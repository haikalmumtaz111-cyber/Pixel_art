// Membaca dan memeriksa file konfigurasi film (folder config/).
const fs = require('fs');
const path = require('path');
const { normalizeTimeline } = require('./timeline.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_CONFIG = 'config/film-night-to-dawn.json';

function readConfig(configArg = DEFAULT_CONFIG) {
  const file = path.resolve(ROOT, configArg);
  if (!fs.existsSync(file)) throw new Error(`File konfigurasi tidak ditemukan: ${file}`);
  return { file, raw: JSON.parse(fs.readFileSync(file, 'utf8')) };
}

// Mengubah isi JSON menjadi konfigurasi lengkap. Bila strict, timeline yang tidak valid langsung ditolak.
function buildConfig(raw, file, { strict = true } = {}) {
  for (const key of ['name', 'seed', 'width', 'height', 'outputWidth', 'outputHeight', 'fps', 'durationSeconds', 'output', 'encoding']) {
    if (raw[key] === undefined) throw new Error(`Konfigurasi "${key}" belum diisi di ${file}`);
  }
  const totalFrames = raw.fps * raw.durationSeconds;
  if (!Number.isInteger(totalFrames)) throw new Error('fps x durationSeconds harus bilangan bulat.');
  const scale = raw.outputWidth / raw.width;
  if (!Number.isInteger(scale) || raw.outputHeight / raw.height !== scale) {
    throw new Error('Resolusi output harus kelipatan bulat yang sama dari resolusi internal, supaya piksel tetap tajam.');
  }
  if (raw.width * 9 !== raw.height * 16) throw new Error('Resolusi internal harus berformat 16:9.');

  const { timeline, issues } = normalizeTimeline(raw, totalFrames, ROOT);
  if (strict && issues.length) throw new Error(`Timeline tidak valid:\n- ${issues.join('\n- ')}`);

  return {
    ...raw,
    title: raw.title || raw.name,
    totalFrames,
    scale,
    timeline,
    timelineIssues: issues,
    configFile: path.relative(ROOT, file),
    paths: {
      root: ROOT,
      frames: path.resolve(ROOT, raw.output.framesDir),
      video: path.resolve(ROOT, raw.output.video),
      reports: path.resolve(ROOT, raw.output.reportDir)
    }
  };
}

function loadConfig(configArg, options) {
  const { file, raw } = readConfig(configArg);
  return buildConfig(raw, file, options);
}

const FRAME_PATTERN = 'frame_%04d.png';
const frameFile = (dir, i) => path.join(dir, `frame_${String(i).padStart(4, '0')}.png`);

module.exports = { ROOT, DEFAULT_CONFIG, readConfig, buildConfig, loadConfig, frameFile, FRAME_PATTERN };
