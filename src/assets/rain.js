// Aset prosedural hujan: dua lapis tetesan diagonal (jauh dan dekat) serta cipratan.
// Posisi setiap tetes dihitung langsung dari waktu, bukan disimpan dari frame sebelumnya.
import { pixel } from '../engine/pixel.js';
import { hash } from '../engine/random.js';
import { mod } from '../engine/math.js';
import { PALETTE as P } from './palette.js';

const MARGIN = 40;

export function createRain({ width, height, seed, slant, far, near, splashes }) {
  const spanX = width + MARGIN * 2;
  const spanY = height + MARGIN;

  // Kemiringan negatif = tetes bergerak ke kiri sambil turun, berlawanan arah kereta.
  function drawLayer(ctx, camera, time, layer, id, colors, isLit) {
    for (let i = 0; i < layer.count; i++) {
      const speed = layer.speed * (0.85 + 0.3 * hash(seed, i, id + 1));
      const travel = hash(seed, i, id + 2) * spanY + speed * time;
      const cycle = Math.floor(travel / spanY);
      const yLocal = travel - cycle * spanY;
      const y = Math.round(yLocal - MARGIN / 2);
      const xBase = hash(seed, i * 131 + cycle, id + 3) * spanX;
      const x = mod(xBase + slant * yLocal - camera.x * layer.parallax, spanX) - MARGIN;
      for (let k = 0; k < layer.length; k++) {
        const px = Math.round(x - slant * k);
        const py = y - k;
        const color = isLit(px, py) ? colors.lit : k === 0 ? colors.head : colors.body;
        pixel(ctx, px, py, color);
      }
    }
  }

  // Cipratan 4 frame: titik, mahkota kecil, mahkota lebar, sisa air.
  function drawSplash(ctx, x, y, step) {
    const c = P.splash;
    if (step === 0) pixel(ctx, x, y, c);
    else if (step === 1) { pixel(ctx, x - 1, y - 1, c); pixel(ctx, x + 1, y - 1, c); pixel(ctx, x, y, c); }
    else if (step === 2) { pixel(ctx, x - 2, y - 1, c); pixel(ctx, x + 2, y - 1, c); pixel(ctx, x - 1, y - 2, c); pixel(ctx, x + 1, y - 2, c); }
    else if (step === 3) { pixel(ctx, x - 3, y, c); pixel(ctx, x + 3, y, c); }
  }

  // surfaces: daftar area {x0, x1, y0, y1, scroll}. scroll = geseran mengikuti kamera.
  function drawSplashes(ctx, time, surfaces, count, salt) {
    for (let s = 0; s < count; s++) {
      const period = 0.45 + 0.3 * hash(seed, s, salt + 1);
      const local = time + hash(seed, s, salt + 2) * period;
      const cycle = Math.floor(local / period);
      const step = Math.floor((local - cycle * period) * 30);
      if (step > 3) continue;
      const surface = surfaces[Math.floor(hash(seed, s * 97 + cycle, salt + 3) * surfaces.length)];
      const w = surface.x1 - surface.x0;
      const x = surface.x0 + mod(hash(seed, s * 89 + cycle, salt + 4) * w - (surface.scroll || 0), w);
      const y = surface.y0 + Math.floor(hash(seed, s * 83 + cycle, salt + 5) * (surface.y1 - surface.y0 + 1));
      drawSplash(ctx, Math.round(x), y, step);
    }
  }

  return {
    drawFar(ctx, camera, time, isLit = () => false) {
      drawLayer(ctx, camera, time, far, 10, { head: P.rainFar, body: P.rainFar, lit: P.rainFarLit }, isLit);
    },
    drawNear(ctx, camera, time, isLit = () => false) {
      drawLayer(ctx, camera, time, near, 20, { head: P.rainNearHi, body: P.rainNear, lit: P.rainLit }, isLit);
    },
    drawGroundSplashes(ctx, camera, time, railY) {
      const scroll = camera.x;
      drawSplashes(ctx, time, [
        { x0: -10, x1: width + 10, y0: railY - 1, y1: railY - 1, scroll },
        { x0: -10, x1: width + 10, y0: railY + 4, y1: railY + 12, scroll },
        { x0: -10, x1: width + 10, y0: railY + 18, y1: height - 18, scroll },
        { x0: -10, x1: width + 10, y0: railY + 18, y1: height - 18, scroll }
      ], splashes, 40);
    },
    drawRoofSplashes(ctx, time, roofs) {
      drawSplashes(ctx, time, roofs, Math.round(splashes / 3), 60);
    }
  };
}
