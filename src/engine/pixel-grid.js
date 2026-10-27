// Pemetaan grid piksel untuk zoom kamera (dipakai penyaji frame mode "browser").
//
// Masalahnya: dunia digambar di 480x270 lalu diperbesar ke 1920x1080. Satu piksel art = 4 x zoom piksel layar.
// Kalau 4 x zoom bukan bilangan bulat (misalnya zoom 1,1 = 4,4 piksel), mustahil semua piksel art berukuran sama
// tanpa blur. Cara lama (nearest neighbor biasa) memilih kolom mana yang 5 piksel berdasarkan posisinya di LAYAR,
// jadi setiap kali kamera bergeser atau zoom berubah, pola 4/5 ikut bergeser: garis tampak "merayap".
//
// Mode zoom:
// - "anchored" (bawaan): ukuran setiap kolom/baris art ditentukan oleh posisinya di DUNIA (bukan di layar),
//   memakai urutan acak-merata (golden ratio). Saat zoom naik dari level c ke c+1 piksel, setiap kolom tumbuh
//   tepat satu kali lalu tetap; saat kamera bergeser, pola ikut bergerak bersama gambar (tidak merayap).
//   Di zoom kelipatan 0,25 (1; 1,25; 1,5; ...) semua piksel berukuran sama persis.
// - "steps": zoom dibulatkan ke level terdekat yang ukuran pikselnya bulat. Grid selalu seragam, tetapi zoom
//   berubah dengan lompatan.
// - "nearest": cara lama Tahap 3 (dipertahankan untuk kompatibilitas dan perbandingan).
//
// Semua fungsi di sini murni (tanpa canvas), jadi bisa diuji langsung di Node.

export const ZOOM_MODES = ['anchored', 'steps', 'nearest'];

// Pengali urutan acak-merata per sumbu (bilangan irasional supaya polanya tidak berulang).
const AXIS_MULT = { x: 0.6180339887498949, y: 0.41421356237309515 };

// Peringkat 0..1 sebuah indeks dunia. Kolom dengan peringkat < bagian pecahan zoom mendapat 1 piksel ekstra.
export function gridRank(index, axis = 'x') {
  const v = (index * AXIS_MULT[axis]) % 1;
  return v < 0 ? v + 1 : v;
}

// Ukuran sel layar untuk zoom tertentu: bagian bulat c dan pecahan f (ukuran rata-rata = c + f).
export function cellOf(cell, zoom, mode = 'anchored') {
  let eff = cell * Math.max(1, zoom);
  if (mode === 'steps') eff = Math.max(cell, Math.round(eff));
  const c = Math.floor(eff + 1e-9);
  const f = eff - c < 1e-9 ? 0 : eff - c;
  return { c, f, eff };
}

// Pemetaan satu sumbu: untuk setiap indeks sumbu di kanvas internal (0..size-1) yang terlihat,
// hasilnya posisi awal dan lebarnya di layar. Pusat zoom = tengah kanvas.
// anchor = geseran lapisan (piksel art), sehingga indeks dunia = indeks kanvas + anchor.
// Hasil: { c, f, first, last, start: Int32Array, size: Int32Array } (indeks first..last terlihat).
export function axisMap({ size, outSize, zoom, anchor = 0, mode = 'anchored', axis = 'x' }) {
  const cell = outSize / size;
  const { c, f } = cellOf(cell, zoom, mode);
  const start = new Int32Array(size);
  const width = new Int32Array(size);
  const sc = size / 2;
  const oc = outSize / 2;
  const w = (s) => c + (f > 0 && gridRank(s + anchor, axis) < f ? 1 : 0);
  let last = sc - 1;
  for (let s = sc, pos = oc; s < size && pos < outSize; s++) {
    start[s] = pos;
    width[s] = w(s);
    pos += width[s];
    last = s;
  }
  let first = sc;
  for (let s = sc - 1, pos = oc; s >= 0 && pos > 0; s--) {
    width[s] = w(s);
    pos -= width[s];
    start[s] = pos;
    first = s;
  }
  return { c, f, first, last, start, size: width };
}

// Model pemetaan "nearest" Tahap 3 (drawImage nearest dengan potongan tengah), untuk analisis dan pengujian.
// Piksel layar X mengambil kolom floor(sx + (X + 0.5) * sw / outSize).
export function nearestAxisMap({ size, outSize, zoom }) {
  const sw = size / Math.max(1, zoom);
  const sx = (size - sw) / 2;
  const start = new Int32Array(size);
  const width = new Int32Array(size);
  let first = -1;
  let last = -1;
  for (let X = 0; X < outSize; X++) {
    const s = Math.floor(sx + ((X + 0.5) * sw) / outSize);
    if (first < 0) first = s;
    if (s !== last) start[s] = X;
    width[s]++;
    last = s;
  }
  const { c, f } = cellOf(outSize / size, zoom);
  return { c, f, first, last, start, size: width };
}

// Kelompokkan indeks berurutan yang lebarnya sama dan bersambung, supaya bisa digambar dengan satu drawImage.
export function mergeRuns(map) {
  const runs = [];
  for (let s = map.first; s <= map.last; s++) {
    const prev = runs[runs.length - 1];
    if (prev && prev.w === map.size[s] && prev.d + prev.n * prev.w === map.start[s]) prev.n++;
    else runs.push({ s, d: map.start[s], w: map.size[s], n: 1 });
  }
  return runs;
}

// Indeks kanvas yang menutupi setiap piksel layar (untuk menyelaraskan pola dither transisi dengan grid art).
export function coverIndex(map, outSize) {
  const index = new Int32Array(outSize);
  for (let s = map.first; s <= map.last; s++) {
    const a = Math.max(0, map.start[s]);
    const b = Math.min(outSize, map.start[s] + map.size[s]);
    for (let X = a; X < b; X++) index[X] = s;
  }
  return index;
}
