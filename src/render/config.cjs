// Antarmuka lama untuk membaca konfigurasi, sekarang diteruskan ke project loader (projects.cjs).
// Menerima id proyek ("night-to-dawn") atau jalur file ("config/film-night-to-dawn.json").
const path = require('path');
const { ROOT, readProject, buildProject, loadProject } = require('./projects.cjs');

function readConfig(ref) {
  const { file, raw, includes } = readProject(ref);
  return { file, raw, includes };
}

function buildConfig(raw, file, options) {
  return buildProject(raw, file, options);
}

function loadConfig(ref, options) {
  return loadProject(ref, options);
}

const FRAME_PATTERN = 'frame_%04d.png';
const frameFile = (dir, i) => path.join(dir, `frame_${String(i).padStart(4, '0')}.png`);

module.exports = { ROOT, readConfig, buildConfig, loadConfig, frameFile, FRAME_PATTERN };
