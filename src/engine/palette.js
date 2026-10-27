// Tangga palet (palette ramp): perubahan warna bertahap dari satu palet ke palet lain,
// mirip efek "palette fade" di konsol 16-bit. Tiap anak tangga dibuat sekali lalu disimpan.
// Palet adalah objek { nama: '#rrggbb' | [warna...] | [r, g, b] }.
import { clamp } from './math.js';
import { mixHex } from './pixel.js';

function mixValue(a, b, t) {
  if (Array.isArray(a)) return a.map((v, i) => (typeof v === 'number' ? Math.round(v + (b[i] - v) * t) : mixHex(v, b[i], t)));
  return mixHex(a, b, t);
}

// Kunci yang tidak ada di `to` tetap memakai warna `from`.
export function createPaletteRamp(from, to, steps = 32) {
  const cache = [from];
  return {
    steps,
    index(amount) {
      return Math.round(clamp(amount, 0, 1) * (steps - 1));
    },
    at(index) {
      if (!cache[index]) {
        const t = index / (steps - 1);
        const palette = { ...from };
        for (const key of Object.keys(to)) palette[key] = mixValue(from[key], to[key], t);
        cache[index] = palette;
      }
      return cache[index];
    }
  };
}
