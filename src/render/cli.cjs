// Pembaca argumen baris perintah yang dipakai semua perintah (render, validate, preview, ...).
//   --project <id>     proyek yang dipilih (lihat: npm run projects)
//   --scene <id>       satu adegan saja
//   --frames <a-b>     rentang frame (a sampai b, termasuk b)
//   --frame <n>        satu frame
//   --no-encode        hanya render frame PNG, tanpa membuat MP4
//   --encode-only      hanya membuat MP4 dari frame PNG yang sudah ada
// Untuk kompatibilitas, argumen pertama tanpa tanda "--" dianggap id proyek atau jalur file JSON.
function parseArgs(argv) {
  const args = { project: null, scene: null, frames: null, encode: true, encodeOnly: false, rest: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--project') args.project = argv[++i];
    else if (a === '--scene') args.scene = argv[++i];
    else if (a === '--frame') {
      const n = Number(argv[++i]);
      args.frames = [n, n];
    } else if (a === '--frames') {
      const m = String(argv[++i]).match(/^(\d+)-(\d+)$/);
      if (!m) throw new Error('Format --frames harus <awal>-<akhir>, misalnya --frames 100-140');
      args.frames = [Number(m[1]), Number(m[2])];
    } else if (a === '--no-encode') args.encode = false;
    else if (a === '--encode-only') args.encodeOnly = true;
    else if (!a.startsWith('--') && !args.project) args.project = a;
    else args.rest.push(a);
  }
  if (args.frames && !(Number.isInteger(args.frames[0]) && Number.isInteger(args.frames[1]) && args.frames[0] <= args.frames[1])) {
    throw new Error('Nomor frame harus bilangan bulat dan awal <= akhir.');
  }
  return args;
}

module.exports = { parseArgs };
