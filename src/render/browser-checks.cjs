// Pemeriksaan yang butuh browser: determinisme, kesinambungan transisi, dan konsistensi aset kereta.
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

// Frame awal transisi harus sama dengan adegan lama saja, frame akhir sama dengan adegan baru saja,
// dan transisi portal harus sudah menutup layar sebelum frame terakhir (supaya tidak ada lompatan).
async function transitionBoundaryChecks(studio, config, renderInfo) {
  const out = [];
  const segments = new Map((renderInfo?.segments || []).map((s) => [s.frame, s]));
  for (const t of config.timeline.transitions) {
    const filmStart = sha256((await studio.renderFrame(t.startFrame)).png);
    const sceneStart = sha256(studio.toBuffer(await studio.inspect('renderScene', t.from, t.startFrame)));
    const filmEnd = sha256((await studio.renderFrame(t.endFrame)).png);
    const sceneEnd = sha256(studio.toBuffer(await studio.inspect('renderScene', t.to, t.endFrame)));
    out.push(result(`boundary:${t.id}`, `Transisi ${t.id} menyambung tanpa lompatan`, filmStart === sceneStart && filmEnd === sceneEnd,
      `frame ${t.startFrame} ${filmStart === sceneStart ? 'sama' : 'BEDA'} dengan ${t.from}, frame ${t.endFrame} ${filmEnd === sceneEnd ? 'sama' : 'BEDA'} dengan ${t.to}`));
    if (t.type === 'portal') {
      const last = segments.get(t.endFrame - 1);
      const firstCovered = [...segments.values()].find((s) => s.frame >= t.startFrame && s.frame <= t.endFrame && s.covered);
      out.push(result(`portal:${t.id}`, `Portal ${t.id} menutup layar sebelum transisi selesai`, Boolean(last && last.covered),
        last ? `layar tertutup penuh mulai frame ${firstCovered ? firstCovered.frame : '-'} (transisi berakhir di ${t.endFrame})` : 'data render tidak ditemukan'));
    }
  }
  if (!config.timeline.transitions.length) out.push(result('boundary', 'Transisi menyambung tanpa lompatan', true, 'tidak ada transisi'));
  return out;
}

// Semua adegan yang menampilkan kereta harus memakai aset kereta yang sama,
// dan warna identitas kereta harus muncul persis di adegan-adegan tersebut.
async function trainConsistencyChecks(studio, config, sampleFrames) {
  const usage = await studio.inspect('trainUsage');
  const snapshots = await studio.inspect('trainSnapshots');
  const used = [...new Set(Object.values(usage).flat())];
  const hashes = new Set(used.map((key) => sha256(studio.toBuffer(snapshots[key]))));
  const scenesWithTrain = Object.entries(usage).filter(([, keys]) => keys.length).map(([id]) => id);
  const out = [result('train-asset', 'Aset kereta konsisten di semua adegan', used.length > 0 && hashes.size === 1,
    used.length ? `${scenesWithTrain.length} adegan memakai ${used.length} definisi kereta (${used.join(', ')}), ${hashes.size} bentuk berbeda` : 'tidak ada adegan yang memakai kereta')];

  const colors = await studio.inspect('trainColors');
  const missing = [];
  for (const frame of sampleFrames) {
    const counts = await studio.inspect('colorCounts', frame, colors);
    const absent = colors.filter((c) => counts[c] === 0);
    if (absent.length) missing.push(`frame ${frame}: ${absent.join(' ')}`);
  }
  out.push(result('train-colors', 'Warna identitas kereta sama di tiap adegan luar', missing.length === 0,
    missing.length ? missing.join(' | ') : `warna ${colors.join(', ')} ditemukan persis di frame ${sampleFrames.join(', ')}`));
  return out;
}

function jsErrorChecks(renderInfo, studio) {
  const during = renderInfo ? renderInfo.jsErrors : null;
  return [result('js-errors', 'Tidak ada error JavaScript selama rendering', during === 0 && studio.errors.length === 0,
    `${during ?? 'tidak tercatat'} error saat render, ${studio.errors.length} error saat pengujian`)];
}

module.exports = { determinismChecks, transitionBoundaryChecks, trainConsistencyChecks, jsErrorChecks };
