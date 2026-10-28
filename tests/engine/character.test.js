// Unit test Tahap 5: gerak natural rig karakter (V16) dan pencahayaan karakter dari palet (V15).
// Semua tanpa browser: rig digambar ke penyangga piksel biasa.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { walkCycle, walkPose, hipDrop, twoBone, armFromAngles, armAngles, raiseArm, WALK_PHASES } from '../../src/assets/characters/gait.js';
import { gradeRgb, createGrader, lightFromPalette, lightSide, createSpriteBuffer, flushLit } from '../../src/assets/characters/lighting.js';
import { createRigCharacter } from '../../src/assets/characters/rig.js';
import { createPaletteRamp } from '../../src/engine/palette.js';
import { withView, rect } from '../../src/engine/pixel.js';

const require = createRequire(import.meta.url);
const P = require('../../src/render/projects.cjs');

// Jalankan karakter berjalan dengan kecepatan tetap, kumpulkan data gerak per frame.
function walkFrames(probe, { x0 = 37.3, speed = 1.07, dir = 1, frames = 240 } = {}) {
  const out = [];
  for (let f = 0; f < frames; f++) out.push(probe(x0 + dir * speed * f, dir, f));
  return out;
}

// Telapak yang menapak dikelompokkan per (kaki, langkah); posisinya di dunia harus satu nilai saja.
function slides(samples) {
  const plants = new Map();
  for (const s of samples) for (const f of s.feet) {
    const key = `${f.foot}:${f.step}`;
    if (!plants.has(key)) plants.set(key, []);
    plants.get(key).push(f.x);
  }
  return [...plants.values()].filter((xs) => xs.length > 1).map((xs) => Math.max(...xs) - Math.min(...xs));
}

// Pola a, b, a pada tiga frame berturut-turut (nilai bolak-balik satu frame) = getar.
const flipFlops = (values) => values.filter((v, i) => i > 0 && i < values.length - 1 && values[i - 1] === values[i + 1] && v !== values[i - 1]).length;

const natural = (legLen, strideLength, speed = 0) => (worldX, dir) => {
  const g = walkPose(worldX, dir, { legLen, strideLength, speed });
  const feet = [['front', g.front], ['back', g.back]].filter(([, f]) => f.planted).map(([foot, f]) => ({ foot, step: f.step, x: Math.round(worldX) + dir * f.dx }));
  // posisi dunia kedua telapak (yang menapak maupun yang melayang): inilah yang terlihat di layar bila kamera diam
  const world = { front: Math.round(worldX) + dir * g.front.dx, back: Math.round(worldX) + dir * g.back.dx };
  return { feet, bob: g.drop, g, world };
};

test('siklus jalan tetap 8 fase dan berurutan mengikuti jarak tempuh', () => {
  assert.equal(WALK_PHASES.length, 8);
  const seen = walkFrames((x, dir) => walkPose(x, dir, { legLen: 18, strideLength: 30 }).phase, { x0: 0, speed: 0.5, frames: 120 });
  for (let i = 1; i < seen.length; i++) assert.ok(seen[i] === seen[i - 1] || seen[i] === (seen[i - 1] + 1) % 8, `fase melompat di frame ${i}`);
  assert.deepEqual([...new Set(seen)].sort(), [0, 1, 2, 3, 4, 5, 6, 7]);
});

test('telapak yang menapak diam di tanah (tidak meluncur) untuk berbagai langkah, kecepatan, dan arah', () => {
  for (const [legLen, stride] of [[18, 30], [16, 22], [13, 24], [17, 18], [18, 26], [25, 60]]) {
    for (const dir of [1, -1]) {
      for (const speed of [0.4, 1.07, 1.55, 3]) {
        const s = slides(walkFrames(natural(legLen, stride), { speed, dir }));
        assert.ok(s.length > 4, 'ada langkah yang diperiksa');
        assert.equal(Math.max(...s), 0, `kaki ${legLen}, langkah ${stride}, arah ${dir}, kecepatan ${speed}: meluncur ${Math.max(...s)} px`);
      }
    }
  }
});

test('setiap saat tepat satu telapak menapak, dan telapak yang terangkat tidak menapak', () => {
  const frames = walkFrames((x, dir) => walkPose(x, dir, { legLen: 18, strideLength: 30 }), { speed: 0.7, frames: 200 });
  for (const g of frames) {
    assert.equal([g.front, g.back].filter((f) => f.planted).length, 1);
    for (const f of [g.front, g.back]) if (f.planted) assert.equal(f.lift, 0);
  }
  assert.ok(frames.some((g) => g.front.lift > 0) && frames.some((g) => g.back.lift > 0), 'kaki yang melayang terangkat');
});

test('ayunan lengan sinkron dan berlawanan dengan kaki di sisinya', () => {
  const cyc = walkCycle({ legLen: 18, strideLength: 30 });
  // fase 0: kaki dekat menapak di depan, lengan dekat di belakang
  const contact = walkPose(0.01, 1, { legLen: 18, strideLength: 30 });
  assert.equal(contact.phase, 0);
  assert.ok(contact.front.dx > 0 && contact.back.dx < 0);
  assert.ok(contact.swing < -0.99);
  // setengah siklus kemudian: kaki jauh di depan, lengan dekat di depan
  const half = walkPose(cyc.cycle / 2 + 0.01, 1, { legLen: 18, strideLength: 30 });
  assert.equal(half.phase, 4);
  assert.ok(half.back.dx > 0 && half.front.dx < 0);
  assert.ok(half.swing > 0.99);
  // lengan dekat dan lengan jauh selalu berlawanan, dan sudut lengan mengikuti kaki di sisi lain
  for (let x = 0; x < cyc.cycle; x += 0.5) {
    const g = walkPose(x, 1, { legLen: 18, strideLength: 30 });
    const front = armAngles('swing', g.swing).angle;
    const back = armAngles('swing', -g.swing).angle;
    assert.ok(Math.abs(front + back) < 1e-9);
  }
});

test('langkah dibatasi panjang kaki: siklus memendek, kaki tidak dipaksa meluncur', () => {
  const c = walkCycle({ legLen: 12, strideLength: 60 });
  assert.ok(c.reach <= 12 * 0.45 + 1e-9);
  assert.equal(c.cycle, c.reach * 4);
  assert.deepEqual(walkCycle({ legLen: 18, strideLength: 30 }), { cycle: 30, reach: 7.5, lift: 2 });
});

test('pinggul naik-turun paling banyak 1 piksel, telapak tidak pernah mundur, tanpa getar bolak-balik', () => {
  for (const [legLen, stride, speed] of [[18, 30, 1.07], [16, 22, 0.84], [13, 24, 1.55], [17, 18, 0.72], [18, 30, 2.5]]) {
    for (const dir of [1, -1]) {
      const frames = walkFrames(natural(legLen, stride, speed), { speed, dir, frames: 300 });
      const bob = frames.map((f) => f.bob);
      assert.ok(Math.max(...bob) <= 1, `bob sampai ${Math.max(...bob)}`);
      assert.equal(flipFlops(bob), 0, `kaki ${legLen}, kecepatan ${speed}: pinggul bergetar`);
      for (const key of ['front', 'back']) {
        const xs = frames.map((f) => f.world[key] * dir);
        for (let i = 1; i < xs.length; i++) assert.ok(xs[i] >= xs[i - 1], `telapak ${key} mundur di frame ${i}`);
        assert.equal(flipFlops(frames.map((f) => f.world[key])), 0);
      }
    }
  }
  // karakter berkaki panjang turun 1 piksel di sekitar kontak; kaki pendek dengan langkah kecil tidak turun
  assert.equal(hipDrop(0, 7.5, 17), 1);
  assert.equal(hipDrop(0.25, 7.5, 17), 0);
  assert.equal(hipDrop(0, 4.5, 16), 0);
  // berlari (jendela turun kurang dari 2 frame): pinggul tidak diturunkan
  assert.equal(hipDrop(0, 7.5, 17, 1.07), 1);
  assert.equal(hipDrop(0, 7.5, 17, 3), 0);
});

test('dua tulang: panjang tetap, lutut menekuk ke depan, siku ke belakang', () => {
  const hip = { x: 0, y: 0 };
  const knee = twoBone(hip, { x: 0, y: 12 }, 8, 8, -1);
  assert.ok(Math.abs(Math.hypot(knee.joint.x, knee.joint.y) - 8) < 1e-9);
  assert.ok(Math.abs(Math.hypot(knee.joint.x - 0, knee.joint.y - 12) - 8) < 1e-9);
  assert.ok(knee.joint.x > 0, 'lutut di depan');
  const elbow = twoBone(hip, { x: 0, y: 9 }, 6, 6, 1);
  assert.ok(elbow.joint.x < 0, 'siku di belakang');
  const far = twoBone(hip, { x: 30, y: 0 }, 6, 6, 1);
  assert.deepEqual(far.end, { x: 12, y: 0 }); // target terlalu jauh: lurus ke arah target
});

test('pose lengan dan isyarat: siku menekuk, lambaian mengangkat tangan ke atas kepala', () => {
  const shoulder = { x: 0, y: 0 };
  const forward = armAngles('swing', 1);
  const backward = armAngles('swing', -1);
  assert.ok(forward.bend > backward.bend, 'siku lebih menekuk saat lengan di depan');
  const f = armFromAngles(shoulder, 6, 6, forward.angle, forward.bend);
  const b = armFromAngles(shoulder, 6, 6, backward.angle, backward.bend);
  assert.ok(f.hand.x > 6 && b.hand.x < -4, `tangan depan ${f.hand.x.toFixed(1)}, belakang ${b.hand.x.toFixed(1)}`);
  assert.ok(f.hand.y < b.hand.y, 'tangan naik saat terayun ke depan');
  const carry = armAngles('carry', 0);
  assert.ok(Math.abs(carry.angle + carry.bend - 88) < 1e-9, 'lengan bawah mendatar');
  assert.ok(armAngles('behind', 0).angle < -30);
  assert.deepEqual(raiseArm(armAngles('hang', 0), 0), { angle: -8, bend: 10 });
  const up = raiseArm(armAngles('swing', 0), 1);
  const hand = armFromAngles(shoulder, 6, 6, up.angle, up.bend).hand;
  assert.ok(hand.y < -10, `tangan di atas bahu (${hand.y.toFixed(1)})`);
  assert.throws(() => armAngles('terbang', 0), /tidak dikenal/);
});

test('pencahayaan netral tidak mengubah warna, dan hasilnya selalu sama', () => {
  for (let v = 0; v < 256; v += 5) assert.deepEqual(gradeRgb([v, 255 - v, (v * 7) % 256], [255, 255, 255], [0, 0, 0]), [v, 255 - v, (v * 7) % 256]);
  const g = createGrader({ light: '#ffffff', lift: '#000000', rim: '#000000' });
  assert.equal(g.color('#c48a5c'), '#c48a5c');
  assert.equal(g.rim('#c48a5c'), '#c48a5c');
  const night = { light: '#58669a', lift: '#0c1026', rim: '#1c2848' };
  const a = createGrader(night);
  const b = createGrader(night);
  assert.equal(a.color('#ece6d6'), b.color('#ece6d6'));
  assert.equal(a.color('#ece6d6'), a.color('#ece6d6'));
  assert.notEqual(a.color('#ece6d6'), '#ece6d6');
  assert.equal(createGrader({ light: '#ffffff', lift: '#000000', rim: '#808080' }).rim('#c0c0c0'), '#ffffff'); // dibatasi 255
});

test('warna cahaya diambil dari palet; kunci yang tidak ada atau salah dianggap netral', () => {
  assert.deepEqual(lightFromPalette({ figureLight: '#f2c49a', figureLift: '#1a0c1e', figureRim: '#5a2c0c' }, 'figure'), { light: '#f2c49a', lift: '#1a0c1e', rim: '#5a2c0c' });
  assert.deepEqual(lightFromPalette({ figureLight: 'oranye' }, 'figure'), { light: '#ffffff', lift: '#000000', rim: '#000000' });
  assert.deepEqual(lightFromPalette(undefined, 'figure'), { light: '#ffffff', lift: '#000000', rim: '#000000' });
});

test('sisi cahaya tepi mengikuti arah dunia, juga saat karakter dicerminkan', () => {
  assert.equal(lightSide(-1, false), -1);
  assert.equal(lightSide(-1, true), 1);
  assert.equal(lightSide(1, false), 1);
  assert.equal(lightSide(0.2, false), 0);
  assert.equal(lightSide(-0.2, true), 0);
});

test('warna karakter berubah searah di sepanjang tangga palet (tidak berkedip)', () => {
  const ramp = createPaletteRamp({ figureLight: '#f2c49a', figureLift: '#1a0c1e', figureRim: '#5a2c0c' }, { figureLight: '#58669a', figureLift: '#0c1026', figureRim: '#1c2848' }, 24);
  const luma = (hex) => { const n = parseInt(hex.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); };
  for (const base of ['#ece6d6', '#c48a5c', '#5a4a3a', '#3f8a86']) {
    let previous = Infinity;
    const values = [];
    for (let frame = 0; frame <= 100; frame++) {
      const pal = ramp.at(ramp.index(frame / 100));
      const hex = createGrader(lightFromPalette(pal, 'figure')).color(base);
      values.push(hex);
      assert.ok(luma(hex) <= previous + 1e-9, `${base}: kecerahan naik lagi di frame ${frame}`);
      previous = luma(hex);
    }
    assert.equal(flipFlops(values), 0);
  }
});

// target palsu: mencatat piksel akhir di koordinat lokal karakter
function canvasLike() {
  const px = new Map();
  return { px, pixelView: null, fillStyle: '#000000', fillRect(x, y, w, h) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) px.set(`${xx},${yy}`, this.fillStyle); } };
}

test('penyangga piksel menulis ulang gambar persis sama bila cahayanya netral', () => {
  const draw = (ctx) => {
    rect(ctx, 2, 3, 5, 4, '#112233');
    rect(ctx, 4, 4, 3, 1, '#445566');
    rect(ctx, -3, 10, 2, 2, '#778899');
  };
  const direct = canvasLike();
  withView(direct, { s: 1, ox: 0, oy: 0 }, () => draw(direct));
  const buffer = createSpriteBuffer(10, 10, 4);
  withView(buffer.ctx, buffer.view, () => draw(buffer.ctx));
  const out = canvasLike();
  withView(out, { s: 1, ox: 0, oy: 0 }, () => flushLit(buffer, out, createGrader({ light: '#ffffff', lift: '#000000', rim: '#000000' }), 1));
  assert.deepEqual([...out.px.entries()].sort(), [...direct.px.entries()].sort());
  // cahaya tepi dari kanan hanya mengenai piksel paling kanan setiap baris
  const lit = canvasLike();
  withView(lit, { s: 1, ox: 0, oy: 0 }, () => flushLit(buffer, lit, createGrader({ light: '#ffffff', lift: '#000000', rim: '#101010' }), 1));
  assert.equal(lit.px.get('6,3'), '#213243');
  assert.equal(lit.px.get('5,3'), '#112233');
});

// ---------- rig karakter ----------
const DARTO = {
  height: 44, build: 'regular', sleeves: 'long', hat: 'peci', accessory: 'parcel', skin: '#c48a5c', skinShade: '#97633e',
  shirt: '#ece6d6', shirtShade: '#c4bca8', collar: '#c4bca8', pants: '#5a4a3a', pantsShade: '#40352a', shoes: '#2a211b',
  hatColor: '#1c1a1e', hatShade: '#33303a', accessoryColor: '#b98a52', accessoryShade: '#8a6236', strideLength: 30, seed: 11
};
const STATES = ['idle', 'stand', 'walk', 'seated', 'gesture', 'cycle', 'sweep'];

function drawRig(def, e, fc = { pal: {}, env: {} }) {
  const rig = createRigCharacter(def);
  const buffer = createSpriteBuffer(26, def.height + 8, 12);
  withView(buffer.ctx, buffer.view, () => rig.draw(buffer.ctx, { params: {}, time: 0, worldX: 0, flip: false, ...e }, fc));
  const filled = [];
  for (let y = -12; y < def.height + 20; y++) for (let x = -12; x < 38; x++) if (buffer.at(x, y)) filled.push([x, y, buffer.at(x, y)]);
  return filled;
}

test('rig natural: semua status tetap bisa digambar, di dalam batas, dengan banyak aksesori', () => {
  for (const accessory of ['none', 'basket', 'parcel', 'bag', 'broom', 'newspaper']) {
    for (const sarong of [null, '#6a4a8a']) {
      for (const state of STATES) {
        for (const [x, flip] of [[0, false], [11.4, true], [23.9, false]]) {
          const px = drawRig({ ...DARTO, accessory, sarong, motion: 'natural' }, { state, worldX: x, flip, params: { gesture: 0.6, headTurn: 0.9 } });
          assert.ok(px.length > 200, `${accessory}/${state}: ${px.length} piksel`);
          for (const [px0, py] of px) assert.ok(px0 >= -8 && px0 < 34 && py >= -8 && py <= 53, `${accessory}/${state}: piksel di luar batas (${px0}, ${py})`);
        }
      }
    }
  }
});

test('rig natural berbeda dari klasik, dan klasik tetap bawaan', () => {
  const classic = drawRig(DARTO, { state: 'walk', worldX: 5 });
  assert.deepEqual(drawRig({ ...DARTO, motion: 'classic' }, { state: 'walk', worldX: 5 }), classic);
  assert.notDeepEqual(drawRig({ ...DARTO, motion: 'natural' }, { state: 'walk', worldX: 5 }), classic);
  // pilihan per entitas lewat params menimpa aset
  assert.deepEqual(drawRig({ ...DARTO, motion: 'natural' }, { state: 'walk', worldX: 5, params: { motion: 'classic' } }), classic);
});

test('skala entitas: langkah dihitung dalam piksel lokal, sisa pembulatan telapak kurang dari skala', () => {
  for (const scale of [2, 3]) {
    const s = slides(walkFrames((worldX, dir) => {
      const g = walkPose(worldX, dir, { legLen: 18, strideLength: 30, scale });
      return { feet: [['front', g.front], ['back', g.back]].filter(([, f]) => f.planted).map(([foot, f]) => ({ foot, step: f.step, x: Math.round(worldX) + dir * f.dx * scale })) };
    }, { speed: 1.07 * scale, frames: 300 }));
    assert.ok(s.length > 4);
    assert.ok(Math.max(...s) <= scale - 1, `skala ${scale}: bergeser ${Math.max(...s)} piksel dunia`);
  }
  // skala 1 tetap persis sama dengan tanpa skala
  assert.deepEqual(walkPose(37.3, 1, { legLen: 18, strideLength: 30, scale: 1 }), walkPose(37.3, 1, { legLen: 18, strideLength: 30 }));
  const rig = createRigCharacter({ ...DARTO, motion: 'natural' });
  assert.equal(rig.motionProbe({ state: 'walk', worldX: 3, params: {}, scale: 2 }).strict, false);
  assert.equal(rig.motionProbe({ state: 'walk', worldX: 3, params: {} }).strict, true);
});

test('rig: gerak natural tidak meluncur, gerak klasik Tahap 3 meluncur (diukur lewat motionProbe)', () => {
  for (const [motion, expectSlide] of [['natural', false], ['classic', true]]) {
    const rig = createRigCharacter({ ...DARTO, motion });
    for (const dir of [1, -1]) {
      const samples = walkFrames((worldX) => rig.motionProbe({ state: 'walk', worldX, flip: dir < 0, params: {} }), { dir, speed: 1.07 });
      const s = slides(samples);
      if (expectSlide) assert.ok(Math.max(...s) >= 5, `klasik meluncur ${Math.max(...s)} px`);
      else assert.equal(Math.max(...s), 0);
      assert.equal(samples[0].strict, motion === 'natural');
    }
  }
  assert.equal(createRigCharacter(DARTO).motionProbe({ state: 'idle', worldX: 0, params: {} }), null);
});

test('rig diterangi: warna mengikuti palet frame, warna identitas ikut palet, tanpa light tetap sama', () => {
  const lit = { ...DARTO, motion: 'natural', light: 'figure' };
  const night = { figureLight: '#58669a', figureLift: '#0c1026', figureRim: '#1c2848' };
  const day = { figureLight: '#ffffff', figureLift: '#000000', figureRim: '#000000' };
  const colors = (px) => new Set(px.map((p) => p[2]));
  const plain = drawRig({ ...DARTO, motion: 'natural' }, { state: 'idle' });
  assert.deepEqual(drawRig(lit, { state: 'idle' }, { pal: day, env: {} }), plain);
  const dark = drawRig(lit, { state: 'idle' }, { pal: night, env: {} });
  assert.equal(dark.length, plain.length, 'bentuk tidak berubah');
  assert.ok(!colors(dark).has('#ece6d6'), 'warna dasar baju tidak tersisa');
  const rig = createRigCharacter(lit);
  assert.deepEqual(rig.identityColors(), ['#ece6d6', '#5a4a3a', '#1c1a1e']);
  const ids = rig.identityColors({ pal: night });
  assert.equal(ids.length, 3);
  for (const hex of ids) assert.ok(colors(dark).has(hex), `warna identitas ${hex} tampil`);
  assert.deepEqual(createRigCharacter(DARTO).identityColors({ pal: night }), ['#ece6d6', '#5a4a3a', '#1c1a1e']);
});

test('rig diterangi: cahaya tepi pindah sisi mengikuti arah dunia dan track lingkungan', () => {
  const lit = { ...DARTO, light: 'figure', lightTrack: 'arah' };
  const pal = { figureLight: '#ffffff', figureLift: '#000000', figureRim: '#404040' };
  const rimmed = (e) => drawRig(lit, { state: 'stand', ...e }, { pal, env: e.env }).filter((p) => !drawRig(DARTO, { state: 'stand', ...e }).some((q) => q[0] === p[0] && q[1] === p[1] && q[2] === p[2]));
  const fromLeft = rimmed({ env: { arah: -1 } });
  const fromRight = rimmed({ env: { arah: 1 } });
  const meanX = (px) => px.reduce((s, p) => s + p[0], 0) / px.length;
  assert.ok(fromLeft.length > 10 && fromRight.length > 10);
  assert.ok(meanX(fromLeft) < meanX(fromRight), 'tepi kiri vs kanan');
  // params entitas menimpa track
  assert.deepEqual(rimmed({ env: { arah: -1 }, params: { lightDirection: 1 } }), fromRight);
});

// ---------- validasi konfigurasi ----------
function project(mutate) {
  const raw = {
    id: 'lab', name: 'lab', title: 'Lab', seed: 1, width: 480, height: 270, outputWidth: 1920, outputHeight: 1080,
    fps: 30, durationSeconds: 2, rendering: { upscale: 'browser' },
    palettes: { pagi: { figureLight: '#f6e6dc', figureLift: '#0a0a18', figureRim: '#3c2a10' } },
    lighting: { from: 'pagi', to: 'pagi', track: 'arah' },
    environment: { arah: [[0, -1]] },
    assets: { pak: { type: 'rig-character', motion: 'natural', light: 'figure', lightTrack: 'arah', frontArm: 'carry' } },
    stages: { jalan: { layers: [{ id: 'trotoar' }], entities: [] } },
    cast: { pak: { asset: 'pak', layer: 'trotoar', position: [100, 200], state: 'walk', motion: { x: [[0, 100], [59, 160]] } } },
    timeline: { scenes: [{ id: 'satu', name: 'Satu', module: 'compose', stage: 'jalan', start: 0, end: 2, cast: ['pak'], camera: { type: 'keys', x: [[0, 0]] } }] }
  };
  mutate(raw);
  return P.buildProject(raw, P.ROOT + '/config/lab.json', { strict: false }).timelineIssues;
}

test('konfigurasi gerak dan cahaya karakter yang benar diterima', () => {
  assert.deepEqual(project(() => {}), []);
});

test('konfigurasi gerak dan cahaya karakter yang salah ditolak dengan pesan jelas', () => {
  const expectIssue = (mutate, pattern) => {
    const issues = project(mutate);
    assert.ok(issues.some((i) => pattern.test(i)), `tidak ada pesan ${pattern}; masalah: ${issues.join(' | ')}`);
  };
  expectIssue((r) => { r.assets.pak.motion = 'melayang'; }, /motion: nilai "melayang" bukan salah satu dari: classic, natural/);
  expectIssue((r) => { r.assets.pak.frontArm = 'terbang'; }, /frontArm: nilai "terbang" bukan salah satu dari/);
  expectIssue((r) => { r.assets.pak.armSwing = 5; }, /armSwing: nilai 5 lebih besar dari batas 2/);
  expectIssue((r) => { delete r.palettes.pagi.figureRim; }, /palet "pagi" belum punya warna: figureRim/);
  expectIssue((r) => { r.cast.pak.params = { light: 'senter' }; }, /palet "pagi" belum punya warna: senterLight, senterLift, senterRim/);
  expectIssue((r) => { r.assets.pak.lightDirection = -2; }, /lightDirection: nilai -2 lebih kecil dari batas -1/);
  expectIssue((r) => { r.cast.pak.paramTracks = { lightDirection: [[0, 0], [10, 3]] }; }, /paramTracks\.lightDirection key 1: nilai 3 di luar batas -1\.\.1/);
  expectIssue((r) => { r.assets.pak.lightTrack = 'matahari-hantu'; }, /track lingkungan "matahari-hantu" tidak ada di bagian environment/);
});
