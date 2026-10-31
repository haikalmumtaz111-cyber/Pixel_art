// Menguji hasil render secara otomatis lalu menulis laporan ke output/reports/ (JSON dan Markdown).
// Pemakaian: node src/render/validate.cjs --project <id>   (lihat daftar proyek: npm run projects)
// Semua pemeriksaan generik: berlaku untuk proyek mana pun tanpa pengetahuan tentang ceritanya.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { loadConfig, FRAME_PATTERN } = require('./config.cjs');
const { describeProjects } = require('./projects.cjs');
const { parseArgs } = require('./cli.cjs');
const M = require('./manifest.cjs');
const { openStudio } = require('./browser.cjs');
const { FFMPEG, FFPROBE, run, encodeVideo } = require('./pipeline.cjs');
const C = require('./checks.cjs');
const B = require('./browser-checks.cjs');

// Pemeriksaan dikelompokkan sesuai daftar kebutuhan pengujian.
const GROUPS = [
  ['Jumlah frame tepat', ['frame-count']],
  ['Durasi video tepat', ['duration']],
  ['Resolusi sesuai target', ['resolution', 'aspect']],
  ['FPS sesuai target', ['fps']],
  ['Interval waktu adegan valid', ['timeline', 'timeline-transitions']],
  ['Tidak ada frame yang hilang', ['png-frames', 'decoded-frames']],
  ['Tidak ada frame kosong', ['blank']],
  ['Frame terakhir valid', ['end-frame']],
  ['Tidak ada error JavaScript', ['js-errors']],
  ['Transisi tanpa artefak', ['no-flash', 'no-hard-cut', 'boundary:', 'portal:', 'boundary']],
  ['Grid piksel kamera stabil (tanpa crawl)', ['grid-stability']],
  ['Aset konsisten antar adegan', ['consistency:']],
  ['Gerak karakter: kaki tidak meluncur, tubuh tidak bergetar', ['motion-feet', 'motion-bob']],
  ['Pose karakter: sendi, panjang lengan dan kaki, sentuhan, duduk, stabil antar-frame', ['motion-joints', 'motion-limbs', 'motion-contact', 'motion-seat', 'motion-stable', 'known:']],
  ['Adegan bisa dirender terpisah', ['scene:']],
  ['Mesin bersama, modul proyek terisolasi', ['engine-modules', 'engine-isolation']],
  ['Video berasal dari render terbaru', ['manifest:']],
  ['Rendering deterministik', ['determinism']],
  ['FFmpeg membaca seluruh video', ['decode', 'codec', 'container', 'pixel-format', 'motion']],
  ['Video dapat diputar', ['playable', 'file']],
  ['Render ulang konsisten', ['reencode']]
];

const groupOf = (id) => GROUPS.findIndex(([, ids]) => ids.some((k) => (k.endsWith(':') ? id.startsWith(k) : id === k)));

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
// Frame 1920x1080 (mode upscale "browser") diperkecil setengah dengan nearest neighbor agar lembarnya tidak raksasa.
function contactSheets(config) {
  const sheets = [];
  const big = config.frameSize.width > 960;
  const shrink = big ? `scale=${config.frameSize.width / 2}:${config.frameSize.height / 2}:flags=neighbor,` : '';
  const make = (name, frames, cols) => {
    const rows = Math.ceil(frames.length / cols);
    const select = frames.map((n) => `eq(n\\,${n})`).join('+');
    const file = path.join(config.paths.reports, `${config.name}-${name}.png`);
    const r = run(FFMPEG, ['-v', 'error', '-y', '-start_number', '0', '-i', path.join(config.paths.frames, FRAME_PATTERN),
      '-vf', `select='${select}',${shrink}tile=${cols}x${rows}`, '-frames:v', '1', '-update', '1', file]);
    if (r.status === 0) sheets.push({ name, frames, file: path.relative(config.paths.root, file) });
  };
  const total = config.totalFrames;
  make('contact-sheet', [0, Math.round(total * 0.22), Math.round(total * 0.45), Math.round(total * 0.6), Math.round(total * 0.82), total - 1].filter((v, i, a) => a.indexOf(v) === i), 3);
  // lembar per adegan memakai frame di luar transisi, supaya isinya adegan itu saja
  const inTransition = (f) => config.timeline.transitions.some((t) => f >= t.startFrame && f <= t.lastFrame);
  for (const s of config.timeline.scenes) {
    if (config.timeline.scenes.length < 2) break;
    const own = [...Array(s.durationFrames).keys()].map((k) => s.startFrame + k).filter((f) => !inTransition(f));
    const pool = own.length >= 4 ? own : [...Array(s.durationFrames).keys()].map((k) => s.startFrame + k);
    const step = (pool.length - 1) / 3;
    make(`scene-${s.id}`, [0, 1, 2, 3].map((k) => pool[Math.round(k * step)]), 4);
  }
  for (const t of config.timeline.transitions) {
    const step = (t.lastFrame - t.startFrame) / 7;
    make(`transition-${t.from}-to-${t.to}`, [...Array(8)].map((_, k) => t.startFrame + Math.round(k * step)), 4);
  }
  return sheets;
}

function versionLine(cmd) {
  const r = spawnSync(cmd, ['-version'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.split('\n')[0] : 'tidak tersedia';
}

// Ringkasan status (T19): selain LULUS dan GAGAL ada KNOWN ISSUE dan TIDAK DIPERIKSA, yang tidak dihitung LULUS.
function tally(checks) {
  const count = (s) => checks.filter((c) => C.statusOf(c) === s).length;
  const t = { passed: count('pass'), failed: count('fail'), known: count('known'), skipped: count('skip'), total: checks.length };
  t.proposed = checks.filter((c) => C.statusOf(c) === 'known' && c.approval === 'usulan').length;
  t.allPass = t.passed === t.total;
  t.noFailure = t.failed === 0;
  t.verdict = t.allPass ? 'SEMUA LULUS' : t.noFailure ? 'TIDAK ADA YANG GAGAL' : 'ADA YANG GAGAL';
  t.line = t.allPass ? `${t.passed}/${t.total} pemeriksaan`
    : `${t.failed ? `${t.failed} gagal, ` : ''}${t.passed} lulus${t.known ? `, ${C.knownText(t.known, t.proposed)}` : ''}${t.skipped ? `, ${t.skipped} tidak diperiksa` : ''}, dari ${t.total} pemeriksaan`;
  return t;
}

function groupStatus(items) {
  const st = items.map(C.statusOf);
  if (!st.length) return 'TIDAK DIUJI';
  if (st.includes('fail')) return 'GAGAL';
  if (st.every((s) => s === 'skip')) return 'TIDAK DIPERIKSA';
  if (st.includes('known')) return 'KNOWN ISSUE';
  if (st.includes('skip')) return 'LULUS, sebagian tidak diperiksa';
  return 'LULUS';
}

function writeReports(config, checks, sheets, extra) {
  const t = tally(checks);
  const { passed, allPass } = t;
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
    return { title, pass: items.length > 0 && items.every((c) => c.pass), status: groupStatus(items), items };
  });
  const { segments, ...renderSummary } = extra.renderInfo || {};
  const engine = { name: config.engine.name, version: config.engine.engineVersion, engineHash: M.engineHash(), libraryHash: M.libraryHash(), modules: extra.modules || [] };
  fs.writeFileSync(path.join(config.paths.reports, `${config.name}-validation.json`),
    JSON.stringify({ testedAt, project: config.id, config: config.configFile, includes: config.includes, allPass, noFailure: t.noFailure, passed, failed: t.failed, known: t.known, proposed: t.proposed, skipped: t.skipped, total: checks.length, groups: groups.map((g) => ({ title: g.title, pass: g.pass, status: g.status })), checks: checks.map((c) => ({ ...c, status: C.statusOf(c) })), sheets, engine, environment, render: renderSummary, lumaSummary: extra.lumaSummary }, null, 2) + '\n');

  const rows = checks.map((c, i) => `| ${i + 1} | ${c.name} | ${C.STATUS_LABEL[C.statusOf(c)]} | ${c.detail.replace(/\|/g, '/')} |`).join('\n');
  const groupRows = groups.map((g, i) => `| ${i + 1} | ${g.title} | ${g.status} |`).join('\n');
  const sceneRows = config.timeline.scenes.map((s) => `| ${s.id} | ${s.name} | [${s.startFrame}, ${s.endFrame}) = ${s.startFrame}-${s.endFrame - 1} | ${s.durationFrames} | ${(s.durationFrames / config.fps).toFixed(2)} detik |`).join('\n');
  const transitionRows = config.timeline.transitions.map((t) => `| ${t.id} | ${t.type} | ${t.startFrame}-${t.lastFrame} | ${t.durationFrames} |`).join('\n') || '| - | - | - | - |';
  const sheetList = sheets.map((s) => `- \`${s.file}\` (frame ${s.frames.join(', ')})`).join('\n');
  const md = `# Laporan Pengujian: ${config.title}

Laporan ini dibuat otomatis oleh \`npm run validate\`.

- Waktu uji: ${testedAt}
- Proyek: \`${config.id}\`
- Konfigurasi: \`${config.configFile}\`${config.includes.length ? ` (+ ${config.includes.length} file $include)` : ''}
- Mesin: ${engine.name} ${engine.version}, sidik jari mesin \`${engine.engineHash.slice(0, 16)}\`, pustaka aset \`${engine.libraryHash.slice(0, 16)}\`
- Video: \`${config.output.video}\`
- Spesifikasi: ${config.width}x${config.height} internal, ${config.outputWidth}x${config.outputHeight} output (upscale ${config.rendering.upscale}), ${config.fps} FPS, ${config.durationSeconds} detik, ${config.totalFrames} frame, seed ${config.seed}
${renderSummary.renderSeconds ? `- Lama render frame: ${renderSummary.renderSeconds.toFixed(1)} detik, lama encoding: ${renderSummary.encodeSeconds.toFixed(1)} detik\n` : ''}
## Ringkasan kebutuhan

| No | Kebutuhan | Hasil |
|----|-----------|-------|
${groupRows}

Status akhir: **${t.verdict}** (${t.line})${t.known || t.skipped ? '\n\nKNOWN ISSUE = masalah yang sudah tercatat di `docs/BACKLOG.md` dan tidak memburuk, hanya di proyek, pemeran, dan frame yang tercatat (`src/render/known-issues.cjs`). KNOWN ISSUE "usulan" belum disetujui pemilik. TIDAK DIPERIKSA = tidak ada yang bisa diperiksa di proyek ini. Keduanya bukan LULUS.' : ''}

## Timeline

| Adegan | Nama | Frame [awal, akhir) | Jumlah frame | Durasi |
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

## Modul yang dimuat

${engine.modules.map((m) => `- \`${m}\``).join('\n') || '-'}

## Lingkungan

- Sistem operasi: ${environment.os}
- Node.js: ${environment.node}
- Chromium: ${environment.chromium}
- ${environment.ffmpeg}
- ${environment.ffprobe}
${renderSummary.ffmpegCommand ? `\n## Perintah encoding\n\n\`\`\`\n${renderSummary.ffmpegCommand}\n\`\`\`\n` : ''}`;
  fs.writeFileSync(path.join(config.paths.reports, `${config.name}-validation.md`), md);
  return t;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.project) {
    console.log(`Pilih proyek dengan --project <id>.\nProyek yang tersedia:\n${describeProjects()}`);
    process.exitCode = 1;
    return;
  }
  const config = loadConfig(args.project, { strict: false });
  const limits = config.validationLimits;
  fs.mkdirSync(config.paths.reports, { recursive: true });
  const renderInfo = M.readManifest(M.manifestFile(config));
  const checks = [];
  const add = (list) => list.forEach((c) => {
    checks.push(c);
    console.log(`${C.STATUS_LABEL[C.statusOf(c)]}  ${c.name}: ${c.detail}`);
  });
  console.log(`Validasi proyek "${config.title}" (${config.id})\n`);

  add(C.timelineChecks(config));
  add(C.manifestChecks(config, renderInfo));
  const expect = { width: config.outputWidth, height: config.outputHeight, fps: config.fps, frames: config.totalFrames, pixelFormat: config.encoding.pixelFormat };
  add(C.videoChecks(config.paths.video, expect));
  let lumaSummary = null;
  if (fs.existsSync(config.paths.video)) {
    add(C.decodeChecks(config.paths.video));
    const stats = C.lumaStats(config.paths.video);
    add(C.frameChecks(stats, C.frameHashes(config.paths.video), config.totalFrames, limits));
    add(C.transitionLumaChecks(stats, config.timeline.transitions, 0, limits));
    lumaSummary = stats.map((s) => [Number(s.yavg.toFixed(1)), Number(s.ydif.toFixed(1))]);
  }
  add(await C.gridChecks(config, renderInfo));
  const png = C.pngChecks(config.paths.frames, config.totalFrames, config.frameSize.width, config.frameSize.height);
  add(png.checks);

  let chromium = null;
  let modules = [];
  if (config.timelineIssues.length === 0) {
    const studio = await openStudio(config);
    chromium = studio.browserVersion;
    modules = studio.loadedModules;
    try {
      add(await B.moduleChecks(studio, config));
      add(await B.transitionBoundaryChecks(studio, config, renderInfo));
      add(await B.sceneIsolationChecks(studio, config));
      add(await B.consistencyChecks(studio, config));
      add(await B.motionChecks(studio, config));
      add(await B.poseChecks(studio, config));
      if (png.checks[0].pass) {
        console.log('Render ulang seluruh frame dengan urutan terbalik untuk uji determinisme...');
        add(C.withNodeDriftHint(checks, await B.determinismChecks(studio, png.hashes, {})));
      }
      add(B.jsErrorChecks(renderInfo, studio));
    } finally {
      await studio.close();
    }
  }
  if (fs.existsSync(config.paths.video) && png.checks[0].pass) {
    console.log('Encode ulang untuk uji konsistensi MP4...');
    add(C.withNodeDriftHint(checks, reencodeCheck(config)));
  }

  const sheets = fs.existsSync(path.join(config.paths.frames, 'frame_0000.png')) ? contactSheets(config) : [];
  const summary = writeReports(config, checks, sheets, { chromium, renderInfo, lumaSummary, modules });
  console.log(`\n${summary.verdict} (${summary.allPass ? `${summary.passed}/${summary.total}` : summary.line}). Laporan: ${path.relative(config.paths.root, config.paths.reports)}/${config.name}-validation.md`);
  if (sheets.length) console.log(`Lembar kontak: ${sheets.map((x) => x.file).join(', ')}`);
  console.log(`Video: ${config.output.video}`);
  if (!summary.noFailure) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`\nVALIDASI GAGAL: ${error.message}`);
  process.exit(1);
});
