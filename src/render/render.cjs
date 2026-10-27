// Render adegan menjadi frame PNG, lalu gabungkan menjadi MP4 dengan FFmpeg.
// Pemakaian: node src/render/render.cjs config/train-night-rain.json
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { loadConfig, frameFile, FRAME_PATTERN } = require('./config.cjs');
const { openStudio } = require('./browser.cjs');

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';

async function renderFrames(config) {
  fs.mkdirSync(config.paths.frames, { recursive: true });
  const studio = await openStudio(config);
  try {
    for (let i = 0; i < config.totalFrames; i++) {
      fs.writeFileSync(frameFile(config, i), await studio.renderFrame(i));
      if ((i + 1) % 15 === 0 || i + 1 === config.totalFrames) console.log(`  frame ${i + 1}/${config.totalFrames}`);
    }
    return studio.browserVersion;
  } finally {
    await studio.close();
  }
}

// Perbesar dengan nearest neighbor (piksel tetap kotak tajam), lalu encode H.264.
function ffmpegArgs(config) {
  const { outputWidth, outputHeight, fps, totalFrames, encoding } = config;
  return [
    '-y', '-v', 'error',
    '-framerate', String(fps),
    '-start_number', '0',
    '-i', path.join(config.paths.frames, FRAME_PATTERN),
    '-frames:v', String(totalFrames),
    '-vf', `scale=${outputWidth}:${outputHeight}:flags=neighbor:out_color_matrix=bt709:out_range=tv,format=${encoding.pixelFormat}`,
    '-c:v', encoding.codec,
    '-preset', encoding.preset,
    '-crf', String(encoding.crf),
    '-tune', 'animation',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-r', String(fps),
    '-movflags', '+faststart',
    config.paths.video
  ];
}

function encodeVideo(config) {
  fs.mkdirSync(path.dirname(config.paths.video), { recursive: true });
  const args = ffmpegArgs(config);
  const result = spawnSync(FFMPEG, args, { encoding: 'utf8' });
  if (result.error) throw new Error(`FFmpeg tidak bisa dijalankan: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`FFmpeg gagal:\n${result.stderr}`);
  return [FFMPEG, ...args].join(' ');
}

async function main() {
  const config = loadConfig(process.argv[2]);
  console.log(`Render "${config.title}" (${config.width}x${config.height} -> ${config.outputWidth}x${config.outputHeight}, ${config.fps} FPS, ${config.totalFrames} frame)`);

  const start = Date.now();
  const chromiumVersion = await renderFrames(config);
  const renderSeconds = (Date.now() - start) / 1000;
  console.log(`Frame selesai dalam ${renderSeconds.toFixed(1)} detik. Menggabungkan jadi MP4...`);

  const encodeStart = Date.now();
  const command = encodeVideo(config);
  const encodeSeconds = (Date.now() - encodeStart) / 1000;

  fs.mkdirSync(config.paths.reports, { recursive: true });
  const info = {
    name: config.name,
    renderedAt: new Date().toISOString(),
    totalFrames: config.totalFrames,
    renderSeconds,
    encodeSeconds,
    chromiumVersion,
    ffmpegCommand: command.replaceAll(config.paths.root + path.sep, '')
  };
  fs.writeFileSync(path.join(config.paths.reports, `${config.name}-render.json`), JSON.stringify(info, null, 2) + '\n');

  const size = fs.statSync(config.paths.video).size;
  console.log(`Video jadi: ${path.relative(config.paths.root, config.paths.video)} (${(size / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((error) => {
  console.error(`\nRENDER GAGAL: ${error.message}`);
  process.exit(1);
});
