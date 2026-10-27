// Angka "acak" yang deterministik: input yang sama selalu menghasilkan angka yang sama.
// Jangan pakai Math.random() di animasi, karena hasil render akan berubah setiap kali dijalankan.
import { lerp, smoothstep } from './math.js';

// Menghasilkan angka 0..1 dari seed dan satu atau dua bilangan bulat.
export function hash(seed, a, b = 0) {
  let h = (seed | 0) ^ Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Noise halus satu dimensi, dipakai untuk bentuk bukit dan semak.
export function noise1D(seed, x) {
  const i = Math.floor(x);
  return lerp(hash(seed, i), hash(seed, i + 1), smoothstep(x - i));
}

export function fbm1D(seed, x, octaves = 3) {
  let sum = 0;
  let amplitude = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    sum += noise1D(seed + o * 101, x * 2 ** o) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
  }
  return sum / total;
}
