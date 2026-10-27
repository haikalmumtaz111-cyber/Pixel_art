// Aset jalan kota lama: trotoar ubin, batu tepi (kerb), jalan batu (cobblestone), selokan, dan rumput tepi.
// Polanya dihitung dari koordinat dunia, jadi jalan bisa memanjang tanpa batas saat kamera bergerak.
import { rect, pixel } from '../../engine/pixel.js';
import { hash } from '../../engine/random.js';
import { pick } from '../common/colors.js';

function street(def) {
  const sidewalkTop = def.sidewalkTop ?? 196;
  const curbTop = def.curbTop ?? 213;
  const roadTop = def.roadTop ?? 217;
  const roadBottom = def.roadBottom ?? 254;
  const bottom = def.bottom ?? 280;
  const seed = (def.seedOffset || 0) + 2024;

  return {
    size: () => ({ w: 0, h: 0 }),
    draw(ctx, e, fc) {
      const x0 = Math.floor(e.local.x0) - 2;
      const x1 = Math.ceil(e.local.x1) + 2;
      const w = x1 - x0;

      // trotoar ubin
      rect(ctx, x0, sidewalkTop, w, curbTop - sidewalkTop, pick(fc, 'sidewalk'));
      rect(ctx, x0, sidewalkTop, w, 1, pick(fc, 'sidewalkLight'));
      rect(ctx, x0, sidewalkTop + 8, w, 1, pick(fc, 'sidewalkDark'));
      for (let x = Math.floor(x0 / 16) * 16; x < x1; x += 16) {
        rect(ctx, x, sidewalkTop + 1, 1, 7, pick(fc, 'sidewalkDark'));
        rect(ctx, x + 8, sidewalkTop + 9, 1, curbTop - sidewalkTop - 9, pick(fc, 'sidewalkDark'));
        if (hash(seed, x, 1) > 0.7) pixel(ctx, x + 4 + Math.floor(hash(seed, x, 2) * 8), sidewalkTop + 3 + Math.floor(hash(seed, x, 3) * 8), pick(fc, 'sidewalkDark'));
      }

      // batu tepi
      rect(ctx, x0, curbTop, w, roadTop - curbTop, pick(fc, 'curb'));
      rect(ctx, x0, curbTop, w, 1, pick(fc, 'curbLight'));
      rect(ctx, x0, roadTop - 1, w, 1, pick(fc, 'curbDark'));
      for (let x = Math.floor(x0 / 24) * 24; x < x1; x += 24) rect(ctx, x, curbTop + 1, 1, roadTop - curbTop - 2, pick(fc, 'curbDark'));

      // jalan batu: baris batu bulat berselang-seling
      rect(ctx, x0, roadTop, w, roadBottom - roadTop, pick(fc, 'roadDark'));
      const stoneH = 5;
      for (let row = 0, y = roadTop + 1; y < roadBottom - 1; row++, y += stoneH) {
        const shift = (row % 2) * 4;
        for (let x = Math.floor((x0 - shift) / 8) * 8 + shift; x < x1; x += 8) {
          const sw = 6 + (hash(seed, x, row) > 0.6 ? 1 : 0);
          const sh = Math.min(stoneH - 1, roadBottom - 1 - y);
          if (sh <= 1) continue;
          const tone = hash(seed + 5, x, row);
          rect(ctx, x + 1, y, sw - 2, 1, pick(fc, 'road'));
          rect(ctx, x, y + 1, sw, sh - 1, pick(fc, tone > 0.8 ? 'roadLight' : 'road'));
          rect(ctx, x + 1, y + 1, 2, 1, pick(fc, 'roadLight'));
          rect(ctx, x + 1, y + sh - 1, sw - 1, 1, pick(fc, 'roadShade'));
        }
      }

      // selokan dan rumput tepi jalan
      rect(ctx, x0, roadBottom, w, 3, pick(fc, 'gutter'));
      rect(ctx, x0, roadBottom + 3, w, bottom - roadBottom - 3, pick(fc, 'grassDark'));
      for (let x = x0; x < x1; x++) {
        const blade = Math.floor(hash(seed + 9, x, 1) * 5);
        rect(ctx, x, roadBottom + 3, 1, 2 + blade, pick(fc, blade > 2 ? 'grassLight' : 'grass'));
      }
    }
  };
}

export const assetTypes = {
  street: { create: (def) => street(def) }
};
