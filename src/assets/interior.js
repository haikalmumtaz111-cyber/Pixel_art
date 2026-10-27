// Aset prosedural interior gerbong penumpang (dilihat dari lorong ke arah dinding jendela).
// Warna kain dan kayu diambil dari desain kereta, dan jendela memakai perbandingan yang sama
// dengan jendela luar (tinggi 10 : lebar 8, jarak antar jendela 3, panel atas terpisah), supaya konsisten.
// Semua bentuk digambar dengan helper pixel.js, jadi bisa digeser dan di-zoom tanpa blur.
// Koordinat di file ini adalah koordinat ruangan; kamera adegan menggesernya lewat view.
import { createLayer, rect, pixel, disc, withView } from '../engine/pixel.js';
import { hash } from '../engine/random.js';
import { clamp } from '../engine/math.js';
import { INTERIOR } from './palette.js';

const LEFT = -120;
const RIGHT = 620;
const GLASS_W = 80; // 8 x 10 seperti jendela luar, diperbesar 10 kali
const GLASS_H = 100;
const PILLAR = 30; // 3 piksel x 10, sama dengan jarak antar jendela luar
const GLASS_TOP = 76;
const SILL = GLASS_TOP + GLASS_H + 3;
const WAINSCOT = 188;
const FLOOR = 228;
const SEAT = 202; // permukaan dudukan kursi

export function createCoachInterior({ width, height, seed, train }) {
  // kain, bingkai jendela, dan kuningan mengikuti desain kereta yang sama dengan tampak luar
  const D = train.design;
  const I = {
    ...INTERIOR,
    velvet: D.coach, velvetLight: D.coachLight, velvetDark: D.coachDark, velvetShine: D.coachShine,
    frame: D.windowFrame, brass: D.brass, brassLight: D.brassLight
  };
  const windows = ['Z', 'A', 'B', 'C'].map((id, i) => ({ id, x: 124 + i * (GLASS_W + PILLAR), y: GLASS_TOP, w: GLASS_W, h: GLASS_H }));
  const lamps = [{ x: 219, y: 104 }, { x: 439, y: 104 }];
  const seats = [{ x: 182, facing: 'right' }, { x: 352, facing: 'left' }];
  const vignette = buildVignette(width, height);

  // Posisi layar dari koordinat ruangan (untuk detail kecil yang tetap 1 piksel saat zoom).
  const toScreen = (view, x, y) => [Math.round(view.ox + x * view.s), Math.round(view.oy + y * view.s)];
  const flickAt = (lamp, time, flicker) => (flicker ? hash(seed, 400 + lamp.x, Math.floor(time * 15)) : 0.5);

  function drawRoom(ctx) {
    // langit-langit dengan rusuk kayu
    rect(ctx, LEFT, -60, RIGHT - LEFT, 84, I.ceiling);
    for (let x = LEFT; x < RIGHT; x += 48) {
      rect(ctx, x, -60, 3, 84, I.ceilingRib);
      rect(ctx, x + 1, -60, 1, 84, I.ceilingLight);
    }
    rect(ctx, LEFT, 22, RIGHT - LEFT, 3, I.wallDark);
    rect(ctx, LEFT, 25, RIGHT - LEFT, 1, I.wallShine);

    // dinding panel kayu
    rect(ctx, LEFT, 26, RIGHT - LEFT, FLOOR - 26, I.wall);
    rect(ctx, LEFT, 60, RIGHT - LEFT, 2, I.wallDark);
    rect(ctx, LEFT, 62, RIGHT - LEFT, 1, I.wallShine);
    rect(ctx, LEFT, WAINSCOT, RIGHT - LEFT, FLOOR - WAINSCOT, I.wainscot);
    rect(ctx, LEFT, WAINSCOT, RIGHT - LEFT, 1, I.wainscotLight);
    for (let x = LEFT + 20; x < RIGHT; x += 55) {
      rect(ctx, x, WAINSCOT + 6, 1, FLOOR - WAINSCOT - 10, I.wallDark);
      rect(ctx, x + 1, WAINSCOT + 6, 1, FLOOR - WAINSCOT - 10, I.wainscotLight);
    }

    // rak bagasi kuningan, koper, dan kotak topi
    rect(ctx, 86, 6, 52, 22, I.luggage);
    rect(ctx, 86, 6, 52, 2, I.luggageLight);
    rect(ctx, 100, 6, 3, 22, I.luggageStrap);
    rect(ctx, 122, 6, 3, 22, I.luggageStrap);
    rect(ctx, 108, 2, 10, 4, I.luggageStrap);
    rect(ctx, 152, 14, 24, 14, I.velvetDark);
    rect(ctx, 152, 14, 24, 1, I.velvet);
    rect(ctx, 300, 12, 40, 16, I.luggageStrap);
    rect(ctx, 300, 12, 40, 2, I.luggage);
    rect(ctx, LEFT, 28, RIGHT - LEFT, 2, I.brass);
    rect(ctx, LEFT, 28, RIGHT - LEFT, 1, I.brassLight);
    for (let x = LEFT; x < RIGHT; x += 4) pixel(ctx, x, 31, I.brass);
    rect(ctx, LEFT, 33, RIGHT - LEFT, 1, I.brass);
    for (let x = LEFT + 30; x < RIGHT; x += 110) rect(ctx, x, 26, 2, 10, I.brass);
  }

  function drawWindowFrame(ctx, w) {
    rect(ctx, w.x - 6, w.y - 6, w.w + 12, w.h + 12, I.frame);
    rect(ctx, w.x - 6, w.y - 6, w.w + 12, 1, I.frameLight);
    rect(ctx, w.x - 8, SILL, w.w + 16, 4, I.brass); // ambang jendela
    rect(ctx, w.x - 8, SILL, w.w + 16, 1, I.brassLight);
  }

  // Bayangan tipis di tepi kaca dan panel atas (transom), mirip dua baris terang di jendela luar.
  function drawGlassDetails(ctx, w) {
    rect(ctx, w.x, w.y, w.w, 1, I.shadow);
    rect(ctx, w.x, w.y, 1, w.h, I.shadow);
    rect(ctx, w.x, w.y + 18, w.w, 3, I.frame);
    rect(ctx, w.x, w.y + 18, w.w, 1, I.frameLight);
  }

  // Tetesan hujan yang mengalir di kaca, berhenti sebentar lalu meluncur lagi.
  function drawDroplets(ctx, view, w, wi, time, env, fade) {
    if (fade <= 0) return;
    withView(ctx, null, () => {
      ctx.globalAlpha = fade;
      for (let i = 0; i < 16; i++) {
        const id = wi * 50 + i;
        const period = 2.6 + 1.8 * hash(seed, id, 1);
        const phase = hash(seed, id, 2) * period;
        const local = time + phase;
        const cycle = Math.floor(local / period);
        if (hash(seed, id * 31 + cycle, 9) >= env.rainAt(cycle * period - phase)) continue;
        const u = (local - cycle * period) / period;
        const x0 = w.x + 4 + hash(seed, id * 7 + cycle, 3) * (w.w - 8);
        const y0 = w.y + 22 + hash(seed, id * 7 + cycle, 4) * w.h * 0.3;
        const travel = w.h * (0.35 + 0.45 * hash(seed, id * 7 + cycle, 5));
        // u - sin(...)/... selalu naik, tetapi berhenti sejenak tiga kali (gerak tersendat)
        const y = y0 + travel * (u - Math.sin(Math.PI * 2 * 3 * u) / (Math.PI * 2 * 3));
        if (y > w.y + w.h - 2) continue;
        const x = x0 - 0.12 * (y - y0);
        const trail = Math.min(6, Math.floor(y - y0));
        for (let k = 1; k <= trail; k++) {
          const [tx, ty] = toScreen(view, x + 0.12 * k, y - k);
          pixel(ctx, tx, ty, I.dropletTrail);
        }
        const [hx, hy] = toScreen(view, x, y);
        pixel(ctx, hx, hy, I.droplet);
        pixel(ctx, hx, hy + 1, I.dropletHi);
      }
      // butiran air yang baru menempel
      for (let i = 0; i < 22; i++) {
        const id = wi * 80 + i;
        const period = 1.4 + 1.6 * hash(seed, id, 11);
        const local = time + hash(seed, id, 12) * period;
        const cycle = Math.floor(local / period);
        if (hash(seed, id * 17 + cycle, 13) >= env.rainAt(cycle * period)) continue;
        const [bx, by] = toScreen(view, w.x + 2 + hash(seed, id * 5 + cycle, 14) * (w.w - 4), w.y + 2 + hash(seed, id * 5 + cycle, 15) * (w.h - 4));
        pixel(ctx, bx, by, I.droplet);
      }
      ctx.globalAlpha = 1;
    });
  }

  // Tirai beludru yang diikat, menggantung di tiang antar jendela.
  function drawPillarCurtains(ctx, x) {
    const top = GLASS_TOP - 8;
    const tie = GLASS_TOP + 56;
    rect(ctx, x - 2, top - 6, PILLAR + 4, 6, I.velvetDark);
    for (let y = top; y < SILL; y++) {
      const pinch = y >= tie && y < tie + 8 ? 4 : y >= tie + 8 ? Math.max(0, 6 - Math.floor((y - tie - 8) / 6)) : Math.floor((tie - y) / 14);
      rect(ctx, x + pinch, y, PILLAR - pinch * 2, 1, I.velvet);
      rect(ctx, x + pinch, y, 2, 1, I.velvetDark);
      rect(ctx, x + PILLAR - pinch - 2, y, 1, 1, I.velvetLight);
    }
    rect(ctx, x + 3, tie + 2, PILLAR - 6, 5, I.brass);
    rect(ctx, x + 3, tie + 2, PILLAR - 6, 1, I.brassLight);
  }

  function drawLamp(ctx, lamp, time, flicker) {
    const flick = flickAt(lamp, time, flicker);
    rect(ctx, lamp.x - 1, lamp.y + 6, 3, 10, I.brass);
    rect(ctx, lamp.x - 5, lamp.y + 14, 11, 3, I.brass);
    rect(ctx, lamp.x - 5, lamp.y + 14, 11, 1, I.brassLight);
    rect(ctx, lamp.x - 3, lamp.y - 8, 7, 14, 'rgba(255, 230, 170, 0.35)');
    rect(ctx, lamp.x - 3, lamp.y - 10, 7, 2, I.brass);
    const flame = flick > 0.6 ? 6 : flick > 0.25 ? 5 : 4;
    rect(ctx, lamp.x - 1, lamp.y + 4 - flame, 3, flame, I.flameCore);
    rect(ctx, lamp.x, lamp.y + 5 - flame, 1, flame - 1, I.flame);
  }

  // Cahaya hangat lampu di dinding, bertingkat seperti pixel art (bukan gradasi halus).
  function drawLampGlow(ctx, lamp, time, flicker) {
    const flick = flickAt(lamp, time, flicker) > 0.6 ? 1 : 0;
    disc(ctx, lamp.x, lamp.y, 70 + flick, 'rgba(255, 176, 92, 0.07)');
    disc(ctx, lamp.x, lamp.y, 44 + flick, 'rgba(255, 186, 104, 0.08)');
    disc(ctx, lamp.x, lamp.y, 22, 'rgba(255, 206, 130, 0.10)');
  }

  function drawSeat(ctx, seat) {
    const right = seat.facing === 'right';
    const backX = seat.x;
    // sandaran tinggi berlapis beludru, bingkai kayu di atas
    rect(ctx, backX - 2, SEAT - 80, 20, 6, I.wallDark);
    rect(ctx, backX - 2, SEAT - 80, 20, 1, I.wallShine);
    rect(ctx, backX, SEAT - 74, 16, 80, I.velvet);
    rect(ctx, right ? backX + 13 : backX, SEAT - 74, 3, 80, I.velvetLight);
    for (let y = SEAT - 66; y < SEAT; y += 12) pixel(ctx, backX + 8, y, I.velvetShine);
    // dudukan
    const cx = right ? backX + 4 : backX - 44;
    rect(ctx, cx, SEAT, 56, 10, I.velvet);
    rect(ctx, cx, SEAT, 56, 2, I.velvetShine);
    rect(ctx, cx, SEAT + 10, 56, 4, I.velvetDark);
    rect(ctx, cx + 2, SEAT + 14, 52, FLOOR - SEAT - 14, I.wallDark);
    rect(ctx, cx + 2, SEAT + 14, 52, 1, I.wainscotLight);
  }

  function drawFloor(ctx) {
    rect(ctx, LEFT, FLOOR, RIGHT - LEFT, 80, I.floor);
    rect(ctx, LEFT, FLOOR, RIGHT - LEFT, 2, I.floorDark);
    for (let y = FLOOR + 6; y < FLOOR + 80; y += 7) rect(ctx, LEFT, y, RIGHT - LEFT, 1, I.floorDark);
    for (let x = LEFT; x < RIGHT; x += 37) rect(ctx, x + ((x / 37) & 1) * 11, FLOOR + 2, 1, 78, I.floorLight);
  }

  return {
    windows,
    seatHeight: SEAT,

    // Kotak kaca jendela dalam koordinat ruangan.
    glassRect(id) {
      return windows.find((w) => w.id === id);
    },

    // options:
    // - view: { s, ox, oy } kamera interior (geser, guncangan, zoom)
    // - windowContent(ctx, rect, window): menggambar pemandangan luar di kotak kaca (koordinat layar)
    // - drawPassenger(ctx): menggambar penumpang di urutan yang tepat
    // - glassFade: 1 = tetesan, pantulan, dan vignette terlihat penuh,
    //   0 = hilang (dipakai saat kamera menembus kaca, supaya akhir transisi sama persis dengan adegan berikutnya)
    // - droplets / flicker: efek tetesan di kaca dan kedip lampu minyak (bisa dimatikan)
    render(ctx, { time, env, view, windowContent, drawPassenger, glassFade = 1, droplets = true, flicker = true }) {
      withView(ctx, view, () => {
        drawRoom(ctx);
        lamps.forEach((lamp) => drawLampGlow(ctx, lamp, time, flicker));
        windows.forEach((w, wi) => {
          drawWindowFrame(ctx, w);
          const [x0, y0] = toScreen(view, w.x, w.y);
          const [x1, y1] = toScreen(view, w.x + w.w, w.y + w.h);
          withView(ctx, null, () => windowContent(ctx, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, w));
          if (droplets) drawDroplets(ctx, view, w, wi, time, env, glassFade);
          drawGlassDetails(ctx, w);
        });
        // pantulan api lampu di kaca
        if (glassFade > 0) {
          ctx.globalAlpha = 0.5 * glassFade;
          rect(ctx, windows[1].x + 3, windows[1].y + 30, 2, 4, I.flameCore);
          rect(ctx, windows[3].x + 3, windows[3].y + 30, 2, 4, I.flameCore);
          ctx.globalAlpha = 1;
        }
        for (let i = 0; i < windows.length - 1; i++) drawPillarCurtains(ctx, windows[i].x + GLASS_W);
        lamps.forEach((lamp) => drawLamp(ctx, lamp, time, flicker));
        drawFloor(ctx);
        drawSeat(ctx, seats[0]);
        if (drawPassenger) drawPassenger(ctx);
        drawSeat(ctx, seats[1]);
        // koran terlipat di kursi seberang
        rect(ctx, 312, SEAT - 6, 18, 6, '#c8bca0');
        rect(ctx, 312, SEAT - 6, 18, 1, '#e6dcc4');
        rect(ctx, 316, SEAT - 4, 10, 1, '#6a6050');
      });
      if (glassFade > 0) {
        ctx.globalAlpha = glassFade;
        ctx.drawImage(vignette.canvas, 0, 0);
        ctx.globalAlpha = 1;
      }
    }
  };
}

function buildVignette(width, height) {
  const layer = createLayer(width, height);
  const image = layer.ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = (x - width / 2) / (width / 2);
      const dy = (y - height / 2) / (height / 2);
      const v = clamp((Math.sqrt(dx * dx * 0.9 + dy * dy) - 0.7) / 0.6, 0, 1);
      const i = (y * width + x) * 4;
      image.data[i] = 12; image.data[i + 1] = 6; image.data[i + 2] = 5;
      image.data[i + 3] = Math.round(v * v * 190);
    }
  }
  layer.ctx.putImageData(image, 0, 0);
  return layer;
}
