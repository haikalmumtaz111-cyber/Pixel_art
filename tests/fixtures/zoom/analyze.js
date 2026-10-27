// Penganalisis frame untuk lab zoom (dijalankan di browser oleh src/render/zoom-tests.cjs).
// Membaca kanvas hasil render pola kalibrasi "identity" dan mengembalikan ukuran serta posisi setiap piksel art
// pada baris dan kolom sampel. Warna yang tidak bisa dibaca sebagai identitas berarti ada campuran (blur).

// Uraikan warna menjadi identitas piksel art, atau null bila bukan warna pola kalibrasi.
function decode(r, g, b) {
  if ((b & 7) !== 4) return null;
  const layer = b >> 6;
  if (layer < 1 || layer > 3) return null;
  return { layer, col: r + ((b >> 4) & 3) * 256, row: g + ((b >> 3) & 1) * 256 };
}

// Run = rangkaian piksel layar berwarna sama sepanjang satu garis. Run yang menyentuh tepi layar
// atau bersebelahan dengan lapisan lain tidak dihitung (ukurannya terpotong).
function runsAlong(data, width, height, fixed, horizontal) {
  const out = [];
  const length = horizontal ? width : height;
  const at = (k) => (horizontal ? (fixed * width + k) * 4 : (k * width + fixed) * 4);
  let start = 0;
  let prev = null;
  const runs = [];
  for (let k = 0; k <= length; k++) {
    let key = null;
    if (k < length) {
      const i = at(k);
      key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    }
    if (k === length || key !== prev) {
      if (prev !== null) runs.push({ start, len: k - start, key: prev });
      start = k;
      prev = key;
    }
  }
  for (let n = 1; n < runs.length - 1; n++) {
    const run = runs[n];
    const id = decode((run.key >> 16) & 255, (run.key >> 8) & 255, run.key & 255);
    if (!id) continue;
    const before = decode((runs[n - 1].key >> 16) & 255, (runs[n - 1].key >> 8) & 255, runs[n - 1].key & 255);
    const after = decode((runs[n + 1].key >> 16) & 255, (runs[n + 1].key >> 8) & 255, runs[n + 1].key & 255);
    if (!before || !after || before.layer !== id.layer || after.layer !== id.layer) continue;
    out.push([id.layer, horizontal ? id.col : id.row, run.start, run.len]);
  }
  return out;
}

// Satukan run dari banyak garis sampel: satu entri per (lapisan, indeks dunia). Karena perbesaran dilakukan per
// sumbu, lebar sebuah kolom harus sama di semua baris; perbedaan dihitung sebagai konflik.
function unique(runs) {
  const seen = new Map();
  let conflicts = 0;
  for (const [layer, index, start, len] of runs) {
    const key = layer * 4096 + index;
    const old = seen.get(key);
    if (!old) seen.set(key, [layer, index, start, len]);
    else if (old[2] !== start || old[3] !== len) conflicts++;
  }
  return { list: [...seen.values()].flat(), conflicts };
}

export function analyze(canvas, { step = 29 } = {}) {
  const { width, height } = canvas;
  const data = canvas.getContext('2d').getImageData(0, 0, width, height).data;
  let invalid = 0;
  for (let i = 0; i < data.length; i += 4) {
    const b = data[i + 2];
    if ((b & 7) !== 4 || (b >> 6) < 1) invalid++;
  }
  const rows = [];
  const cols = [];
  for (let y = step >> 1; y < height; y += step) for (const r of runsAlong(data, width, height, y, true)) rows.push(r);
  for (let x = step >> 1; x < width; x += step) for (const r of runsAlong(data, width, height, x, false)) cols.push(r);
  const x = unique(rows);
  const y = unique(cols);
  // x / y: daftar datar [lapisan, indeks, awal, panjang, ...]
  return { invalid, x: x.list, y: y.list, conflicts: x.conflicts + y.conflicts };
}
