// Lab zoom: mengukur kualitas grid piksel kamera untuk beberapa pendekatan zoom, lalu memeriksa bahwa mode
// bawaan ("anchored") memenuhi syaratnya. Memakai pola kalibrasi "identity" (src/assets/common/calibration.js)
// sehingga ukuran, posisi, dan identitas setiap piksel art bisa dibaca langsung dari gambar hasil render.
//
// Yang diukur per skenario (zoom integer/pecahan, geser horizontal/vertikal/diagonal, zoom masuk/keluar):
// - warna asing (blur/anti-aliasing)          harus 0 untuk semua mode
// - ukuran sel per frame                       zoom kelipatan 0,25 = satu ukuran; pecahan = paling banyak c dan c+1
// - crawl: kolom/baris dunia yang berubah ukuran padahal zoom tetap
// - gerak kaku: semua piksel satu lapisan bergeser sama jauh saat kamera geser
// - tidak bolak-balik: saat zoom naik, tidak ada piksel yang mengecil (dan sebaliknya)
// - ketepatan skala dan lompatan skala (pop) terhadap zoom yang diminta
// Pemakaian: node src/render/zoom-tests.cjs   (laporan: output/reports/zoom-lab.md)
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { ROOT, buildProject } = require('./projects.cjs');
const { openStudio } = require('./browser.cjs');
const { result, gridChecks } = require('./checks.cjs');
const { loadProject } = require('./projects.cjs');
const { renderFrames } = require('./pipeline.cjs');
const { md5List } = require('./fingerprint.cjs');
const { frameFile } = require('./config.cjs');
const { loadBaseline } = require('./baselines.cjs');
const os = require('os');

const FPS = 30;
const LADDER = [1, 1.05, 1.1, 1.2, 1.25, 1.3, 1.5, 1.6, 1.75, 2, 2.2, 2.5, 3, 3.5, 4];

// Skenario kamera. x, y dalam piksel art (angka tetap atau [awal, akhir]); zoom tetap, [awal, akhir], atau daftar per frame.
const SCENARIOS = [
  { id: 'ladder', name: 'Tangga zoom 1 sampai 4 (kamera diam)', frames: LADDER.length, x: 100, y: 60, zoom: LADDER },
  { id: 'pan-h-110', name: 'Geser horizontal, zoom 1,1', frames: 30, x: [100, 160], y: 60, zoom: 1.1 },
  { id: 'pan-v-110', name: 'Geser vertikal, zoom 1,1', frames: 30, x: 100, y: [60, 100], zoom: 1.1 },
  { id: 'pan-d-110', name: 'Geser diagonal, zoom 1,1', frames: 30, x: [100, 145], y: [60, 90], zoom: 1.1 },
  { id: 'pan-d-237', name: 'Geser diagonal, zoom 2,37', frames: 30, x: [100, 130], y: [60, 80], zoom: 2.37 },
  { id: 'pan-h-125', name: 'Geser horizontal, zoom 1,25 (bulat)', frames: 30, x: [100, 160], y: 60, zoom: 1.25 },
  { id: 'pan-d-175', name: 'Geser diagonal, zoom 1,75 (bulat)', frames: 30, x: [100, 140], y: [60, 85], zoom: 1.75 },
  { id: 'ramp-in', name: 'Zoom masuk 1 ke 1,25 (kamera diam)', frames: 36, x: 100, y: 60, zoom: [1, 1.25] },
  { id: 'ramp-out-pan', name: 'Zoom keluar 1,5 ke 1 sambil geser horizontal', frames: 45, x: [100, 170], y: 60, zoom: [1.5, 1] },
  { id: 'ramp-in-diag', name: 'Zoom masuk 1 ke 2 sambil geser diagonal', frames: 60, x: [100, 150], y: [60, 90], zoom: [1, 2] }
];

const MODES = [
  { id: 'nearest', label: 'nearest (cara Tahap 3)', rendering: { zoomMode: 'nearest' } },
  { id: 'steps', label: 'steps (zoom dibulatkan)', rendering: { zoomMode: 'steps' } },
  { id: 'anchored-screen', label: 'anchored, satu kanvas (pola menempel layar)', rendering: { zoomMode: 'anchored', zoomLayers: false } },
  { id: 'anchored', label: 'anchored per lapisan (bawaan Tahap 4)', rendering: { zoomMode: 'anchored' } }
];

const keysOf = (value, frames) => {
  if (Array.isArray(value) && value.length === 2 && frames !== 2) return [[0, value[0]], [frames - 1, value[1]]];
  if (Array.isArray(value)) return value.map((v, i) => [i, v]);
  return [[0, value]];
};

function labConfig(scenario, mode, style = 'identity') {
  const raw = {
    id: 'zoom-lab', name: `zoom-lab-${mode.id}-${scenario.id}`, title: 'Lab zoom', seed: 1,
    width: 480, height: 270, outputWidth: 1920, outputHeight: 1080, fps: FPS, durationSeconds: scenario.frames / FPS,
    rendering: { upscale: 'browser', ...mode.rendering },
    palettes: { default: {} },
    assets: {
      far: { type: 'calibration-grid', layerId: 1, style },
      near: { type: 'calibration-grid', layerId: 2, style, bandTop: 130, bandBottom: 265 }
    },
    stages: {
      lab: {
        layers: [{ id: 'far', parallax: 0.5 }, { id: 'near', parallax: 1 }],
        entities: [{ id: 'far-grid', asset: 'far', layer: 'far' }, { id: 'near-grid', asset: 'near', layer: 'near' }]
      }
    },
    timeline: {
      scenes: [{
        id: 'lab', name: scenario.name, module: 'compose', stage: 'lab', start: 0, end: scenario.frames / FPS,
        camera: { type: 'keys', x: keysOf(scenario.x, scenario.frames), y: keysOf(scenario.y, scenario.frames), zoom: keysOf(scenario.zoom, scenario.frames) },
        transitionOut: null
      }]
    }
  };
  return buildProject(raw, path.join(ROOT, 'config', 'zoom-lab.json'));
}

// ---------- metrik ----------

// Ubah daftar datar [lapisan, indeks, awal, panjang, ...] menjadi peta ukuran dan posisi per kolom/baris dunia.
function collect(flat) {
  const size = new Map();
  const start = new Map();
  for (let i = 0; i < flat.length; i += 4) {
    const key = flat[i] * 4096 + flat[i + 1];
    size.set(key, flat[i + 3]);
    start.set(key, flat[i + 2]);
  }
  return { size, start };
}

// Skala terukur lapisan dekat (lapisan 2): jarak dua kolom terjauh dibagi selisih indeksnya.
function measuredCell(axis) {
  let a = Infinity;
  let b = -Infinity;
  for (const key of axis.start.keys()) {
    if (Math.floor(key / 4096) !== 2) continue;
    const index = key % 4096;
    a = Math.min(a, index);
    b = Math.max(b, index);
  }
  if (!(b > a)) return null;
  return (axis.start.get(2 * 4096 + b) - axis.start.get(2 * 4096 + a)) / (b - a);
}

// Pengumpul metrik satu skenario, frame demi frame (tanpa menyimpan semua frame).
function createMetrics(mode) {
  const m = {
    invalidPixels: 0, conflicts: 0, framesUniformAtLevel: 0, framesAtLevel: 0, framesTooManySizes: 0,
    crawl: 0, comparedAtConstantZoom: 0, rigidSpreadMax: 0, nonMonotonic: 0, scaleErrorMax: 0, scaleJumpMax: 0, sizes: {}
  };
  let prev = null;
  return {
    add(f, zoom) {
      const eff = 4 * zoom;
      const shownEff = mode === 'steps' ? Math.max(4, Math.round(eff)) : eff;
      const c = Math.floor(shownEff + 1e-9);
      const atLevel = Math.abs(shownEff - Math.round(shownEff)) < 1e-6;
      const x = collect(f.x);
      const y = collect(f.y);
      m.invalidPixels += f.invalid;
      m.conflicts += f.conflicts;
      const sizes = new Set([...x.size.values(), ...y.size.values()]);
      for (const s of sizes) m.sizes[s] = (m.sizes[s] || 0) + 1;
      if (atLevel) {
        m.framesAtLevel++;
        if (sizes.size === 1) m.framesUniformAtLevel++;
      } else if ([...sizes].some((s) => s !== c && s !== c + 1)) m.framesTooManySizes++;
      const cellX = measuredCell(x);
      if (cellX !== null) m.scaleErrorMax = Math.max(m.scaleErrorMax, Math.abs(cellX - eff));
      if (prev) {
        const dz = zoom - prev.zoom;
        if (prev.cellX !== null && cellX !== null) m.scaleJumpMax = Math.max(m.scaleJumpMax, Math.abs(cellX - prev.cellX - 4 * dz));
        for (const [axis, before] of [[x, prev.x], [y, prev.y]]) {
          const shifts = new Map();
          for (const [key, s] of axis.size) {
            if (!before.size.has(key)) continue;
            const old = before.size.get(key);
            if (dz === 0) {
              m.comparedAtConstantZoom++;
              if (s !== old) m.crawl++;
              const layer = Math.floor(key / 4096);
              const d = axis.start.get(key) - before.start.get(key);
              const range = shifts.get(layer) || [d, d];
              shifts.set(layer, [Math.min(range[0], d), Math.max(range[1], d)]);
            } else if ((dz > 0 && s < old) || (dz < 0 && s > old)) m.nonMonotonic++;
          }
          for (const [lo, hi] of shifts.values()) m.rigidSpreadMax = Math.max(m.rigidSpreadMax, hi - lo);
        }
      }
      prev = { zoom, x, y, cellX };
    },
    finish() {
      m.scaleErrorMax = Number(m.scaleErrorMax.toFixed(3));
      m.scaleJumpMax = Number(m.scaleJumpMax.toFixed(3));
      return m;
    }
  };
}

async function runMode(mode, engine) {
  const out = {};
  for (const scenario of SCENARIOS) {
    const config = labConfig(scenario, mode);
    const zoomTrack = engine.createTrack(config.timeline.scenes[0].camera.zoom, 1);
    const studio = await openStudio(config);
    const metrics = createMetrics(mode.id);
    const started = Date.now();
    try {
      for (let frame = 0; frame < scenario.frames; frame++) {
        const stats = await studio.evaluate(async (i) => {
          window.studio.drawFrame(i);
          const lab = await import('/tests/fixtures/zoom/analyze.js');
          return lab.analyze(document.getElementById('screen'));
        }, frame);
        metrics.add(stats, zoomTrack(frame));
      }
    } finally {
      await studio.close();
    }
    out[scenario.id] = { ...metrics.finish(), ms: Date.now() - started };
  }
  return out;
}

// Ringkasan satu mode dari semua skenario.
function summarize(perScenario) {
  const all = Object.entries(perScenario);
  const sum = (k) => all.reduce((s, [, m]) => s + m[k], 0);
  const max = (k) => Math.max(...all.map(([, m]) => m[k]));
  const pans = all.filter(([id]) => id.startsWith('pan-'));
  const fracPans = pans.filter(([id]) => !['pan-h-125', 'pan-d-175'].includes(id));
  return {
    invalidPixels: sum('invalidPixels'),
    conflicts: sum('conflicts'),
    uniformAtLevel: `${sum('framesUniformAtLevel')}/${sum('framesAtLevel')}`,
    uniformAtLevelOk: sum('framesUniformAtLevel') === sum('framesAtLevel'),
    framesTooManySizes: sum('framesTooManySizes'),
    crawlFractionalPans: fracPans.reduce((s, [, m]) => s + m.crawl, 0),
    crawlRatePct: Number((100 * fracPans.reduce((s, [, m]) => s + m.crawl, 0) / Math.max(1, fracPans.reduce((s, [, m]) => s + m.comparedAtConstantZoom, 0))).toFixed(2)),
    crawlIntegerPans: pans.filter(([id]) => ['pan-h-125', 'pan-d-175'].includes(id)).reduce((s, [, m]) => s + m.crawl, 0),
    rigidSpreadMax: Math.max(...pans.map(([, m]) => m.rigidSpreadMax)),
    nonMonotonic: sum('nonMonotonic'),
    scaleErrorMax: max('scaleErrorMax'),
    scaleJumpMax: max('scaleJumpMax')
  };
}

// Penerapan pada Project A (adegan kustom film kereta): varian di memori dengan upscale "browser" dan lensa zoom
// pecahan di adegan 1. Konfigurasi resmi Project A tidak diubah.
// - frame dengan zoom 1 harus identik dengan baseline resmi Project A (setelah diperkecil 4x nearest)
// - zoom pecahan dengan mode anchored tidak boleh merayap, mode nearest sebagai pembanding
async function projectAChecks() {
  const baseline = loadBaseline('night-to-dawn').data;
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-zoom-a-'));
  const out = {};
  try {
    for (const zoomMode of ['nearest', 'anchored']) {
      const config = loadProject('night-to-dawn');
      config.rendering = { ...config.rendering, upscale: 'browser', zoomMode };
      config.frameSize = { width: config.outputWidth, height: config.outputHeight };
      const s01 = config.timeline.scenes[0];
      s01.lens = { zoom: [[0, 1], [30, 1], [110, 1.3, 'inOutSine']] };
      const dir = path.join(temp, zoomMode);
      const info = await renderFrames(config, { first: 0, count: 120, framesDir: dir });
      const grid = (await gridChecks(config, info))[0];
      const same = [0, 15, 29].filter((f) => {
        const md5 = md5List(['-i', frameFile(dir, f), '-vf', 'scale=480:270:flags=neighbor', '-pix_fmt', 'rgb24'])[0];
        return md5 === baseline.pixelMd5[f];
      });
      out[zoomMode] = { grid, sameAtZoom1: same.length, jsErrors: info.jsErrors };
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
  return [
    result('zoom:project-a-identity', 'Project A di mode browser zoom 1 identik dengan baseline resmi', out.anchored.sameAtZoom1 === 3 && out.nearest.sameAtZoom1 === 3,
      `frame 0, 15, 29: anchored ${out.anchored.sameAtZoom1}/3, nearest ${out.nearest.sameAtZoom1}/3 identik setelah diperkecil 4x`),
    result('zoom:project-a-no-crawl', 'Project A dengan lensa zoom pecahan tidak merayap (adegan kustom berlapis)', out.anchored.grid.pass && !out.nearest.grid.pass,
      `anchored: ${out.anchored.grid.detail} | pembanding nearest: ${out.nearest.grid.detail}`)
  ];
}

async function main() {
  // untuk mencari masalah: ZOOM_LAB_ONLY=pan-h-110 hanya menjalankan skenario itu (laporan tidak ditulis)
  const only = process.env.ZOOM_LAB_ONLY;
  if (only) SCENARIOS.splice(0, SCENARIOS.length, ...SCENARIOS.filter((sc) => sc.id === only));
  const engine = await import(pathToFileURL(path.join(ROOT, 'src', 'engine', 'tracks.js')).href);
  const results = {};
  for (const mode of MODES) {
    console.log(`Lab zoom: mode ${mode.label} ...`);
    results[mode.id] = { label: mode.label, scenarios: await runMode(mode, engine) };
    results[mode.id].summary = summarize(results[mode.id].scenarios);
  }
  if (only) {
    for (const mode of MODES) console.log(mode.id, JSON.stringify(results[mode.id].scenarios[only]));
    return;
  }

  // syarat untuk mode bawaan
  const a = results.anchored.summary;
  const n = results.nearest.summary;
  const s = results.steps.summary;
  const checks = [
    result('zoom:no-blur', 'Tanpa blur/anti-aliasing (semua mode, semua frame)', MODES.every((m) => results[m.id].summary.invalidPixels === 0),
      MODES.map((m) => `${m.id}: ${results[m.id].summary.invalidPixels} piksel asing`).join(', ')),
    result('zoom:uniform-levels', 'Zoom kelipatan 0,25: semua piksel berukuran sama', a.uniformAtLevelOk, `anchored ${a.uniformAtLevel} frame seragam`),
    result('zoom:two-sizes', 'Zoom pecahan: paling banyak dua ukuran berdampingan', a.framesTooManySizes === 0, `${a.framesTooManySizes} frame melanggar`),
    result('zoom:no-crawl', 'Tidak merayap saat kamera geser di zoom pecahan (horizontal, vertikal, diagonal)', a.crawlFractionalPans === 0,
      `anchored ${a.crawlFractionalPans} perubahan ukuran (${a.crawlRatePct}%), pembanding nearest ${n.crawlFractionalPans} (${n.crawlRatePct}%)`),
    result('zoom:rigid', 'Gerak kaku: semua piksel satu lapisan bergeser sama jauh', a.rigidSpreadMax === 0, `selisih geseran terbesar anchored ${a.rigidSpreadMax} px, nearest ${n.rigidSpreadMax} px`),
    result('zoom:monotonic', 'Saat zoom berubah tidak ada piksel yang bolak-balik ukuran', a.nonMonotonic === 0, `anchored ${a.nonMonotonic}, nearest ${n.nonMonotonic}`),
    result('zoom:smooth', 'Skala halus: tidak ada lompatan zoom (pop)', a.scaleJumpMax <= 0.05 && a.scaleErrorMax <= 0.05,
      `anchored lompatan ${a.scaleJumpMax} px/piksel art, galat ${a.scaleErrorMax}; steps lompatan ${s.scaleJumpMax}, galat ${s.scaleErrorMax}`),
    result('zoom:consistent', 'Pemetaan terpisah per sumbu konsisten (tiap kolom sama lebar di semua baris)', a.conflicts === 0, `${a.conflicts} konflik`)
  ];
  console.log('Lab zoom: penerapan pada Project A (varian di memori) ...');
  checks.push(...await projectAChecks());
  for (const c of checks) console.log(`${c.pass ? 'LULUS' : 'GAGAL'}  ${c.name}: ${c.detail}`);

  const passed = checks.filter((c) => c.pass).length;
  const allPass = passed === checks.length;
  const testedAt = new Date().toISOString();
  const reports = path.join(ROOT, 'output', 'reports');
  fs.mkdirSync(reports, { recursive: true });
  fs.writeFileSync(path.join(reports, 'zoom-lab.json'), JSON.stringify({ testedAt, allPass, passed, total: checks.length, scenarios: SCENARIOS, results, checks }, null, 2) + '\n');

  const rows = [
    ['Piksel asing (blur/AA)', 'invalidPixels'],
    ['Frame seragam di zoom kelipatan 0,25', 'uniformAtLevel'],
    ['Frame dengan lebih dari 2 ukuran', 'framesTooManySizes'],
    ['Crawl saat geser di zoom pecahan', (x) => `${x.crawlFractionalPans} (${x.crawlRatePct}%)`],
    ['Crawl saat geser di zoom bulat', 'crawlIntegerPans'],
    ['Selisih geseran dalam satu lapisan (px)', 'rigidSpreadMax'],
    ['Piksel bolak-balik saat zoom', 'nonMonotonic'],
    ['Galat skala terbesar (px per piksel art)', 'scaleErrorMax'],
    ['Lompatan skala terbesar antar frame', 'scaleJumpMax']
  ];
  const table = `| Ukuran | ${MODES.map((m) => m.label).join(' | ')} |\n|---|${MODES.map(() => '---').join('|')}|\n` +
    rows.map(([label, key]) => `| ${label} | ${MODES.map((m) => (typeof key === 'function' ? key(results[m.id].summary) : results[m.id].summary[key])).join(' | ')} |`).join('\n');
  const scenarioRows = SCENARIOS.map((sc) => `| ${sc.name} | ${sc.frames} | ${MODES.map((m) => {
    const r = results[m.id].scenarios[sc.id];
    return `crawl ${r.crawl}, kaku ${r.rigidSpreadMax}, bolak-balik ${r.nonMonotonic}, lompatan ${r.scaleJumpMax}`;
  }).join(' | ')} |`).join('\n');
  const checkRows = checks.map((c, i) => `| ${i + 1} | ${c.name} | ${c.pass ? 'LULUS' : 'GAGAL'} | ${c.detail} |`).join('\n');
  fs.writeFileSync(path.join(reports, 'zoom-lab.md'), `# Lab Zoom: Perbandingan Pendekatan Grid Piksel

Dibuat otomatis oleh \`npm run test:zoom\` pada ${testedAt}. Setiap mode dirender dengan pola kalibrasi
"identity" (setiap piksel art punya warna unik), lalu ukuran dan posisi piksel art dibaca dari gambar 1920x1080.
Dua lapisan dipakai (latar jauh parallax 0,5 dan pita dekat parallax 1) supaya pengaruh parallax ikut teruji.

## Ringkasan per mode

${table}

## Per skenario

| Skenario | Frame | ${MODES.map((m) => m.label).join(' | ')} |
|---|---|${MODES.map(() => '---').join('|')}|
${scenarioRows}

## Syarat mode bawaan (anchored)

| No | Pemeriksaan | Hasil | Detail |
|----|-------------|-------|--------|
${checkRows}

Status akhir: **${allPass ? 'SEMUA LULUS' : 'ADA YANG GAGAL'}** (${passed}/${checks.length})
`);
  console.log(`\n${allPass ? 'SEMUA LULUS' : 'ADA YANG GAGAL'} (${passed}/${checks.length}). Laporan: output/reports/zoom-lab.md`);
  if (!allPass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`\nLAB ZOOM GAGAL: ${error.message}`);
  process.exit(1);
});
