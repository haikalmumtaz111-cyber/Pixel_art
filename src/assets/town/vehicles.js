// Kendaraan sederhana: sepeda ontel. Roda dan pedal berputar mengikuti jarak tempuh (posisi dunia),
// sehingga putarannya selalu cocok dengan kecepatan sepeda. Pengendara dipasang sebagai entitas anak.
import { rect, pixel, line } from '../../engine/pixel.js';
import { pick } from '../common/colors.js';

function bicycle(def) {
  const R = def.wheelRadius ?? 8;
  const W = R * 4 + 6;
  const H = R * 2 + 8;
  return {
    defaultState: 'idle',
    size: () => ({ w: W, h: H }),
    draw(ctx, e, fc) {
      const frame = pick(fc, def.color || 'bikeFrame');
      const tire = pick(fc, 'tire');
      const spoke = pick(fc, 'spoke');
      const angle = (e.worldX * (e.flip ? -1 : 1)) / R;
      const cy = H - R - 1;
      const rear = R + 1;
      const front = W - R - 2;
      for (const cx of [rear, front]) {
        // ban berupa lingkaran tipis, jadi jalan di belakang roda tetap terlihat
        for (let a = 0; a < 64; a++) {
          const t = (a / 64) * Math.PI * 2;
          pixel(ctx, cx + Math.round(Math.cos(t) * R), cy + Math.round(Math.sin(t) * R), tire);
          pixel(ctx, cx + Math.round(Math.cos(t) * (R - 1)), cy + Math.round(Math.sin(t) * (R - 1)), pick(fc, 'wheelGap'));
        }
        for (let s = 0; s < 4; s++) {
          const a = angle + (s * Math.PI) / 2;
          line(ctx, cx, cy, cx + Math.round(Math.cos(a) * (R - 1)), cy + Math.round(Math.sin(a) * (R - 1)), spoke);
        }
        pixel(ctx, cx, cy, frame);
      }
      // rangka: sadel, batang, garpu depan, setang
      const crankX = Math.round((rear + front) / 2) - 1;
      const seatX = rear + 5;
      const seatY = cy - R + 1;
      line(ctx, rear, cy, crankX, cy, frame);
      line(ctx, rear, cy, seatX, seatY, frame);
      line(ctx, seatX, seatY, crankX, cy, frame);
      line(ctx, seatX, seatY + 1, front - 3, seatY + 1, frame);
      line(ctx, crankX, cy, front - 3, seatY + 1, frame);
      line(ctx, front - 3, seatY + 1, front, cy, frame);
      rect(ctx, seatX - 2, seatY - 2, 5, 2, pick(fc, 'saddle'));
      line(ctx, front - 3, seatY + 1, front - 4, seatY - 3, frame);
      rect(ctx, front - 6, seatY - 4, 4, 1, frame);
      // keranjang depan dan pedal
      rect(ctx, front - 2, seatY - 1, 5, 4, pick(fc, 'basket'));
      const px = crankX + Math.round(Math.cos(angle) * 3);
      const py = cy + Math.round(Math.sin(angle) * 3);
      line(ctx, crankX, cy, px, py, spoke);
      rect(ctx, px - 1, py, 3, 1, frame);
    },
    // Bagian yang disentuh pengendara (T19, hanya untuk pengujian; draw() tidak memakainya): batang setang, sadel,
    // dan pedal pada putaran frame ini, dalam koordinat lokal yang sama dengan draw(). Unit test mencocokkan
    // kotak ini dengan piksel yang digambar draw().
    sockets(e) {
      const angle = (e.worldX * (e.flip ? -1 : 1)) / R;
      const cy = H - R - 1;
      const rear = R + 1;
      const front = W - R - 2;
      const crankX = Math.round((rear + front) / 2) - 1;
      const seatX = rear + 5;
      const seatY = cy - R + 1;
      const px = crankX + Math.round(Math.cos(angle) * 3);
      const py = cy + Math.round(Math.sin(angle) * 3);
      return {
        grip: { x: front - 6, y: seatY - 4, w: 4, h: 1 },
        seat: { x: seatX - 2, y: seatY - 2, w: 5, h: 2 },
        pedal: { x: px - 1, y: py, w: 3, h: 1 }
      };
    }
  };
}

export const assetTypes = {
  bicycle: { create: (def) => bicycle(def) }
};
