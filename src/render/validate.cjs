// Menguji hasil render secara otomatis lalu menulis laporan ke output/reports/ (JSON dan Markdown).
// Pemakaian: node src/render/validate.cjs config/film-night-to-dawn.json
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { loadConfig, FRAME_PATTERN } = require('./config.cjs');
const { openStudio } = require('./browser.cjs');
const { FFMPEG, FFPROBE, run, encodeVideo } = require('./pipeline.cjs');
const C = require('./checks.cjs');
const B = require('./browser-checks.cjs');

// Pemeriksaan dikelompokkan sesuai daftar kebutuhan pengujian Tahap 2.
const GROUPS = [
  ['Jumlah frame tepat', ['frame-count']],
  ['Durasi video tepat', ['duration']],
  ['Resolusi sesuai target', ['resolution', 'aspect']],
  ['FPS sesuai target', ['fps']],
  ['Interval waktu adegan valid', ['timeline', 'timeline-transitions']],
  ['Tidak ada frame yang hilang', ['png-frames', 'decoded-frames']],
  ['Tidak ada frame kosong', ['blank']],
  ['Tidak ada error JavaScript', ['js-errors']],
  ['Transisi tanpa artefak', ['no-flash', 'no-hard-cut', 'boundary:', 'portal:', 'boundary']],
  ['Aset kereta konsisten', ['train-asset', 'train-colors']],
  ['Rendering deterministik', ['determinism']],
  ['FFmpeg membaca seluruh video', ['decode', 'codec', 'container', 'pixel-format', 'motion']],
  ['Video dapat diputar', ['playable', 'file']],
  ['Render ulang konsisten', ['reencode']]
];

const groupOf = (id) => GROUPS.findIndex(([, ids]) => ids.some((k) => (k.endsWith(':') ? id.startsWith(k) : id === k)));

function sampleFrames(config) {
  const custom = config.validation?.trainVisibleFrames;
  if (custom) return custom;
  const first = config.timeline.scenes[0];
  return [Math.floor((first.startFrame + first.endFrame) / 2)];
}

// Encode ulang frame PNG ke file sementara dan bandingkan dengan MP4 yang ada.
function reencodeCheck(config) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-reencode-'));
  const video = path.join(temp, 'ulang.mp4');
  try {
    encodeVideo(config, { framesDir: config.paths.frames, count: config.totalFrames, video });
    const a = C.sha256(fs.readFileSync(video));
    const b = C.sha256(fs.readFileSync(config.paths.video));
    return [C.result('reencode', 'Encode ulang menghasilkan MP4 identik', a === b, a === b ? `SHA-256 sama: ${a.slice(0, 16)}...` : `SHA-256 berbeda (${a.slice(0, 12)} vs ${b.slice(0, 12)})`)];
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

// Lembar kontak dari frame PNG asli (tajam, tanpa kompresi): ringkasan, per adegan, dan per transisi.
function contactSheets(config) {
  const sheets = [];
  const make = (name, frames, cols) => {
    const rows = Math.ceil(frames.length / cols);
    const select = frames.map((n) => `eq(n\\,${n})`).join('+');
    const file = path.join(config.paths.reports, `${config.name}-${name}.png`);
    const r = run(FFMPEG, ['-v', 'error', '-y', '-start_number', '0', '-i', path.join(config.paths.frames, FRAME_PATTERN),
      '-vf', `select='${select}',tile=${cols}x${rows}`, '-frames:v', '1', '-update', '1', file]);
    if (r.status === 0) sheets.push({ name, frames, file: path.relative(config.paths.root, file) });
  };
  const total = config.totalFrames;
  make('contact-sheet', [0, Math.round(total * 0.22), Math.round(total * 0.45), Math.round(total * 0.6), Math.round(total * 0.82), total - 1].filter((v, i, a) => a.indexOf(v) === i), 3);
  for (const s of config.timeline.scenes) {
    if (config.timeline.scenes.length < 2) break;
    const step = (s.durationFrames - 1) / 3;
    make(`scene-${s.id}`, [0, 1, 2, 3].map((k) => s.startFrame + Math.round(k * step)), 4);
  }
  for (const t of config.timeline.transitions) {
    const step = (t.endFrame - t.startFrame) / 7;
    make(`transition-${t.from}-to-${t.to}`, [...Array(8)].map((_, k) => t.startFrame + Math.round(k * step)), 4);
  }
  return sheets;
}

function versionLine(cmd) {
  const r = spawnSync(cmd, ['-version'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.split('\n')[0] : 'tidak tersedia';
}

function writeReports(config, checks, sheets, extra) {
  const passed = checks.filter((c) => c.pass).length;
  const allPass = passed === checks.length;
  const testedAt = new Date().toISOString();
  const environment = {
    os: `${os.type()} ${os.release()} (${os.platform()}/${os.arch()})`,
    node: process.version,
    chromium: extra.chromium || '-',
    ffmpeg: versionLine(FFMPEG),
    ffprobe: versionLine(FFPROBE)
  };
  const groups = GROUPS.map(([title], g) => {
    const items = checks.filter((c) => groupOf(c.id) === g);
    return { title, pass: items.length > 0 && items.every((c) => c.pass), items };
  });
  const { segments, ...renderSummary } = extra.renderInfo || {};
  fs.writeFileSync(path.join(config.paths.reports, `${config.name}-validation.json`),
    JSON.stringify({ testedAt, config: config.configFile, allPass, passed, total: checks.length, groups: groups.map((g) => ({ title: g.title, pass: g.pass })), checks, sheets, environment, render: renderSummary, lumaSummary: extra.lumaSummary }, null, 2) + '\n');

  const rows = checks.map((c, i) => `| ${i + 1} | ${c.name} | ${c.pass ? 'LULUS' : 'GAGAL'} | ${c.detail.replace(/\|/g, '/')} |`).join('\n');
  const groupRows = groups.map((g, i) => `| ${i + 1} | ${g.title} | ${g.items.length ? (g.pass ? 'LULUS' : 'GAGAL') : 'TIDAK DIUJI'} |`).join('\n');
  const sceneRows = config.timeline.scenes.map((s) => `| ${s.id} | ${s.name} | ${s.startFrame}-${s.endFrame} | ${s.durationFrames} | ${(s.durationFrames / config.fps).toFixed(2)} detik |`).join('\n');
  const transitionRows = config.timeline.transitions.map((t) => `| ${t.id} | ${t.type} | ${t.startFrame}-${t.endFrame} | ${t.endFrame - t.startFrame + 1} |`).join('\n') || '| - | - | - | - |';
  const sheetList = sheets.map((s) => `- \`${s.file}\` (frame ${s.frames.join(', ')})`).join('\n');
  const md = `# Laporan Pengujian: ${config.title}

Laporan ini dibuat otomatis oleh \`npm run validate\`.

- Waktu uji: ${testedAt}
- Konfigurasi: \`${config.configFile}\`
- Video: \`${config.output.video}\`
- Spesifikasi: ${config.width}x${config.height} internal, ${config.outputWidth}x${config.outputHeight} output, ${config.fps} FPS, ${config.durationSeconds} detik, ${config.totalFrames} frame
${renderSummary.renderSeconds ? `- Lama render frame: ${renderSummary.renderSeconds.toFixed(1)} detik, lama encoding: ${renderSummary.encodeSeconds.toFixed(1)} detik\n` : ''}
## Ringkasan kebutuhan

| No | Kebutuhan | Hasil |
|----|-----------|-------|
${groupRows}

Status akhir: **${allPass ? 'SEMUA LULUS' : 'ADA YANG GAGAL'}** (${passed}/${checks.length} pemeriksaan)

## Timeline

| Adegan | Nama | Frame | Jumlah frame | Durasi |
|--------|------|-------|--------------|--------|
${sceneRows}

| Transisi | Jenis | Frame | Jumlah frame |
|----------|-------|-------|--------------|
${transitionRows}

## Detail pemeriksaan

| No | Pemeriksaan | Hasil | Detail |
|----|-------------|-------|--------|
${rows}

## Lembar kontak (preview)

${sheetList || '-'}

## Lingkungan

- Sistem operasi: ${environment.os}
- Node.js: ${environment.node}
- Chromium: ${environment.chromium}
- ${environment.ffmpeg}
- ${environment.ffprobe}
${renderSummary.ffmpegCommand ? `\n## Perintah encoding\n\n\`\`\`\n${renderSummary.ffmpegCommand}\n\`\`\`\n` : ''}`;
  fs.writeFileSync(path.join(config.paths.reports, `${config.name}-validation.md`), md);
  return { allPass, passed, total: checks.length };
}

async function main() {
  const config = loadConfig(process.argv[2], { strict: false });
  fs.mkdirSync(config.paths.reports, { recursive: true });
  const renderFile = path.join(config.paths.reports, `${config.name}-render.json`);
  const renderInfo = fs.existsSync(renderFile) ? JSON.parse(fs.readFileSync(renderFile, 'utf8')) : null;
  const checks = [];
  const add = (list) => list.forEach((c) => {
    checks.push(c);
    console.log(`${c.pass ? 'LULUS' : 'GAGAL'}  ${c.name}: ${c.detail}`);
  });

  add(C.timelineChecks(config));
  const expect = { width: config.outputWidth, height: config.outputHeight, fps: config.fps, frames: config.totalFrames, pixelFormat: config.encoding.pixelFormat };
  add(C.videoChecks(config.paths.video, expect));
  let lumaSummary = null;
  if (fs.existsSync(config.paths.video)) {
    add(C.decodeChecks(config.paths.video));
    const stats = C.lumaStats(config.paths.video);
    add(C.frameChecks(stats, C.frameHashes(config.paths.video), config.totalFrames));
    add(C.transitionLumaChecks(stats, config.timeline.transitions));
    lumaSummary = stats.map((s) => [Number(s.yavg.toFixed(1)), Number(s.ydif.toFixed(1))]);
  }
  const png = C.pngChecks(config.paths.frames, config.totalFrames, config.width, config.height);
  add(png.checks);

  let chromium = null;
  if (config.timelineIssues.length === 0) {
    const studio = await openStudio(config);
    chromium = studio.browserVersion;
    try {
      add(await B.transitionBoundaryChecks(studio, config, renderInfo));
      // konfigurasi satu adegan dari Tahap 1 membuat kereta langsung di adegan, tanpa daftar aset bersama
      if (Object.values(config.assets || {}).some((a) => a.type === 'steam-train')) {
        add(await B.trainConsistencyChecks(studio, config, sampleFrames(config)));
      }
      console.log('Render ulang seluruh frame dengan urutan terbalik untuk uji determinisme...');
      add(await B.determinismChecks(studio, png.hashes, {}));
      add(B.jsErrorChecks(renderInfo, studio));
    } finally {
      await studio.close();
    }
  }
  if (fs.existsSync(config.paths.video) && png.checks[0].pass) {
    console.log('Encode ulang untuk uji konsistensi MP4...');
    add(reencodeCheck(config));
  }

  const sheets = fs.existsSync(path.join(config.paths.frames, 'frame_0000.png')) ? contactSheets(config) : [];
  const summary = writeReports(config, checks, sheets, { chromium, renderInfo, lumaSummary });
  console.log(`\n${summary.allPass ? 'SEMUA LULUS' : 'ADA YANG GAGAL'} (${summary.passed}/${summary.total}). Laporan: ${path.relative(config.paths.root, config.paths.reports)}/${config.name}-validation.md`);
  if (!summary.allPass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`\nVALIDASI GAGAL: ${error.message}`);
  process.exit(1);
});
