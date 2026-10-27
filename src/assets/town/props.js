// Properti jalanan kota lama: lampu jalan besi, warung kayu yang bisa dibuka, dan bangku kayu.
import { rect, pixel, disc } from '../../engine/pixel.js';
import { mod } from '../../engine/math.js';
import { pick } from '../common/colors.js';
import { drawText, textWidth } from '../common/pixel-font.js';
import { withEntityParams } from './buildings.js';

// Lampu jalan. Status warna "on" = lampu menyala (cahaya hangat), "off" = padam.
function streetLampModel(def) {
  const H = def.height ?? 74;
  return {
    size: () => ({ w: 14, h: H }),
    draw(ctx, e, fc) {
      const iron = pick(fc, 'iron');
      const ironLight = pick(fc, 'ironLight');
      const on = e.color === 'on';
      rect(ctx, 4, H - 5, 6, 5, iron);
      rect(ctx, 4, H - 5, 6, 1, ironLight);
      rect(ctx, 6, 10, 2, H - 14, iron);
      rect(ctx, 6, 10, 1, H - 14, ironLight);
      rect(ctx, 5, Math.round(H * 0.55), 4, 2, iron);
      // kepala lampu: bingkai besi dan kaca
      rect(ctx, 3, 0, 8, 2, iron);
      rect(ctx, 4, 2, 6, 7, iron);
      rect(ctx, 5, 3, 4, 5, on ? pick(fc, 'lampLit') : pick(fc, 'lampGlass'));
      rect(ctx, 4, 9, 6, 2, iron);
      pixel(ctx, 7, -1, iron);
      if (on) {
        ctx.globalAlpha = 0.18;
        disc(ctx, 7, 5, 9, pick(fc, 'lampGlow'));
        ctx.globalAlpha = 0.1;
        disc(ctx, 7, 5, 16, pick(fc, 'lampGlow'));
        ctx.globalAlpha = 1;
      }
    }
  };
}

// Warung kayu beratap seng. Parameter animasi "open" (0..1) menggulung kerai bambu ke atas,
// lalu dagangan terlihat. Cocok untuk adegan pedagang membuka kios.
function kioskModel(def) {
  const W = def.width ?? 46;
  const H = 40;
  return {
    size: () => ({ w: W, h: H }),
    draw(ctx, e, fc) {
      const open = Math.max(0, Math.min(1, e.params.open ?? 0));
      const wood = pick(fc, 'wood');
      const woodDark = pick(fc, 'woodDark');
      const woodLight = pick(fc, 'woodLight');
      // atap seng bergelombang
      for (let x = -3; x < W + 3; x += 2) rect(ctx, x, 0, 1, 5, pick(fc, mod(x, 4) === 1 ? 'zincLight' : 'zinc'));
      rect(ctx, -3, 5, W + 6, 1, pick(fc, 'zincDark'));
      if (def.sign) {
        const tw = textWidth(def.sign);
        rect(ctx, Math.round((W - tw) / 2) - 2, 6, tw + 4, 7, pick(fc, 'signBoard'));
        drawText(ctx, def.sign, Math.round((W - tw) / 2), 7, pick(fc, 'signText'));
      }
      // tiang
      rect(ctx, 1, 6, 2, H - 6, wood);
      rect(ctx, W - 3, 6, 2, H - 6, woodDark);
      // bagian dalam dan dagangan
      const iy = 14;
      const ih = 12;
      rect(ctx, 3, iy, W - 6, ih, pick(fc, 'shopInside'));
      if (open > 0.4) {
        // stoples kerupuk, sisir pisang, dan keranjang
        for (let i = 0; i < 4; i++) {
          const x = 5 + i * 9;
          rect(ctx, x, iy + 4, 6, 8, pick(fc, 'glassLight'));
          rect(ctx, x + 1, iy + 6, 4, 5, pick(fc, 'goodsA'));
          rect(ctx, x, iy + 3, 6, 1, pick(fc, 'goodsC'));
        }
        rect(ctx, W - 12, iy + 8, 7, 3, pick(fc, 'goodsB'));
        pixel(ctx, W - 10, iy + 7, pick(fc, 'goodsB'));
      }
      // kerai bambu yang tergulung ke atas
      const blind = Math.round(ih * (1 - open));
      for (let y = 0; y < blind; y++) rect(ctx, 3, iy + y, W - 6, 1, y % 2 ? pick(fc, 'bamboo') : pick(fc, 'bambooDark'));
      rect(ctx, 2, iy + blind - 1, W - 4, 2, pick(fc, 'bambooDark'));
      // meja dagangan
      rect(ctx, 0, iy + ih, W, 4, woodLight);
      rect(ctx, 2, iy + ih + 4, W - 4, H - iy - ih - 4, wood);
      for (let x = 5; x < W - 4; x += 7) rect(ctx, x, iy + ih + 5, 1, H - iy - ih - 6, woodDark);
    }
  };
}

// Bangku kayu panjang.
function benchModel(def) {
  const W = def.width ?? 30;
  return {
    size: () => ({ w: W, h: 12 }),
    draw(ctx, e, fc) {
      rect(ctx, 0, 3, W, 3, pick(fc, 'woodLight'));
      rect(ctx, 0, 5, W, 1, pick(fc, 'woodDark'));
      rect(ctx, 0, 0, W, 2, pick(fc, 'wood'));
      for (const x of [2, W - 4]) rect(ctx, x, 6, 2, 6, pick(fc, 'woodDark'));
    }
  };
}

const reusable = (makeModel) => ({ create: (def) => ({ defaultState: 'idle', ...withEntityParams(def, makeModel) }) });

export const assetTypes = {
  'street-lamp': reusable(streetLampModel),
  kiosk: reusable(kioskModel),
  bench: reusable(benchModel)
};
