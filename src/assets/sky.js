// Aset prosedural langit: gradasi berdither, bulan, awan, dan vignette.
// Bagian yang tidak berubah digambar sekali di awal (pre-render) supaya render cepat.
import { createLayer, rect, bayer, hexToRgb } from '../engine/pixel.js';
import { clamp, mod } from '../engine/math.js';
import { hash } from '../engine/random.js';
import { PALETTE as P } from './palette.js';

const CLOUD_TILE = 960; // lebar pola awan yang berulang mulus

export function createSky({ width, height, seed, horizonY }) {
  const gradient = buildGradient(width, height, horizonY);
  const moon = buildMoon(11, 18);
  const cloudsHigh = buildCloudCeiling(seed + 11, 60);
  const cloudsLow = buildCloudBand(seed + 23, 64);
  const vignette = buildVignette(width, height);

  return {
    draw(ctx, camera, time) {
      ctx.drawImage(gradient.canvas, 0, 0);
      ctx.drawImage(moon.canvas, 372 - moon.size - Math.round(camera.x * 0.02), 44 - moon.size);
      drawTiled(ctx, cloudsHigh, Math.round(camera.x * 0.04 + time * 4), 0, width);
      drawTiled(ctx, cloudsLow, Math.round(camera.x * 0.1 + time * 9), 50, width);
    },
    drawVignette(ctx) {
      ctx.drawImage(vignette.canvas, 0, 0);
    }
  };
}

function drawTiled(ctx, layer, offset, y, width) {
  const start = -mod(offset, layer.width);
  for (let x = start; x < width; x += layer.width) ctx.drawImage(layer.canvas, x, y);
}

function buildGradient(width, height, horizonY) {
  const layer = createLayer(width, height);
  const image = layer.ctx.createImageData(width, height);
  const colors = P.sky.map(hexToRgb);
  const last = colors.length - 1;
  for (let y = 0; y < height; y++) {
    const t = clamp(y / horizonY, 0, 1) * last;
    const base = Math.floor(t);
    const frac = t - base;
    for (let x = 0; x < width; x++) {
      const c = colors[Math.min(last, frac > bayer(x, y) ? base + 1 : base)];
      const i = (y * width + x) * 4;
      image.data[i] = c[0]; image.data[i + 1] = c[1]; image.data[i + 2] = c[2]; image.data[i + 3] = 255;
    }
  }
  layer.ctx.putImageData(image, 0, 0);
  return layer;
}

// Bulan dengan halo berdither, digambar ke kanvas kecil transparan.
function buildMoon(radius, haloSize) {
  const size = radius + haloSize;
  const layer = createLayer(size * 2 + 1, size * 2 + 1);
  for (let dy = -size; dy <= size; dy++) {
    for (let dx = -size; dx <= size; dx++) {
      const d = Math.hypot(dx, dy);
      const x = dx + size;
      const y = dy + size;
      if (d <= radius + 0.3) {
        const shaded = Math.hypot(dx - 4, dy + 3) > radius - 1;
        rect(layer.ctx, x, y, 1, 1, shaded ? P.moonShade : P.moon);
      } else if (d < size) {
        const v = 1 - (d - radius) / haloSize;
        if (bayer(x, y) < v * v * 0.55) rect(layer.ctx, x, y, 1, 1, v > 0.6 ? P.moonHaloLight : P.moonHalo);
      }
    }
  }
  // kawah kecil
  for (const [cx, cy] of [[-3, -2], [2, 3], [-1, 5], [4, -4]]) rect(layer.ctx, size + cx, size + cy, 2, 1, P.moonShade);
  layer.size = size;
  return layer;
}

// Lapisan awan tebal yang menggantung dari atas layar, sisi bawahnya bergelombang.
function buildCloudCeiling(seed, height) {
  const layer = createLayer(CLOUD_TILE, height);
  const ph = [0, 1, 2, 3].map((k) => hash(seed, k) * Math.PI * 2);
  for (let x = 0; x < CLOUD_TILE; x++) {
    const u = (x / CLOUD_TILE) * Math.PI * 2;
    const bottom = Math.round(16 + 12 * (0.5 + 0.5 * Math.sin(u * 3 + ph[0])) +
      7 * Math.abs(Math.sin(u * 9 + ph[1])) + 3 * Math.abs(Math.sin(u * 23 + ph[2])));
    rect(layer.ctx, x, 0, 1, bottom, P.cloudHigh);
    rect(layer.ctx, x, bottom - 2, 1, 2, P.cloudHighRim);
    for (let y = bottom; y < bottom + 4; y++) {
      if (bayer(x, y) < 1 - (y - bottom) / 4) rect(layer.ctx, x, y, 1, 1, P.cloudHigh);
    }
  }
  return layer;
}

// Pita awan rendah yang mengambang, puncaknya terkena cahaya bulan.
function buildCloudBand(seed, height) {
  const layer = createLayer(CLOUD_TILE, height);
  const ph = [0, 1, 2, 3, 4, 5].map((k) => hash(seed, k) * Math.PI * 2);
  for (let x = 0; x < CLOUD_TILE; x++) {
    const u = (x / CLOUD_TILE) * Math.PI * 2;
    const presence = Math.sin(u * 4 + ph[0]) + 0.5 * Math.sin(u * 7 + ph[1]);
    if (presence < -0.35) continue; // celah antar awan
    const thick = Math.min(1, (presence + 0.35) * 1.6);
    const top = Math.round(30 - thick * (8 + 9 * Math.abs(Math.sin(u * 11 + ph[2])) + 4 * Math.abs(Math.sin(u * 27 + ph[3]))));
    const bottom = Math.round(34 + thick * (6 + 3 * Math.sin(u * 13 + ph[4])));
    if (bottom <= top) continue;
    rect(layer.ctx, x, top, 1, bottom - top, P.cloudLow);
    rect(layer.ctx, x, top + 1, 1, 3, P.cloudLowLight);
    rect(layer.ctx, x, top, 1, 1, P.cloudLowRim);
    rect(layer.ctx, x, bottom - 3, 1, 3, P.cloudLowShadow);
    for (let y = bottom; y < bottom + 3; y++) {
      if (bayer(x, y) < 1 - (y - bottom) / 3) rect(layer.ctx, x, y, 1, 1, P.cloudLowShadow);
    }
  }
  return layer;
}

function buildVignette(width, height) {
  const layer = createLayer(width, height);
  const image = layer.ctx.createImageData(width, height);
  const [r, g, b] = P.vignette;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = (x - width / 2) / (width / 2);
      const dy = (y - height / 2) / (height / 2);
      const v = clamp((Math.sqrt(dx * dx * 0.85 + dy * dy) - 0.8) / 0.55, 0, 1);
      const i = (y * width + x) * 4;
      image.data[i] = r; image.data[i + 1] = g; image.data[i + 2] = b;
      image.data[i + 3] = Math.round(v * v * 170);
    }
  }
  layer.ctx.putImageData(image, 0, 0);
  return layer;
}
