// Langkah-langkah render yang dipakai bersama oleh render.cjs, validate.cjs, dan negative-tests.cjs.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { frameFile, FRAME_PATTERN } = require('./config.cjs');
const { openStudio } = require('./browser.cjs');

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe';

function run(cmd, args) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (result.error) throw new Error(`${cmd} tidak bisa dijalankan: ${result.error.message}`);
  return result;
}

// Render frame [first, first + count) ke folder PNG bernomor 0000, 0001, ...
// sceneId (opsional) = render satu adegan saja, tanpa transisi dengan adegan lain.
async function renderFrames(config, { first = 0, count = config.totalFrames, framesDir, onProgress, sceneId = null }) {
  fs.mkdirSync(framesDir, { recursive: true });
  const studio = await openStudio(config);
  const segments = [];
  try {
    for (let i = 0; i < count; i++) {
      const { png, info } = await studio.renderFrame(first + i, sceneId);
      fs.writeFileSync(frameFile(framesDir, i), png);
      segments.push({ frame: first + i, ...info });
      if (onProgress) onProgress(i + 1, count);
    }
    return { chromiumVersion: studio.browserVersion, jsErrors: studio.errors.length, segments };
  } finally {
    await studio.close();
  }
}

// Perbesar dengan nearest neighbor (piksel tetap kotak tajam), lalu encode H.264.
// overrides dipakai pengujian negatif untuk sengaja membuat video yang salah.
function ffmpegArgs(config, { framesDir, count, video, overrides = {} }) {
  const fps = overrides.fps ?? config.fps;
  const width = overrides.width ?? config.outputWidth;
  const height = overrides.height ?? config.outputHeight;
  const pixelFormat = overrides.pixelFormat ?? config.encoding.pixelFormat;
  const preset = overrides.preset ?? config.encoding.preset;
  const profile = 'profile' in overrides ? overrides.profile : config.encoding.profile;
  const level = 'level' in overrides ? overrides.level : config.encoding.level;
  return [
    '-y', '-v', 'error',
    '-framerate', String(fps),
    '-start_number', '0',
    '-i', path.join(framesDir, FRAME_PATTERN),
    '-frames:v', String(count),
    '-vf', `scale=${width}:${height}:flags=neighbor:out_color_matrix=bt709:out_range=tv,format=${pixelFormat}`,
    '-c:v', config.encoding.codec,
    '-preset', preset,
    '-crf', String(config.encoding.crf),
    '-tune', 'animation',
    // profil dan level H.264 menentukan perangkat mana yang sanggup memutar video
    ...(profile ? ['-profile:v', profile] : []),
    ...(level ? ['-level:v', level] : []),
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-r', String(fps),
    '-movflags', '+faststart',
    video
  ];
}

function encodeVideo(config, job) {
  fs.mkdirSync(path.dirname(job.video), { recursive: true });
  const args = ffmpegArgs(config, job);
  const result = run(FFMPEG, args);
  if (result.status !== 0) throw new Error(`FFmpeg gagal:\n${result.stderr}`);
  return [FFMPEG, ...args].join(' ');
}

module.exports = { FFMPEG, FFPROBE, run, renderFrames, encodeVideo };
