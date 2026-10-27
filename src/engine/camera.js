// Kamera 2D sederhana. Posisi kamera disimpan dalam koordinat dunia.
// Lapisan parallax digeser sebesar camera.x dikali faktor kedalamannya:
// faktor kecil = jauh (bergerak lambat), faktor 1 = sejajar rel, di atas 1 = latar depan.
// camera.y > 0 berarti kamera turun, sehingga pemandangan terlihat naik (dipakai saat menengadah/menunduk).
import { clamp, lerp, easeInOutCubic } from './math.js';
import { createTrack } from './tracks.js';

// Kamera mengikuti target. Di awal, target masih bergeser di layar dari frameStart
// ke frameEnd, lalu kamera "mengunci" target setelah settleSeconds detik. (Dipakai Tahap 1.)
export function followCamera({ targetX, time, frameStart, frameEnd, settleSeconds }) {
  const k = easeInOutCubic(clamp(time / settleSeconds, 0, 1));
  const screenX = lerp(frameStart, frameEnd, k);
  return { x: targetX - screenX, y: 0 };
}

export function layerOffset(camera, factor) {
  return Math.round(camera.x * factor);
}

// Track kamera dari timeline. Hasilnya fungsi frame -> { x, y }.
// - type "follow": keys = posisi layar ujung depan lokomotif (kamera ikut kereta)
// - type "speed":  speedKeys = kecepatan kamera dibanding kereta (1 = sama cepat, 0 = diam).
//                  Posisi dihitung sekali di awal dengan menjumlahkan gerak per frame,
//                  jadi tetap deterministik dan tidak bergantung urutan render.
// liftKeys (opsional) = posisi vertikal kamera.
export function createCameraTrack(def, { headAt, fps, totalFrames }) {
  const lift = createTrack(def.liftKeys, 0);
  if (def.type === 'follow') {
    const framing = createTrack(def.keys, 0);
    return (frame) => ({ x: headAt(frame / fps) - framing(frame), y: lift(frame) });
  }
  if (def.type === 'speed') {
    const speed = createTrack(def.speedKeys, 1);
    const xs = new Array(totalFrames);
    const ref = def.refFrame || 0;
    for (let f = 0; f <= ref && f < totalFrames; f++) xs[f] = headAt(f / fps) - def.framing;
    for (let f = ref + 1; f < totalFrames; f++) {
      xs[f] = xs[f - 1] + speed(f - 1) * (headAt(f / fps) - headAt((f - 1) / fps));
    }
    return (frame) => ({ x: xs[clamp(frame, 0, totalFrames - 1)], y: lift(frame) });
  }
  throw new Error(`Jenis track kamera tidak dikenal: ${def.type}`);
}
