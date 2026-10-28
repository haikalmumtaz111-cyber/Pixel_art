// Bahan pembanding Tahap 5 (V15 pencahayaan karakter, V16 gerak karakter), disimpan di output/comparisons/:
// - v15-v16-sebelum-sesudah.mp4  proyek demo character-lab penuh: atas = layar penuh (kiri sebelum, kanan sesudah),
//                                bawah = potongan 1:1 yang mengikuti tokoh utama tiap adegan (kiri sebelum, kanan sesudah)
// - v16-langkah.png              8 frame berurutan Pak Darto berjalan: atas sebelum (tabel Tahap 3), bawah sesudah (natural)
// - v15-cahaya.png               tokoh yang sama pada pagi, siang, sore, malam: atas sebelum (warna tetap), bawah sesudah
// dan laporan ukur output/reports/character-demo.md (.json): kaki meluncur, getar pinggul, warna identitas per waktu.
// "Sebelum" = proyek yang sama, tetapi semua karakter rig memakai motion "classic" tanpa "light", yaitu perilaku
// rig persis seperti Tahap 3-4 (Project B membuktikannya: identik dengan baseline resminya).
// Pemakaian: node src/render/character-demo.cjs  (npm run demo:character)
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { spawnSync } = require('child_process');
const { ROOT, loadProject } = require('./projects.cjs');
const { renderFrames, FFMPEG, run } = require('./pipeline.cjs');
const { openStudio } = require('./browser.cjs');
const { frameFile, FRAME_PATTERN } = require('./config.cjs');

const PROJECT = 'character-lab';
const OUT = path.join(ROOT, 'output', 'comparisons');
const REPORTS = path.join(ROOT, 'output', 'reports');
const ENCODE = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level:v', '4.1', '-movflags', '+faststart'];
// tokoh yang diikuti potongan detail di setiap adegan
const SUBJECTS = { 's01-langkah': 'darto-pagi', 's02-pose': 'pak-tua', 's03-sore': 'darto-sore', 's04-malam': 'darto-sore' };
const LIGHT_SAMPLES = [['PAGI', 60], ['SIANG', 170], ['SORE', 280], ['MALAM', 350]];
const WALK_STRIP = [40, 42, 44, 46, 48, 50, 52, 54];
const RIG_ONLY = ['motion', 'light', 'lightTrack', 'lightDirection', 'frontArm', 'backArm', 'armSwing'];

function font() {
  const r = spawnSync('fc-match', ['-f', '%{file}', 'DejaVu Sans:bold'], { encoding: 'utf8' });
  return r.status === 0 && fs.existsSync(r.stdout) ? r.stdout : null;
}
const FONT = font();
// teks label (dilewati bila tidak ada font)
const label = (text, x, y, size = 26) => (FONT
  ? `drawtext=fontfile='${FONT}':text='${text.replace(/[:']/g, ' ')}':x=${x}:y=${y}:fontsize=${size}:fontcolor=white:box=1:boxcolor=black@0.75:boxborderw=8`
  : 'null');

function ffmpeg(args) {
  const r = run(FFMPEG, ['-v', 'error', '-y', ...args]);
  if (r.status !== 0) throw new Error(`FFmpeg gagal: ${r.stderr.slice(0, 400)}`);
}

// Varian "sebelum": semua karakter rig kembali ke gerak klasik tanpa cahaya palet.
function beforeVariant(config) {
  const c = JSON.parse(JSON.stringify(config));
  const types = c.assets || {};
  for (const def of Object.values(types)) {
    if (def.type !== 'rig-character') continue;
    for (const key of RIG_ONLY) delete def[key];
  }
  for (const def of Object.values(c.cast || {})) {
    if (types[def.asset]?.type !== 'rig-character') continue;
    for (const key of RIG_ONLY) if (def.params) delete def.params[key];
    if (def.paramTracks) delete def.paramTracks.lightDirection;
  }
  return c;
}

// Posisi potongan detail (piksel layar 1920x1080) untuk setiap frame: mengikuti tokoh adegan itu.
async function cropPlan(config) {
  const { createTrack } = await import(pathToFileURL(path.join(ROOT, 'src', 'engine', 'tracks.js')).href);
  const scale = config.outputWidth / config.width;
  const sceneAt = (f) => {
    const t = config.timeline.transitions.find((x) => f >= x.startFrame && f < x.endFrame);
    return t ? t.to : config.timeline.scenes.find((s) => f >= s.startFrame && f < s.endFrame).id;
  };
  const plan = [];
  for (let f = 0; f < config.totalFrames; f++) {
    const scene = config.timeline.scenes.find((s) => s.id === sceneAt(f));
    const cam = scene.camera;
    const camX = createTrack(cam.x, 0)(f);
    const camY = createTrack(cam.y, 0)(f);
    const zoom = createTrack(cam.zoom, 1)(f);
    const who = config.cast[SUBJECTS[scene.id]];
    const wx = who.motion?.x ? createTrack(who.motion.x, who.position[0])(f) : who.position[0];
    const sx = ((Math.round(wx) - Math.round(camX) - config.width / 2) * zoom + config.width / 2) * scale;
    const sy = ((who.position[1] - Math.round(camY) - config.height / 2) * zoom + config.height / 2) * scale;
    const snap = (v, max) => Math.min(max, Math.max(0, Math.round(v / 8) * 8));
    plan.push({ x: snap(sx - 480, config.outputWidth - 960), y: snap(sy - 460, config.outputHeight - 540) });
  }
  return plan;
}

// Statistik gerak dan warna dari browser (data motionProbe dan warna identitas).
async function measure(config) {
  const studio = await openStudio(config);
  try {
    const frames = await studio.inspect('motionProbes', 0, config.totalFrames);
    const plants = new Map();
    const bobs = new Map();
    frames.forEach((probes, frame) => {
      for (const [entity, probe] of Object.entries(probes)) {
        for (const f of probe.feet) {
          const key = `${entity}:${f.foot}:${f.step}`;
          if (!plants.has(key)) plants.set(key, []);
          plants.get(key).push(f.x);
        }
        if (!bobs.has(entity)) bobs.set(entity, []);
        bobs.get(entity).push({ frame, bob: probe.bob });
      }
    });
    const slides = [...plants.values()].filter((xs) => xs.length > 1).map((xs) => Math.max(...xs) - Math.min(...xs));
    let flips = 0;
    for (const list of bobs.values()) {
      for (let i = 1; i < list.length - 1; i++) {
        const [a, b, c] = [list[i - 1], list[i], list[i + 1]];
        if (a.frame === b.frame - 1 && c.frame === b.frame + 1 && a.bob === c.bob && b.bob !== a.bob) flips++;
      }
    }
    const colors = {};
    for (const [name, frame] of LIGHT_SAMPLES) colors[name] = await studio.inspect('identityColors', 'pak-darto', frame);
    return {
      steps: slides.length,
      slidingSteps: slides.filter((s) => s > 0).length,
      meanSlide: slides.length ? Number((slides.reduce((a, b) => a + b, 0) / slides.length).toFixed(2)) : 0,
      maxSlide: slides.length ? Math.max(...slides) : 0,
      bobFlips: flips,
      colors
    };
  } finally {
    await studio.close();
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const after = loadProject(PROJECT);
  const before = beforeVariant(after);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-character-demo-'));
  try {
    const dirs = { before: path.join(temp, 'sebelum'), after: path.join(temp, 'sesudah') };
    console.log('Render character-lab sebelum (gerak klasik, warna tetap) ...');
    await renderFrames(before, { framesDir: dirs.before });
    console.log('Render character-lab sesudah (gerak natural, cahaya palet) ...');
    await renderFrames(after, { framesDir: dirs.after });

    // 1. video empat panel, potongan bawah mengikuti tokoh lewat perintah crop per frame
    const plan = await cropPlan(after);
    const cmds = path.join(temp, 'crop.cmd');
    fs.writeFileSync(cmds, plan.map((p, f) => `${Math.max(0, (f - 0.5) / after.fps).toFixed(4)} crop@cb x ${p.x}, crop@cb y ${p.y}, crop@ca x ${p.x}, crop@ca y ${p.y};`).join('\n') + '\n');
    const tag = 'Tahap 4 - gerak klasik, warna tetap';
    const tagAfter = 'Tahap 5 - gerak natural, cahaya palet';
    const filter = [
      `[0:v]split[b0][b1]`, `[1:v]split[a0][a1]`,
      `[b0]scale=960:540:flags=neighbor,${label(`SEBELUM (${tag})`, 12, 12, 24)}[tb]`,
      `[a0]scale=960:540:flags=neighbor,${label(`SESUDAH (${tagAfter})`, 12, 12, 24)}[ta]`,
      `[b1]sendcmd=f='${cmds}',crop@cb=960:540:${plan[0].x}:${plan[0].y},${label('detail ukuran asli, mengikuti tokoh', 12, 12, 20)}[db]`,
      `[a1]sendcmd=f='${cmds}',crop@ca=960:540:${plan[0].x}:${plan[0].y},${label('detail ukuran asli, mengikuti tokoh', 12, 12, 20)}[da]`,
      `[tb][ta][db][da]xstack=inputs=4:layout=0_0|960_0|0_540|960_540[v]`
    ].join(';');
    console.log('Menyusun video pembanding ...');
    ffmpeg(['-framerate', String(after.fps), '-i', path.join(dirs.before, FRAME_PATTERN), '-framerate', String(after.fps), '-i', path.join(dirs.after, FRAME_PATTERN),
      '-filter_complex', filter, '-map', '[v]', '-r', String(after.fps), ...ENCODE, path.join(OUT, 'v15-v16-sebelum-sesudah.mp4')]);

    // 2. jalur langkah: 8 frame berurutan, potongan 240x480 di sekitar Pak Darto (zoom 2)
    const strip = (dir) => WALK_STRIP.map((f) => ['-i', frameFile(dir, f)]).flat();
    const tiles = [];
    WALK_STRIP.forEach((f, k) => {
      const p = plan[f];
      for (const [row, i] of [['b', k], ['a', k + WALK_STRIP.length]]) tiles.push(`[${i}:v]crop=240:480:${p.x + 360}:${p.y},${label(`f${f}`, 6, 6, 18)}[${row}${k}]`);
    });
    const ids = (row) => WALK_STRIP.map((_, k) => `[${row}${k}]`).join('');
    ffmpeg([...strip(dirs.before), ...strip(dirs.after), '-filter_complex',
      `${tiles.join(';')};${ids('b')}hstack=inputs=${WALK_STRIP.length},pad=iw:ih+44:0:44,${label('SEBELUM - tabel 8 fase Tahap 3 (telapak ikut meluncur)', 8, 8, 22)}[rb];${ids('a')}hstack=inputs=${WALK_STRIP.length},pad=iw:ih+44:0:44,${label('SESUDAH - 8 fase natural (telapak menempel, siku dan lutut menekuk)', 8, 8, 22)}[ra];[rb][ra]vstack[v]`,
      '-map', '[v]', '-frames:v', '1', path.join(OUT, 'v16-langkah.png')]);

    // 3. cahaya: tokoh yang sama di empat waktu, potongan 480x540
    const lightInputs = [];
    const lightTiles = [];
    LIGHT_SAMPLES.forEach(([name, f], k) => {
      lightInputs.push('-i', frameFile(dirs.before, f));
      lightInputs.push('-i', frameFile(dirs.after, f));
      const p = plan[f];
      lightTiles.push(`[${2 * k}:v]crop=480:540:${p.x + 240}:${p.y},${label(`${name} sebelum`, 8, 8, 20)}[lb${k}]`);
      lightTiles.push(`[${2 * k + 1}:v]crop=480:540:${p.x + 240}:${p.y},${label(`${name} sesudah`, 8, 8, 20)}[la${k}]`);
    });
    const lrow = (r) => LIGHT_SAMPLES.map((_, k) => `[l${r}${k}]`).join('');
    ffmpeg([...lightInputs, '-filter_complex', `${lightTiles.join(';')};${lrow('b')}hstack=inputs=4[rb];${lrow('a')}hstack=inputs=4[ra];[rb][ra]vstack[v]`,
      '-map', '[v]', '-frames:v', '1', path.join(OUT, 'v15-cahaya.png')]);

    // 4. laporan ukur
    console.log('Mengukur gerak dan warna ...');
    const stats = { before: await measure(before), after: await measure(after) };
    const testedAt = new Date().toISOString();
    fs.writeFileSync(path.join(REPORTS, 'character-demo.json'), JSON.stringify({ testedAt, project: PROJECT, ...stats }, null, 2) + '\n');
    const row = (name, f) => `| ${name} | ${f(stats.before)} | ${f(stats.after)} |`;
    const colorRows = LIGHT_SAMPLES.map(([name, frame]) => `| ${name} (frame ${frame}) | ${stats.before.colors[name].join(', ')} | ${stats.after.colors[name].join(', ')} |`).join('\n');
    fs.writeFileSync(path.join(REPORTS, 'character-demo.md'), `# Pembanding Tahap 5: gerak dan cahaya karakter

Dibuat otomatis oleh \`npm run demo:character\` pada ${testedAt}, dari proyek demo \`${PROJECT}\`.
"Sebelum" = proyek yang sama dengan semua karakter rig memakai gerak klasik tanpa cahaya palet (perilaku Tahap 3-4).
"Sesudah" = konfigurasi proyek apa adanya (gerak natural, cahaya palet).

## Gerak (seluruh film, semua karakter yang berjalan)

| Ukuran | Sebelum | Sesudah |
|--------|---------|---------|
${row('Langkah (telapak menapak) yang diukur', (s) => s.steps)}
${row('Langkah yang telapaknya meluncur', (s) => s.slidingSteps)}
${row('Telapak meluncur rata-rata per langkah', (s) => `${s.meanSlide} px`)}
${row('Telapak meluncur terjauh', (s) => `${s.maxSlide} px`)}
${row('Pinggul bolak-balik dalam 1 frame (getar)', (s) => s.bobFlips)}

Satuan px = piksel art (1 piksel art = 4 piksel layar di zoom 1, 8 piksel layar di zoom 2).

## Warna identitas Pak Darto (baju, celana, peci) per waktu

| Waktu | Sebelum (warna tetap) | Sesudah (mengikuti palet) |
|-------|-----------------------|---------------------------|
${colorRows}

Bahan visual: \`output/comparisons/v15-v16-sebelum-sesudah.mp4\`, \`output/comparisons/v16-langkah.png\`, \`output/comparisons/v15-cahaya.png\`.
`);
    console.log(`Selesai: ${['v15-v16-sebelum-sesudah.mp4', 'v16-langkah.png', 'v15-cahaya.png'].map((f) => `output/comparisons/${f}`).join(', ')}, output/reports/character-demo.md`);
    console.log(`Sebelum: ${stats.before.slidingSteps}/${stats.before.steps} langkah meluncur (rata-rata ${stats.before.meanSlide} px, maks ${stats.before.maxSlide} px). Sesudah: ${stats.after.slidingSteps}/${stats.after.steps} langkah meluncur, ${stats.after.bobFlips} getar.`);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`\nPEMBANDING GAGAL: ${error.message}`);
  process.exit(1);
});
