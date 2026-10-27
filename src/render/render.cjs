// Render film menjadi frame PNG, lalu gabungkan menjadi MP4 dengan FFmpeg.
// Pemakaian:
//   node src/render/render.cjs config/film-night-to-dawn.json                            (seluruh film)
//   node src/render/render.cjs config/film-night-to-dawn.json --scene s02-inside-train   (satu adegan saja)
const fs = require('fs');
const path = require('path');
const { loadConfig } = require('./config.cjs');
const { renderFrames, encodeVideo } = require('./pipeline.cjs');

function parseArgs(argv) {
  const args = { config: undefined, scene: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--scene') args.scene = argv[++i];
    else if (!args.config) args.config = argv[i];
  }
  return args;
}

// Tentukan frame yang dirender dan lokasi hasilnya (seluruh film atau satu adegan).
function planJob(config, sceneId) {
  if (!sceneId) {
    return { label: 'seluruh film', first: 0, count: config.totalFrames, framesDir: config.paths.frames, video: config.paths.video, reportName: config.name, sceneId: null };
  }
  const scene = config.timeline.scenes.find((s) => s.id === sceneId);
  if (!scene) throw new Error(`Adegan "${sceneId}" tidak ada. Pilihan: ${config.timeline.scenes.map((s) => s.id).join(', ')}`);
  return {
    label: `adegan ${scene.id} saja, tanpa transisi (frame ${scene.startFrame}-${scene.endFrame})`,
    sceneId: scene.id,
    first: scene.startFrame,
    count: scene.durationFrames,
    framesDir: `${config.paths.frames}--${scene.id}`,
    video: path.join(config.paths.root, 'output', 'scenes', `${config.name}--${scene.id}.mp4`),
    reportName: `${config.name}--${scene.id}`
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = loadConfig(args.config);
  const job = planJob(config, args.scene);
  console.log(`Render "${config.title}", ${job.label}: ${job.count} frame, ${config.width}x${config.height} -> ${config.outputWidth}x${config.outputHeight}, ${config.fps} FPS`);

  const start = Date.now();
  const result = await renderFrames(config, {
    first: job.first,
    count: job.count,
    framesDir: job.framesDir,
    sceneId: job.sceneId,
    onProgress: (done, total) => {
      if (done % 30 === 0 || done === total) console.log(`  frame ${done}/${total}`);
    }
  });
  const renderSeconds = (Date.now() - start) / 1000;
  console.log(`Frame selesai dalam ${renderSeconds.toFixed(1)} detik. Menggabungkan jadi MP4...`);

  const encodeStart = Date.now();
  const command = encodeVideo(config, { framesDir: job.framesDir, count: job.count, video: job.video });
  const encodeSeconds = (Date.now() - encodeStart) / 1000;

  fs.mkdirSync(config.paths.reports, { recursive: true });
  const rel = (p) => p.replaceAll(config.paths.root + path.sep, '');
  const info = {
    name: job.reportName,
    renderedAt: new Date().toISOString(),
    firstFrame: job.first,
    totalFrames: job.count,
    renderSeconds,
    encodeSeconds,
    chromiumVersion: result.chromiumVersion,
    jsErrors: result.jsErrors,
    video: rel(job.video),
    ffmpegCommand: rel(command),
    segments: result.segments
  };
  fs.writeFileSync(path.join(config.paths.reports, `${job.reportName}-render.json`), JSON.stringify(info, null, 2) + '\n');

  const size = fs.statSync(job.video).size;
  console.log(`Video jadi: ${rel(job.video)} (${(size / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((error) => {
  console.error(`\nRENDER GAGAL: ${error.message}`);
  process.exit(1);
});
