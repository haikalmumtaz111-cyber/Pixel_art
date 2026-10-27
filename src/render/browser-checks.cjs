// Pemeriksaan yang butuh browser: determinisme, kesinambungan transisi, adegan terpisah,
// konsistensi aset, dan modul yang dimuat. Semuanya generik, berlaku untuk proyek mana pun.
const { sha256, result } = require('./checks.cjs');

// Render ulang frame di browser baru dengan urutan terbalik, lalu bandingkan byte demi byte.
// Ini sekaligus membuktikan hasil tidak bergantung pada urutan render.
async function determinismChecks(studio, pngHashes, { first = 0, frames }) {
  const list = frames || pngHashes.map((_, i) => i).reverse();
  let same = 0;
  const differ = [];
  for (const i of list) {
    const { png } = await studio.renderFrame(first + i);
    if (sha256(png) === pngHashes[i]) same++;
    else differ.push(i);
  }
  // render dua kali berturut-turut pada frame yang sama harus identik
  const probe = list.slice(0, 3);
  let repeat = 0;
  for (const i of probe) {
    const a = sha256((await studio.renderFrame(first + i)).png);
    const b = sha256((await studio.renderFrame(first + i)).png);
    if (a === b && a === pngHashes[i]) repeat++;
  }
  return [
    result('determinism', 'Rendering deterministik (render ulang identik, urutan terbalik)', same === list.length && repeat === probe.length,
      differ.length ? `${differ.length} frame berbeda, contoh: ${differ.slice(0, 6).join(', ')}` : `${same}/${list.length} frame identik byte demi byte, ${repeat}/${probe.length} frame identik saat dirender dua kali`)
  ];
}

// Frame pertama transisi harus sama dengan adegan lama saja, frame terakhir sama dengan adegan baru saja,
// dan transisi portal harus sudah menutup layar sebelum frame terakhir (supaya tidak ada lompatan).
async function transitionBoundaryChecks(studio, config, renderInfo) {
  const out = [];
  const segments = new Map((renderInfo?.segments || []).map((s) => [s.frame, s]));
  for (const t of config.timeline.transitions) {
    const filmStart = sha256((await studio.renderFrame(t.startFrame)).png);
    const sceneStart = sha256(studio.toBuffer(await studio.inspect('renderScene', t.from, t.startFrame)));
    const filmEnd = sha256((await studio.renderFrame(t.lastFrame)).png);
    const sceneEnd = sha256(studio.toBuffer(await studio.inspect('renderScene', t.to, t.lastFrame)));
    out.push(result(`boundary:${t.id}`, `Transisi ${t.id} menyambung tanpa lompatan`, filmStart === sceneStart && filmEnd === sceneEnd,
      `frame ${t.startFrame} ${filmStart === sceneStart ? 'sama' : 'BEDA'} dengan ${t.from}, frame ${t.lastFrame} ${filmEnd === sceneEnd ? 'sama' : 'BEDA'} dengan ${t.to}`));
    if (t.type === 'portal') {
      const last = segments.get(t.lastFrame - 1);
      const firstCovered = [...segments.values()].find((s) => s.frame >= t.startFrame && s.frame <= t.lastFrame && s.covered);
      out.push(result(`portal:${t.id}`, `Portal ${t.id} menutup layar sebelum transisi selesai`, Boolean(last && last.covered),
        last ? `layar tertutup penuh mulai frame ${firstCovered ? firstCovered.frame : '-'} (transisi berakhir di ${t.lastFrame})` : 'data render tidak ditemukan'));
    }
  }
  if (!config.timeline.transitions.length) out.push(result('boundary', 'Transisi menyambung tanpa lompatan', true, 'tidak ada transisi'));
  return out;
}

// Frame di luar transisi = adegan itu saja. Jadi render satu adegan secara terpisah (npm run render:scene)
// harus menghasilkan gambar yang persis sama dengan film utuh pada frame tersebut.
async function sceneIsolationChecks(studio, config) {
  const out = [];
  const inTransition = (f) => config.timeline.transitions.some((t) => f >= t.startFrame && f <= t.lastFrame);
  for (const scene of config.timeline.scenes) {
    const frames = [];
    for (let f = scene.startFrame; f < scene.endFrame; f++) if (!inTransition(f)) frames.push(f);
    const picks = [...new Set([frames[0], frames[Math.floor(frames.length / 2)], frames[frames.length - 1]])].filter((f) => f !== undefined);
    const differ = [];
    for (const f of picks) {
      const film = sha256((await studio.renderFrame(f)).png);
      const alone = sha256((await studio.renderFrame(f, scene.id)).png);
      if (film !== alone) differ.push(f);
    }
    out.push(result(`scene:${scene.id}`, `Adegan ${scene.id} bisa dirender terpisah`, picks.length > 0 && differ.length === 0,
      differ.length ? `frame ${differ.join(', ')} berbeda dari film utuh` : `frame ${picks.join(', ')} identik dengan film utuh`));
  }
  return out;
}

// Aturan konsistensi dari config.validation.consistency:
// - { "assetType": "steam-train", "frames": [...] }: semua adegan memakai SATU aset berjenis itu (bentuk sama),
//   dan warna identitasnya muncul di setiap frame contoh
// - { "asset": "pak-darto", "frames": [...] }: warna identitas aset itu muncul di setiap frame contoh
async function consistencyChecks(studio, config) {
  const out = [];
  for (const rule of config.validation?.consistency || []) {
    const type = rule.assetType || config.assets[rule.asset]?.type;
    const usage = await studio.inspect('assetUsage', type);
    const label = rule.asset || rule.assetType;
    let keys;
    if (rule.assetType) {
      keys = [...new Set(Object.values(usage).flat())];
      const snapshots = await studio.inspect('assetSnapshots', type);
      const shapes = new Set(keys.filter((k) => snapshots[k]).map((k) => sha256(studio.toBuffer(snapshots[k]))));
      const scenes = Object.entries(usage).filter(([, list]) => list.length).map(([id]) => id);
      out.push(result(`consistency:${label}-asset`, `Aset ${label} sama di semua adegan`, keys.length === 1 && shapes.size <= 1,
        keys.length ? `${scenes.length} adegan memakai ${keys.length} definisi (${keys.join(', ')}), ${shapes.size} bentuk berbeda` : 'tidak ada adegan yang memakai aset ini'));
    } else {
      keys = [rule.asset];
      const scenes = Object.entries(usage).filter(([, list]) => list.includes(rule.asset)).map(([id]) => id);
      out.push(result(`consistency:${label}-asset`, `Aset ${label} dipakai bersama oleh adegan-adegannya`, scenes.length > 0,
        scenes.length ? `satu definisi aset "${rule.asset}" dipakai adegan ${scenes.join(', ')}` : 'tidak ada adegan yang memakai aset ini'));
    }
    const colors = [...new Set((await Promise.all(keys.map((k) => studio.inspect('identityColors', k)))).flat())];
    const missing = [];
    for (const frame of rule.frames) {
      const counts = await studio.inspect('colorCounts', frame, colors);
      const absent = colors.filter((c) => counts[c] === 0);
      if (absent.length) missing.push(`frame ${frame}: ${absent.join(' ')}`);
    }
    out.push(result(`consistency:${label}-colors`, `Warna identitas ${label} konsisten`, colors.length > 0 && missing.length === 0,
      !colors.length ? 'aset tidak menyediakan warna identitas' : missing.length ? missing.join(' | ') : `warna ${colors.join(', ')} ditemukan persis di frame ${rule.frames.join(', ')}`));
  }
  return out;
}

// Proyek hanya boleh memuat modul aset yang jenisnya dipakai di bagian "assets", plus modul adegannya sendiri.
// Ini bukti bahwa mesin tidak menyimpan logika proyek lain (misalnya Project B tidak memuat modul kereta).
// Selain itu, file yang benar-benar diunduh browser (termasuk impor tidak langsung) tidak boleh berisi
// modul katalog atau modul adegan lain.
async function moduleChecks(studio, config) {
  const catalog = config.engine.catalog.types;
  const expected = new Set(Object.values(config.assets || {}).map((a) => catalog[a.type]?.module).filter(Boolean));
  for (const s of config.timeline.scenes) {
    if (config.engine.builtinScenes?.includes(s.module) || !s.module) continue;
    expected.add(s.module.startsWith('/') ? (s.module.endsWith('.js') ? s.module : `${s.module}.js`) : `/src/scenes/${s.module}.js`);
  }
  const loaded = new Set(studio.loadedModules);
  const extra = [...loaded].filter((m) => !expected.has(m));
  const absent = [...expected].filter((m) => !loaded.has(m));
  const fetched = await studio.inspect('fetchedScripts');
  const foreign = fetched.filter((f) => !expected.has(f) && (Object.values(catalog).some((t) => t.module === f) || f.startsWith('/src/scenes/')));
  const groups = ['/src/engine/', '/src/assets/', '/src/scenes/'].map((dir) => `${dir}: ${fetched.filter((f) => f.startsWith(dir)).length}`).join(', ');
  return [
    result('engine-modules', 'Hanya modul milik proyek ini yang dimuat', extra.length === 0 && absent.length === 0,
      `${loaded.size} modul: ${[...loaded].join(', ')}${extra.length ? ` | TIDAK DIHARAPKAN: ${extra.join(', ')}` : ''}${absent.length ? ` | TIDAK DIMUAT: ${absent.join(', ')}` : ''}`),
    result('engine-isolation', 'Tidak ada modul proyek lain yang ikut terunduh', foreign.length === 0,
      `${fetched.length} file JS terunduh (${groups})${foreign.length ? ` | MODUL ASING: ${foreign.join(', ')}` : ''}`)
  ];
}

function jsErrorChecks(renderInfo, studio) {
  const during = renderInfo ? renderInfo.jsErrors : null;
  return [result('js-errors', 'Tidak ada error JavaScript selama rendering', during === 0 && studio.errors.length === 0,
    `${during ?? 'tidak tercatat'} error saat render, ${studio.errors.length} error saat pengujian`)];
}

module.exports = { determinismChecks, transitionBoundaryChecks, sceneIsolationChecks, consistencyChecks, moduleChecks, jsErrorChecks };
