// Track keyframe berbasis frame, dipakai untuk kamera dan efek lingkungan.
// Format di JSON: [[frame, nilai, easing?], ...]. Easing ditulis di key tujuan,
// artinya "cara bergerak dari key sebelumnya menuju key ini".
import { ease, lerp } from './math.js';

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
