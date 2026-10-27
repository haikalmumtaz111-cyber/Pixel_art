// Bahan pembanding V14 (zoom kamera pecahan): video dan gambar sebelum/sesudah, disimpan di output/comparisons/.
// - v14-old-town-detail.mp4  Project B, empat potongan diperbesar 2x (bilangan bulat): kiri Tahap 3, kanan Tahap 4
// - v14-old-town-full.mp4    Project B layar penuh: bagian zoom versi Tahap 3, lalu versi Tahap 4
// - v14-lab-modes.mp4        lab zoom pola demo, empat pendekatan berdampingan (potongan 1:1)
// - v14-crawl-map.png        peta ukuran piksel per kolom dunia (sumbu x) per frame (sumbu y), nearest vs anchored
// - v14-old-town-sheet.png   lembar cuplikan frame berurutan saat zoom, sebelum dan sesudah
// - v14-dissolve-dither.png  dither transisi dissolve diperbesar 4x: sebelum (terbelah) dan sesudah (selaras grid)
// "Sebelum" dirender dengan rendering.zoomMode = "nearest", yang terbukti identik 100% dengan render Tahap 3.
// Pemakaian: node src/render/zoom-demo.cjs
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { ROOT, loadProject, buildProject } = require('./projects.cjs');
const { renderFrames, FFMPEG, run } = require('./pipeline.cjs');
const { openStudio } = require('./browser.cjs');
const { frameFile } = require('./config.cjs');

const OUT = path.join(ROOT, 'output', 'comparisons');
const B_RANGES = [[75, 135], [250, 350]];
const ENCODE = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level:v', '4.1', '-movflags', '+faststart'];

function font() {
  const r = spawnSync('fc-match', ['-f', '%{file}', 'DejaVu Sans:bold'], { encoding: 'utf8' });
  return r.status === 0 && fs.existsSync(r.stdout) ? r.stdout : null;
}
const FONT = font();
// teks label (dilewati bila tidak ada font)
const label = (text, x, y, size = 30) => (FONT
  ? `drawtext=fontfile='${FONT}':text='${text.replace(/[:']/g, ' ')}':x=${x}:y=${y}:fontsize=${size}:fontcolor=white:box=1:boxcolor=black@0.75:boxborderw=8`
  : 'null');

function ffmpeg(args) {
  const r = run(FFMPEG, ['-v', 'error', '-y', ...args]);
  if (r.status !== 0) throw new Error(`FFmpeg gagal: ${r.stderr.slice(0, 400)}`);
}

// Render rentang frame Project B dengan mode zoom tertentu ke folder bernomor global.
async function renderB(mode, dir) {
  const config = loadProject('old-town-morning');
  config.rendering = { ...config.rendering, zoomMode: mode };
  for (const [a, b] of B_RANGES) await renderFrames(config, { first: a, count: b - a + 1, framesDir: dir, globalNames: true });
}

// Susun frame dua folder menjadi video lewat daftar frame (concat) supaya nomor frame bebas.
function listFile(dir, frames, file) {
  fs.writeFileSync(file, frames.map((f) => `file '${frameFile(dir, f)}'\nduration ${1 / 30}`).join('\n') + '\n');
  return file;
}
const frameCount = (frames) => ['-frames:v', String(frames)];

async function oldTown(temp) {
  const before = path.join(temp, 'b-nearest');
  const after = path.join(temp, 'b-anchored');
  console.log('Render Project B sebelum (nearest) dan sesudah (anchored) ...');
  await renderB('nearest', before);
  await renderB('anchored', after);
  const frames = B_RANGES.flatMap(([a, b]) => [...Array(b - a + 1).keys()].map((k) => a + k));
  const lb = listFile(before, frames, path.join(temp, 'before.txt'));
  const la = listFile(after, frames, path.join(temp, 'after.txt'));

  // 1. detail 2x2: dua wilayah, kiri sebelum, kanan sesudah
  const regions = [[640, 420], [1000, 760]];
  const crops = [];
  regions.forEach(([x, y], r) => {
    crops.push(`[0:v]crop=480:270:${x}:${y},scale=960:540:flags=neighbor,${label('SEBELUM - Tahap 3 (nearest)', 16, 16, 26)}[b${r}]`);
    crops.push(`[1:v]crop=480:270:${x}:${y},scale=960:540:flags=neighbor,${label('SESUDAH - Tahap 4 (anchored)', 16, 16, 26)}[a${r}]`);
  });
  const filter = `${crops.join(';')};[b0][a0][b1][a1]xstack=inputs=4:layout=0_0|960_0|0_540|960_540[v]`;
  ffmpeg(['-f', 'concat', '-safe', '0', '-i', lb, '-f', 'concat', '-safe', '0', '-i', la, '-filter_complex', filter, '-map', '[v]', '-r', '30', ...frameCount(frames.length), ...ENCODE, path.join(OUT, 'v14-old-town-detail.mp4')]);

  // 2. layar penuh: Tahap 3 lalu Tahap 4
  const both = path.join(temp, 'both.txt');
  fs.writeFileSync(both, fs.readFileSync(lb, 'utf8') + fs.readFileSync(la, 'utf8'));
  const n = frames.length;
  ffmpeg(['-f', 'concat', '-safe', '0', '-i', both, '-vf',
    `${label('SEBELUM - Tahap 3 (nearest)', 24, 24)}:enable='lt(n,${n})',${label('SESUDAH - Tahap 4 (anchored)', 24, 24)}:enable='gte(n,${n})'`.replace(/,null/g, ''),
    '-r', '30', ...frameCount(2 * n), ...ENCODE, path.join(OUT, 'v14-old-town-full.mp4')]);

  // 3. lembar cuplikan: 4 frame berurutan saat pullback, potongan 2x, atas sebelum, bawah sesudah
  const sheet = [300, 301, 302, 303];
  const inputs = [];
  sheet.forEach((f) => inputs.push('-i', frameFile(before, f)));
  sheet.forEach((f) => inputs.push('-i', frameFile(after, f)));
  const tiles = [...Array(8).keys()].map((k) => `[${k}:v]crop=240:270:1000:760,scale=480:540:flags=neighbor,${label(`${k < 4 ? 'sebelum' : 'sesudah'} f${sheet[k % 4]}`, 8, 8, 20)}[t${k}]`).join(';');
  ffmpeg([...inputs, '-filter_complex', `${tiles};[t0][t1][t2][t3][t4][t5][t6][t7]xstack=inputs=8:layout=0_0|480_0|960_0|1440_0|0_540|480_540|960_540|1440_540[v]`, '-map', '[v]', '-frames:v', '1', path.join(OUT, 'v14-old-town-sheet.png')]);

  // 4. dither dissolve di zoom 1,25 (frame 124), diperbesar 4x
  ffmpeg(['-i', frameFile(before, 124), '-i', frameFile(after, 124), '-filter_complex',
    `[0]crop=200:120:900:600,scale=800:480:flags=neighbor,${label('SEBELUM - dither 4 px di atas piksel 5 px', 8, 8, 20)}[a];[1]crop=200:120:900:600,scale=800:480:flags=neighbor,${label('SESUDAH - dither selaras grid', 8, 8, 20)}[b];[a][b]hstack`,
    '-frames:v', '1', path.join(OUT, 'v14-dissolve-dither.png')]);
}

// ---------- lab ----------

function labRaw(mode, style, frames, camera) {
  return {
    id: 'zoom-lab', name: `zoom-demo-${mode.id}`, title: 'Lab zoom', seed: 1, width: 480, height: 270, outputWidth: 1920, outputHeight: 1080,
    fps: 30, durationSeconds: frames / 30, rendering: { upscale: 'browser', ...mode.rendering }, palettes: { default: {} },
    assets: {
      far: { type: 'calibration-grid', layerId: 1, style },
      near: { type: 'calibration-grid', layerId: 2, style, bandTop: 130, bandBottom: 265 }
    },
    stages: { lab: { layers: [{ id: 'far', parallax: 0.5 }, { id: 'near', parallax: 1 }], entities: [{ id: 'far-grid', asset: 'far', layer: 'far' }, { id: 'near-grid', asset: 'near', layer: 'near' }] } },
    timeline: { scenes: [{ id: 'lab', name: 'Lab', module: 'compose', stage: 'lab', start: 0, end: frames / 30, camera: { type: 'keys', ...camera }, transitionOut: null }] }
  };
}

const LAB_MODES = [
  { id: 'nearest', title: 'nearest (Tahap 3)', rendering: { zoomMode: 'nearest' } },
  { id: 'steps', title: 'steps (dibulatkan)', rendering: { zoomMode: 'steps' } },
  { id: 'anchored-screen', title: 'anchored 1 kanvas', rendering: { zoomMode: 'anchored', zoomLayers: false } },
  { id: 'anchored', title: 'anchored per lapisan (Tahap 4)', rendering: { zoomMode: 'anchored' } }
];
// zoom masuk sambil geser diagonal, lalu geser diagonal di zoom 1,1
const LAB_CAMERA = { x: [[0, 100], [89, 160]], y: [[0, 60], [89, 95]], zoom: [[0, 1], [59, 1.6, 'inOutSine'], [60, 1.1], [89, 1.1]] };
const LAB_FRAMES = 90;

async function lab(temp) {
  console.log('Render lab zoom pola demo untuk empat pendekatan ...');
  const inputs = [];
  for (const mode of LAB_MODES) {
    const config = buildProject(labRaw(mode, 'readable', LAB_FRAMES, LAB_CAMERA), path.join(ROOT, 'config', 'zoom-lab.json'));
    const dir = path.join(temp, `lab-${mode.id}`);
    await renderFrames(config, { framesDir: dir });
    inputs.push('-framerate', '30', '-i', path.join(dir, 'frame_%04d.png'));
  }
  const tiles = LAB_MODES.map((m, k) => `[${k}:v]crop=960:540:480:270,${label(m.title, 12, 12, 26)}[q${k}]`).join(';');
  ffmpeg([...inputs, '-filter_complex', `${tiles};[q0][q1][q2][q3]xstack=inputs=4:layout=0_0|960_0|0_540|960_540[v]`, '-map', '[v]', ...ENCODE, path.join(OUT, 'v14-lab-modes.mp4')]);
}

// Peta crawl: setiap baris gambar = satu frame, setiap kolom = satu kolom dunia lapisan dekat.
// Biru = 4 piksel, jingga = 5 piksel, gelap = tidak terlihat. Pola yang tegak lurus = stabil; pola miring/acak = merayap.
async function crawlMap(temp) {
  console.log('Membuat peta crawl ...');
  const frames = 60;
  const camera = { x: [[0, 100], [59, 160]], y: [[0, 60]], zoom: [[0, 1.1]] };
  const cols = 520;
  const rowH = 4;
  const maps = [];
  for (const mode of [LAB_MODES[0], LAB_MODES[3]]) {
    const config = buildProject(labRaw(mode, 'identity', frames, camera), path.join(ROOT, 'config', 'zoom-lab.json'));
    const studio = await openStudio(config);
    const rows = [];
    try {
      for (let f = 0; f < frames; f++) {
        const stats = await studio.evaluate(async (i) => {
          window.studio.drawFrame(i);
          const m = await import('/tests/fixtures/zoom/analyze.js');
          return m.analyze(document.getElementById('screen'));
        }, f);
        const widths = new Map();
        for (let i = 0; i < stats.x.length; i += 4) if (stats.x[i] === 2) widths.set(stats.x[i + 1], stats.x[i + 3]);
        rows.push(widths);
      }
    } finally {
      await studio.close();
    }
    maps.push(rows);
  }
  const width = cols * 2 + 20;
  const height = frames * rowH;
  const buf = Buffer.alloc(width * height * 3, 20);
  maps.forEach((rows, m) => {
    rows.forEach((widths, f) => {
      for (let c = 0; c < cols; c++) {
        const w = widths.get(100 + c);
        const color = w === 4 ? [70, 110, 200] : w === 5 ? [240, 150, 50] : [20, 20, 20];
        for (let y = 0; y < rowH; y++) {
          const i = ((f * rowH + y) * width + m * (cols + 20) + c) * 3;
          buf[i] = color[0]; buf[i + 1] = color[1]; buf[i + 2] = color[2];
        }
      }
    });
  });
  const raw = path.join(temp, 'crawl.rgb');
  fs.writeFileSync(raw, buf);
  ffmpeg(['-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${width}x${height}`, '-i', raw, '-vf',
    `scale=${width * 2}:${height * 2}:flags=neighbor,${label('nearest (Tahap 3)', 10, 10, 22)},${label('anchored per lapisan (Tahap 4)', (cols + 20) * 2 + 10, 10, 22)}`.replace(/,null/g, ''),
    '-frames:v', '1', path.join(OUT, 'v14-crawl-map.png')]);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-zoom-demo-'));
  try {
    await oldTown(temp);
    await lab(temp);
    await crawlMap(temp);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
  for (const f of fs.readdirSync(OUT)) console.log(`  ${path.relative(ROOT, path.join(OUT, f))} (${(fs.statSync(path.join(OUT, f)).size / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((error) => {
  console.error(`\nDEMO ZOOM GAGAL: ${error.message}`);
  process.exit(1);
});
