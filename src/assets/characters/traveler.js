// Karakter penumpang: satu definisi (data warna dan proporsi) yang bisa dipakai ulang
// di adegan mana pun. Ada dua cara gambar:
// - drawSilhouette: siluet kecil di jendela kereta saat dilihat dari luar
// - drawSeated: penumpang duduk menghadap kanan untuk adegan interior
// Semua gerakan (napas, kedip, arah pandang) dihitung dari waktu, jadi deterministik.
import { rect, pixel } from '../../engine/pixel.js';
import { hash } from '../../engine/random.js';

export const TRAVELER = {
  id: 'traveler',
  name: 'Penumpang bertopi pet',
  palette: {
    cap: '#3b3331', capLight: '#5a4c43', capDark: '#241e1d',
    hair: '#2a1a12',
    skin: '#dfa37a', skinLight: '#f3c79e', skinShade: '#ad7450', eye: '#1a0e0a', mouth: '#8a4a34',
    coat: '#4f3425', coatLight: '#6f4a31', coatShade: '#35221a', button: '#a8833a',
    scarf: '#8c2a30', scarfLight: '#b4424a',
    trousers: '#2f2a30', trousersLight: '#454048',
    shoe: '#17100c', shoeLight: '#3a2a20'
  },
  // nilai bawaan gerakan, bisa diganti lewat parameter karakter di timeline
  motion: { breathSeconds: 3.4, blinkEverySeconds: 2.8, blinkFrames: 3 }
};

export function createCharacter(definition = TRAVELER, overrides = {}) {
  const c = { ...definition.palette, ...(overrides.palette || {}) };
  const motion = { ...definition.motion, ...(overrides.motion || {}) };
  const seed = overrides.seed ?? 77;

  return {
    id: definition.id,
    name: definition.name,
    palette: c,
    motion,

    // Siluet di jendela 8x10 piksel. Topi pet dengan pinggiran ke depan jadi ciri khasnya.
    drawSilhouette(ctx, wx, wy, color) {
      const hx = wx + 2;
      rect(ctx, hx, wy + 2, 3, 1, color);
      rect(ctx, hx, wy + 3, 5, 1, color);
      rect(ctx, hx, wy + 4, 3, 3, color);
      rect(ctx, hx - 1, wy + 7, 5, 3, color);
    },

    // Pose pada waktu tertentu. look = 0..1 (seberapa jauh kepala condong melihat ke luar).
    // override (opsional) = parameter gerak dari adegan, misalnya { blinkEverySeconds: 2.2 }.
    poseAt(time, look = 0, override = {}) {
      const m = { ...motion, ...override };
      const phase = (time / m.breathSeconds) * Math.PI * 2;
      // bahu naik dulu, kepala menyusul sedikit kemudian (gerak berlapis agar terasa alami)
      const shoulders = Math.sin(phase) > 0.15 ? 1 : 0;
      const head = Math.sin(phase - 0.7) > 0.15 ? 1 : 0;
      const every = m.blinkEverySeconds;
      const k = Math.floor(time / every);
      const closedFor = m.blinkFrames / 30;
      let blink = false;
      for (const n of [k - 1, k]) {
        const start = n * every + hash(seed, n, 3) * every * 0.6;
        if (time >= start && time < start + closedFor) blink = true;
      }
      return { shoulders, head, blink, look };
    },

    // Penumpang duduk menghadap kanan. (x, y) = titik belakang pinggul di permukaan kursi.
    drawSeated(ctx, x, y, pose) {
      const sh = -pose.shoulders;
      const lookX = pose.look > 0.5 ? 1 : 0;
      const hy = -pose.head - Math.round(pose.look * 1.4);
      const hx = lookX;

      // kaki: paha mendatar ke depan, betis turun ke lantai
      rect(ctx, x + 3, y - 8, 22, 7, c.trousers);
      rect(ctx, x + 3, y - 8, 22, 1, c.trousersLight);
      rect(ctx, x + 20, y - 2, 7, 21, c.trousers);
      rect(ctx, x + 26, y - 2, 1, 21, c.trousersLight);
      rect(ctx, x + 19, y + 18, 12, 3, c.shoe);
      rect(ctx, x + 22, y + 18, 8, 1, c.shoeLight);

      // badan bermantel
      rect(ctx, x, y - 34 + sh, 15, 28 - sh, c.coat);
      rect(ctx, x + 13, y - 33 + sh, 2, 27 - sh, c.coatLight);
      rect(ctx, x, y - 34 + sh, 3, 28 - sh, c.coatShade);
      rect(ctx, x + 1, y - 9, 16, 4, c.coat);
      pixel(ctx, x + 14, y - 26 + sh, c.button);
      pixel(ctx, x + 14, y - 20 + sh, c.button);

      // lengan, tangan bertumpu di lutut
      rect(ctx, x + 5, y - 31 + sh, 6, 16 - sh, c.coatShade);
      rect(ctx, x + 10, y - 31 + sh, 1, 15 - sh, c.coat);
      rect(ctx, x + 7, y - 16, 14, 5, c.coatShade);
      rect(ctx, x + 7, y - 16, 14, 1, c.coat);
      rect(ctx, x + 20, y - 15, 4, 4, c.skinShade);
      rect(ctx, x + 21, y - 15, 3, 1, c.skin);

      // syal merah, sewarna gerbong kereta
      rect(ctx, x + 4, y - 37 + sh, 11, 4, c.scarf);
      rect(ctx, x + 5, y - 37 + sh, 9, 1, c.scarfLight);
      rect(ctx, x + 12, y - 34 + sh, 3, 7, c.scarf);
      pixel(ctx, x + 14, y - 33 + sh, c.scarfLight);

      // leher
      rect(ctx, x + 8, y - 39 + hy, 4, 3, c.skinShade);

      // kepala menghadap kanan
      const X = x + hx;
      const Y = y + hy;
      rect(ctx, X + 5, Y - 50, 10, 12, c.skin);
      rect(ctx, X + 6, Y - 38, 8, 1, c.skin);
      rect(ctx, X + 14, Y - 48, 1, 9, c.skinLight);
      rect(ctx, X + 15, Y - 46, 1, 4, c.skin); // hidung dan dagu
      pixel(ctx, X + 16, Y - 45, c.skinLight);
      pixel(ctx, X + 15, Y - 41, c.skinShade);
      rect(ctx, X + 5, Y - 50, 3, 9, c.hair);
      rect(ctx, X + 8, Y - 46, 2, 3, c.skinShade); // telinga
      pixel(ctx, X + 13, Y - 40, c.mouth);
      if (pose.blink) rect(ctx, X + 12, Y - 46, 2, 1, c.skinShade);
      else {
        pixel(ctx, X + 12 + lookX, Y - 46, c.eye);
        pixel(ctx, X + 12, Y - 48, c.hair); // alis
        pixel(ctx, X + 13, Y - 48, c.hair);
      }

      // topi pet
      rect(ctx, X + 4, Y - 53, 11, 4, c.cap);
      rect(ctx, X + 6, Y - 54, 8, 1, c.cap);
      rect(ctx, X + 6, Y - 54, 7, 1, c.capLight);
      rect(ctx, X + 4, Y - 50, 2, 2, c.capDark);
      rect(ctx, X + 12, Y - 50, 7, 2, c.capDark); // pinggiran ke depan
      rect(ctx, X + 13, Y - 50, 6, 1, c.cap);
    }
  };
}
