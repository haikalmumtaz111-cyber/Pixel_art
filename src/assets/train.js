// Aset prosedural kereta uap: lokomotif, tender batu bara, dan dua gerbong penumpang.
// Satu definisi kereta dipakai di semua adegan, sehingga warna, cerobong, roda,
// bentuk gerbong, dan tata letak jendela selalu sama.
// Kereta digambar dalam koordinat layar. headX = ujung depan lokomotif di layar,
// distance = jarak tempuh di dunia (dipakai untuk putaran roda dan guncangan sambungan rel).
import { rect, pixel, disc, line, screenRect, mixHex } from '../engine/pixel.js';
import { hash } from '../engine/random.js';
import { clamp, mod } from '../engine/math.js';
import { NIGHT, INTERIOR } from './palette.js';

const LOCO = 68;
const TENDER = 30;
const COACH = 76;
const GAP = 3;
const DRIVER_R = 7;
const SMALL_R = 4;
const BEAM_LENGTH = 180;
const WINDOWS_PER_COACH = 6;

// Warna identitas kereta. Bisa ditimpa lewat parameter aset (misalnya untuk kereta lain).
const DESIGN_KEYS = [
  'locoDark', 'loco', 'locoLight', 'locoShine', 'brass', 'brassLight', 'bufferRed',
  'wheelRed', 'wheelRedLight', 'wheelCounter', 'wheelRim', 'wheelFace', 'wheelSpoke', 'hub', 'rod',
  'coachDark', 'coach', 'coachLight', 'coachShine', 'coachStripe', 'roof', 'roofLight', 'roofShine',
  'chassis', 'windowFrame', 'windowLit', 'windowLitHi', 'windowLitLow', 'windowDim', 'windowDimHi',
  'passenger', 'crew', 'fire', 'fireHi', 'fireAlt', 'headlight'
];

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

// lights = 1 berarti lampu menyala penuh (malam). Nilai lebih kecil = kurang dominan (pagi).
const NIGHT_LIGHTS = { lights: 1 };

export function createTrain({ seed, railY, motion = { startX: 0, speed: 0 }, colors = {}, traveler = null }) {
  const D = {};
  for (const key of DESIGN_KEYS) D[key] = NIGHT[key];
  Object.assign(D, colors);
  const WHEEL_DRIVER = { rim: D.wheelRim, face: D.wheelRed, spoke: D.wheelRedLight, hub: D.hub, counter: D.wheelCounter };
  const WHEEL_SMALL = { rim: D.wheelRim, face: D.wheelFace, spoke: D.wheelSpoke, hub: D.hub };

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
    rect(ctx, x + 2, y - 20 + b, 62, 3, D.locoDark);
    rect(ctx, x + 2, y - 20 + b, 62, 1, D.locoLight);
    rect(ctx, x + 62, y - 20 + b, 4, 6, D.bufferRed);

    // silinder uap
    rect(ctx, x + 50, y - 16 + b, 9, 7, D.loco);
    rect(ctx, x + 50, y - 16 + b, 9, 1, D.locoShine);
    rect(ctx, x + 50, y - 10 + b, 9, 1, D.locoDark);

    // ketel uap (boiler)
    const by = y - 36 + b;
    rect(ctx, x + 18, by, 40, 16, D.loco);
    rect(ctx, x + 18, by, 40, 1, D.locoShine);
    rect(ctx, x + 18, by + 1, 40, 3, D.locoLight);
    rect(ctx, x + 18, by + 13, 40, 3, D.locoDark);
    for (const rx of [27, 39, 49]) {
      rect(ctx, x + rx, by, 1, 16, D.brass);
      pixel(ctx, x + rx, by + 1, D.brassLight);
    }
    rect(ctx, x + 52, by, 6, 16, D.locoDark);
    rect(ctx, x + 52, by, 6, 1, D.locoLight);

    // cerobong, kubah uap kuningan, kubah pasir
    rect(ctx, x + 49, by - 11, 6, 11, D.loco);
    rect(ctx, x + 53, by - 11, 1, 11, D.locoLight);
    rect(ctx, x + 48, by - 13, 8, 2, D.locoLight);
    rect(ctx, x + 48, by - 13, 8, 1, D.locoShine);
    rect(ctx, x + 35, by - 4, 7, 4, D.brass);
    rect(ctx, x + 36, by - 5, 5, 1, D.brass);
    rect(ctx, x + 36, by - 4, 5, 1, D.brassLight);
    rect(ctx, x + 28, by - 3, 5, 3, D.loco);
    rect(ctx, x + 29, by - 4, 3, 1, D.locoLight);

    // lampu depan
    rect(ctx, x + 57, by - 6, 5, 5, D.locoDark);
    rect(ctx, x + 60, by - 5, 2, 3, D.headlight);

    // kabin masinis dengan cahaya api tungku yang berkedip
    const top = y - 50 + b;
    const flick = hash(seed, 900, Math.floor(time * 12));
    rect(ctx, x, top + 2, 18, 30, D.loco);
    rect(ctx, x + 17, top + 2, 1, 30, D.locoLight);
    rect(ctx, x - 1, top, 20, 2, D.roof);
    rect(ctx, x - 1, top, 20, 1, D.roofShine);
    rect(ctx, x + 4, top + 5, 9, 9, D.windowFrame);
    rect(ctx, x + 5, top + 6, 7, 7, flick > 0.5 ? D.fire : D.fireAlt);
    rect(ctx, x + 5, top + 6, 7, 2, D.fireHi);
    rect(ctx, x + 8, top + 8, 3, 3, D.crew);
    rect(ctx, x + 7, top + 11, 5, 2, D.crew);
    rect(ctx, x + 4, top + 18, 9, 3, D.brass);
    rect(ctx, x + 6, top + 19, 1, 1, D.locoDark);
    rect(ctx, x + 9, top + 19, 2, 1, D.locoDark);
    rect(ctx, x + 2, y - 21 + b, 14, 1, flick > 0.3 ? D.fire : D.fireAlt);

    // batang penghubung roda (coupling rod) dan batang piston
    const pin = (cx) => ({ x: cx + Math.round(Math.cos(angle) * 4), y: dy + Math.round(Math.sin(angle) * 4) });
    const p1 = pin(d1);
    const p2 = pin(d2);
    rect(ctx, p1.x, p1.y, p2.x - p1.x + 1, 2, D.rod);
    const crossX = p2.x + 6;
    const crossY = y - 13 + b;
    line(ctx, p2.x, p2.y, crossX, crossY, D.rod);
    rect(ctx, crossX, crossY - 1, 2, 3, D.hub);
    rect(ctx, crossX + 2, crossY, x + 50 - crossX - 2, 1, D.hub);

    // penghalau rintangan (cowcatcher)
    for (let r = 0; r < 12; r++) {
      rect(ctx, x + 64, y - 14 + r + b, 1 + Math.floor(r / 2.2), 1, r % 3 === 0 ? D.locoLight : D.bufferRed);
    }
  }

  function drawTender(ctx, x, distance) {
    const y = railY;
    const b = bob(distance, 1);
    for (const wx of [6, 15, 24]) drawWheel(ctx, x + wx, y - 5, SMALL_R, distance / SMALL_R, 3, WHEEL_SMALL);
    rect(ctx, x + 1, y - 13 + b, 28, 3, D.chassis);
    const top = y - 36 + b;
    for (let i = 0; i < 26; i++) {
      const h = 2 + Math.round(2 * Math.sin(i * 0.5 + 1)) + (hash(seed, 700 + i) > 0.6 ? 1 : 0);
      rect(ctx, x + 2 + i, top - h, 1, h, D.locoDark);
      if (hash(seed, 760 + i) > 0.7) pixel(ctx, x + 2 + i, top - h, D.locoShine);
    }
    rect(ctx, x, top, 30, 23, D.loco);
    rect(ctx, x, top, 30, 1, D.locoShine);
    rect(ctx, x, top + 1, 30, 2, D.locoLight);
    rect(ctx, x, top + 20, 30, 3, D.locoDark);
    rect(ctx, x + 29, top, 1, 23, D.locoLight);
    rect(ctx, x + 3, top + 7, 24, 1, D.brass);
    rect(ctx, x + 3, top + 15, 24, 1, D.brass);
  }

  // lights < 1: lampu kurang dominan saat pagi.
  // zoom > 1: dari dekat, isi jendela terlihat sebagai ruangan yang lebih redup (bukan kotak kuning
  // terang), sehingga tidak muncul kilatan cahaya saat kamera mendekati jendela.
  function windowColors(dim, lights, zoom) {
    const fade = (1 - lights) * 0.6;
    const near = clamp((zoom - 2) / 6, 0, 1);
    return {
      lit: mixHex(mixHex(dim ? D.windowDim : D.windowLit, D.windowDim, fade), INTERIOR.wallLight, near),
      hi: mixHex(mixHex(dim ? D.windowDimHi : D.windowLitHi, D.windowDimHi, fade), INTERIOR.wallShine, near),
      low: mixHex(D.windowLitLow, INTERIOR.wallDark, near)
    };
  }

  function drawWindow(ctx, wx, wy, carIndex, k, colors, portal) {
    rect(ctx, wx - 1, wy - 1, 10, 12, D.windowFrame);
    rect(ctx, wx, wy, 8, 10, colors.lit);
    rect(ctx, wx, wy, 8, 2, colors.hi);
    rect(ctx, wx, wy + 9, 8, 1, colors.low);
    rect(ctx, wx, wy, 1, 10, colors.low); // tirai
    if (traveler && traveler.coach === carIndex && traveler.window === k) {
      traveler.character.drawSilhouette(ctx, wx, wy, D.passenger);
    } else {
      const who = hash(seed, carIndex * 20 + k, 5);
      if (who < 0.55) {
        const hx = wx + 2 + Math.floor(hash(seed, carIndex * 20 + k, 6) * 2);
        rect(ctx, hx, wy + 4, 3, 3, D.passenger);
        rect(ctx, hx - 1, wy + 7, 5, 3, D.passenger);
        if (who < 0.2) rect(ctx, hx - 1, wy + 3, 5, 1, D.passenger); // topi
      }
    }
    // jendela "portal": isi jendela diganti adegan berikutnya (dipakai transisi masuk gerbong)
    if (portal && portal.coach === carIndex && portal.window === k) {
      portal.rect = screenRect(ctx, wx, wy, 8, 10);
      portal.drawInside(ctx, portal.rect);
    }
  }

  function drawCoach(ctx, x, distance, time, carIndex, lights, portal) {
    const y = railY;
    const b = bob(distance, carIndex + 2);
    const a = distance / SMALL_R;
    for (const bx of [14, COACH - 14]) {
      rect(ctx, x + bx - 8, y - 7, 16, 2, D.chassis);
      drawWheel(ctx, x + bx - 5, y - 5, SMALL_R, a, 3, WHEEL_SMALL);
      drawWheel(ctx, x + bx + 5, y - 5, SMALL_R, a, 3, WHEEL_SMALL);
    }
    const top = y - 46 + b;
    rect(ctx, x + 3, top, COACH - 6, 1, D.roofShine);
    rect(ctx, x + 1, top + 1, COACH - 2, 1, D.roofLight);
    rect(ctx, x, top + 2, COACH, 2, D.roof);
    for (const vx of [18, 38, 58]) rect(ctx, x + vx, top - 1, 3, 1, D.roofLight);
    rect(ctx, x, top + 4, COACH, 26, D.coach);
    rect(ctx, x, top + 4, COACH, 1, D.coachShine);
    rect(ctx, x, top + 5, COACH, 1, D.coachLight);
    rect(ctx, x, top + 24, COACH, 6, D.coachDark);
    rect(ctx, x, top + 21, COACH, 1, D.coachStripe);
    rect(ctx, x, top + 4, 1, 26, D.coachDark);
    rect(ctx, x + COACH - 1, top + 4, 1, 26, D.coachLight);
    rect(ctx, x + 3, top + 30, COACH - 6, 3, D.chassis);
    // lampu kabin kadang meredup sesaat, seperti lampu minyak
    const dim = hash(seed, 300 + carIndex, Math.floor(time * 15)) > 0.95;
    const colors = windowColors(dim, lights, ctx.pixelView ? ctx.pixelView.s : 1);
    for (let k = 0; k < WINDOWS_PER_COACH; k++) drawWindow(ctx, x + 6 + k * 11, top + 8, carIndex, k, colors, portal);
  }

  function windowXs(headX) {
    const xs = [];
    for (const left of coachLefts) for (let k = 0; k < WINDOWS_PER_COACH; k++) xs.push(headX + left + 6 + k * 11);
    return xs;
  }

  const train = {
    design: D,
    length: -coachLefts[1],
    // posisi puncak cerobong relatif terhadap ujung depan lokomotif
    stackOffset: { x: locoLeft + 52, y: railY - 50 },
    headAt: (time) => motion.startX + motion.speed * time,
    bob,

    // portal (opsional) = { coach, window, drawInside(ctx, rect) }. Setelah digambar, portal.rect terisi.
    draw(ctx, headX, distance, time, env = NIGHT_LIGHTS, portal = null) {
      // sambungan antar gerbong
      for (const left of [tenderLeft + TENDER, coachLefts[0] + COACH, coachLefts[1] + COACH]) {
        rect(ctx, headX + left, railY - 38, GAP, 20, D.chassis);
      }
      coachLefts.forEach((left, i) => drawCoach(ctx, headX + left, distance, time, i, env.lights, portal));
      drawTender(ctx, headX + tenderLeft, distance);
      drawLoco(ctx, headX + locoLeft, distance, time);
    },

    // Kotak jendela (area kaca) di layar sebelum zoom, untuk menentukan titik fokus kamera.
    windowRect(headX, coach, k) {
      return { x: headX + coachLefts[coach] + 6 + k * 11, y: railY - 38, w: 8, h: 10 };
    },

    // Cahaya jendela jatuh ke tanggul rel, lalu terpantul bergetar di tanah basah.
    drawLightSpill(ctx, headX, time, env = NIGHT_LIGHTS) {
      const shimmer = Math.floor(time * 12);
      const L = env.lights;
      windowXs(headX).forEach((wx, w) => {
        rect(ctx, wx - 1, railY + 2, 10, 4, `rgba(255, 184, 90, ${0.15 * L})`);
        rect(ctx, wx - 3, railY + 6, 14, 5, `rgba(255, 184, 90, ${0.09 * L})`);
        rect(ctx, wx - 5, railY + 11, 18, 6, `rgba(255, 184, 90, ${0.05 * L})`);
        for (let r = 0; r < 16; r += 2) {
          const shift = Math.round((hash(seed, w * 16 + r, shimmer) - 0.5) * 3);
          rect(ctx, wx + 1 + shift, railY + 17 + r, 6, 1, `rgba(255, 196, 100, ${((0.24 - r * 0.013) * L).toFixed(3)})`);
        }
      });
    },

    // Sorot lampu depan berbentuk kerucut bertingkat.
    // Saat lampu masih di luar layar kiri, sorotnya muncul perlahan agar tidak terlihat seperti kotak terang.
    drawHeadlight(ctx, headX, env = NIGHT_LIGHTS) {
      const ox = headX + lamp.x;
      const L = env.lights * clamp((ox + 60) / 60, 0, 1);
      for (let dx = 0; dx < BEAM_LENGTH; dx++) {
        const half = Math.floor(1 + dx * 0.17);
        const cy = lamp.y + Math.floor(dx * 0.1);
        const a = dx < 50 ? 0.13 : dx < 110 ? 0.09 : dx < 155 ? 0.06 : 0.035;
        rect(ctx, ox + dx, cy - half, 1, half * 2 + 1, `rgba(255, 236, 170, ${a * L})`);
        const core = Math.floor(half * 0.4);
        if (core > 0) rect(ctx, ox + dx, cy - core, 1, core * 2 + 1, `rgba(255, 240, 190, ${0.07 * L})`);
      }
      disc(ctx, ox, lamp.y, 5, `rgba(255, 240, 190, ${0.12 * L})`);
      disc(ctx, ox, lamp.y, 3, `rgba(255, 245, 210, ${0.3 * L})`);
      rect(ctx, ox + 8, railY, BEAM_LENGTH - 30, 1, `rgba(255, 236, 170, ${0.35 * L})`);
    },

    // Dipakai hujan: apakah titik layar (x, y) berada di dalam sorot lampu?
    // view (opsional) = zoom yang sedang aktif, supaya posisi sorot ikut zoom.
    isLit(headX, env = NIGHT_LIGHTS, view = null) {
      if (env.lights < 0.4) return () => false;
      const ox = headX + lamp.x;
      return (x, y) => {
        if (view) {
          x = (x - view.ox) / view.s;
          y = (y - view.oy) / view.s;
        }
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
    },

    // Warna identitas kereta (badan gerbong, garis emas, roda merah, kilap lokomotif, kuningan).
    // Dipakai pengujian konsistensi aset: warna ini harus muncul persis di setiap adegan yang menampilkan kereta.
    identityColors: () => [D.coach, D.coachStripe, D.wheelRed, D.locoShine, D.brass],

    // Gambar kereta dengan parameter tetap. Dipakai pengujian konsistensi aset antar adegan.
    drawSnapshot(ctx, width) {
      rect(ctx, 0, 0, width, railY + 4, '#000000');
      train.draw(ctx, Math.round(width / 2 + train.length / 2), 0, 0, NIGHT_LIGHTS);
    }
  };
  return train;
}
