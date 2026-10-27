// Track keyframe berbasis frame, dipakai untuk kamera, entitas, dan efek lingkungan.
// Format di JSON: [[frame, nilai, easing?], ...]. Easing ditulis di key tujuan,
// artinya "cara bergerak dari key sebelumnya menuju key ini".
// Semua track adalah fungsi murni dari nomor frame: tidak menyimpan keadaan antar frame.
import { ease, lerp } from './math.js';

// Track angka yang dihaluskan (interpolasi) antar keyframe.
export function createTrack(keys, fallback = 0) {
  if (!keys || keys.length === 0) return () => fallback;
  const list = keys.map(([frame, value, easing]) => ({ frame, value, easing: easing || 'linear' }));
  const first = list[0];
  const last = list[list.length - 1];
  return (frame) => {
    if (frame <= first.frame) return first.value;
    if (frame >= last.frame) return last.value;
    let i = 1;
    while (list[i].frame < frame) i++;
    const a = list[i - 1];
    const b = list[i];
    return lerp(a.value, b.value, ease(b.easing, (frame - a.frame) / (b.frame - a.frame)));
  };
}

// Track bertangga (diskrit): nilai bertahan sampai keyframe berikutnya.
// Dipakai untuk visibilitas, status animasi, pilihan frame sprite, dan status warna.
export function createStepTrack(keys, fallback = null) {
  if (!keys || keys.length === 0) return () => fallback;
  const list = keys.map(([frame, value]) => ({ frame, value }));
  return (frame) => {
    let value = list[0].value;
    for (const key of list) {
      if (key.frame <= frame) value = key.value;
      else break;
    }
    return value;
  };
}

// Nilai yang bisa tetap atau berupa daftar keyframe. step = true untuk track bertangga.
export function createValue(spec, fallback, { step = false } = {}) {
  if (Array.isArray(spec) && Array.isArray(spec[0])) return step ? createStepTrack(spec, fallback) : createTrack(spec, fallback);
  const value = spec === undefined ? fallback : spec;
  return () => value;
}
