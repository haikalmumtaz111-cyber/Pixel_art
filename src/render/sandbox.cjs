// Salinan sementara repository untuk pengujian yang perlu "merusak" sesuatu (konfigurasi, kode, hasil render)
// tanpa menyentuh repository asli. Berisi src, config, tests, dan package.json; node_modules hanya ditautkan.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ROOT } = require('./projects.cjs');

function makeSandbox(prefix = 'pixel-uji-') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  for (const part of ['src', 'config', 'tests', 'package.json']) fs.cpSync(path.join(ROOT, part), path.join(dir, part), { recursive: true });
  if (fs.existsSync(path.join(ROOT, 'node_modules'))) fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
  return {
    dir,
    // modul Node dari salinan (bukan dari repository asli)
    require: (rel) => require(path.join(dir, rel)),
    // salin hasil render (frame, MP4, manifest) proyek ke dalam salinan
    copyOutputs(config, manifestFile) {
      for (const p of [config.paths.frames, config.paths.video, manifestFile]) {
        if (fs.existsSync(p)) fs.cpSync(p, path.join(dir, path.relative(ROOT, p)), { recursive: true });
      }
    },
    cleanup() {
      for (const key of Object.keys(require.cache)) if (key.startsWith(dir)) delete require.cache[key];
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };
}

module.exports = { makeSandbox };
