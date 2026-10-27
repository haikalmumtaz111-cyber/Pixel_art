// Aset bangunan kota lama: ruko (rumah toko) bergaya Indies dan siluet kota di kejauhan.
// Semua variasi diatur lewat parameter, jadi satu aset bisa menghasilkan banyak bangunan berbeda.
import { rect, pixel } from '../../engine/pixel.js';
import { hash } from '../../engine/random.js';
import { pick } from '../common/colors.js';
import { drawText, textWidth } from '../common/pixel-font.js';

const AWNINGS = { red: 'awningRed', green: 'awningGreen', blue: 'awningBlue' };

// Ruko 1-2 lantai. Koordinat lokal: (0,0) pojok kiri atas, dasar bangunan di y = tinggi.
// Status entitas: "closed" (pintu lipat tertutup) atau "open" (toko buka).
// Status warna: "on" (lampu dalam menyala, pagi buta) atau "off".
// Parameter entitas (lebar, warna, papan nama, ...) menimpa parameter aset, jadi satu aset bisa
// dipakai untuk banyak bangunan berbeda.
function shophouseModel(def) {
  const W = def.width ?? 72;
  const floors = def.floors ?? 2;
  const groundH = 44;
  const upperH = floors > 1 ? 34 : 0;
  const roofH = def.roof === 'stepped' ? 14 : def.roof === 'peak' ? 16 : 10;
  const H = roofH + upperH + groundH;
  const seed = def.seedOffset ?? 0;

  function drawRoof(ctx, fc, wall, trim) {
    const tile = pick(fc, 'roofTile');
    const tileLight = pick(fc, 'roofTileLight');
    const tileDark = pick(fc, 'roofTileDark');
    if (def.roof === 'stepped' || def.roof === 'peak') {
      // fasad atas (gevel) menutupi atap, khas bangunan lama
      const mid = Math.floor(W / 2);
      for (let y = 0; y < roofH; y++) {
        let half;
        if (def.roof === 'stepped') half = y < 4 ? Math.floor(W * 0.18) : y < 9 ? Math.floor(W * 0.32) : Math.floor(W / 2);
        else half = Math.min(Math.floor(W / 2), Math.round(((y + 1) / roofH) * (W / 2)) + 2);
        rect(ctx, mid - half, y, half * 2, 1, wall);
      }
      if (def.roof === 'stepped') {
        rect(ctx, mid - Math.floor(W * 0.18), 0, Math.floor(W * 0.36), 1, trim);
        rect(ctx, mid - Math.floor(W * 0.32), 4, Math.floor(W * 0.64), 1, trim);
        rect(ctx, 0, 9, W, 1, trim);
      }
      rect(ctx, mid - 3, 6, 6, 3, pick(fc, 'roofTileDark'));
      rect(ctx, -1, roofH - 2, W + 2, 2, trim);
      return;
    }
    // atap genteng terlihat dari depan, dengan tritisan
    for (let y = 0; y < roofH - 2; y++) {
      const inset = Math.max(0, 6 - y);
      rect(ctx, inset - 2, y, W + 4 - inset * 2, 1, y % 3 === 0 ? tileLight : tile);
    }
    for (let x = 2; x < W; x += 6) rect(ctx, x, 1, 1, roofH - 3, tileDark);
    rect(ctx, -3, roofH - 2, W + 6, 2, tileDark);
  }

  function drawWindow(ctx, fc, x, y, w, h, lit) {
    const shutter = pick(fc, def.shutter || 'shutterGreen');
    const shutterLight = pick(fc, `${def.shutter || 'shutterGreen'}Light`);
    const glass = lit ? pick(fc, 'windowLit') : pick(fc, 'glass');
    rect(ctx, x - 1, y - 1, w + 2, h + 2, pick(fc, 'trimShade'));
    rect(ctx, x, y, w, h, glass);
    rect(ctx, x, y, w, 2, lit ? pick(fc, 'windowLitHi') : pick(fc, 'glassLight'));
    rect(ctx, x + Math.floor(w / 2), y, 1, h, pick(fc, 'trimShade'));
    // daun jendela krepyak yang terbuka di kiri dan kanan
    for (const sx of [x - 4, x + w + 1]) {
      rect(ctx, sx, y - 1, 3, h + 2, shutter);
      for (let ly = y; ly < y + h; ly += 2) rect(ctx, sx, ly, 3, 1, shutterLight);
    }
  }

  return {
    size: () => ({ w: W, h: H }),
    draw(ctx, e, fc) {
      const wallKey = def.wall || 'wallCream';
      const wall = pick(fc, wallKey);
      const wallShade = pick(fc, `${wallKey}Shade`);
      const trim = pick(fc, def.trim || 'trimWhite');
      const trimShade = pick(fc, 'trimShade');
      const lit = e.color === 'on';
      const top = roofH;

      rect(ctx, 0, top, W, H - top, wall);
      rect(ctx, W - 3, top, 3, H - top, wallShade); // sisi kanan teduh (matahari pagi dari kiri)
      drawRoof(ctx, fc, wall, trim);

      if (floors > 1) {
        // lantai atas: jendela, lubang angin, balkon
        const n = def.windows ?? 2;
        const ww = 10;
        const gap = (W - n * ww) / (n + 1);
        rect(ctx, 0, top, W, 2, trim);
        for (let x = 4; x < W - 4; x += 5) rect(ctx, x, top + 4, 2, 2, trimShade);
        for (let i = 0; i < n; i++) drawWindow(ctx, fc, Math.round(gap + i * (ww + gap)), top + 9, ww, 16, lit);
        if (def.balcony) {
          const by = top + upperH - 6;
          rect(ctx, 2, by, W - 4, 1, pick(fc, 'wood'));
          for (let x = 3; x < W - 3; x += 3) rect(ctx, x, by + 1, 1, 4, pick(fc, 'woodDark'));
          rect(ctx, 2, by + 5, W - 4, 1, pick(fc, 'wood'));
        }
        rect(ctx, 0, top + upperH - 1, W, 2, trim);
      }

      const g = top + upperH;
      // pilaster kiri-kanan
      rect(ctx, 0, g, 3, groundH, trim);
      rect(ctx, W - 4, g, 3, groundH, trimShade);

      // papan nama toko
      if (def.sign) {
        const tw = textWidth(def.sign);
        const sw = Math.min(W - 10, tw + 6);
        const sx = Math.round((W - sw) / 2);
        rect(ctx, sx, g + 2, sw, 9, pick(fc, def.signBoard || 'signBoard'));
        rect(ctx, sx, g + 10, sw, 1, trimShade);
        drawText(ctx, def.sign, sx + Math.round((sw - tw) / 2), g + 4, pick(fc, def.signText || 'signText'));
      }

      // bukaan toko: pintu lipat kayu (tutup) atau isi toko (buka)
      const ox = 6;
      const oy = g + 18;
      const ow = W - 12;
      const oh = groundH - 20;
      if (e.state === 'closed') {
        rect(ctx, ox, oy, ow, oh, pick(fc, 'wood'));
        for (let x = ox; x < ox + ow; x += 6) rect(ctx, x, oy, 1, oh, pick(fc, 'woodDark'));
        rect(ctx, ox, oy, ow, 1, pick(fc, 'woodLight'));
      } else {
        rect(ctx, ox, oy, ow, oh, pick(fc, 'shopInside'));
        rect(ctx, ox, oy + 6, ow, 1, pick(fc, 'woodDark'));
        rect(ctx, ox, oy + 13, ow, 1, pick(fc, 'woodDark'));
        // barang dagangan di rak
        const goods = ['goodsA', 'goodsB', 'goodsC'];
        for (let x = ox + 2; x < ox + ow - 3; x += 4) {
          const k = Math.floor(hash(seed + 31, x, 1) * 3);
          rect(ctx, x, oy + 3 + (hash(seed + 31, x, 2) > 0.5 ? 0 : 1), 3, 3, pick(fc, goods[k]));
          rect(ctx, x, oy + 10, 2, 3, pick(fc, goods[(k + 1) % 3]));
        }
        rect(ctx, ox, oy + oh - 5, ow, 5, pick(fc, 'wood'));
        rect(ctx, ox, oy + oh - 5, ow, 1, pick(fc, 'woodLight'));
        if (lit) {
          ctx.globalAlpha = 0.25;
          rect(ctx, ox, oy, ow, oh - 5, pick(fc, 'windowLit'));
          ctx.globalAlpha = 1;
        }
      }
      rect(ctx, ox - 1, oy - 1, ow + 2, 1, trimShade);

      // tenda kain bergaris di atas bukaan toko
      const awning = AWNINGS[def.awning];
      if (awning) {
        const ay = oy - 6;
        for (let y = 0; y < 5; y++) {
          for (let x = -1 - y; x < W + 1 + y; x += 4) rect(ctx, x, ay + y, 2, 1, pick(fc, awning));
          for (let x = 1 - y; x < W + 1 + y; x += 4) rect(ctx, x, ay + y, 2, 1, pick(fc, 'awningWhite'));
        }
        for (let x = -5; x < W + 5; x += 4) rect(ctx, x, ay + 5, 2, 1, pick(fc, awning));
        // bayangan tenda di dinding
        ctx.globalAlpha = 0.25;
        rect(ctx, 3, ay + 6, W - 7, 3, pick(fc, 'shadow'));
        ctx.globalAlpha = 1;
      }

      // anak tangga dan tanaman pot
      rect(ctx, 0, H - 2, W, 2, trimShade);
      if (def.plants) {
        for (const px of [2, W - 9]) {
          rect(ctx, px, H - 7, 6, 5, pick(fc, 'pot'));
          rect(ctx, px, H - 7, 6, 1, pick(fc, 'potLight'));
          for (let i = 0; i < 4; i++) rect(ctx, px - 1 + i * 2, H - 11 - (i % 2) * 2, 2, 4, pick(fc, i % 2 ? 'leaf' : 'leafLight'));
        }
      }
    }
  };
}

// Model dibuat sekali untuk setiap kombinasi parameter, lalu dipakai ulang.
function withEntityParams(def, makeModel) {
  const models = new Map();
  const modelFor = (e) => {
    const merged = { ...def, ...(e.params || {}) };
    const key = JSON.stringify(merged);
    if (!models.has(key)) models.set(key, makeModel(merged));
    return models.get(key);
  };
  return {
    size: (e, fc) => modelFor(e).size(e, fc),
    draw: (ctx, e, fc) => modelFor(e).draw(ctx, e, fc)
  };
}

function shophouse(def) {
  return { defaultState: 'open', ...withEntityParams(def, shophouseModel) };
}

// Siluet atap-atap kota dan pohon kelapa di kejauhan, tersusun dari sel dunia yang deterministik.
function skyline(def) {
  const seed = (def.seedOffset || 0) + 555;
  const base = def.base ?? 180;
  return {
    size: () => ({ w: 0, h: 0 }),
    draw(ctx, e, fc) {
      const roof = pick(fc, def.color || 'farRoof');
      const light = pick(fc, def.light || 'farRoofLight');
      const tree = pick(fc, def.tree || 'farTree');
      const cell = 22;
      const first = Math.floor((e.local.x0 - 40) / cell);
      const last = Math.floor((e.local.x1 + 40) / cell);
      for (let c = first; c <= last; c++) {
        const kind = hash(seed, c, 1);
        const x = c * cell + Math.floor(hash(seed, c, 2) * 8);
        if (kind < 0.55) {
          const w = 16 + Math.floor(hash(seed, c, 3) * 12);
          const hgt = 10 + Math.floor(hash(seed, c, 4) * 12);
          rect(ctx, x, base - hgt, w, hgt + 40, roof);
          for (let r = 0; r < 6; r++) rect(ctx, x - 2 + r, base - hgt - r, w + 4 - r * 2, 1, r === 0 ? light : roof);
        } else if (kind < 0.85) {
          // pohon kelapa
          const hgt = 22 + Math.floor(hash(seed, c, 5) * 14);
          const top = base - hgt;
          rect(ctx, x + 2, top, 2, hgt + 40, tree);
          // pelepah: garis tebal 2 piksel yang melengkung turun, kiri dan kanan
          for (const [dir, len, droop] of [[-1, 8, 0.12], [1, 8, 0.12], [-1, 5, 0.3], [1, 5, 0.3]]) {
            for (let i = 0; i <= len; i++) rect(ctx, x + 3 + dir * i - (dir < 0 ? 1 : 0), top - 1 + Math.round(i * i * droop * 0.5), 2, 2, tree);
          }
          rect(ctx, x + 1, top - 3, 4, 3, tree);
        } else {
          // menara air
          rect(ctx, x, base - 30, 2, 70, roof);
          rect(ctx, x + 8, base - 30, 2, 70, roof);
          rect(ctx, x - 2, base - 38, 14, 8, roof);
          rect(ctx, x - 2, base - 38, 14, 1, light);
        }
      }
    }
  };
}

export { withEntityParams };

export const assetTypes = {
  shophouse: { create: (def) => shophouse(def) },
  skyline: { create: (def) => skyline(def) }
};
