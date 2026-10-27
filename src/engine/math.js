// Fungsi matematika kecil yang dipakai di banyak tempat.

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (t) => t * t * (3 - 2 * t);
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Sisa bagi yang selalu positif, contoh: mod(-1, 10) = 9.
export const mod = (value, n) => ((value % n) + n) % n;

// Kurva percepatan (easing) yang bisa dipanggil lewat nama dari file timeline JSON.
export const EASINGS = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: easeInOutCubic,
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  smoothstep
};

export function ease(name, t) {
  const fn = EASINGS[name || 'linear'];
  if (!fn) throw new Error(`Easing tidak dikenal: ${name}`);
  return fn(clamp(t, 0, 1));
}
