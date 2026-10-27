// Pola kalibrasi untuk menguji kamera dan zoom (dipakai lab zoom di src/render/zoom-tests.cjs).
// Bisa dipakai proyek mana pun sebagai "papan uji" grid piksel.
//
// style "identity": setiap piksel art punya warna unik yang menyandikan kolom, baris, dan lapisannya:
//   R = kolom & 255, G = baris & 255, B = lapisan * 64 + (kolom >> 8) * 16 + (baris >> 8) * 8 + 4.
//   Tetangga kiri/kanan selalu beda R, tetangga atas/bawah selalu beda G, jadi dari gambar hasil render
//   ukuran dan posisi setiap piksel art bisa diukur persis, dan warna campuran (blur) langsung ketahuan.
// style "readable": pola yang enak dilihat mata (papan catur, garis 1 piksel, diagonal, tulisan) untuk video demo.
import { blit } from '../../engine/pixel.js';
import { drawText, textWidth } from './pixel-font.js';

const W = 1024;
const H = 512;

function identitySprite(layerId, bandTop, bandBottom) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(W, H);
  for (let y = bandTop; y < bandBottom; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      image.data[i] = x & 255;
      image.data[i + 1] = y & 255;
      image.data[i + 2] = layerId * 64 + ((x >> 8) & 3) * 16 + ((y >> 8) & 1) * 8 + 4;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function readableSprite(layerId, bandTop, bandBottom) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const near = layerId > 1;
  const [a, b, lineColor, textColor] = near ? ['#e8d8b0', '#d4c094', '#3a2a1a', '#8a2a2a'] : ['#7d93cb', '#6f86c4', '#e6ecf6', '#f6d8b4'];
  for (let y = bandTop; y < bandBottom; y++) {
    for (let x = 0; x < W; x++) {
      // papan catur 2x2 piksel art + garis grid 1 piksel setiap 8 piksel + garis diagonal
      let color = ((x >> 1) + (y >> 1)) & 1 ? a : b;
      if (x % 8 === 0 || y % 8 === 0) color = lineColor;
      if ((x + y) % 24 === 0) color = textColor;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const label = near ? 'PIXEL GRID' : 'LATAR JAUH';
  for (let y = bandTop + 10; y < bandBottom - 8; y += 40) {
    for (let x = 12; x < W - 60; x += textWidth(label) + 40) {
      ctx.fillStyle = lineColor;
      ctx.fillRect(x - 2, y - 2, textWidth(label) + 4, 9);
      drawText(ctx, label, x, y, textColor);
    }
  }
  return canvas;
}

function calibrationGrid(def) {
  const layerId = def.layerId ?? 1;
  const bandTop = Math.max(0, def.bandTop ?? 0);
  const bandBottom = Math.min(H, def.bandBottom ?? H);
  let sprite = null;
  return {
    size: () => ({ w: W, h: H }),
    draw(ctx) {
      if (!sprite) sprite = (def.style === 'readable' ? readableSprite : identitySprite)(layerId, bandTop, bandBottom);
      blit(ctx, sprite, 0, 0);
    }
  };
}

export const assetTypes = {
  'calibration-grid': { create: (def) => calibrationGrid(def) }
};
