// Manifest render: "struk" setiap proses render.
// Ditulis berstatus "rendering" saat mulai, lalu "complete" bila semua frame dan MP4 selesai,
// atau "failed" bila gagal. Validator hanya menerima hasil yang manifest-nya "complete" dan
// cocok dengan konfigurasi, hasil kompilasi, mesin, frame, dan MP4 saat ini. Jadi MP4 lama dari render sebelumnya
// tidak bisa dianggap bukti bahwa render terbaru berhasil.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ROOT, readProject, loadEngine } = require('./projects.cjs');
const { frameFile } = require('./config.cjs');
const T = require('./timing.cjs');

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');

function listFiles(dir, ext) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const full = path.join(dir, d.name);
    if (d.isDirectory()) return listFiles(full, ext);
    return d.name.endsWith(ext) ? [full] : [];
  });
}

// Sidik jari mesin inti: seluruh file src/engine. Sama untuk semua proyek.
function engineHash() {
  const files = listFiles(path.join(ROOT, 'src', 'engine'), '.js').sort();
  return sha256(files.map((f) => `${path.relative(ROOT, f)}\n${fs.readFileSync(f, 'utf8')}`).join('\n'));
}

// Sidik jari pustaka bersama: semua modul aset dan adegan (src/assets, src/scenes).
// Pustaka dipakai bersama oleh semua proyek, jadi perubahan di sini membuat semua render lama kedaluwarsa.
function libraryHash() {
  const files = ['assets', 'scenes'].flatMap((d) => listFiles(path.join(ROOT, 'src', d), '')).filter((f) => /\.(js|json)$/.test(f)).sort();
  return sha256(files.map((f) => `${path.relative(ROOT, f)}\n${fs.readFileSync(f, 'utf8')}`).join('\n'));
}

// Sidik jari masukan proyek: isi proyek (setelah $include), konfigurasi mesin, dan katalog aset.
function inputsHash(ref) {
  const { raw } = readProject(ref);
  return sha256(JSON.stringify({ project: raw, engine: loadEngine() }));
}

// Sidik jari hasil kompilasi (Tahap 6A-2a, BACKLOG T22): bagian konfigurasi yang dibaca browser setelah kompiler Node
// (timeline.cjs, timing.cjs), dalam bentuk kanonik. Menangkap perubahan kompiler yang mengubah hasil render walaupun
// JSON proyek tidak berubah. Kode pipeline Node lain (render.cjs, pipeline.cjs, browser.cjs, server.cjs) tidak tercakup (T24).
const compiledHash = (config) => T.runtimeHash(config);

// Empat sidik jari yang menentukan apakah frame di disk berasal dari kode dan konfigurasi saat ini.
const FINGERPRINT_KEYS = ['inputsHash', 'engineHash', 'libraryHash', 'compiledHash'];
function fingerprints(config) {
  return { inputsHash: inputsHash(config.configFile), engineHash: engineHash(), libraryHash: libraryHash(), compiledHash: compiledHash(config) };
}

// Sidik jari frame PNG: hash setiap file, digabung berurutan.
function framesHash(dir, count, first = 0) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const file = frameFile(dir, first + i);
    parts.push(fs.existsSync(file) ? sha256(fs.readFileSync(file)) : 'hilang');
  }
  return sha256(parts.join('\n'));
}

function manifestFile(config, name = config.name) {
  return path.join(config.paths.reports, `${name}-render.json`);
}

// Ditulis ke file sementara di folder yang sama lalu diganti nama, jadi manifest tidak pernah setengah tertulis.
function writeManifest(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = path.join(path.dirname(file), `.${path.basename(file)}.partial`);
  try {
    fs.writeFileSync(temp, JSON.stringify(data, null, 2) + '\n');
    fs.renameSync(temp, file);
  } catch (error) {
    fs.rmSync(temp, { force: true });
    throw error;
  }
}

function readManifest(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

module.exports = { sha256, engineHash, libraryHash, inputsHash, compiledHash, FINGERPRINT_KEYS, fingerprints, framesHash, manifestFile, writeManifest, readManifest };
