// Membaca dan memeriksa file konfigurasi adegan (folder config/).
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_CONFIG = 'config/train-night-rain.json';

function loadConfig(configArg = DEFAULT_CONFIG) {
  const file = path.resolve(ROOT, configArg);
  if (!fs.existsSync(file)) throw new Error(`File konfigurasi tidak ditemukan: ${file}`);
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));

  for (const key of ['name', 'sceneModule', 'seed', 'width', 'height', 'outputWidth', 'outputHeight', 'fps', 'durationSeconds', 'output', 'encoding']) {
    if (raw[key] === undefined) throw new Error(`Konfigurasi "${key}" belum diisi di ${file}`);
  }
  const totalFrames = raw.fps * raw.durationSeconds;
  if (!Number.isInteger(totalFrames)) throw new Error('fps x durationSeconds harus bilangan bulat.');
  const scale = raw.outputWidth / raw.width;
  if (!Number.isInteger(scale) || raw.outputHeight / raw.height !== scale) {
    throw new Error('Resolusi output harus kelipatan bulat yang sama dari resolusi internal, supaya piksel tetap tajam.');
  }
  if (raw.width * 9 !== raw.height * 16) throw new Error('Resolusi internal harus berformat 16:9.');

  return {
    ...raw,
    totalFrames,
    scale,
    configFile: path.relative(ROOT, file),
    paths: {
      root: ROOT,
      frames: path.resolve(ROOT, raw.output.framesDir),
      video: path.resolve(ROOT, raw.output.video),
      reports: path.resolve(ROOT, raw.output.reportDir)
    }
  };
}

const FRAME_PATTERN = 'frame_%04d.png';
const frameFile = (config, i) => path.join(config.paths.frames, `frame_${String(i).padStart(4, '0')}.png`);

module.exports = { ROOT, loadConfig, frameFile, FRAME_PATTERN };
