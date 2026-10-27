// Aset prosedural kereta uap: lokomotif, tender batu bara, dan dua gerbong penumpang.
// Kereta digambar dalam koordinat layar. headX = ujung depan lokomotif di layar,
// distance = jarak tempuh di dunia (dipakai untuk putaran roda dan guncangan sambungan rel).
import { rect, pixel, disc, line } from '../engine/pixel.js';
import { hash } from '../engine/random.js';
import { mod } from '../engine/math.js';
import { PALETTE as P } from './palette.js';

const LOCO = 68;
const TENDER = 30;
const COACH = 76;
const GAP = 3;
const DRIVER_R = 7;
const SMALL_R = 4;
const BEAM_LENGTH = 180;

const WHEEL_DRIVER = { rim: P.wheelRim, face: P.wheelRed, spoke: P.wheelRedLight, hub: P.hub, counter: P.wheelCounter };
const WHEEL_SMALL = { rim: P.wheelRim, face: P.wheelFace, spoke: P.wheelSpoke, hub: P.hub };

// Roda berputar searah jarum jam saat kereta bergerak ke kanan: sudut = jarak / jari-jari.
function drawWheel(ctx, cx, cy, r, angle, spokes, c) {
  disc(ctx, cx, cy, r, c.rim);
  disc(ctx, cx, cy, r - 1, c.face);
  if (c.counter) {
    // pemberat roda (counterweight) membuat arah putaran mudah terlihat
    const ca = angle + Math.PI;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const d = Math.hypot(dx, dy);
        if (d > r - 1.5 || d < r * 0.4) continue;
        const diff = Math.atan2(Math.sin(Math.atan2(dy, dx) - ca), Math.cos(Math.atan2(dy, dx) - ca));
        if (Math.abs(diff) < 0.75) pixel(ctx, cx + dx, cy + dy, c.counter);
      }
    }
  }
  for (let s = 0; s < spokes; s++) {
    const a = angle + (s * Math.PI * 2) / spokes;
    line(ctx, cx, cy, cx + Math.round(Math.cos(a) * (r - 1)), cy + Math.round(Math.sin(a) * (r - 1)), c.spoke);
  }
  pixel(ctx, cx, cy, c.hub);
}

export function createTrain({ seed, railY }) {
  // posisi sisi kiri tiap bagian, relatif terhadap ujung depan lokomotif
  const locoLeft = -LOCO;
  const tenderLeft = locoLeft - GAP - TENDER;
  const coachLefts = [tenderLeft - GAP - COACH, tenderLeft - 2 * GAP - 2 * COACH];
  const lamp = { x: -7, y: railY - 40 };

  // Guncangan 1 piksel saat roda melewati sambungan rel.
  const bob = (distance, part) => (mod(Math.round(distance) + part * 17, 48) < 3 ? 1 : 0);

  function drawLoco(ctx, x, distance, time) {
    const y = railY;
    const b = bob(distance, 0);
    const angle = distance / DRIVER_R;
    const d1 = x + 24;
    const d2 = x + 40;
    const dy = y - 8;

    drawWheel(ctx, x + 9, y - 5, SMALL_R, distance / SMALL_R, 3, WHEEL_SMALL);
    drawWheel(ctx, x + 58, y - 4, 3, distance / 3, 3, WHEEL_SMALL);
    drawWheel(ctx, d1, dy, DRIVER_R, angle, 6, WHEEL_DRIVER);
    drawWheel(ctx, d2, dy, DRIVER_R, angle, 6, WHEEL_DRIVER);

    // rangka dan balok penyangga merah
    rect(ctx, x + 2, y - 20 + b, 62, 3, P.locoDark);
    rect(ctx, x + 2, y - 20 + b, 62, 1, P.locoLight);
    rect(ctx, x + 62, y - 20 + b, 4, 6, P.bufferRed);

    // silinder uap
    rect(ctx, x + 50, y - 16 + b, 9, 7, P.loco);
    rect(ctx, x + 50, y - 16 + b, 9, 1, P.locoShine);
    rect(ctx, x + 50, y - 10 + b, 9, 1, P.locoDark);

    // ketel uap (boiler)
    const by = y - 36 + b;
    rect(ctx, x + 18, by, 40, 16, P.loco);
    rect(ctx, x + 18, by, 40, 1, P.locoShine);
    rect(ctx, x + 18, by + 1, 40, 3, P.locoLight);
    rect(ctx, x + 18, by + 13, 40, 3, P.locoDark);
    for (const rx of [27, 39, 49]) {
      rect(ctx, x + rx, by, 1, 16, P.brass);
      pixel(ctx, x + rx, by + 1, P.brassLight);
    }
    rect(ctx, x + 52, by, 6, 16, P.locoDark);
    rect(ctx, x + 52, by, 6, 1, P.locoLight);

    // cerobong, kubah uap kuningan, kubah pasir
    rect(ctx, x + 49, by - 11, 6, 11, P.loco);
    rect(ctx, x + 53, by - 11, 1, 11, P.locoLight);
    rect(ctx, x + 48, by - 13, 8, 2, P.locoLight);
    rect(ctx, x + 48, by - 13, 8, 1, P.locoShine);
    rect(ctx, x + 35, by - 4, 7, 4, P.brass);
    rect(ctx, x + 36, by - 5, 5, 1, P.brass);
    rect(ctx, x + 36, by - 4, 5, 1, P.brassLight);
    rect(ctx, x + 28, by - 3, 5, 3, P.loco);
    rect(ctx, x + 29, by - 4, 3, 1, P.locoLight);

    // lampu depan
    rect(ctx, x + 57, by - 6, 5, 5, P.locoDark);
    rect(ctx, x + 60, by - 5, 2, 3, P.headlight);

    // kabin masinis dengan cahaya api tungku yang berkedip
    const top = y - 50 + b;
    const flick = hash(seed, 900, Math.floor(time * 12));
    rect(ctx, x, top + 2, 18, 30, P.loco);
    rect(ctx, x + 17, top + 2, 1, 30, P.locoLight);
    rect(ctx, x - 1, top, 20, 2, P.roof);
    rect(ctx, x - 1, top, 20, 1, P.roofShine);
    rect(ctx, x + 4, top + 5, 9, 9, P.windowFrame);
    rect(ctx, x + 5, top + 6, 7, 7, flick > 0.5 ? P.fire : P.fireAlt);
    rect(ctx, x + 5, top + 6, 7, 2, P.fireHi);
    rect(ctx, x + 8, top + 8, 3, 3, P.crew);
    rect(ctx, x + 7, top + 11, 5, 2, P.crew);
    rect(ctx, x + 4, top + 18, 9, 3, P.brass);
    rect(ctx, x + 6, top + 19, 1, 1, P.locoDark);
    rect(ctx, x + 9, top + 19, 2, 1, P.locoDark);
    rect(ctx, x + 2, y - 21 + b, 14, 1, flick > 0.3 ? P.fire : P.fireAlt);

    // batang penghubung roda (coupling rod) dan batang piston
    const pin = (cx) => ({ x: cx + Math.round(Math.cos(angle) * 4), y: dy + Math.round(Math.sin(angle) * 4) });
    const p1 = pin(d1);
    const p2 = pin(d2);
    rect(ctx, p1.x, p1.y, p2.x - p1.x + 1, 2, P.rod);
    const crossX = p2.x + 6;
    const crossY = y - 13 + b;
    line(ctx, p2.x, p2.y, crossX, crossY, P.rod);
    rect(ctx, crossX, crossY - 1, 2, 3, P.hub);
    rect(ctx, crossX + 2, crossY, x + 50 - crossX - 2, 1, P.hub);

    // penghalau rintangan (cowcatcher)
    for (let r = 0; r < 12; r++) {
      rect(ctx, x + 64, y - 14 + r + b, 1 + Math.floor(r / 2.2), 1, r % 3 === 0 ? P.locoLight : P.bufferRed);
    }
  }

  function drawTender(ctx, x, distance) {
    const y = railY;
    const b = bob(distance, 1);
    for (const wx of [6, 15, 24]) drawWheel(ctx, x + wx, y - 5, SMALL_R, distance / SMALL_R, 3, WHEEL_SMALL);
    rect(ctx, x + 1, y - 13 + b, 28, 3, P.chassis);
    const top = y - 36 + b;
    for (let i = 0; i < 26; i++) {
      const h = 2 + Math.round(2 * Math.sin(i * 0.5 + 1)) + (hash(seed, 700 + i) > 0.6 ? 1 : 0);
      rect(ctx, x + 2 + i, top - h, 1, h, P.locoDark);
      if (hash(seed, 760 + i) > 0.7) pixel(ctx, x + 2 + i, top - h, P.locoShine);
    }
    rect(ctx, x, top, 30, 23, P.loco);
    rect(ctx, x, top, 30, 1, P.locoShine);
    rect(ctx, x, top + 1, 30, 2, P.locoLight);
    rect(ctx, x, top + 20, 30, 3, P.locoDark);
    rect(ctx, x + 29, top, 1, 23, P.locoLight);
    rect(ctx, x + 3, top + 7, 24, 1, P.brass);
    rect(ctx, x + 3, top + 15, 24, 1, P.brass);
  }

  function drawWindow(ctx, wx, wy, carIndex, k, dim) {
    rect(ctx, wx - 1, wy - 1, 10, 12, P.windowFrame);
    rect(ctx, wx, wy, 8, 10, dim ? P.windowDim : P.windowLit);
    rect(ctx, wx, wy, 8, 2, dim ? P.windowDimHi : P.windowLitHi);
    rect(ctx, wx, wy + 9, 8, 1, P.windowLitLow);
    rect(ctx, wx, wy, 1, 10, P.windowLitLow); // tirai
    const who = hash(seed, carIndex * 20 + k, 5);
    if (who < 0.55) {
      const hx = wx + 2 + Math.floor(hash(seed, carIndex * 20 + k, 6) * 2);
      rect(ctx, hx, wy + 4, 3, 3, P.passenger);
      rect(ctx, hx - 1, wy + 7, 5, 3, P.passenger);
      if (who < 0.2) rect(ctx, hx - 1, wy + 3, 5, 1, P.passenger); // topi
    }
  }

  function drawCoach(ctx, x, distance, time, carIndex) {
    const y = railY;
    const b = bob(distance, carIndex + 2);
    const a = distance / SMALL_R;
    for (const bx of [14, COACH - 14]) {
      rect(ctx, x + bx - 8, y - 7, 16, 2, P.chassis);
      drawWheel(ctx, x + bx - 5, y - 5, SMALL_R, a, 3, WHEEL_SMALL);
      drawWheel(ctx, x + bx + 5, y - 5, SMALL_R, a, 3, WHEEL_SMALL);
    }
    const top = y - 46 + b;
    rect(ctx, x + 3, top, COACH - 6, 1, P.roofShine);
    rect(ctx, x + 1, top + 1, COACH - 2, 1, P.roofLight);
    rect(ctx, x, top + 2, COACH, 2, P.roof);
    for (const vx of [18, 38, 58]) rect(ctx, x + vx, top - 1, 3, 1, P.roofLight);
    rect(ctx, x, top + 4, COACH, 26, P.coach);
    rect(ctx, x, top + 4, COACH, 1, P.coachShine);
    rect(ctx, x, top + 5, COACH, 1, P.coachLight);
    rect(ctx, x, top + 24, COACH, 6, P.coachDark);
    rect(ctx, x, top + 21, COACH, 1, P.coachStripe);
    rect(ctx, x, top + 4, 1, 26, P.coachDark);
    rect(ctx, x + COACH - 1, top + 4, 1, 26, P.coachLight);
    rect(ctx, x + 3, top + 30, COACH - 6, 3, P.chassis);
    // lampu kabin kadang meredup sesaat, seperti lampu minyak
    const dim = hash(seed, 300 + carIndex, Math.floor(time * 15)) > 0.95;
    for (let k = 0; k < 6; k++) drawWindow(ctx, x + 6 + k * 11, top + 8, carIndex, k, dim);
  }

  function windowXs(headX) {
    const xs = [];
    for (const left of coachLefts) for (let k = 0; k < 6; k++) xs.push(headX + left + 6 + k * 11);
    return xs;
  }

  return {
    length: -coachLefts[1],
    // posisi puncak cerobong relatif terhadap ujung depan lokomotif
    stackOffset: { x: locoLeft + 52, y: railY - 50 },

    draw(ctx, headX, distance, time) {
      // sambungan antar gerbong
      for (const left of [tenderLeft + TENDER, coachLefts[0] + COACH, coachLefts[1] + COACH]) {
        rect(ctx, headX + left, railY - 38, GAP, 20, P.chassis);
      }
      coachLefts.forEach((left, i) => drawCoach(ctx, headX + left, distance, time, i));
      drawTender(ctx, headX + tenderLeft, distance);
      drawLoco(ctx, headX + locoLeft, distance, time);
    },

    // Cahaya jendela jatuh ke tanggul rel, lalu terpantul bergetar di tanah basah.
    drawLightSpill(ctx, headX, time) {
      const shimmer = Math.floor(time * 12);
      windowXs(headX).forEach((wx, w) => {
        rect(ctx, wx - 1, railY + 2, 10, 4, 'rgba(255, 184, 90, 0.15)');
        rect(ctx, wx - 3, railY + 6, 14, 5, 'rgba(255, 184, 90, 0.09)');
        rect(ctx, wx - 5, railY + 11, 18, 6, 'rgba(255, 184, 90, 0.05)');
        for (let r = 0; r < 16; r += 2) {
          const shift = Math.round((hash(seed, w * 16 + r, shimmer) - 0.5) * 3);
          rect(ctx, wx + 1 + shift, railY + 17 + r, 6, 1, `rgba(255, 196, 100, ${(0.24 - r * 0.013).toFixed(3)})`);
        }
      });
    },

    // Sorot lampu depan berbentuk kerucut bertingkat.
    drawHeadlight(ctx, headX) {
      const ox = headX + lamp.x;
      for (let dx = 0; dx < BEAM_LENGTH; dx++) {
        const half = Math.floor(1 + dx * 0.17);
        const cy = lamp.y + Math.floor(dx * 0.1);
        const a = dx < 50 ? 0.13 : dx < 110 ? 0.09 : dx < 155 ? 0.06 : 0.035;
        rect(ctx, ox + dx, cy - half, 1, half * 2 + 1, `rgba(255, 236, 170, ${a})`);
        const core = Math.floor(half * 0.4);
        if (core > 0) rect(ctx, ox + dx, cy - core, 1, core * 2 + 1, 'rgba(255, 240, 190, 0.07)');
      }
      disc(ctx, ox, lamp.y, 5, 'rgba(255, 240, 190, 0.12)');
      disc(ctx, ox, lamp.y, 3, 'rgba(255, 245, 210, 0.3)');
      rect(ctx, ox + 8, railY, BEAM_LENGTH - 30, 1, 'rgba(255, 236, 170, 0.35)');
    },

    // Dipakai hujan: apakah titik (x, y) berada di dalam sorot lampu?
    isLit(headX) {
      const ox = headX + lamp.x;
      return (x, y) => {
        const dx = x - ox;
        if (dx < 0 || dx >= BEAM_LENGTH) return false;
        return Math.abs(y - (lamp.y + Math.floor(dx * 0.1))) <= Math.floor(1 + dx * 0.17);
      };
    },

    // Permukaan atap tempat cipratan hujan muncul.
    roofSurfaces(headX) {
      return [
        ...coachLefts.map((left) => ({ x0: headX + left + 2, x1: headX + left + COACH - 2, y0: railY - 47, y1: railY - 47 })),
        { x0: headX + locoLeft, x1: headX + locoLeft + 18, y0: railY - 51, y1: railY - 51 },
        { x0: headX + locoLeft + 18, x1: headX + locoLeft + 47, y0: railY - 37, y1: railY - 37 }
      ];
    }
  };
}
