// Unit test T19: data pose rig (poseProbe), soket benda, letak kotak gambar (layoutAt), dan analisis pose-checks.cjs.
// Semua tanpa browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createRigCharacter } from '../../src/assets/characters/rig.js';
import { createSpriteBuffer } from '../../src/assets/characters/lighting.js';
import { assetTypes as vehicleTypes } from '../../src/assets/town/vehicles.js';
import { assetTypes as propTypes } from '../../src/assets/town/props.js';
import { createComposedScene, placementOf } from '../../src/engine/composer.js';
import { createEnvironment } from '../../src/engine/environment.js';
import { withView } from '../../src/engine/pixel.js';

const require = createRequire(import.meta.url);
const PC = require('../../src/render/pose-checks.cjs');
const C = require('../../src/render/checks.cjs');
const KNOWN = require('../../src/render/known-issues.cjs');
const P = require('../../src/render/projects.cjs');

const BASE = {
  height: 44, build: 'regular', sleeves: 'long', hat: 'peci', skin: '#c48a5c', skinShade: '#97633e',
  shirt: '#ece6d6', shirtShade: '#c4bca8', collar: '#c4bca8', pants: '#5a4a3a', pantsShade: '#40352a', shoes: '#2a211b',
  hatColor: '#1c1a1e', hatShade: '#33303a', accessoryColor: '#b98a52', accessoryShade: '#8a6236', strideLength: 30, seed: 11
};
const STATES = ['idle', 'stand', 'walk', 'seated', 'gesture', 'cycle', 'sweep'];
const ACCESSORIES = ['none', 'basket', 'parcel', 'bag', 'broom', 'newspaper'];

// Gambar rig ke penyangga piksel, hasil: daftar sel terisi beserta warnanya.
function pixels(rig, e, fc = { pal: {}, env: {} }) {
  const buffer = createSpriteBuffer(26, 60, 14);
  withView(buffer.ctx, buffer.view, () => rig.draw(buffer.ctx, e, fc));
  const out = [];
  for (let y = -14; y < 74; y++) for (let x = -14; x < 40; x++) if (buffer.at(x, y)) out.push(`${x},${y},${buffer.at(x, y)}`);
  return out;
}
const entity = (state, worldX, flip, params = {}) => ({ state, worldX, flip, speedX: 1.07, scale: 1, time: worldX / 30, params });

test('poseProbe tidak mengubah gambar: semua status, aksesori, arah, sarung, dengan dan tanpa cahaya', () => {
  for (const accessory of ACCESSORIES) {
    for (const sarong of [null, '#6a4a8a']) {
      for (const light of [null, 'figure']) {
        const def = { ...BASE, accessory, sarong, motion: 'natural', light };
        const fresh = createRigCharacter(def);
        const probed = createRigCharacter(def);
        const fc = { pal: { figureLight: '#e0d0c0', figureLift: '#101010', figureRim: '#202020' }, env: {} };
        for (const state of STATES) {
          for (const [x, flip] of [[0, false], [11.4, true], [23.9, false]]) {
            const e = entity(state, x, flip, { gesture: 0.6, headTurn: 0.9 });
            const before = pixels(probed, e, fc);
            const pose = probed.poseProbe(e);
            assert.equal(pose.mode, 'natural');
            assert.ok(pose.items.some((it) => it.kind === 'body') && pose.items.filter((it) => it.kind === 'arm').length === 2, `${accessory}/${state}: data badan atau lengan tidak lengkap`);
            assert.deepEqual(pixels(probed, e, fc), before, `${accessory}/${state}/${sarong}/${light}: gambar berubah setelah poseProbe`);
            assert.deepEqual(before, pixels(fresh, e, fc), `${accessory}/${state}: gambar berbeda dari rig yang tidak pernah diprobe`);
          }
        }
      }
    }
  }
});

test('gerak klasik tidak diukur dan gambarnya tidak berubah oleh poseProbe', () => {
  const rig = createRigCharacter({ ...BASE, accessory: 'broom' });
  for (const state of STATES) {
    const e = entity(state, 7.3, false, { gesture: 0.4 });
    const before = pixels(rig, e);
    assert.deepEqual(rig.poseProbe(e), { mode: 'classic', state });
    assert.deepEqual(pixels(rig, e), before);
  }
  // params entitas bisa memilih natural untuk aset klasik, dan sebaliknya
  assert.equal(rig.poseProbe(entity('walk', 3, false, { motion: 'natural' })).mode, 'natural');
  assert.equal(createRigCharacter({ ...BASE, motion: 'natural' }).poseProbe(entity('walk', 3, false, { motion: 'classic' })).mode, 'classic');
});

test('data pose sesuai piksel: tangan dekat dan sepatu dekat ada di tempat yang dilaporkan', () => {
  const rig = createRigCharacter({ ...BASE, accessory: 'none', motion: 'natural' });
  for (const state of ['idle', 'walk', 'gesture']) {
    for (let i = 0; i < 40; i++) {
      const e = entity(state, i * 0.9, false, { gesture: (i % 10) / 10 });
      const px = new Set(pixels(rig, e));
      const items = rig.poseProbe(e).items;
      const hand = items.find((it) => it.kind === 'arm' && it.front).hand;
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) assert.ok(px.has(`${hand.x + dx},${hand.y + dy},${BASE.skin}`), `${state} ${i}: tangan dekat tidak di (${hand.x}, ${hand.y})`);
      const leg = items.find((it) => it.kind === 'leg' && it.front);
      for (let dx = -1; dx <= 2; dx++) assert.ok(px.has(`${leg.ankle.x + dx},${leg.ankle.y},${BASE.shoes}`), `${state} ${i}: sepatu dekat tidak di pergelangan`);
    }
  }
});

test('tulang dari pemecah tepat sama panjang dengan desain, ruas tergambar hanya selisih pembulatan', () => {
  let poses = 0;
  for (let height = 28; height <= 64; height += 6) {
    for (const strideLength of [14, 22, 30, 44]) {
      for (const build of ['slim', 'stout']) {
        const rig = createRigCharacter({ ...BASE, height, strideLength, build, accessory: 'broom', motion: 'natural' });
        for (const state of ['walk', 'idle', 'gesture', 'seated', 'cycle', 'sweep']) {
          for (let i = 0; i < 48; i++) {
            const e = entity(state, i * 0.83, i % 2 === 1, { gesture: (i % 11) / 10, phaseOffset: 3 });
            const box = { left: 100, top: 100, right: 126, w: 26, h: height + 8, scale: 1, flip: e.flip };
            const res = PC.poseChecks([{ x: { place: box, pose: rig.poseProbe(e) } }]);
            const limbs = res.find((r) => r.id === 'motion-limbs');
            assert.equal(C.statusOf(limbs), 'pass', `tinggi ${height}, langkah ${strideLength}, ${build}, ${state}, ${i}: ${limbs.detail}`);
            assert.equal(C.statusOf(res.find((r) => r.id === 'motion-joints')), 'pass');
            poses++;
          }
        }
      }
    }
  }
  assert.ok(poses > 1000);
});

test('soket sepeda (setang, sadel, pedal) tepat pada piksel yang digambar', () => {
  const pal = new Proxy({}, { get: (t, k) => (typeof k === 'string' ? `@${k}` : undefined) });
  for (const wheelRadius of [7, 8, 10]) {
    const bike = vehicleTypes.bicycle.create({ wheelRadius, color: 'bikeFrame' });
    for (let i = 0; i < 24; i++) {
      const e = { worldX: i * 1.7, flip: false };
      const buffer = createSpriteBuffer(60, 40, 4);
      withView(buffer.ctx, buffer.view, () => bike.draw(buffer.ctx, e, { pal }));
      const s = bike.sockets(e);
      const cells = (b) => Array.from({ length: b.w * b.h }, (_, k) => buffer.at(b.x + (k % b.w), b.y + Math.floor(k / b.w)));
      assert.ok(cells(s.grip).every((c) => c === '@bikeFrame'), `setang r${wheelRadius} ${i}`);
      assert.ok(cells(s.seat).every((c) => c === '@saddle'), `sadel r${wheelRadius} ${i}`);
      assert.ok(cells(s.pedal).every((c) => c === '@bikeFrame'), `pedal r${wheelRadius} ${i}`);
    }
  }
});

test('pengayuh natural (V29): kedua tangan di setang sepeda, siku tetap sedikit menekuk', () => {
  // pemasangan asli character-lab: pengayuh anak sepeda di posisi relatif cast, keduanya anchor bawah-tengah
  const config = P.loadProject('character-lab');
  const mount = config.cast.pengayuh;
  const bikeCast = config.cast[mount.parent];
  const bike = vehicleTypes.bicycle.create(config.assets[bikeCast.asset]);
  const placed = (st, size) => placementOf({ scale: 1, anchor: [0.5, 1] }, st, size);
  const frameAt = (bx, riderDef, params = {}) => {
    const rider = createRigCharacter(riderDef);
    const b = { worldX: bx, worldY: bikeCast.position[1], flip: false, params: {} };
    const r = { state: 'cycle', worldX: bx + mount.position[0], worldY: b.worldY + mount.position[1], flip: false, speedX: 3.7, scale: 1, time: bx / 111, params: { ...mount.params, ...params } };
    return {
      sepeda: { place: placed(b, bike.size()), pose: null, sockets: bike.sockets(b) },
      pengayuh: { parent: 'sepeda', place: placed(r, rider.size()), pose: rider.poseProbe(r) }
    };
  };
  const frames = Array.from({ length: 40 }, (_, i) => frameAt(250 + i * 3.7, config.assets[mount.asset]));
  // tanpa daftar KNOWN ISSUE apa pun: kedua tangan wajib di dalam toleransi soket grip (jarak sel paling banyak 1)
  const res = PC.poseChecks(frames, { knownIssues: [] });
  const contact = res.find((r) => r.id === 'motion-contact');
  assert.equal(C.statusOf(contact), 'pass', contact.detail);
  assert.match(contact.detail, /cycle:hand-grip 80/);
  for (const id of ['motion-joints', 'motion-limbs', 'motion-seat', 'motion-stable']) assert.equal(C.statusOf(res.find((r) => r.id === id)), 'pass', id);
  for (const f of frames) {
    const arms = f.pengayuh.pose.items.filter((it) => it.kind === 'arm');
    assert.equal(arms.length, 2);
    for (const a of arms) {
      // target di dalam jangkauan: tangan tepat di target, bukan lengan lurus yang berhenti sebelum target
      assert.deepEqual(a.hand, a.target);
      assert.ok(Math.hypot(a.target.x - a.rawShoulder.x, a.target.y - a.rawShoulder.y) < a.upper + a.lower - 0.25);
      // siku menekuk: jauh dari garis bahu-tangan, dan tidak lebih rendah dari tangan
      const [s, e, h] = [a.rawShoulder, a.rawElbow, a.rawHand];
      const off = Math.abs((h.x - s.x) * (e.y - s.y) - (h.y - s.y) * (e.x - s.x)) / Math.hypot(h.x - s.x, h.y - s.y);
      assert.ok(off >= 1, `siku hampir lurus (${off.toFixed(2)} px)`);
      assert.ok(a.elbow.y <= a.hand.y, 'siku lebih rendah dari tangan');
    }
  }
  // gripX/gripDrop menggeser target tangan bersama setangnya: 2 baris lebih tinggi = tangan 2 baris lebih tinggi
  const hands = (f) => f.pengayuh.pose.items.filter((it) => it.kind === 'arm').map((a) => a.hand);
  const moved = frameAt(260, config.assets[mount.asset], { gripDrop: 15 });
  assert.deepEqual(hands(moved), hands(frameAt(260, config.assets[mount.asset])).map((q) => ({ x: q.x, y: q.y - 2 })));
});

test('penyapu natural (V30): ujung lengan jauh sampai ke tangan jauh di gagang, siku menekuk, di semua tinggi dan bentuk badan', () => {
  const config = P.loadProject('character-lab');
  const sweeper = config.assets[config.cast.penyapu.asset];
  for (const height of [30, 34, 38, 41, 44, 48, 52, 56]) {
    for (const build of ['slim', 'regular', 'stout']) {
      const rig = createRigCharacter({ ...sweeper, height, build, light: null });
      const size = rig.size();
      for (const flip of [false, true]) {
        // 45 frame = lebih dari satu siklus sapu (periode 2 pi / 5 detik)
        const frames = Array.from({ length: 45 }, (_, i) => {
          const st = { state: 'sweep', worldX: 506, worldY: 204, speedX: 0, flip, scale: 1, time: i / 30, params: {} };
          return { penyapu: { place: placementOf({ scale: 1, anchor: [0.5, 1] }, st, size), pose: rig.poseProbe(st) } };
        });
        // tanpa daftar KNOWN ISSUE apa pun: semua sentuhan di dalam toleransi, tanpa getar
        const res = PC.poseChecks(frames, { knownIssues: [] });
        const where = `tinggi ${height} ${build}${flip ? ' cermin' : ''}`;
        for (const id of ['motion-joints', 'motion-limbs', 'motion-contact', 'motion-stable']) {
          const r = res.find((x) => x.id === id);
          assert.equal(C.statusOf(r), 'pass', `${where}: ${id} ${r.detail}`);
        }
        assert.match(res.find((r) => r.id === 'motion-contact').detail, /sweep:farArm-farHand 45/);
        for (const f of frames) {
          const far = f.penyapu.pose.items.find((it) => it.kind === 'arm' && !it.front);
          // titik genggam di dalam 85% panjang lengan (titiknya dibulatkan ke piksel): ujung lengan tepat di tangan jauh
          assert.deepEqual(far.hand, far.target, where);
          assert.ok(Math.hypot(far.target.x - far.rawShoulder.x, far.target.y - far.rawShoulder.y) <= (far.upper + far.lower) * 0.85 + Math.SQRT1_2, where);
          // siku jauh menekuk: jauh dari garis bahu-tangan
          const [s, e, h] = [far.rawShoulder, far.rawElbow, far.rawHand];
          const off = Math.abs((h.x - s.x) * (e.y - s.y) - (h.y - s.y) * (e.x - s.x)) / Math.hypot(h.x - s.x, h.y - s.y);
          assert.ok(off >= 1, `${where}: siku jauh hampir lurus (${off.toFixed(2)} px)`);
        }
      }
    }
  }
});

test('soket bangku tepat pada papan dudukan yang digambar', () => {
  const pal = new Proxy({}, { get: (t, k) => (typeof k === 'string' ? `@${k}` : undefined) });
  for (const def of [{}, { width: 24 }]) {
    const bench = propTypes.bench.create(def);
    const e = { params: {} };
    const buffer = createSpriteBuffer(40, 12, 2);
    withView(buffer.ctx, buffer.view, () => bench.draw(buffer.ctx, e, { pal }));
    const seat = bench.sockets(e).seat;
    assert.equal(seat.w, def.width ?? 30);
    for (let y = seat.y; y < seat.y + seat.h; y++) for (let x = seat.x; x < seat.x + seat.w; x++) assert.match(buffer.at(x, y), /^@wood/);
    // baris di atas papan kosong (sela sandaran), jadi papan memang permukaan duduk
    for (let x = 0; x < seat.w; x++) assert.equal(buffer.at(x, seat.y - 1), null);
  }
});

test('layoutAt memberi letak kotak gambar yang sama dengan render()', () => {
  const config = P.loadProject('character-lab');
  const seen = new Map();
  const probe = { defaultState: 'idle', size: () => ({ w: 26, h: 50 }), draw: (ctx, e) => seen.set(e.id, { ...ctx.pixelView }) };
  const environment = createEnvironment(config.environment, config.fps);
  for (const scene of config.timeline.scenes) {
    // kamera diam di 0, supaya letak layar = letak dunia
    const flat = { ...scene, camera: { type: 'keys', x: [[0, 0]], y: [[0, 0]] } };
    const impl = createComposedScene({ film: config, scene: flat, assets: { get: () => probe }, environment });
    for (const frame of [scene.startFrame, scene.startFrame + 37, scene.endFrame - 1]) {
      seen.clear();
      impl.render({ pixelView: null }, { frame, time: frame / config.fps });
      const layout = impl.layoutAt(frame);
      assert.equal(layout.length, seen.size);
      for (const { id, place } of layout) {
        const view = seen.get(id);
        assert.equal(view.flip ?? false, place.flip, id);
        assert.equal(view.ox, place.flip ? place.right : place.left, `${scene.id} ${frame} ${id}`);
        assert.equal(view.oy, place.top, `${scene.id} ${frame} ${id}`);
      }
    }
  }
  assert.deepEqual(placementOf({ scale: 1, anchor: [0.5, 1] }, { worldX: 10.4, worldY: 20, flip: true }, { w: 26, h: 50 }), { left: -3, top: -30, right: 23, w: 26, h: 50, scale: 1, flip: true });
});

// ---------- analisis pose-checks.cjs dengan data buatan ----------
const place = { left: 0, top: 0, right: 26, w: 26, h: 52, scale: 1, flip: false };
// satu frame berisi satu karakter natural dengan lengan dekat (penggerak gesture) dan lengan jauh (swing)
function frameWith({ front, back, gesture, state = 'gesture', body = { pose: 'standing', footY: 52, hipY: 34, shoulderY: 20, headTop: 11 } }) {
  const arm = (isFront, hand, drivers) => ({
    kind: 'arm', front: isFront, shoulder: { x: 12, y: 21 }, elbow: { x: 14, y: 26 }, hand,
    rawShoulder: { x: 12, y: 21 }, rawElbow: { x: 14, y: 26 }, rawHand: { x: hand.x, y: hand.y }, upper: Math.hypot(2, 5), lower: Math.hypot(hand.x - 14, hand.y - 26), target: null, drawHand: true, drivers
  });
  return { k: { place, pose: { mode: 'natural', strict: true, state, box: { w: 26, h: 52 }, items: [
    { kind: 'driver', gesture, breath: 0 }, { kind: 'body', ...body }, arm(true, front, ['swing', 'gesture']), arm(false, back, ['swing'])
  ] } } };
}
const stableOf = (frames, opts) => PC.poseChecks(frames, opts).find((r) => r.id === 'motion-stable');

test('motion-stable: titik balik gesture hanya mengecualikan sendi yang digerakkan gesture', () => {
  const g = [0.5, 0.7, 0.9, 0.7, 0.5];
  // tangan dekat naik ke puncak lalu turun (a, b, a di frame 2), lengan jauh diam: sah
  const ok = g.map((v, i) => frameWith({ gesture: v, front: { x: 20, y: i === 2 ? 10 : i === 1 || i === 3 ? 13 : 16 }, back: { x: 11, y: 32 } }));
  assert.equal(C.statusOf(stableOf(ok)), 'pass', stableOf(ok).detail);
  assert.match(stableOf(ok).detail, /titik balik gesture/);
  // lengan jauh ikut bolak-balik tepat di puncak gesture: gesture bukan penggeraknya, jadi tetap getar
  const bad = g.map((v, i) => frameWith({ gesture: v, front: { x: 20, y: i === 2 ? 10 : i === 1 || i === 3 ? 13 : 16 }, back: { x: 11, y: i === 2 ? 30 : 32 } }));
  const r = stableOf(bad);
  assert.equal(C.statusOf(r), 'fail');
  assert.match(r.detail, /lengan jauh tangan bolak-balik/);
  // penggerak yang berkedip 1 frame bukan titik balik mulus, jadi tidak bisa menutupi getar tangan dekat
  const flicker = [0.5, 0.5, 0.9, 0.5, 0.5].map((v, i) => frameWith({ gesture: v, front: { x: 20, y: i === 2 ? 10 : 16 }, back: { x: 11, y: 32 } }));
  assert.equal(C.statusOf(stableOf(flicker)), 'fail');
  // napas (bertangga) tidak pernah menjadi alasan pengecualian: bahu bolak-balik = getar
  const breath = [0, 1, 0, 1, 0].map((b, i) => frameWith({ gesture: 0, state: 'idle', front: { x: 20, y: 16 }, back: { x: 11, y: 32 }, body: { pose: 'standing', footY: 52, hipY: 34, shoulderY: 20 - b, headTop: 11 - b } }));
  assert.equal(C.statusOf(stableOf(breath)), 'fail');
  // sendi yang penggeraknya diam tidak boleh melompat lebih dari 1 piksel
  const jump = [0, 0, 0].map((_, i) => frameWith({ gesture: 0, state: 'idle', front: { x: 20, y: 16 }, back: { x: 11, y: 32 + i * 3 } }));
  assert.match(stableOf(jump).detail, /melompat 3 px tanpa penggerak/);
});

// KNOWN ISSUE hanya berlaku di proyek, pemeran, dan frame yang tercatat: data buatan diletakkan di frame aslinya
const LAB = { project: 'character-lab' };
// Sejak V29 dan V30 diperbaiki, daftar resmi tidak punya KNOWN ISSUE sentuhan. Mekanismenya diuji dengan entri uji
// di file ini saja (bentuknya sama dengan entri V30 sebelum diperbaiki), bukan lewat known-issues.cjs.
const TOUCH_KNOWN = {
  id: 'UJI-SENTUH', approval: 'disetujui', check: 'motion-contact', project: 'character-lab',
  entity: 'penyapu', state: 'sweep', touch: 'farArm-farHand', frames: [[108, 359]], worst: 3,
  title: 'Entri uji: ujung lengan jauh penyapu 3 px dari tangan jauh'
};
const LAB_TOUCH = { ...LAB, knownIssues: [...KNOWN, TOUCH_KNOWN] };
const atFrame = (n, entries) => [...Array(n).fill({}), entries];
const statusIn = (results, id) => {
  const r = results.find((x) => x.id === id);
  return r ? C.statusOf(r) : 'tidak ada';
};
// pengayuh (induk sepeda dengan soket setang). Setang di baris dunia 200 + 4 = 204. Tangan 2 baris di y lokal h =
// baris 150 + h dan 151 + h, jadi jarak ke setang = 204 - (151 + h). Untuk jarak g: h = 53 - g. Kolomnya bertumpuk
// dengan setang (123-124 di 122-125).
function riderFrame(g, { entity = 'pengayuh', name = 'hand-grip', state = 'cycle' } = {}) {
  const bikeAt = { left: 100, top: 200, right: 138, w: 38, h: 24, scale: 1, flip: false };
  const riderAt = { left: 100, top: 150, right: 126, w: 26, h: 50, scale: 1, flip: false };
  return {
    sepeda: { place: bikeAt, pose: null, sockets: { grip: { x: 22, y: 4, w: 4, h: 1 } } },
    [entity]: { parent: 'sepeda', place: riderAt, pose: { mode: 'natural', strict: true, state, box: { w: 26, h: 50 }, items: [
      { kind: 'touch', name, a: { x: 23, y: 53 - g, w: 2, h: 2 }, b: { socket: 'grip', from: 'parent' } }
    ] } }
  };
}
// penyapu: ujung lengan jauh (2x2 di baris 30-31) dan tangan jauh 2x2 yang mulai di baris 31 + g, jadi jarak sel = g
function sweeperFrame(g, { entity = 'penyapu', name = 'farArm-farHand', state = 'sweep' } = {}) {
  return {
    [entity]: { place, pose: { mode: 'natural', strict: true, state, box: { w: 26, h: 52 }, items: [
      { kind: 'touch', name, a: { x: 14, y: 30, w: 2, h: 2 }, b: { x: 14, y: 31 + g, w: 2, h: 2 } }
    ] } }
  };
}
// satu kaki berjalan selama 5 frame (center - 2 .. center + 2), lutut tergambar `ys`, posisi mentah `raws`
function walkFrames(center, { entity = 'darto-pagi', front = false, ys = [42, 42, 43, 42, 42], raws = [42.49, 42.49, 42.51, 42.49, 42.49] } = {}) {
  const frames = Array(center - 2).fill({});
  for (let i = 0; i < 5; i++) {
    frames.push({ [entity]: { place, pose: { mode: 'natural', strict: true, state: 'walk', box: { w: 26, h: 52 }, items: [
      { kind: 'driver', stride: center + i, swing: 0 },
      { kind: 'leg', front, hip: { x: 11, y: 34 }, knee: { x: 12, y: ys[i] }, rawKnee: { x: 12, y: raws[i] }, ankle: { x: 12, y: 51 }, half: 8.5, legLen: 18, drivers: ['stride'] }
    ] } } });
  }
  return frames;
}

test('KNOWN ISSUE: dilaporkan sebagai KNOWN ISSUE, GAGAL bila memburuk atau tidak lagi terjadi', () => {
  const touchKnown = (g, frame = 108) => PC.poseChecks(atFrame(frame, sweeperFrame(g)), LAB_TOUCH).find((r) => r.id === 'known:UJI-SENTUH');
  assert.equal(C.statusOf(touchKnown(3)), 'known');
  assert.equal(touchKnown(3).approval, 'disetujui');
  assert.match(touchKnown(3).detail, /terburuk 3 px/);
  assert.equal(C.statusOf(touchKnown(3, 359)), 'known');
  assert.equal(C.statusOf(touchKnown(4)), 'fail');
  assert.match(touchKnown(4).detail, /MEMBURUK/);
  assert.equal(C.statusOf(touchKnown(1)), 'fail');
  assert.match(touchKnown(1).detail, /TIDAK LAGI TERJADI/);
  // KNOWN ISSUE gerak: kejadian tercatat persis = KNOWN ISSUE; lompatan lebih besar = GAGAL
  const v31 = (frames) => PC.poseChecks(frames, LAB).find((r) => r.id === 'known:V31');
  const blip = walkFrames(3);
  assert.equal(C.statusOf(v31(blip)), 'known', v31(blip).detail);
  assert.equal(v31(blip).approval, 'disetujui');
  assert.doesNotMatch(v31(blip).name, /usulan/);
  // entri yang belum disetujui pemilik ditandai "usulan" di nama barisnya
  const proposed = KNOWN.map((k) => (k.id === 'V31' ? { ...k, approval: 'usulan' } : k));
  const asProposal = PC.poseChecks(blip, { ...LAB, knownIssues: proposed }).find((r) => r.id === 'known:V31');
  assert.equal(C.statusOf(asProposal), 'known');
  assert.equal(asProposal.approval, 'usulan');
  assert.match(asProposal.name, /usulan, menunggu persetujuan pemilik/);
  assert.match(v31(blip).detail, /1 dari 19 kejadian tercatat/);
  assert.equal(C.statusOf(PC.poseChecks(blip, LAB).find((r) => r.id === 'motion-stable')), 'pass');
  const worse = walkFrames(3, { ys: [42, 42, 44, 42, 42] });
  assert.equal(C.statusOf(v31(worse)), 'fail');
  assert.match(v31(worse).detail, /MEMBURUK/);
  // proyek yang punya KNOWN ISSUE tetapi kejadiannya tidak muncul lagi: GAGAL, supaya daftarnya diperbarui
  assert.match(v31(atFrame(108, riderFrame(6))).detail, /TIDAK LAGI TERJADI/);
  assert.equal(C.statusOf(v31(atFrame(108, riderFrame(6)))), 'fail');
  // tanpa daftar KNOWN ISSUE, kejadian yang sama GAGAL di pemeriksaan utama
  assert.equal(statusIn(PC.poseChecks(blip, { ...LAB, knownIssues: [] }), 'motion-stable'), 'fail');
});

test('KNOWN ISSUE tidak berlaku untuk pemeran, frame, sentuhan, sendi, jenis, atau proyek lain', () => {
  const contact = (frames, opts = LAB_TOUCH) => PC.poseChecks(frames, opts);
  // sentuhan: sama persis dengan entri uji (3 px) di tempat yang tercatat = KNOWN ISSUE, motion-contact tidak ikut gagal
  assert.equal(statusIn(contact(atFrame(108, sweeperFrame(3))), 'motion-contact'), 'skip');
  // pemeran lain dengan masalah sama: GAGAL, dan entri uji tidak menelan kasusnya
  const other = contact(atFrame(108, sweeperFrame(3, { entity: 'penyapu-lain' })));
  assert.equal(statusIn(other, 'motion-contact'), 'fail');
  assert.match(other.find((r) => r.id === 'motion-contact').detail, /penyapu-lain frame 108: farArm-farHand berjarak 3 px/);
  assert.equal(statusIn(other, 'known:UJI-SENTUH'), 'fail');
  // frame di luar rentang tercatat (sebelum 108, sesudah 359)
  for (const f of [107, 360]) assert.equal(statusIn(contact(atFrame(f, sweeperFrame(3))), 'motion-contact'), 'fail', `frame ${f}`);
  // sentuhan lain atau status lain di pemeran dan frame yang sama
  assert.equal(statusIn(contact(atFrame(108, sweeperFrame(3, { name: 'farHand-handle' }))), 'motion-contact'), 'fail');
  assert.equal(statusIn(contact(atFrame(108, sweeperFrame(3, { state: 'walk' }))), 'motion-contact'), 'fail');
  // V29 sudah diperbaiki dan tidak ada di daftar: tangan pengayuh 6 px dari setang di frame dan pemeran aslinya GAGAL
  const rider = contact(atFrame(108, riderFrame(6)));
  assert.equal(statusIn(rider, 'motion-contact'), 'fail');
  assert.match(rider.find((r) => r.id === 'motion-contact').detail, /pengayuh frame 108: hand-grip berjarak 6 px/);
  assert.equal(statusIn(rider, 'known:V29'), 'tidak ada');
  assert.equal(statusIn(contact(atFrame(108, riderFrame(2))), 'motion-contact'), 'fail');
  assert.equal(statusIn(contact(atFrame(108, riderFrame(1))), 'motion-contact'), 'pass');
  // V30 juga sudah diperbaiki dan tidak ada di daftar resmi: lengan jauh penyapu 3 px dari tangannya di frame dan pemeran
  // aslinya GAGAL, tanpa baris KNOWN ISSUE V30
  const sweeper = contact(atFrame(108, sweeperFrame(3)), LAB);
  assert.equal(statusIn(sweeper, 'motion-contact'), 'fail');
  assert.match(sweeper.find((r) => r.id === 'motion-contact').detail, /penyapu frame 108: farArm-farHand berjarak 3 px/);
  assert.equal(statusIn(sweeper, 'known:V30'), 'tidak ada');
  assert.equal(statusIn(contact(atFrame(108, sweeperFrame(2)), LAB), 'motion-contact'), 'fail');
  assert.equal(statusIn(contact(atFrame(108, sweeperFrame(1)), LAB), 'motion-contact'), 'pass');
  // proyek lain atau tanpa proyek: tidak ada KNOWN ISSUE sama sekali
  for (const opts of [{ project: 'proyek-baru' }, {}]) {
    const r = contact(atFrame(108, sweeperFrame(3)), opts);
    assert.equal(statusIn(r, 'motion-contact'), 'fail');
    assert.ok(!r.some((x) => x.id.startsWith('known:')), JSON.stringify(opts));
  }
  // gerak: kejadian V31 yang sama di frame lain, sendi lain, pemeran lain, jenis lain, atau proyek lain
  const stable = (frames, opts = LAB) => statusIn(PC.poseChecks(frames, opts), 'motion-stable');
  assert.equal(stable(walkFrames(3)), 'pass');
  assert.equal(stable(walkFrames(5)), 'fail');
  assert.equal(stable(walkFrames(3, { front: true })), 'fail');
  assert.equal(stable(walkFrames(3, { entity: 'darto-lain' })), 'fail');
  assert.equal(stable(walkFrames(3, { raws: [42, 42, 43.2, 42, 42] })), 'fail');
  assert.equal(stable(walkFrames(3), { project: 'proyek-baru' }), 'fail');
  // V32 (getar) tidak menutupi kedip pembulatan di kejadian yang sama, dan sebaliknya
  assert.equal(stable(walkFrames(147, { entity: 'anak-sekolah', front: true, raws: [42, 42, 43.2, 42, 42] })), 'pass');
  assert.equal(stable(walkFrames(147, { entity: 'anak-sekolah', front: true })), 'fail');
});

test('tanpa pose natural semua pemeriksaan pose TIDAK DIPERIKSA, bukan LULUS', () => {
  const classic = PC.poseChecks([{ a: { place, pose: { mode: 'classic', state: 'walk' } } }]);
  assert.equal(classic.length, 5);
  for (const r of classic) {
    assert.equal(C.statusOf(r), 'skip');
    assert.equal(r.pass, false);
    assert.match(r.detail, /gerak klasik/);
  }
  for (const r of PC.poseChecks([{}, {}])) assert.equal(C.statusOf(r), 'skip');
  // proyek yang punya KNOWN ISSUE tetapi tanpa pose natural: KNOWN ISSUE-nya ikut TIDAK DIPERIKSA, tidak hilang diam-diam
  const lab = PC.poseChecks([{ a: { place, pose: { mode: 'classic', state: 'walk' } } }], { project: 'character-lab' });
  assert.deepEqual(lab.filter((r) => r.id.startsWith('known:')).map((r) => [r.id, C.statusOf(r)]), [['known:V31', 'skip'], ['known:V32', 'skip']]);
  // skala lebih dari 1 tidak diwajibkan
  assert.ok(PC.poseChecks([{ a: { place: { ...place, scale: 2 }, pose: { mode: 'natural', strict: false, state: 'walk', items: [] } } }]).every((r) => C.statusOf(r) === 'skip'));
});

test('daftar KNOWN ISSUE: sempit, terukur, dan status persetujuannya tidak berubah diam-diam', () => {
  const ids = new Set();
  const projects = new Set(P.listProjects().map((p) => p.id));
  for (const k of KNOWN) {
    assert.match(k.id, /^V\d+$/);
    assert.ok(!ids.has(k.id));
    ids.add(k.id);
    assert.ok(['motion-contact', 'motion-stable'].includes(k.check), k.id);
    assert.ok(['disetujui', 'usulan'].includes(k.approval), k.id);
    assert.ok(projects.has(k.project), `${k.id}: proyek ${k.project}`);
    assert.ok(k.title && k.state && Number.isFinite(k.worst) && k.worst > PC.TOL.touch - 1, k.id);
    if (k.check === 'motion-contact') {
      assert.ok(k.entity && k.touch, k.id);
      assert.ok(k.frames.length && k.frames.every(([a, b]) => Number.isInteger(a) && Number.isInteger(b) && a <= b), k.id);
    } else {
      assert.ok(['pembulatan', 'getar'].includes(k.kind), k.id);
      for (const [who, joints] of Object.entries(k.occurrences)) {
        for (const [joint, frames] of Object.entries(joints)) {
          assert.match(joint, /^(kaki|lengan) (dekat|jauh) [a-z]+ [xy]$/, `${k.id} ${who}`);
          assert.ok(frames.length && frames.every((f, i) => Number.isInteger(f) && (i === 0 || f > frames[i - 1])), `${k.id} ${who} ${joint}`);
        }
      }
    }
  }
  // batas yang sudah diukur dan status persetujuan pemilik: mengubahnya harus disengaja (ubah juga tes ini dan BACKLOG)
  const count = (k) => Object.values(k.occurrences).flatMap((o) => Object.values(o)).reduce((n, f) => n + f.length, 0);
  const brief = Object.fromEntries(KNOWN.map((k) => [k.id, [k.project, k.approval, k.worst, k.check === 'motion-stable' ? count(k) : `${k.entity} ${k.frames.map((r) => r.join('-')).join(',')}`]]));
  // V29 dan V30 dikeluarkan bersama perbaikannya (tangan pengayuh di setang dan lengan jauh penyapu sampai ke tangannya,
  // lihat tes pengayuh dan penyapu natural di atas)
  assert.deepEqual(brief, {
    V31: ['character-lab', 'disetujui', 1, 19],
    V32: ['character-lab', 'disetujui', 1, 10]
  });
});
