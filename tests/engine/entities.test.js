// Unit test sistem entitas dan track kamera.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEntity, anchorOf } from '../../src/engine/entities.js';
import { createCameraTrack } from '../../src/engine/camera.js';

// registry aset palsu: entitas hanya butuh get(key)
const assets = { get: (key) => ({ key, defaultState: 'idle', size: () => ({ w: 10, h: 20 }) }) };

function world(defs) {
  const byId = new Map(defs.map((d) => [d.id, d]));
  const built = new Map();
  const lookup = (id) => {
    if (!built.has(id)) built.set(id, createEntity(byId.get(id), { assets, fps: 30, lookup }));
    return built.get(id);
  };
  return lookup;
}

test('posisi entitas dari keyframe gerak', () => {
  const e = world([{ id: 'p', asset: 'x', position: [10, 200], motion: { x: [[0, 10], [100, 110]] } }])('p');
  assert.deepEqual(e.world(50), { x: 60, y: 200 });
  const st = e.stateAt(50, 50 / 30);
  assert.equal(st.worldX, 60);
  assert.equal(st.speedX, 1);
  assert.equal(st.state, 'idle'); // status bawaan aset
});

test('entitas anak mengikuti induk (misalnya pengendara di atas sepeda)', () => {
  const lookup = world([
    { id: 'sepeda', asset: 'bike', position: [0, 244], motion: { x: [[0, 0], [10, 30]] } },
    { id: 'pengendara', asset: 'rider', parent: 'sepeda', position: [-3, -7] }
  ]);
  assert.deepEqual(lookup('pengendara').world(10), { x: 27, y: 237 });
});

test('rantai induk yang berputar dihentikan dengan pesan jelas', () => {
  const lookup = world([{ id: 'a', asset: 'x', parent: 'b' }, { id: 'b', asset: 'x', parent: 'a' }]);
  assert.throws(() => lookup('a').world(0), /terlalu panjang/);
});

test('status, visibilitas, warna, flip, dan frame sprite memakai track bertangga', () => {
  const e = world([{
    id: 'toko', asset: 'shop', state: [[0, 'closed'], [96, 'open']], visible: [[0, false], [10, true]],
    color: [[0, 'on'], [80, 'off']], flip: [[0, false], [50, true]], frame: { cycle: { fps: 10, count: 4 } }
  }])('toko');
  const at = (f) => e.stateAt(f, f / 30);
  assert.equal(at(5).visible, false);
  assert.equal(at(10).visible, true);
  assert.equal(at(95).state, 'closed');
  assert.equal(at(96).state, 'open');
  assert.equal(at(79).color, 'on');
  assert.equal(at(80).color, 'off');
  assert.equal(at(50).flip, true);
  assert.equal(at(3).frame, 1); // 3/30 detik x 10 fps = 1
});

test('parameter animasi (paramTracks) dan parameter tetap', () => {
  const e = world([{ id: 'c', asset: 'rig', params: { phaseOffset: 3 }, paramTracks: { headTurn: [[0, 0], [10, 1]] } }])('c');
  const st = e.stateAt(5, 5 / 30);
  assert.equal(st.params.headTurn, 0.5);
  assert.equal(st.params.phaseOffset, 3);
});

test('keadaan entitas tidak bergantung urutan frame yang dihitung', () => {
  const defs = [
    { id: 'jalan', asset: 'rig', position: [0, 211], motion: { x: [[0, 0], [359, 256, 'inOutSine']] }, paramTracks: { gesture: [[100, 0], [200, 1]] } },
    { id: 'anak', asset: 'rig', parent: 'jalan', position: [5, 0], state: [[0, 'idle'], [120, 'walk']] }
  ];
  const frames = [...Array(360).keys()];
  const a = world(defs);
  const forward = frames.map((f) => JSON.stringify([a('jalan').stateAt(f, f / 30), a('anak').stateAt(f, f / 30)]));
  const b = world(defs);
  const shuffled = [...frames].sort((x, y) => ((x * 7919) % 360) - ((y * 7919) % 360));
  const map = new Map(shuffled.map((f) => [f, JSON.stringify([b('jalan').stateAt(f, f / 30), b('anak').stateAt(f, f / 30)])]));
  assert.deepEqual(forward, frames.map((f) => map.get(f)));
});

test('anchor: nama titik tumpu menjadi pecahan lebar dan tinggi', () => {
  assert.deepEqual(anchorOf('bottom-center'), [0.5, 1]);
  assert.deepEqual(anchorOf(undefined), [0, 0]);
  assert.deepEqual(anchorOf([0.25, 0.75]), [0.25, 0.75]);
});

test('kamera keys: posisi dan zoom dari keyframe, zoom bawaan 1', () => {
  const cam = createCameraTrack({ type: 'keys', x: [[0, 0], [119, 150]] }, { fps: 30, totalFrames: 360 });
  assert.equal(cam(0).x, 0);
  assert.equal(cam(119).x, 150);
  assert.equal(cam(60).zoom, 1);
});

test('kamera follow-entity: mengikuti entitas dengan rata-rata bergerak', () => {
  const entityX = (id, frame) => (id === 'pejalan' ? frame * 2 : 0);
  const cam = createCameraTrack({ type: 'follow-entity', entity: 'pejalan', screenX: 200, smoothing: 5, zoom: [[0, 1.25], [100, 1]] }, { fps: 30, totalFrames: 360, entityX });
  // rata-rata posisi frame 96..100 = 196, dikurangi posisi layar 200
  assert.equal(cam(100).x, 196 - 200);
  assert.equal(cam(0).zoom, 1.25);
  assert.equal(cam(100).zoom, 1);
  // fungsi murni: dipanggil berulang atau acak tetap sama
  assert.deepEqual(cam(50), cam(50));
});

test('kamera dengan jenis tidak dikenal ditolak', () => {
  assert.throws(() => createCameraTrack({ type: 'drone' }, { fps: 30, totalFrames: 10 }), /tidak dikenal/);
});
