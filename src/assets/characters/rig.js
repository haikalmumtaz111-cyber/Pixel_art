// Rig karakter pixel art yang bisa dipakai ulang.
// Karakter disusun dari bagian tubuh (kaki, badan, lengan, kepala, rambut, topi, aksesori) yang digambar
// dengan kode, lalu diberi pose menurut status animasi:
//   idle    berdiri + bernapas          walk     siklus jalan 8 frame (langkah mengikuti jarak, kaki tidak meluncur)
//   stand   berdiri diam                seated   duduk (bangku/kursi)
//   gesture lengan depan terangkat      cycle    mengayuh sepeda (pedal mengikuti putaran roda)
//   sweep   menyapu (lengan dan sapu bergerak maju-mundur, cocok dengan aksesori "broom")
// Ditambah kedip, napas, dan tengok kepala (headTurn: -1 menoleh ke belakang, 0 samping, 1 ke kamera).
// Karakter baru cukup dibuat lewat data (warna, topi, rambut, tinggi, aksesori), tanpa menyalin kode ini.
// Karakter digambar menghadap kanan; menghadap kiri memakai "flip" entitas (cermin otomatis).
import { rect, pixel } from '../../engine/pixel.js';
import { hash } from '../../engine/random.js';
import { mod } from '../../engine/math.js';

const BOX_W = 26;

// Tabel siklus jalan 8 frame: kontak, turun, lewat, naik, kontak, turun, lewat, naik.
const WALK = {
  frontFoot: [4, 3, 0, -3, -4, -3, 0, 3],
  backFoot: [-4, -3, 0, 3, 4, 3, 0, -3],
  frontLift: [0, 0, 0, 0, 0, 1, 2, 1],
  backLift: [0, 1, 2, 1, 0, 0, 0, 0],
  bob: [0, 1, 0, -1, 0, 1, 0, -1],
  frontHand: [-5, -3, 0, 3, 5, 3, 0, -3],
  backHand: [4, 2, 0, -2, -4, -2, 0, 2]
};

const DEFAULTS = {
  height: 44, build: 'regular', sleeves: 'long', hairStyle: 'short', hat: 'none', accessory: 'none',
  skin: '#c98b5e', skinShade: '#9c6440', hair: '#1f1611',
  shirt: '#e8e2cf', shirtShade: '#b9b29c', collar: null,
  pants: '#4a3a2c', pantsShade: '#33281f', sarong: null, sarongPattern: null,
  shoes: '#2a1d14', hatColor: '#1b1716', hatShade: '#0f0c0b',
  accessoryColor: '#8a6a3a', accessoryShade: '#5e4524',
  strideLength: 26, seed: 1
};

// Garis tebal piksel dari (x0, y0) ke (x1, y1): tiap baris satu persegi selebar w.
function limb(ctx, x0, y0, x1, y1, w, color) {
  const rows = Math.max(1, Math.abs(y1 - y0));
  const dir = y1 >= y0 ? 1 : -1;
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    rect(ctx, Math.round(x0 + (x1 - x0) * t), y0 + i * dir, w, 1, color);
  }
}

export function createRigCharacter(def) {
  const c = { ...DEFAULTS, ...def };
  const h = c.height;
  const boxH = h + 8;
  const legLen = Math.round(h * 0.42);
  const torsoLen = Math.round(h * 0.33);
  const torsoW = c.build === 'slim' ? 6 : c.build === 'stout' ? 9 : 7;
  const legW = c.build === 'slim' ? 2 : 3;
  const cx = 12;

  // Kedip: mata tertutup 3 frame, jadwalnya acak tetapi deterministik per karakter.
  function blinking(time) {
    const every = 2.6 + hash(c.seed, 1) * 1.2;
    const k = Math.floor(time / every);
    for (const n of [k - 1, k]) {
      const start = n * every + hash(c.seed, n, 2) * every * 0.5;
      if (time >= start && time < start + 0.1) return true;
    }
    return false;
  }

  function drawHead(ctx, top, turn, blink) {
    const x = cx - 3;
    const view = turn > 0.5 ? 'front' : turn < -0.5 ? 'back' : 'side';
    rect(ctx, x, top, 8, 8, c.skin);
    rect(ctx, x + 1, top + 8, 6, 1, c.skin); // dagu
    if (view === 'side') {
      rect(ctx, x + 8, top + 3, 1, 2, c.skin); // hidung
      rect(ctx, x, top + 2, 1, 6, c.skinShade);
      pixel(ctx, x + 3, top + 4, c.skinShade); // telinga
      if (c.hat !== 'kerudung') rect(ctx, x, top, 4, 4, c.hair);
      pixel(ctx, x + 6, top + 7, c.skinShade); // mulut
      if (blink) rect(ctx, x + 5, top + 4, 2, 1, c.skinShade);
      else pixel(ctx, x + 6, top + 4, '#1a100b');
    } else if (view === 'back') {
      rect(ctx, x - 1, top + 3, 1, 2, c.skin);
      rect(ctx, x + 7, top + 2, 1, 6, c.skinShade);
      if (c.hat !== 'kerudung') rect(ctx, x + 4, top, 4, 4, c.hair);
      if (blink) rect(ctx, x + 1, top + 4, 2, 1, c.skinShade);
      else pixel(ctx, x + 1, top + 4, '#1a100b');
    } else {
      rect(ctx, x, top + 2, 1, 6, c.skinShade);
      rect(ctx, x + 7, top + 2, 1, 6, c.skinShade);
      if (blink) { rect(ctx, x + 2, top + 4, 1, 1, c.skinShade); rect(ctx, x + 5, top + 4, 1, 1, c.skinShade); }
      else { pixel(ctx, x + 2, top + 4, '#1a100b'); pixel(ctx, x + 5, top + 4, '#1a100b'); }
      pixel(ctx, x + 3, top + 7, c.skinShade);
      pixel(ctx, x + 4, top + 7, c.skinShade);
    }
    // rambut
    if (c.hat !== 'kerudung') {
      rect(ctx, x, top - 1, 8, 2, c.hair);
      if (c.hairStyle === 'bun') rect(ctx, view === 'back' ? x + 7 : x - 3, top + 1, 3, 3, c.hair);
      if (c.hairStyle === 'long') rect(ctx, view === 'back' ? x + 6 : x - 1, top, 3, 10, c.hair);
    }
    // topi
    if (c.hat === 'peci') {
      rect(ctx, x, top - 4, 8, 4, c.hatColor);
      rect(ctx, x, top - 1, 8, 1, c.hatShade);
      rect(ctx, x + 1, top - 4, 6, 1, c.hatShade);
    } else if (c.hat === 'caping') {
      // caping: topi kerucut anyaman yang lebar
      for (let r = 0; r < 5; r++) rect(ctx, cx - 1 - r * 2, top - 5 + r, 3 + r * 4, 1, r === 4 ? c.hatShade : c.hatColor);
      pixel(ctx, cx - 4, top - 2, c.hatShade);
      pixel(ctx, cx + 3, top - 3, c.hatShade);
    } else if (c.hat === 'kerudung') {
      rect(ctx, x - 1, top - 2, 10, 3, c.hatColor);
      rect(ctx, view === 'back' ? x + 5 : x - 1, top, 4, 10, c.hatColor);
      rect(ctx, x - 1, top + 8, 10, 3, c.hatColor);
      rect(ctx, x - 1, top + 10, 10, 1, c.hatShade);
    }
  }

  // Bagian bawah: celana (dua kaki) atau kain sarung yang menutup kaki.
  function drawLegs(ctx, hipY, footY, front, back) {
    const hx = cx - Math.floor(legW / 2);
    const foot = (f, color) => {
      const kneeY = Math.round((hipY + footY) / 2);
      const kneeX = hx + Math.round(f.dx / 2) + (f.lift ? 2 : 1);
      limb(ctx, hx, hipY, kneeX, kneeY, legW, color);
      limb(ctx, kneeX, kneeY, hx + f.dx, footY - 1 - f.lift, legW, color);
    };
    if (c.sarong) {
      const left = Math.min(back.dx, front.dx, 0) + hx - 1;
      const right = Math.max(back.dx, front.dx, 0) + hx + legW + 1;
      for (let y = hipY; y < footY - 1; y++) {
        const t = (y - hipY) / (footY - hipY);
        const l = Math.round(hx - 2 + (left - (hx - 2)) * t);
        const r = Math.round(hx + legW + 2 + (right - (hx + legW + 2)) * t);
        rect(ctx, l, y, r - l, 1, c.sarong);
        if (c.sarongPattern) for (let x = l + ((y >> 1) & 1); x < r; x += 3) if ((y & 1) === 0) pixel(ctx, x, y, c.sarongPattern);
      }
    } else {
      foot(back, c.pantsShade);
      foot(front, c.pants);
    }
    for (const [f, shade] of [[back, true], [front, false]]) {
      const x = hx + f.dx;
      rect(ctx, x - 1, footY - 1 - f.lift, 4, 2, shade ? '#1b130d' : c.shoes);
    }
  }

  function drawArm(ctx, sx, sy, hx, hy, front) {
    const sleeve = front ? c.shirt : c.shirtShade;
    const elbowX = Math.round((sx + hx) / 2);
    const elbowY = Math.round((sy + hy) / 2);
    // lengan depan diberi garis bayangan di sisi belakang, supaya ayunannya terbaca di depan badan
    if (front) {
      limb(ctx, sx - 1, sy + 1, elbowX - 1, elbowY, 1, c.shirtShade);
      limb(ctx, elbowX - 1, elbowY, hx - 1, hy, 1, c.sleeves === 'long' ? c.shirtShade : c.skinShade);
    }
    if (c.sleeves === 'long') {
      limb(ctx, sx, sy, elbowX, elbowY, 2, sleeve);
      limb(ctx, elbowX, elbowY, hx, hy, 2, sleeve);
    } else {
      limb(ctx, sx, sy, elbowX, elbowY, 2, sleeve);
      limb(ctx, elbowX, elbowY, hx, hy, 2, front ? c.skin : c.skinShade);
    }
    rect(ctx, hx, hy, 2, 2, front ? c.skin : c.skinShade);
  }

  function drawTorso(ctx, top, bottom) {
    const x = cx - Math.floor(torsoW / 2);
    rect(ctx, x, top, torsoW, bottom - top, c.shirt);
    rect(ctx, x, top, 2, bottom - top, c.shirtShade);
    if (c.collar) rect(ctx, x + 2, top, torsoW - 2, 1, c.collar);
    if (c.accessory === 'bag') {
      for (let i = 0; i < torsoW + 2; i++) pixel(ctx, x + i, top + 1 + i, c.accessoryShade);
    }
  }

  function drawAccessory(ctx, hand, hipY, gesture) {
    if (c.accessory === 'basket') {
      // bakul anyaman dibawa di depan pinggang
      const x = hand.x - 2;
      const y = hipY - 3;
      rect(ctx, x, y, 8, 6, c.accessoryColor);
      for (let i = 0; i < 8; i += 2) pixel(ctx, x + i, y + 1 + ((i >> 1) & 1) * 2, c.accessoryShade);
      rect(ctx, x, y + 5, 8, 1, c.accessoryShade);
      rect(ctx, x + 1, y - 2, 6, 2, '#d8b45a');
    } else if (c.accessory === 'parcel') {
      rect(ctx, cx - 6, hipY - 9, 6, 5, c.accessoryColor);
      rect(ctx, cx - 6, hipY - 7, 6, 1, c.accessoryShade);
    } else if (c.accessory === 'bag') {
      rect(ctx, cx - 6, hipY - 2, 5, 5, c.accessoryColor);
      rect(ctx, cx - 6, hipY + 2, 5, 1, c.accessoryShade);
    } else if (c.accessory === 'broom') {
      // sapu lidi yang digerakkan maju-mundur
      const tipX = hand.x + 2 + Math.round(gesture * 4);
      for (let i = 0; i < 12; i++) pixel(ctx, hand.x + 1 + Math.round(((tipX - hand.x) * i) / 12), hand.y + i, c.accessoryShade);
      rect(ctx, tipX - 2, hand.y + 12, 6, 2, c.accessoryColor);
    } else if (c.accessory === 'newspaper') {
      rect(ctx, hand.x - 1, hand.y - 6, 7, 7, '#d9d2bc');
      rect(ctx, hand.x, hand.y - 4, 5, 1, '#8a8474');
      rect(ctx, hand.x, hand.y - 2, 5, 1, '#8a8474');
    }
  }

  // Pose berdiri (idle/stand/gesture/walk) dengan data kaki dan tangan.
  function drawStanding(ctx, { front, back, bob, frontHand, backHand, breath, turn, blink, gesture }) {
    const footY = boxH;
    const hipY = footY - legLen + bob;
    const shoulderY = hipY - torsoLen - breath;
    const headTop = shoulderY - 9;
    drawArm(ctx, cx - 1, shoulderY + 1, cx + backHand, hipY - 2, false);
    drawLegs(ctx, hipY, footY, front, back);
    drawTorso(ctx, shoulderY, hipY + 1);
    drawHead(ctx, headTop, turn, blink);
    // lengan depan: gesture mengangkat tangan dari samping badan ke atas kepala
    const restX = cx + frontHand;
    const restY = hipY - 2;
    const hand = {
      x: Math.round(restX + (cx + 5 - restX) * gesture),
      y: Math.round(restY + (headTop - 2 - restY) * gesture)
    };
    if (c.accessory === 'basket') hand.y = Math.min(hand.y, hipY - 4);
    drawArm(ctx, cx + 1, shoulderY + 1, hand.x, hand.y, true);
    drawAccessory(ctx, hand, hipY, gesture);
  }

  function drawSeated(ctx, { breath, turn, blink, gesture, pedal }) {
    const footY = boxH;
    const hipY = footY - Math.round(legLen * 0.55);
    const shoulderY = hipY - torsoLen - breath;
    const headTop = shoulderY - 9;
    const hx = cx - 1;
    if (pedal) {
      // dua kaki mengikuti posisi pedal
      for (const [p, color] of [[pedal.back, c.pantsShade], [pedal.front, c.pants]]) {
        const kneeX = Math.round((hx + p.x) / 2) + 3;
        const kneeY = Math.min(hipY, p.y) - 2;
        limb(ctx, hx, hipY, kneeX, kneeY, legW, color);
        limb(ctx, kneeX, kneeY, p.x, p.y - 1, legW, color);
        rect(ctx, p.x - 1, p.y - 1, 4, 2, c.shoes);
      }
    } else {
      // paha mendatar ke depan, betis turun ke lantai
      const kneeX = hx + legLen - 6;
      rect(ctx, hx, hipY - 1, kneeX - hx + 2, legW, c.sarong || c.pants);
      limb(ctx, kneeX, hipY, kneeX + 1, footY - 2, legW, c.sarong || c.pants);
      rect(ctx, kneeX, footY - 2, 5, 2, c.shoes);
    }
    drawArm(ctx, cx - 1, shoulderY + 1, cx + 3, hipY - 3, false);
    drawTorso(ctx, shoulderY, hipY + 1);
    drawHead(ctx, headTop, turn, blink);
    const hand = pedal ? { x: cx + 8, y: shoulderY + 4 } : { x: cx + 5, y: Math.round(hipY - 3 - gesture * 6) };
    drawArm(ctx, cx + 1, shoulderY + 1, hand.x, hand.y, true);
    drawAccessory(ctx, hand, hipY, gesture);
  }

  return {
    defaultState: 'idle',
    identityColors: () => [c.shirt, c.sarong || c.pants, c.hat === 'none' ? c.hair : c.hatColor].filter(Boolean),
    size: () => ({ w: BOX_W, h: boxH }),

    draw(ctx, e) {
      const p = e.params;
      const time = e.time;
      const turn = p.headTurn ?? 0;
      const gesture = Math.max(0, Math.min(1, p.gesture ?? 0));
      const blink = blinking(time);
      // napas pelan: bahu naik 1 piksel setengah waktu
      const breath = Math.sin((time / (p.breathSeconds ?? 3.4)) * Math.PI * 2) > 0.2 ? 1 : 0;

      if (e.state === 'walk') {
        // langkah dihitung dari jarak tempuh, jadi kaki tidak meluncur saat kecepatan berubah
        const dir = e.flip ? -1 : 1;
        const phase = mod(Math.floor((e.worldX * dir * 8) / c.strideLength), 8);
        drawStanding(ctx, {
          front: { dx: WALK.frontFoot[phase], lift: WALK.frontLift[phase] },
          back: { dx: WALK.backFoot[phase], lift: WALK.backLift[phase] },
          bob: WALK.bob[phase], frontHand: WALK.frontHand[phase], backHand: WALK.backHand[phase],
          breath: 0, turn, blink, gesture
        });
      } else if (e.state === 'seated') {
        drawSeated(ctx, { breath, turn, blink, gesture });
      } else if (e.state === 'sweep') {
        const swing = 0.5 + 0.5 * Math.sin(time * 5);
        drawStanding(ctx, {
          front: { dx: 2, lift: 0 }, back: { dx: -2, lift: 0 }, bob: 0,
          frontHand: 2 + Math.round(swing * 2), backHand: 0, breath: 0, turn, blink, gesture: 0.1 * swing
        });
      } else if (e.state === 'cycle') {
        // phaseOffset = jarak titik entitas ini ke titik sepeda, agar pedal kaki sama dengan pedal sepeda
        const angle = ((e.worldX + (p.phaseOffset ?? 0)) * (e.flip ? -1 : 1)) / (p.wheelRadius ?? 8);
        const crank = { x: cx + (p.crankX ?? 3), y: boxH - (p.crankDrop ?? 2) };
        const r = p.crankRadius ?? 3;
        const at = (a) => ({ x: Math.round(crank.x + Math.cos(a) * r), y: Math.round(crank.y + Math.sin(a) * r) });
        drawSeated(ctx, { breath: 0, turn, blink, gesture: 0, pedal: { front: at(angle), back: at(angle + Math.PI) } });
      } else {
        const standing = e.state === 'stand';
        drawStanding(ctx, {
          front: { dx: 1, lift: 0 }, back: { dx: -1, lift: 0 }, bob: 0,
          frontHand: 1, backHand: -1, breath: standing ? 0 : breath, turn, blink, gesture: e.state === 'gesture' || gesture > 0 ? gesture : 0
        });
      }
    }
  };
}

export const assetTypes = {
  'rig-character': { create: (def) => createRigCharacter(def) }
};
