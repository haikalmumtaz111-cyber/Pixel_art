// Ambil warna dari palet aktif frame ini (fc.pal). Warna magenta menandai kunci palet yang lupa diisi,
// supaya kesalahan langsung terlihat saat inspeksi visual.
export const MISSING = '#ff00ff';
export const pick = (fc, key) => (fc.pal && fc.pal[key] !== undefined ? fc.pal[key] : MISSING);

// Cache per palet: palet dari tangga palet adalah objek yang sama untuk anak tangga yang sama,
// jadi sprite yang sudah dibuat bisa dipakai ulang tanpa merusak determinisme.
export function perPalette(build) {
  const cache = new WeakMap();
  return (pal) => {
    if (!cache.has(pal)) cache.set(pal, build(pal));
    return cache.get(pal);
  };
}
