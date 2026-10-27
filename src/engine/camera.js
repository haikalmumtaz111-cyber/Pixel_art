// Kamera 2D sederhana. Posisi kamera disimpan dalam koordinat dunia.
// Lapisan parallax digeser sebesar camera.x dikali faktor kedalamannya:
// faktor kecil = jauh (bergerak lambat), faktor 1 = sejajar rel, di atas 1 = latar depan.
import { clamp, lerp, easeInOutCubic } from './math.js';

// Kamera mengikuti target. Di awal, target masih bergeser di layar dari frameStart
// ke frameEnd, lalu kamera "mengunci" target setelah settleSeconds detik.
export function followCamera({ targetX, time, frameStart, frameEnd, settleSeconds }) {
  const k = easeInOutCubic(clamp(time / settleSeconds, 0, 1));
  const screenX = lerp(frameStart, frameEnd, k);
  return { x: targetX - screenX, y: 0 };
}

export function layerOffset(camera, factor) {
  return Math.round(camera.x * factor);
}
