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

// Track kamera dari timeline. Hasilnya fungsi frame -> { x, y, zoom }.
// - type "keys":          x, y, zoom berupa keyframe biasa (pan, crane, zoom)
// - type "follow-entity": kamera mengikuti entitas. screenX = posisi entitas di layar (bisa keyframe),
//                         smoothing = jumlah frame untuk rata-rata posisi (makin besar, makin halus dan
//                         makin tertinggal). Dihitung dari posisi entitas di frame-frame sebelumnya,
//                         jadi tetap fungsi murni dari nomor frame.
// - type "follow":        keys = posisi layar target bergerak (headAt), dipakai film kereta
// - type "speed":         speedKeys = kecepatan kamera dibanding target (1 = sama cepat, 0 = diam).
//                         Posisi dihitung sekali di awal dengan menjumlahkan gerak per frame.
// liftKeys / y (opsional) = posisi vertikal kamera. zoom (opsional) = keyframe zoom (>= 1).
export function createCameraTrack(def, { headAt, fps, totalFrames, entityX }) {
  const zoom = createTrack(def.zoom, 1);
  if (def.type === 'keys') {
    const x = createTrack(def.x, 0);
    const y = createTrack(def.y, 0);
    return (frame) => ({ x: x(frame), y: y(frame), zoom: zoom(frame) });
  }
  if (def.type === 'follow-entity') {
    const screenX = createTrack(Array.isArray(def.screenX) ? def.screenX : [[0, def.screenX ?? 240]], 240);
    const y = createTrack(def.y, 0);
    const n = Math.max(1, def.smoothing || 1);
    return (frame) => {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += entityX(def.entity, frame - i);
      return { x: sum / n - screenX(frame), y: y(frame), zoom: zoom(frame) };
    };
  }
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
