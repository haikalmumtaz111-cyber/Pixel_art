// Menampilkan semua proyek, adegannya, dan lokasi hasil render.
// Pemakaian: npm run projects
const fs = require('fs');
const path = require('path');
const { listProjects, loadProject, ROOT } = require('./projects.cjs');
const { readManifest, manifestFile } = require('./manifest.cjs');

const rel = (p) => path.relative(ROOT, p);

for (const p of listProjects()) {
  let config;
  try {
    config = loadProject(p.id);
  } catch (error) {
    console.log(`\n${p.id}: KONFIGURASI TIDAK VALID\n${error.message}`);
    process.exitCode = 1;
    continue;
  }
  console.log(`\n${config.id}  -  ${config.title}`);
  console.log(`  file       : ${config.configFile}${config.includes.length ? ` (+${config.includes.length} file $include)` : ''}`);
  console.log(`  durasi     : ${config.durationSeconds} detik, ${config.fps} FPS, ${config.totalFrames} frame, ${config.width}x${config.height} -> ${config.outputWidth}x${config.outputHeight}`);
  for (const s of config.timeline.scenes) console.log(`  adegan     : ${s.id.padEnd(24)} frame ${s.startFrame}-${s.endFrame - 1} (${s.module})`);
  for (const t of config.timeline.transitions) console.log(`  transisi   : ${t.type.padEnd(24)} frame ${t.startFrame}-${t.lastFrame}`);
  const video = config.paths.video;
  const manifest = readManifest(manifestFile(config));
  console.log(`  video      : ${rel(video)} ${fs.existsSync(video) ? `(${(fs.statSync(video).size / 1024 / 1024).toFixed(2)} MB)` : '(belum dirender)'}`);
  console.log(`  render     : ${manifest ? `${manifest.status}${manifest.finishedAt ? `, ${manifest.finishedAt}` : ''}` : 'belum pernah'}`);
  console.log(`  laporan    : ${rel(path.join(config.paths.reports, `${config.name}-validation.md`))}`);
  console.log(`  perintah   : npm run render -- --project ${config.id}   |   npm run validate -- --project ${config.id}`);
}
