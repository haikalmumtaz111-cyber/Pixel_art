// Tumbuhan: pohon rindang (ketapang) dan pohon kelapa, dengan daun yang bergoyang pelan ditiup angin.
// Goyangan dihitung dari waktu, jadi deterministik.
import { rect, pixel, disc } from '../../engine/pixel.js';
import { hash } from '../../engine/random.js';
import { pick } from '../common/colors.js';
import { withEntityParams } from './buildings.js';

function treeModel(def) {
  const H = def.height ?? 70;
  const R = def.crown ?? 20;
  const W = R * 2 + 12;
  const seed = (def.seedOffset || 0) + 61;
  const kind = def.kind || 'round';
  const sway = def.sway ?? 1;
  const clusters = [...Array(9)].map((_, i) => {
    const a = (i / 9) * Math.PI * 2 + hash(seed, i, 1);
    const d = i === 0 ? 0 : R * (0.45 + 0.35 * hash(seed, i, 2));
    return { x: Math.round(Math.cos(a) * d), y: Math.round(Math.sin(a) * d * 0.6), r: Math.round(R * (0.45 + 0.2 * hash(seed, i, 3))) };
  });

  return {
    size: () => ({ w: W, h: H }),
    draw(ctx, e, fc) {
      const t = e.time;
      const cx = Math.floor(W / 2);
      const trunk = pick(fc, 'trunk');
      const trunkLight = pick(fc, 'trunkLight');
      if (kind === 'palm') {
        // batang kelapa melengkung, pelepah menjuntai
        const top = 8;
        for (let y = top; y < H; y++) {
          const bend = Math.round(Math.sin(((H - y) / H) * 1.6) * 5);
          rect(ctx, cx + bend - 1, y, 3, 1, (y >> 2) & 1 ? trunk : trunkLight);
        }
        const hx = cx + Math.round(Math.sin(1.6) * 5);
        const wave = Math.sin(t * 1.4 + seed) * sway;
        for (let f = 0; f < 7; f++) {
          const dir = f < 3 ? -1 : f > 3 ? 1 : 0;
          const len = 14 + Math.floor(hash(seed, f, 4) * 6);
          for (let i = 0; i < len; i++) {
            const x = hx + dir * i + (dir === 0 ? Math.round(wave) : 0);
            const y = top + Math.round((i * i) / (len * 0.9)) - (dir === 0 ? i : 0) + Math.round(wave * (i / len));
            pixel(ctx, x, y, pick(fc, i % 3 === 0 ? 'leafLight' : 'leaf'));
            if (i % 2 === 0) pixel(ctx, x, y + 1, pick(fc, 'leafDark'));
          }
        }
        disc(ctx, hx, top + 1, 2, pick(fc, 'trunk'));
        return;
      }
      // pohon rindang
      const crownY = R;
      rect(ctx, cx - 2, crownY, 4, H - crownY, trunk);
      rect(ctx, cx - 2, crownY, 1, H - crownY, trunkLight);
      rect(ctx, cx + 1, crownY + 8, 6, 2, trunk);
      clusters.forEach((cl, i) => {
        // gumpalan atas bergoyang lebih jauh dari gumpalan bawah
        const dx = Math.round(Math.sin(t * 1.1 + i * 0.8 + seed) * sway * (cl.y < 0 ? 1 : 0.5));
        disc(ctx, cx + cl.x + dx, crownY + cl.y, cl.r, pick(fc, 'leafDark'));
      });
      clusters.forEach((cl, i) => {
        const dx = Math.round(Math.sin(t * 1.1 + i * 0.8 + seed) * sway * (cl.y < 0 ? 1 : 0.5));
        disc(ctx, cx + cl.x + dx - 1, crownY + cl.y - 2, Math.max(2, cl.r - 3), pick(fc, 'leaf'));
      });
      clusters.forEach((cl, i) => {
        if (cl.y > 2) return;
        const dx = Math.round(Math.sin(t * 1.1 + i * 0.8 + seed) * sway);
        disc(ctx, cx + cl.x + dx - 3, crownY + cl.y - 4, Math.max(1, Math.floor(cl.r / 3)), pick(fc, 'leafLight'));
      });
    }
  };
}

export const assetTypes = {
  tree: { create: (def) => ({ defaultState: 'idle', ...withEntityParams(def, treeModel) }) }
};
