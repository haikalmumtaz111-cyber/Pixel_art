// Unit test kompiler waktu relatif adegan (Tahap 6A-1, src/render/timing.cjs) tanpa browser.
// Patokan yang dipakai di sini tidak dihitung ulang dari kompiler yang sedang diuji:
// - hash runtimeView keempat proyek resmi dikunci dari kode kompiler main@b37862c (sebelum timing.cjs dipakai)
// - frame hasil konversi sintaks baru ditulis tangan sebagai angka literal
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createSchedule } from '../../src/engine/schedule.js';

const require = createRequire(import.meta.url);
const P = require('../../src/render/projects.cjs');
const T = require('../../src/render/timing.cjs');

// Hash runtimeView proyek resmi dari main@b37862c. Hanya boleh diganti bila konfigurasi proyek itu sengaja diubah
// dan disetujui pemilik (bersama baseline render-nya), bukan karena kompiler menghasilkan angka lain.
const LOCKED = {
  'night-to-dawn': 'dcf06bb78043f49efef31aec8a6d079e30051d1e1e4fb4e5448ea95b65cf0336',
  'old-town-morning': '5a3e23b26c75e8b041fbdf1d375bc18e34f6d3d99d3a56f65744a2b42da32730',
  'character-lab': '0b7240f42afa8a99ad34f468d8d77f65a325dd691eac288b35856c5d712702c7',
  'train-night-rain': '16123b4613bb25949fde9be6ff8b547dd021db3ea385a08c25bfff7b9192b91d'
};

const clone = (v) => JSON.parse(JSON.stringify(v));
const build = (raw) => P.buildProject(raw, `${P.ROOT}/config/${raw.id}.json`, { strict: false });
const has = (issues, pattern) => assert.ok(issues.some((i) => pattern.test(i)), `tidak ada masalah ${pattern}:\n${issues.join('\n')}`);
const issuesOf = (make, mutate) => {
  const raw = make();
  mutate(raw);
  return build(raw).timelineIssues;
};

// ---------- proyek resmi ----------

function loadRaw(id) {
  const { file, raw, includes } = P.readProject(id);
  return { file, raw: clone(raw), includes };
}
const buildRaw = ({ file, raw, includes }) => P.buildProject(raw, file, { strict: false, includes });
// adegan tanpa start/end, transisi tanpa start (sisanya tetap)
const withoutStart = (scene, extra) => {
  const { start, end, ...rest } = scene;
  return { ...rest, ...extra };
};
const transition = (scene) => {
  if (!scene.transitionOut) return null;
  const { start, ...rest } = scene.transitionOut;
  return rest;
};

// Ketiga proyek bertimeline ditulis ulang dengan sintaks baru. Angkanya ditulis tangan dari konfigurasi resmi.
const REWRITES = {
  // adegan kustom: hanya posisi (duration) dan transisi dengan lead bawaan (1,2 detik = 36 frame, lead 18)
  'night-to-dawn': (r) => {
    r.timeline.scenes = r.timeline.scenes.map((s) => withoutStart(s, { duration: 5, transitionOut: transition(s) }));
  },
  // waktu detik relatif adegan; track yang tidak pas di detik ditulis dalam frame lewat objek track.
  // 3.9666666666666667 = double terdekat untuk 119/30 detik (toleransi galat binernya sama dengan start/end lama)
  'old-town-morning': (r) => {
    r.timing = { unit: 'seconds', base: 'scene' };
    const [a, b, c] = r.timeline.scenes;
    const frames = (keys) => ({ unit: 'frames', keys });
    r.timeline.scenes = [
      withoutStart(a, {
        duration: 4,
        camera: { type: 'keys', x: frames([[0, 0], [119, 130, 'inOutSine']]), y: [[0, 0], [2.8, 0], [3.9666666666666667, 18, 'inOutSine']], zoom: frames([[0, 1], [84, 1], [119, 1.25, 'inOutSine']]) },
        transitionOut: transition(a)
      }),
      withoutStart(b, { duration: 4 }),
      withoutStart(c, { duration: 4, entities: [c.entities[0], { ...c.entities[1], paramTracks: { intensity: [[0, 0], [2, 0.9, 'inOutSine'], [3.9666666666666667, 1]] } }] })
    ];
  },
  // kamera statis yang key-nya di frame film 0 tetap ditulis berbasis film lewat objek track
  'character-lab': (r) => {
    r.timing = { unit: 'seconds', base: 'scene' };
    const [a, b, c, d] = r.timeline.scenes;
    const film = (keys) => ({ base: 'film', keys });
    r.timeline.scenes = [
      withoutStart(a, { duration: 4, transitionOut: transition(a) }),
      withoutStart(b, { duration: 3.5, camera: { type: 'keys', x: film([[0, 280]]), y: film([[0, 40]]), zoom: film([[0, 1.5]]) }, transitionOut: transition(b) }),
      withoutStart(c, { duration: 2.1, camera: { type: 'keys', x: film([[0, 250]]), y: film([[0, 0]]) } }),
      withoutStart(d, { duration: 2.4, camera: { type: 'keys', x: film([[0, 250]]), y: film([[0, 0]]) } })
    ];
  }
};

test('keempat proyek resmi: representasi runtime identik dengan main@b37862c', () => {
  for (const [id, hash] of Object.entries(LOCKED)) {
    const c = P.loadProject(id);
    assert.equal(T.runtimeHash(c), hash, `runtimeView ${id} berubah dari main`);
  }
});

// NT-STALE-1 (Blueprint v2 bagian 3.7): manifest render tidak meng-hash kode kompiler (eksperimen E1), jadi kunci di atas
// yang menjaga proyek resmi. Di salinan sementara repository, mutasi kompiler +1 frame (JSON proyek tetap) harus mengubah
// hash runtimeView proyek bertransisi, sedangkan mutasi komentar saja tidak boleh mengubah apa pun.
test('NT-STALE-1: mutasi kompiler +1 frame di salinan tertangkap kunci runtimeView, mutasi komentar tidak', (t) => {
  const { makeSandbox } = require('../../src/render/sandbox.cjs');
  const hashes = (box) => {
    const P2 = box.require('src/render/projects.cjs');
    const T2 = box.require('src/render/timing.cjs');
    return Object.fromEntries(Object.keys(LOCKED).map((id) => [id, T2.runtimeHash(P2.loadProject(id))]));
  };
  const bad = makeSandbox('pixel-ntstale-');
  t.after(() => bad.cleanup());
  const file = path.join(bad.dir, 'src/render/timeline.cjs');
  const from = 'startFrame: start, endFrame: end, lastFrame: end - 1,';
  const code = fs.readFileSync(file, 'utf8');
  assert.equal(code.split(from).length, 2, 'titik mutasi tidak unik');
  fs.writeFileSync(file, code.replace(from, 'startFrame: start + 1, endFrame: end, lastFrame: end - 1,'));
  const mutated = hashes(bad);
  for (const id of ['night-to-dawn', 'old-town-morning', 'character-lab']) assert.notEqual(mutated[id], LOCKED[id], `${id}: mutasi kompiler tidak tertangkap`);
  assert.equal(mutated['train-night-rain'], LOCKED['train-night-rain'], 'prototipe tanpa transisi tidak boleh terpengaruh');

  const ok = makeSandbox('pixel-ntstale-');
  t.after(() => ok.cleanup());
  for (const rel of ['src/render/timing.cjs', 'src/render/timeline.cjs']) {
    const f = path.join(ok.dir, rel);
    fs.writeFileSync(f, `// komentar kontrol NT-STALE-1\n${fs.readFileSync(f, 'utf8')}\n/* komentar kontrol */\n`);
  }
  assert.deepEqual(hashes(ok), LOCKED);
});

test('golden equivalence proyek resmi: sintaks duration dan waktu relatif adegan = runtime main', () => {
  for (const [id, rewrite] of Object.entries(REWRITES)) {
    const project = loadRaw(id);
    rewrite(project.raw);
    assert.ok(project.raw.timeline.scenes.every((s) => s.start === undefined && s.duration !== undefined), `${id} masih memakai start/end`);
    const c = buildRaw(project);
    assert.deepEqual(c.timelineIssues, [], `${id} sintaks baru bermasalah`);
    assert.equal(T.runtimeHash(c), LOCKED[id], `${id} sintaks baru menghasilkan runtime yang berbeda dari main`);
  }
});

test('jalur lama tanpa timing: salinan adegan sama isinya dengan konfigurasi dan track tidak disalin ulang', () => {
  const project = loadRaw('old-town-morning');
  const c = buildRaw(project);
  const raw = project.raw.timeline.scenes;
  c.timeline.scenes.forEach((s, i) => {
    const { startFrame, endFrame, durationFrames, assets, ...rest } = s;
    const { assets: _a, ...source } = raw[i];
    assert.deepEqual(rest, source);
  });
  // kamera inline adegan 1 dipakai apa adanya (bukan salinan hasil konversi)
  assert.equal(c.timeline.scenes[0].camera.x, project.raw.timeline.scenes[0].camera.x);
});

// ---------- proyek mini sintaks baru (24 FPS, 5 detik = 120 frame) ----------

const PALETTE = {
  sky: ['#000000', '#111111'], sunCore: '#ffffff', sun: '#ffeeaa', sunGlow: '#ffddaa', sunGlowFar: '#eeccaa',
  tire: '#111111', spoke: '#222222', wheelGap: '#333333', saddle: '#444444', basket: '#555555', bikeFrame: '#666666',
  iron: '#101010', ironLight: '#202020', lampLit: '#ffee88', lampGlass: '#ddddaa', lampGlow: '#ffcc66', steam: '#cccccc'
};

// dunia bersama (track global dalam frame film)
function world(fps, seconds) {
  const last = fps * seconds - 1;
  return {
    id: 'mini-waktu', name: 'mini-waktu', title: 'Mini waktu', seed: 1, width: 480, height: 270, outputWidth: 1920, outputHeight: 1080,
    fps, durationSeconds: seconds, rendering: { upscale: 'browser' },
    palettes: { pagi: { ...PALETTE }, siang: { extends: 'pagi', sun: '#ffffff' } },
    lighting: { from: 'pagi', to: 'siang', track: 'terang' },
    environment: { terang: [[0, 0], [last, 1]] },
    assets: {
      langit: { type: 'gradient-sky', horizon: 150 }, sepeda: { type: 'bicycle', wheelRadius: 8 }, lampu: { type: 'street-lamp' },
      sinar: { type: 'light-rays' }, orang: { type: 'rig-character' }, uap: { type: 'particles' }
    },
    stages: { jalan: { layers: [{ id: 'langit', parallax: 0 }, { id: 'jalan' }], entities: [{ id: 'langit-1', asset: 'langit', layer: 'langit' }] } },
    cast: { sepeda: { asset: 'sepeda', layer: 'jalan', position: [0, 240], motion: { x: [[0, 0], [last, 300]] } } },
    cameraTracks: { ikut: { type: 'follow-entity', entity: 'sepeda', screenX: 200, zoom: [[0, 1.25], [last, 1]] } }
  };
}

// Adegan a 0-48 (2 detik), b 48-84 (1,5 detik), c 84-120 (1,5 detik).
// Transisi a->b: 0,5 detik = 12 frame, lead bawaan 6 -> frame 42-53. Transisi b->c: 0,25 detik = 6 frame, lead 0,125 = 3 -> 81-86.
// Rentang tampil: a [0, 54), b [42, 87), c [81, 120).
function baru() {
  return {
    ...world(24, 5),
    timing: { unit: 'seconds', base: 'scene' },
    timeline: {
      scenes: [
        {
          id: 'a', name: 'A', module: 'compose', stage: 'jalan', duration: 2, cast: ['sepeda'],
          camera: { type: 'keys', x: [[0, 0], [1.5, 60, 'inOutSine']], y: [[2.125, 5]], zoom: { unit: 'frames', keys: [[0, 1], [47, 1.25]] } },
          lens: { zoom: [[0, 1], [1, 1.5]] },
          transitionOut: { type: 'dissolve', duration: 0.5 }
        },
        {
          id: 'b', name: 'B', module: 'compose', stage: 'jalan', duration: 1.5, cast: ['sepeda'], timing: { unit: 'frames' },
          camera: { type: 'follow-entity', entity: 'sepeda', screenX: [[-6, 200], [0, 180], [38, 150]], y: [[0, 10]], zoom: { unit: 'seconds', base: 'film', keys: [[2, 1], [3.5, 1.25]] } },
          entities: [
            { id: 'lampu-1', asset: 'lampu', layer: 'jalan', position: [100, 240], color: [[0, 'off'], [12, 'on']], visible: { unit: 'seconds', keys: [[-0.25, true], [1, false], [1.25, true]] }, flip: false },
            { id: 'sinar-1', asset: 'sinar', layer: 'jalan', position: [0, 0], motion: { x: [[0, 10], [38, 20]] }, paramTracks: { intensity: [[0, 0], [36, 1]] } }
          ],
          transitionOut: { type: 'dissolve', duration: 0.25, lead: 0.125 }
        },
        {
          id: 'c', name: 'C', module: 'compose', stage: 'jalan', duration: 1.5, cast: ['sepeda'], timing: { base: 'film' },
          camera: { type: 'keys', x: [[3.5, 0], [4.5, 30]], y: { base: 'scene', keys: [[-0.125, 3], [1.25, 0]] } },
          entities: [
            {
              id: 'orang-1', asset: 'orang', layer: 'jalan', position: [200, 240],
              state: [[3.5, 'stand'], [4, 'walk']], frame: [[3.5, 0], [4, 1]], motion: { x: [[3.5, 100], [4.75, 160]] },
              paramTracks: { headTurn: { unit: 'frames', base: 'scene', keys: [[0, 0], [35, 0.5]] } }
            }
          ]
        }
      ]
    }
  };
}

// Kembaran baru() dalam format lama (start/end, keyframe frame film), ditulis tangan.
function lama() {
  return {
    ...world(24, 5),
    timeline: {
      scenes: [
        {
          id: 'a', name: 'A', module: 'compose', stage: 'jalan', start: 0, end: 2, cast: ['sepeda'],
          camera: { type: 'keys', x: [[0, 0], [36, 60, 'inOutSine']], y: [[51, 5]], zoom: [[0, 1], [47, 1.25]] },
          lens: { zoom: [[0, 1], [24, 1.5]] },
          transitionOut: { type: 'dissolve', start: 1.75, duration: 0.5 }
        },
        {
          id: 'b', name: 'B', module: 'compose', stage: 'jalan', start: 2, end: 3.5, cast: ['sepeda'],
          camera: { type: 'follow-entity', entity: 'sepeda', screenX: [[42, 200], [48, 180], [86, 150]], y: [[48, 10]], zoom: [[48, 1], [84, 1.25]] },
          entities: [
            { id: 'lampu-1', asset: 'lampu', layer: 'jalan', position: [100, 240], color: [[48, 'off'], [60, 'on']], visible: [[42, true], [72, false], [78, true]], flip: false },
            { id: 'sinar-1', asset: 'sinar', layer: 'jalan', position: [0, 0], motion: { x: [[48, 10], [86, 20]] }, paramTracks: { intensity: [[48, 0], [84, 1]] } }
          ],
          transitionOut: { type: 'dissolve', start: 3.375, duration: 0.25 }
        },
        {
          id: 'c', name: 'C', module: 'compose', stage: 'jalan', start: 3.5, end: 5, cast: ['sepeda'],
          camera: { type: 'keys', x: [[84, 0], [108, 30]], y: [[81, 3], [114, 0]] },
          entities: [
            {
              id: 'orang-1', asset: 'orang', layer: 'jalan', position: [200, 240],
              state: [[84, 'stand'], [96, 'walk']], frame: [[84, 0], [96, 1]], motion: { x: [[84, 100], [114, 160]] },
              paramTracks: { headTurn: [[84, 0], [119, 0.5]] }
            }
          ]
        }
      ]
    }
  };
}

test('golden sintaks baru (24 FPS): posisi, transisi, dan semua track sesuai hitungan tangan', () => {
  const c = build(baru());
  assert.deepEqual(c.timelineIssues, []);
  assert.equal(c.totalFrames, 120);
  const [a, b, cc] = c.timeline.scenes;
  assert.deepEqual(c.timeline.scenes.map((s) => [s.id, s.startFrame, s.endFrame, s.durationFrames]), [['a', 0, 48, 48], ['b', 48, 84, 36], ['c', 84, 120, 36]]);
  assert.deepEqual(c.timeline.transitions.map((t) => [t.id, t.startFrame, t.endFrame, t.lastFrame, t.durationFrames, t.boundaryFrame]), [['a->b', 42, 54, 53, 12, 48], ['b->c', 81, 87, 86, 6, 84]]);
  // a: detik relatif adegan (timing proyek), zoom lewat objek track frame
  assert.deepEqual(a.camera, { type: 'keys', x: [[0, 0], [36, 60, 'inOutSine']], y: [[51, 5]], zoom: [[0, 1], [47, 1.25]] });
  assert.deepEqual(a.lens, { zoom: [[0, 1], [24, 1.5]] });
  // b: frame relatif adegan (timing adegan), termasuk waktu lokal negatif -6 di jendela transisi masuk
  assert.deepEqual(b.camera, { type: 'follow-entity', entity: 'sepeda', screenX: [[42, 200], [48, 180], [86, 150]], y: [[48, 10]], zoom: [[48, 1], [84, 1.25]] });
  assert.deepEqual(b.entities[0].color, [[48, 'off'], [60, 'on']]);
  assert.deepEqual(b.entities[0].visible, [[42, true], [72, false], [78, true]]);
  assert.equal(b.entities[0].flip, false);
  assert.deepEqual(b.entities[1].motion, { x: [[48, 10], [86, 20]] });
  assert.deepEqual(b.entities[1].paramTracks, { intensity: [[48, 0], [84, 1]] });
  // c: detik film (base adegan "film"), y dan headTurn kembali ke relatif adegan lewat objek track
  assert.deepEqual(cc.camera, { type: 'keys', x: [[84, 0], [108, 30]], y: [[81, 3], [114, 0]] });
  const orang = cc.entities[0];
  assert.deepEqual([orang.state, orang.frame, orang.motion, orang.paramTracks], [[[84, 'stand'], [96, 'walk']], [[84, 0], [96, 1]], { x: [[84, 100], [114, 160]] }, { headTurn: [[84, 0], [119, 0.5]] }]);
  // track global tidak tersentuh
  assert.deepEqual(c.cast.sepeda.motion.x, [[0, 0], [119, 300]]);
  assert.deepEqual(c.environment.terang, [[0, 0], [119, 1]]);
});

test('golden equivalence mini: sintaks baru = format lama yang setara (runtimeView sama persis)', () => {
  const fresh = build(baru());
  const old = build(lama());
  assert.deepEqual(old.timelineIssues, []);
  assert.deepEqual(T.runtimeView(fresh), T.runtimeView(old));
  assert.equal(T.runtimeHash(fresh), T.runtimeHash(old));
});

test('seluruh frame film terpetakan ke adegan atau transisi yang benar', () => {
  const fresh = createSchedule(build(baru()).timeline);
  const old = createSchedule(build(lama()).timeline);
  const expected = (f) => (f < 42 ? 'a' : f < 54 ? 'a->b' : f < 81 ? 'b' : f < 87 ? 'b->c' : 'c');
  for (let f = 0; f < 120; f++) {
    const s = fresh.segmentAt(f);
    const label = s.kind === 'scene' ? s.id : s.transition.id;
    assert.equal(label, expected(f), `frame ${f}`);
    assert.deepEqual(s, old.segmentAt(f), `frame ${f} berbeda dari format lama`);
  }
  // p transisi: 0 di frame pertama, 1 di frame terakhir
  assert.deepEqual([42, 53, 81, 86].map((f) => fresh.segmentAt(f).p), [0, 1, 0, 1]);
  assert.throws(() => fresh.segmentAt(120), /tidak berada di adegan mana pun/);
});

test('batas transisi masuk, keluar, dan akhir film tanpa off-by-one', () => {
  const ok = (mutate) => assert.deepEqual(issuesOf(baru, mutate), []);
  const bad = (mutate, pattern) => has(issuesOf(baru, mutate), pattern);
  // b: jendela transisi masuk mulai di frame lokal -6 (frame film 42)
  ok((r) => { r.timeline.scenes[1].camera.screenX = [[-6, 1]]; });
  bad((r) => { r.timeline.scenes[1].camera.screenX = [[-7, 1]]; }, /frame lokal -7 di luar jendela transisi masuk \(paling awal frame lokal -6\)/);
  // b: transisi keluar berakhir di frame film 87 (frame lokal 38 masih tampil)
  ok((r) => { r.timeline.scenes[1].camera.screenX = [[38, 1]]; });
  bad((r) => { r.timeline.scenes[1].camera.screenX = [[39, 1]]; }, /frame lokal 39 = frame film 87 di luar rentang tampil adegan \(frame lokal -6\.\.38\)/);
  // c: frame lokal 35 = frame film 119 (terakhir), 36 = 120 = akhir film
  ok((r) => { r.timeline.scenes[2].entities[0].paramTracks.headTurn.keys = [[35, 1]]; });
  bad((r) => { r.timeline.scenes[2].entities[0].paramTracks.headTurn.keys = [[36, 1]]; }, /frame film 120 di luar rentang tampil adegan/);
  // c berbasis film: 5 detik = frame 120 = endFrame film, ditolak pemeriksaan track lama setelah konversi
  bad((r) => { r.timeline.scenes[2].camera.x = [[5, 0]]; }, /frame 120 di luar 0\.\.119/);
  // a tanpa transisi masuk: waktu negatif ditolak
  bad((r) => { r.timeline.scenes[0].camera.x = { unit: 'frames', keys: [[-1, 0]] }; }, /adegan ini tanpa transisi masuk/);
});

for (const fps of [24, 25, 30, 60]) {
  test(`waktu lokal di ${fps} FPS: detik, frame, dan objek track menjadi frame film tepat`, () => {
    // dua adegan 2 detik, transisi 2 detik dengan lead 1 detik: frame fps..3fps-1
    const raw = {
      ...world(fps, 4),
      timing: { unit: 'seconds', base: 'scene' },
      timeline: {
        scenes: [
          { id: 'satu', name: 'Satu', module: 'compose', stage: 'jalan', duration: 2, cast: ['sepeda'], camera: { type: 'keys', x: [[0, 0], [2, 10]] }, transitionOut: { type: 'dissolve', duration: 2, lead: 1 } },
          {
            id: 'dua', name: 'Dua', module: 'compose', stage: 'jalan', duration: 2, cast: ['sepeda'],
            camera: { type: 'follow-entity', entity: 'sepeda', screenX: [[-1, 200], [0, 180], [1, 150]], zoom: { unit: 'frames', keys: [[-fps, 1], [2 * fps - 1, 1.5]] } },
            lens: { zoom: { base: 'film', keys: [[1, 1], [3, 2]] } }
          }
        ]
      }
    };
    const c = build(raw);
    assert.deepEqual(c.timelineIssues, []);
    const [one, two] = c.timeline.scenes;
    assert.deepEqual([one.startFrame, one.endFrame, two.startFrame, two.endFrame], [0, 2 * fps, 2 * fps, 4 * fps]);
    const t = c.timeline.transitions[0];
    assert.deepEqual([t.startFrame, t.endFrame, t.boundaryFrame], [fps, 3 * fps, 2 * fps]);
    assert.deepEqual(one.camera.x, [[0, 0], [2 * fps, 10]]);
    assert.deepEqual(two.camera.screenX, [[fps, 200], [2 * fps, 180], [3 * fps, 150]]);
    assert.deepEqual(two.camera.zoom, [[fps, 1], [4 * fps - 1, 1.5]]);
    assert.deepEqual(two.lens.zoom, [[fps, 1], [3 * fps, 2]]);
  });
}

test('AC5 (Blueprint v2, 30 FPS): 0 detik = startFrame, 1/30 detik = +1, 2,5 detik = +75, -k frame di jendela masuk = startFrame - k', () => {
  const raw = {
    ...world(30, 6),
    timing: { unit: 'seconds', base: 'scene' },
    timeline: {
      scenes: [
        { id: 'satu', name: 'Satu', module: 'compose', stage: 'jalan', duration: 2, cast: ['sepeda'], camera: { track: 'ikut' }, transitionOut: { type: 'dissolve', duration: 1 } },
        { id: 'dua', name: 'Dua', module: 'compose', stage: 'jalan', duration: 4, cast: ['sepeda'], camera: { type: 'keys', x: [[-0.5, 0], [0, 1], [1 / 30, 2], [2.5, 3]] } }
      ]
    }
  };
  const c = build(raw);
  assert.deepEqual(c.timelineIssues, []);
  const two = c.timeline.scenes[1];
  assert.equal(two.startFrame, 60);
  // transisi 1 detik = 30 frame, lead bawaan 15 frame: jendela masuk frame film 45..59 (frame lokal -15..-1)
  assert.deepEqual(c.timeline.transitions.map((x) => [x.startFrame, x.lastFrame]), [[45, 74]]);
  assert.deepEqual(two.camera.x, [[45, 0], [60, 1], [61, 2], [135, 3]]);
});

test('posisi adegan dari jumlah frame bulat, bukan jumlah detik pecahan', () => {
  // 12 adegan 0,1 detik di 30 FPS: jumlah detiknya 1.2000000000000002, jumlah frame-nya tepat 36
  const raw = { ...world(30, 1.2) };
  raw.timeline = { scenes: Array.from({ length: 12 }, (_, i) => ({ id: `s${i}`, name: `S${i}`, module: 'compose', stage: 'jalan', duration: 0.1, cast: ['sepeda'], camera: { track: 'ikut' } })) };
  const c = build(raw);
  assert.deepEqual(c.timelineIssues, []);
  assert.deepEqual(c.timeline.scenes.map((s) => s.startFrame), [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33]);
  assert.equal(c.timeline.scenes[11].endFrame, 36);
});

test('prioritas timing: track > adegan > proyek > bawaan (frames, film)', () => {
  assert.deepEqual(T.resolveTiming(), { unit: 'frames', base: 'film' });
  assert.deepEqual(T.resolveTiming(undefined, undefined, { unit: 'seconds' }), { unit: 'seconds', base: 'film' });
  assert.deepEqual(T.resolveTiming(undefined, { base: 'scene' }, { unit: 'seconds', base: 'film' }), { unit: 'seconds', base: 'scene' });
  assert.deepEqual(T.resolveTiming({ unit: 'frames' }, { base: 'scene' }, { unit: 'seconds' }), { unit: 'frames', base: 'scene' });
  // lewat kompiler: proyek seconds/scene, adegan c base film, track y base scene -> seconds/scene
  const c = build(baru());
  assert.deepEqual(c.timeline.scenes[2].camera.y, [[81, 3], [114, 0]]);
});

test('kamera dari cameraTracks (track global) tidak dikonversi, juga saat dipakai dua adegan berbasis scene', () => {
  const raw = baru();
  // a (detik relatif adegan) dan b (frame relatif adegan) sama-sama memakai track global "ikut"
  raw.timeline.scenes[0].camera = { track: 'ikut' };
  raw.timeline.scenes[1].camera = { track: 'ikut' };
  const c = build(raw);
  assert.deepEqual(c.timelineIssues, []);
  assert.deepEqual(c.cameraTracks, world(24, 5).cameraTracks);
  assert.deepEqual([c.timeline.scenes[0].camera, c.timeline.scenes[1].camera], [{ track: 'ikut' }, { track: 'ikut' }]);
});

test('semua track milik adegan (A1) dikonversi, termasuk motion.y dan field kamera keys/liftKeys/speedKeys; entitas stage tidak', () => {
  const raw = baru();
  // b: timing frames relatif adegan (mulai frame film 48)
  raw.timeline.scenes[1].entities[1].motion.y = [[0, 5], [30, 9]];
  raw.timeline.scenes[1].camera = { type: 'follow', keys: [[0, 200], [30, 150]], liftKeys: [[-6, 0], [10, 4]] };
  raw.timeline.scenes[2].camera = { type: 'speed', framing: 0, speedKeys: { base: 'scene', keys: [[0, 1], [1, 0.5]] }, liftKeys: [[3.5, 2]] };
  const c = build(raw);
  const [, b, cc] = c.timeline.scenes;
  assert.deepEqual(b.entities[1].motion, { x: [[48, 10], [86, 20]], y: [[48, 5], [78, 9]] });
  assert.deepEqual([b.camera.keys, b.camera.liftKeys], [[[48, 200], [78, 150]], [[42, 0], [58, 4]]]);
  // c: adegan berbasis film (detik film), speedKeys lewat objek track relatif adegan (mulai frame 84)
  assert.deepEqual([cc.camera.speedKeys, cc.camera.liftKeys], [[[84, 1], [108, 0.5]], [[84, 2]]]);
  // entitas stage adalah data global: tidak dikonversi
  assert.deepEqual(c.stages.jalan.entities, world(24, 5).stages.jalan.entities);
});

test('params.sinceFrame tetap boleh di adegan berbasis film', () => {
  const raw = baru();
  raw.timeline.scenes[2].entities.push({ id: 'uap-1', asset: 'uap', layer: 'jalan', position: [0, 0], params: { sinceFrame: 90 } });
  assert.deepEqual(build(raw).timelineIssues, []);
});

// ---------- konfigurasi tidak valid ----------
// Penomoran N1-N17 mengikuti Blueprint Tahap 6A v2 bagian 4.3. "Tambahan" = aturan kontrak bagian 3 yang tidak punya nomor N.

test('Blueprint N3: adegan dengan start/end dan duration sekaligus ditolak', () => {
  has(issuesOf(baru, (r) => { r.timeline.scenes[1].start = 2; }), /mode duration dan mode start\/end tidak boleh dicampur \(duration: a, b, c; start\/end: b\)/);
  has(issuesOf(lama, (r) => { r.timeline.scenes[2].duration = 1.5; }), /tidak boleh dicampur/);
});

test('Blueprint N4: sebagian adegan duration dan sebagian start/end (tanpa adegan yang memakai keduanya) ditolak', () => {
  has(issuesOf(baru, (r) => {
    const b = r.timeline.scenes[1];
    delete b.duration;
    Object.assign(b, { start: 2, end: 3.5 });
  }), /mode duration dan mode start\/end tidak boleh dicampur \(duration: a, c; start\/end: b\)/);
});

test('Tambahan 3.1: duration adegan wajib angka positif', () => {
  has(issuesOf(baru, (r) => { r.timeline.scenes[0].duration = 0; }), /Adegan 1 \(a\): duration harus angka detik lebih dari 0, bukan 0/);
  has(issuesOf(baru, (r) => { r.timeline.scenes[0].duration = -2; }), /duration harus angka detik lebih dari 0, bukan -2/);
  has(issuesOf(baru, (r) => { r.timeline.scenes[0].duration = '2'; }), /duration harus angka detik lebih dari 0, bukan "2"/);
  has(issuesOf(baru, (r) => { delete r.timeline.scenes[0].duration; }), /Adegan 1 \(a\): field "duration" belum diisi/);
});

test('Blueprint N6: duration adegan harus menjadi frame bulat', () => {
  has(issuesOf(baru, (r) => { r.timeline.scenes[0].duration = 2.01; }), /duration 2\.01 detik tidak menjadi frame bulat pada 24 FPS/);
});

test('Tambahan 3.1: duration adegan minimal satu frame', () => {
  has(issuesOf(baru, (r) => { r.timeline.scenes[0].duration = 1e-9; }), /duration 1e-9 detik kurang dari 1 frame pada 24 FPS/);
});

test('Blueprint N5: total duration adegan wajib sama dengan durationSeconds proyek', () => {
  has(issuesOf(baru, (r) => { r.timeline.scenes[2].duration = 1.25; }), /total duration adegan 114 frame \(4\.75 detik\) harus sama dengan durationSeconds proyek \(5 detik = 120 frame\)/);
});

test('Blueprint N14 (lead di mode start/end): transisi mode start/end tidak menerima lead', () => {
  has(issuesOf(lama, (r) => { r.timeline.scenes[0].transitionOut.lead = 0.25; }), /Transisi dari a: "lead" hanya untuk adegan berbasis duration/);
});

test('Blueprint N14 (start di mode duration): transisi mode duration tidak menerima start', () => {
  has(issuesOf(baru, (r) => { r.timeline.scenes[0].transitionOut.start = 1.75; }), /Transisi dari a: mode duration tidak menerima "start"/);
});

test('Blueprint N16: lead bawaan hanya bila setengah durasi menjadi frame bulat (dan durasi transisi minimal 2 frame, 3.3)', () => {
  // 0,375 detik = 9 frame, setengahnya 4,5 frame
  has(issuesOf(baru, (r) => { r.timeline.scenes[0].transitionOut.duration = 0.375; }), /lead bawaan \(setengah durasi 9 frame = 4\.5 frame\) bukan frame bulat/);
  has(issuesOf(baru, (r) => { r.timeline.scenes[0].transitionOut.duration = 0.01; }), /Transisi dari a: duration \(detik\) wajib diisi, menjadi frame bulat pada 24 FPS, dan minimal 2 frame/);
});

test('Blueprint N15: lead 0, lead >= durasi, dan lead bukan frame bulat ditolak (transisi juga wajib di dalam kedua adegan, 3.3)', () => {
  has(issuesOf(baru, (r) => { r.timeline.scenes[0].transitionOut.lead = 0.5; }), /lead 0\.5 detik \(12 frame\) harus 1\.\.11 frame/);
  has(issuesOf(baru, (r) => { r.timeline.scenes[0].transitionOut.lead = 0; }), /lead 0 detik \(0 frame\) harus 1\.\.11 frame/);
  has(issuesOf(baru, (r) => { r.timeline.scenes[0].transitionOut.lead = 0.01; }), /lead 0\.01 detik tidak menjadi frame bulat pada 24 FPS/);
  // lead sah tetapi transisi keluar dari adegan berikutnya (b hanya 36 frame)
  has(issuesOf(baru, (r) => { Object.assign(r.timeline.scenes[0].transitionOut, { duration: 2, lead: 0.25 }); }), /rentang keluar dari kedua adegan/);
});

test('Blueprint N1 + N2: unit dan base timing yang tidak dikenal ditolak di proyek, adegan, dan track', () => {
  // N1: unit
  has(issuesOf(baru, (r) => { r.timing.unit = 'menit'; }), /Proyek timing: unit "menit" tidak dikenal \(pilihan: frames, seconds\)/);
  has(issuesOf(baru, (r) => { r.timeline.scenes[1].timing.unit = 'menit'; }), /Adegan 2 \(b\) timing: unit "menit" tidak dikenal/);
  has(issuesOf(baru, (r) => { r.timeline.scenes[0].camera.zoom.unit = 'menit'; }), /Adegan 1 \(a\) kamera zoom: unit "menit" tidak dikenal/);
  // N2: base
  has(issuesOf(baru, (r) => { r.timing.base = 'adegan'; }), /Proyek timing: base "adegan" tidak dikenal \(pilihan: film, scene\)/);
  has(issuesOf(baru, (r) => { r.timeline.scenes[1].timing.base = 'adegan'; }), /Adegan 2 \(b\) timing: base "adegan" tidak dikenal \(pilihan: film, scene\)/);
  has(issuesOf(baru, (r) => { r.timeline.scenes[2].camera.y.base = 'adegan'; }), /Adegan 3 \(c\) kamera y: base "adegan" tidak dikenal/);
  // bentuk timing yang salah (bagian 3.2)
  has(issuesOf(baru, (r) => { r.timeline.scenes[1].timing = 'frames'; }), /Adegan 2 \(b\) timing: timing harus objek/);
  has(issuesOf(baru, (r) => { r.timing.offset = 2; }), /"offset" tidak dikenal di timing/);
});

test('Blueprint N10: keyframe yang tidak naik setelah konversi ditolak oleh pemeriksa lama', () => {
  // track angka, detik relatif adegan: 1 detik = frame 24, 0,5 detik = frame 12
  has(issuesOf(baru, (r) => { r.timeline.scenes[0].camera.x = [[1, 0], [0.5, 60]]; }), /Adegan 1 \(a\) kamera x key 1: frame harus berurutan naik/);
  // dua key yang jatuh di frame film yang sama
  has(issuesOf(baru, (r) => { r.timeline.scenes[0].lens.zoom = [[0.5, 1], [0.5, 1.5]]; }), /Adegan 1 \(a\) lens zoom key 1: frame harus berurutan naik/);
  // track bertangga lewat objek track (frame relatif adegan)
  has(issuesOf(baru, (r) => { r.timeline.scenes[1].entities[0].color = { unit: 'frames', base: 'scene', keys: [[12, 'on'], [0, 'off']] }; }), /entitas "lampu-1" color key 1: frame harus berurutan naik/);
});

test('Blueprint N11: objek track tanpa keys yang sah, dengan kunci asing, atau dengan unit tidak dikenal ditolak', () => {
  has(issuesOf(baru, (r) => { r.timeline.scenes[0].camera.zoom = { unit: 'frames', keys: 5 }; }), /kamera zoom: keys harus daftar keyframe/);
  has(issuesOf(baru, (r) => { r.timeline.scenes[0].camera.zoom.easing = 'linear'; }), /kamera zoom: "easing" tidak dikenal di objek track/);
  has(issuesOf(baru, (r) => { r.timeline.scenes[0].camera.zoom.unit = 'jam'; }), /kamera zoom: unit "jam" tidak dikenal/);
  has(issuesOf(baru, (r) => { r.timeline.scenes[0].camera.zoom = { unit: 'frames' }; }), /kamera zoom: keys harus daftar keyframe/);
  // bukan objek track sama sekali: ditolak pemeriksaan lama (dulu membuat pemeriksa kamera crash)
  has(issuesOf(baru, (r) => { r.timeline.scenes[0].camera.zoom = {}; }), /kamera zoom: harus berupa daftar keyframe/);
});

test('Blueprint N7: keyframe detik yang tidak menjadi frame bulat ditolak, tanpa pembulatan diam-diam', () => {
  has(issuesOf(baru, (r) => { r.timeline.scenes[0].camera.x = [[0.01, 0]]; }), /kamera x key 0: 0\.01 detik tidak menjadi frame bulat pada 24 FPS/);
  has(issuesOf(baru, (r) => { r.timeline.scenes[0].camera.x = [['satu', 0]]; }), /kamera x key 0: "satu" detik tidak menjadi frame bulat/);
});

test('Tambahan 3.2: keyframe unit frames harus bilangan bulat', () => {
  has(issuesOf(baru, (r) => { r.timeline.scenes[1].entities[1].motion.x = [[1.5, 0]]; }), /entitas "sinar-1" motion\.x key 0: waktu 1\.5 harus frame bulat \(unit frames\)/);
});

test('Blueprint N8 (negatif): waktu lokal negatif hanya di jendela transisi masuk', () => {
  has(issuesOf(baru, (r) => { r.timeline.scenes[1].entities[0].visible.keys[0][0] = -0.5; }), /visible key 0: waktu lokal -0\.5 detik \(frame lokal -12\) di luar jendela transisi masuk \(paling awal frame lokal -6\)/);
  has(issuesOf(baru, (r) => { r.timeline.scenes[0].lens.zoom = [[-0.5, 1]]; }), /lens zoom key 0: .*adegan ini tanpa transisi masuk/);
});

test('Blueprint N8 (positif) + N9: keyframe di luar rentang tampil adegan atau di endFrame film ditolak', () => {
  // N9 dalam detik: adegan terakhir c (1,5 detik = 36 frame), waktu lokal 1,5 detik = frame film 120 = akhir film
  has(issuesOf(baru, (r) => { r.timeline.scenes[2].camera.y = { base: 'scene', keys: [[1.5, 0]] }; }), /kamera y key 0: waktu lokal 1\.5 detik \(frame lokal 36\) = frame film 120 di luar rentang tampil adegan \(frame lokal -3\.\.35\)/);
  has(issuesOf(baru, (r) => { r.timeline.scenes[0].camera.y = [[2.25, 5]]; }), /kamera y key 0: waktu lokal 2\.25 detik \(frame lokal 54\) = frame film 54 di luar rentang tampil adegan \(frame lokal 0\.\.53\)/);
  has(issuesOf(baru, (r) => { r.timeline.scenes[2].entities[0].paramTracks.headTurn.keys = [[0, 0], [36, 1]]; }), /paramTracks\.headTurn key 1: .*frame film 120/);
  has(issuesOf(baru, (r) => { r.timeline.scenes[2].entities[0].state = [[5, 'walk']]; }), /state key 0: frame 120 di luar 0\.\.119/);
});

test('Blueprint N17: params.sinceFrame ditolak pada entitas adegan berbasis scene', () => {
  has(issuesOf(baru, (r) => { r.timeline.scenes[1].entities.push({ id: 'uap-1', asset: 'uap', layer: 'jalan', position: [0, 0], params: { sinceFrame: 50 } }); }),
    /Adegan 2 \(b\) entitas "uap-1": params\.sinceFrame belum didukung di adegan berbasis scene/);
});

test('Blueprint N12 + N13: timing di track global dan adegan kustom ditolak dengan pesan jelas (plus keputusan pemilik 3 dan 4)', () => {
  // N12: objek track di track global
  has(issuesOf(baru, (r) => { r.environment.terang = { unit: 'seconds', keys: [[0, 0], [4, 1]] }; }), /environment\.terang: track global tetap frame film/);
  has(issuesOf(baru, (r) => { r.cast.sepeda.motion.x = { base: 'film', keys: [[0, 0]] }; }), /cast\.sepeda\.motion\.x: track global tetap frame film/);
  has(issuesOf(baru, (r) => { r.cameraTracks.ikut.zoom = { keys: [[0, 1]] }; }), /cameraTracks\.ikut\.zoom: track global tetap frame film/);
  has(issuesOf(baru, (r) => { r.stages.jalan.entities[0].visible = { keys: [[0, true]] }; }), /stages\.jalan\.entities\[0\]\.visible: track global tetap frame film/);
  // N12: kunci "timing" di data global (dulu diabaikan diam-diam)
  has(issuesOf(baru, (r) => { r.cast.sepeda.timing = { unit: 'seconds', base: 'scene' }; }), /cast\.sepeda\.timing: kunci "timing" tidak dibaca di sini; timing hanya berlaku di proyek, di adegan, atau sebagai unit\/base objek track milik adegan/);
  has(issuesOf(baru, (r) => { r.stages.jalan.timing = { unit: 'seconds' }; }), /stages\.jalan\.timing: kunci "timing" tidak dibaca di sini/);
  has(issuesOf(baru, (r) => { r.stages.jalan.entities[0].timing = { base: 'scene' }; }), /stages\.jalan\.entities\[0\]\.timing: kunci "timing" tidak dibaca di sini/);
  has(issuesOf(baru, (r) => { r.cameraTracks.ikut.timing = { unit: 'seconds' }; }), /cameraTracks\.ikut\.timing: kunci "timing" tidak dibaca di sini/);
  has(issuesOf(baru, (r) => { r.environment.timing = { unit: 'seconds' }; }), /environment\.timing: kunci "timing" tidak dibaca di sini/);
  // N13 dan keputusan pemilik 3: adegan kustom, field keyframe ditentukan modulnya sendiri
  const night = () => loadRaw('night-to-dawn').raw;
  has(issuesOf(night, (r) => { r.timing = { unit: 'seconds' }; }), /Adegan 1 \(s01-night-train\): adegan kustom \(modul "night-train"\) belum mendukung timing seconds\/film/);
  has(issuesOf(night, (r) => { r.timeline.scenes[1].timing = { base: 'scene' }; }), /Adegan 2 \(s02-inside-train\): adegan kustom .* belum mendukung timing frames\/scene/);
  has(issuesOf(night, (r) => { r.timeline.scenes[1].characters.traveler.lookKeys = { unit: 'seconds', keys: [[5, 0]] }; }), /characters\.traveler\.lookKeys: adegan kustom belum menerima objek timing/);
  // prototipe tanpa timeline
  has(issuesOf(() => loadRaw('train-night-rain').raw, (r) => { r.timing = { unit: 'seconds' }; }), /Konfigurasi tanpa timeline tidak mendukung "timing"/);
  // kamera speed: refFrame adalah frame film
  has(issuesOf(baru, (r) => { r.timeline.scenes[0].camera = { type: 'speed', framing: 0, refFrame: 10, speedKeys: [[0, 1]] }; }), /kamera: refFrame belum didukung dengan timing seconds\/scene/);
});

test('Blueprint A2: kunci timing di luar proyek dan adegan ditolak apa pun nilainya (data film, entitas, pencahayaan adegan)', () => {
  const stray = (where) => new RegExp(`^${where}: kunci "timing" tidak dibaca di sini; timing hanya berlaku di proyek, di adegan, atau sebagai unit/base objek track milik adegan$`);
  const real = (id) => (mutate) => {
    const project = loadRaw(id);
    mutate(project.raw);
    return buildRaw(project).timelineIssues;
  };
  // data film proyek: pencahayaan dan validasi (old-town-morning punya keduanya)
  const town = real('old-town-morning');
  assert.deepEqual(town(() => {}), []);
  has(town((r) => { r.lighting.timing = { unit: 'seconds' }; }), stray('lighting\\.timing'));
  has(town((r) => { r.lighting.timing = 'seconds'; }), stray('lighting\\.timing'));
  has(town((r) => { r.validation.timing = 30; }), stray('validation\\.timing'));
  has(town((r) => { r.validation.consistency[0].timing = { base: 'scene' }; }), stray('validation\\.consistency\\[0\\]\\.timing'));
  has(town((r) => { r.validation.consistency[0].timing = null; }), stray('validation\\.consistency\\[0\\]\\.timing'));
  // track global dengan nilai bukan objek (N12 dulu hanya menolak objek)
  has(issuesOf(baru, (r) => { r.cast.sepeda.timing = 'seconds'; }), stray('cast\\.sepeda\\.timing'));
  has(issuesOf(baru, (r) => { r.environment.timing = 0; }), stray('environment\\.timing'));
  // pencahayaan adegan: sah tanpa timing, ditolak dengan timing
  const lit = { from: 'pagi', to: 'siang', track: 'terang' };
  assert.deepEqual(issuesOf(baru, (r) => { r.timeline.scenes[0].lighting = { ...lit }; }), []);
  has(issuesOf(baru, (r) => { r.timeline.scenes[0].lighting = { ...lit, timing: { unit: 'frames' } }; }), stray('Adegan 1 \\(a\\) lighting\\.timing'));
  // entitas adegan: timing berlaku per adegan atau per objek track, bukan per entitas
  has(issuesOf(baru, (r) => { r.timeline.scenes[1].entities[0].timing = { unit: 'seconds' }; }), stray('Adegan 2 \\(b\\) entities\\[0\\]\\.timing'));
  has(issuesOf(baru, (r) => { r.timeline.scenes[1].entities[0].timing = 'seconds'; }), stray('Adegan 2 \\(b\\) entities\\[0\\]\\.timing'));
  has(issuesOf(baru, (r) => { r.timeline.scenes[1].entities[0].timing = false; }), stray('Adegan 2 \\(b\\) entities\\[0\\]\\.timing'));
  has(issuesOf(baru, (r) => { r.timeline.scenes[1].entities[1].motion.timing = { unit: 'seconds' }; }), stray('Adegan 2 \\(b\\) entities\\[1\\]\\.motion\\.timing'));
  // lokasi lain yang juga tidak membaca timing: kamera, lensa, transisi, dan timeline
  has(issuesOf(baru, (r) => { r.timeline.scenes[0].camera.timing = { unit: 'frames' }; }), stray('Adegan 1 \\(a\\) camera\\.timing'));
  has(issuesOf(baru, (r) => { r.timeline.scenes[0].lens.timing = { unit: 'frames' }; }), stray('Adegan 1 \\(a\\) lens\\.timing'));
  has(issuesOf(baru, (r) => { r.timeline.scenes[0].transitionOut.timing = { unit: 'frames' }; }), stray('Adegan 1 \\(a\\) transitionOut\\.timing'));
  has(issuesOf(baru, (r) => { r.timeline.timing = { unit: 'seconds' }; }), stray('timeline\\.timing'));
  // adegan kustom dan konfigurasi tanpa timeline
  has(real('night-to-dawn')((r) => { r.timeline.scenes[1].characters.traveler.timing = { unit: 'seconds' }; }), stray('Adegan 2 \\(s02-inside-train\\) characters\\.traveler\\.timing'));
  has(real('train-night-rain')((r) => { r.sceneParams.timing = { unit: 'seconds' }; }), stray('sceneParams\\.timing'));
});

test('Blueprint A2 kontrol positif: timing tetap sah di proyek, adegan, dan objek track milik adegan', () => {
  const raw = baru();
  // ketiga tingkat memang dipakai fixture ini
  assert.deepEqual(raw.timing, { unit: 'seconds', base: 'scene' });
  assert.deepEqual(raw.timeline.scenes.map((s) => s.timing), [undefined, { unit: 'frames' }, { base: 'film' }]);
  assert.deepEqual(raw.timeline.scenes[2].camera.y, { base: 'scene', keys: [[-0.125, 3], [1.25, 0]] });
  const c = build(raw);
  assert.deepEqual(c.timelineIssues, []);
  const [a, b, cc] = c.timeline.scenes;
  assert.deepEqual(a.camera.x, [[0, 0], [36, 60, 'inOutSine']]); // timing proyek: detik relatif adegan
  assert.deepEqual(b.entities[0].color, [[48, 'off'], [60, 'on']]); // timing adegan: frame relatif adegan
  assert.deepEqual(cc.camera.y, [[81, 3], [114, 0]]); // objek track: base scene menimpa base film adegan c
  // keempat proyek resmi (tanpa timing) tidak terkena penolakan baru
  for (const id of Object.keys(LOCKED)) assert.deepEqual(buildRaw(loadRaw(id)).timelineIssues, [], id);
});

test('keputusan pemilik 5: timeline start/end memakai timing seconds/scene dengan konversi dan validasi normal', () => {
  // adegan b di lama(): start 2 detik = frame 48, rentang tampil [42, 87) = frame lokal -6..38
  // (transisi a->b 42-53, b->c 81-86). Semua track b ditulis ulang dalam waktu relatif adegan.
  const relatif = () => {
    const r = lama();
    const b = r.timeline.scenes[1];
    b.timing = { unit: 'seconds', base: 'scene' };
    b.camera = { type: 'follow-entity', entity: 'sepeda', screenX: { unit: 'frames', keys: [[-6, 200], [0, 180], [38, 150]] }, y: [[0, 10]], zoom: [[0, 1], [1.5, 1.25]] };
    b.entities = [
      { id: 'lampu-1', asset: 'lampu', layer: 'jalan', position: [100, 240], color: [[0, 'off'], [0.5, 'on']], visible: [[-0.25, true], [1, false], [1.25, true]], flip: false },
      { id: 'sinar-1', asset: 'sinar', layer: 'jalan', position: [0, 0], motion: { x: { unit: 'frames', keys: [[0, 10], [38, 20]] } }, paramTracks: { intensity: [[0, 0], [1.5, 1]] } }
    ];
    return r;
  };
  const raw = relatif();
  assert.deepEqual([raw.timeline.scenes[1].start, raw.timeline.scenes[1].end], [2, 3.5]); // tetap mode start/end
  const c = build(raw);
  const old = build(lama());
  assert.deepEqual(c.timelineIssues, []);
  // posisi adegan dan transisi tetap dari start/end, track b = versi frame film tulisan tangan
  assert.deepEqual(c.timeline.scenes.map((s) => [s.id, s.startFrame, s.endFrame]), [['a', 0, 48], ['b', 48, 84], ['c', 84, 120]]);
  assert.deepEqual(c.timeline.transitions, old.timeline.transitions);
  assert.deepEqual(c.timeline.scenes[1].camera, old.timeline.scenes[1].camera);
  assert.deepEqual(c.timeline.scenes[1].entities, old.timeline.scenes[1].entities);
  assert.deepEqual(c.timeline.scenes[0].camera, old.timeline.scenes[0].camera); // adegan lain tetap frame film
  assert.equal(T.runtimeHash(c), T.runtimeHash(old));
  // validasi normal: di luar rentang tampil, sebelum jendela transisi masuk, detik bukan frame bulat, dan akhir film
  has(issuesOf(relatif, (r) => { r.timeline.scenes[1].camera.zoom = [[0, 1], [1.625, 1.25]]; }), /Adegan 2 \(b\) kamera zoom key 1: waktu lokal 1\.625 detik \(frame lokal 39\) = frame film 87 di luar rentang tampil adegan \(frame lokal -6\.\.38\)/);
  has(issuesOf(relatif, (r) => { r.timeline.scenes[1].entities[0].visible[0][0] = -0.5; }), /Adegan 2 \(b\) entitas "lampu-1" visible key 0: waktu lokal -0\.5 detik \(frame lokal -12\) di luar jendela transisi masuk \(paling awal frame lokal -6\)/);
  has(issuesOf(relatif, (r) => { r.timeline.scenes[1].camera.y = [[0.01, 10]]; }), /Adegan 2 \(b\) kamera y key 0: 0\.01 detik tidak menjadi frame bulat pada 24 FPS/);
  has(issuesOf(lama, (r) => {
    const last = r.timeline.scenes[2];
    Object.assign(last, { timing: { unit: 'seconds', base: 'scene' }, camera: { type: 'keys', x: [[0, 0], [1.5, 30]] } });
    delete last.entities;
  }), /Adegan 3 \(c\) kamera x key 1: waktu lokal 1\.5 detik \(frame lokal 36\) = frame film 120 di luar rentang tampil adegan \(frame lokal -3\.\.35\)/);
  // lead tetap ditolak di mode start/end walaupun adegannya memakai timing (N14)
  has(issuesOf(relatif, (r) => { r.timeline.scenes[1].transitionOut.lead = 0.125; }), /Transisi dari b: "lead" hanya untuk adegan berbasis duration/);
});

test('kompiler tidak mengubah konfigurasi mentah (sintaks baru dan jalur lama)', () => {
  for (const make of [baru, lama]) {
    const raw = make();
    const before = clone(raw);
    build(raw);
    assert.deepEqual(raw, before, `${make.name}: konfigurasi mentah berubah setelah dikompilasi`);
  }
  const project = loadRaw('old-town-morning');
  const before = clone(project.raw);
  buildRaw(project);
  assert.deepEqual(project.raw, before, 'old-town-morning: konfigurasi mentah berubah setelah dikompilasi');
});

// ---------- runtimeView ----------

test('runtimeView: berubah bila frame berubah, tetap bila hanya field non-runtime yang berubah', () => {
  const base = T.runtimeHash(build(lama()));
  const changed = (mutate) => {
    const raw = lama();
    mutate(raw);
    return T.runtimeHash(build(raw));
  };
  assert.notEqual(changed((r) => { r.timeline.scenes[1].camera.screenX[0][0] = 43; }), base);
  assert.notEqual(changed((r) => { r.timeline.scenes[0].transitionOut.start = 1.7916666666666667; }), base);
  assert.notEqual(changed((r) => { r.environment.terang[1][0] = 118; }), base);
  assert.equal(changed((r) => { r.title = 'Judul lain'; r.timeline.scenes[0].name = 'Nama lain'; r.validation = { consistency: [] }; }), base);
});

// Kelengkapan daftar putih runtimeView: setiap field konfigurasi yang dibaca kode browser harus ikut di runtimeView
// (atau tercatat sebagai bagian objek film/adegan buatan mesin, bukan konfigurasi).
test('runtimeView mencakup semua field konfigurasi yang dibaca kode browser', () => {
  const files = ['engine', 'assets', 'scenes'].flatMap((d) => fs.readdirSync(path.join(P.ROOT, 'src', d), { recursive: true }).map((f) => path.join(P.ROOT, 'src', d, f))).filter((f) => f.endsWith('.js'));
  // buang komentar dan teks berkutip (misalnya './film.js' di import) agar yang tersisa hanya kode
  const strip = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1').replace(/'[^'\n]*'|"[^"\n]*"/g, "''");
  const reads = { film: new Set(), scene: new Set(), transition: new Set() };
  const collect = (set, code, pattern) => { for (const m of code.matchAll(pattern)) set.add(m[1]); };
  const destructured = (set, code, names) => {
    for (const m of code.matchAll(new RegExp(`(?:const|let)\\s*\\{([^}]*)\\}\\s*=\\s*(?:${names})\\s*;`, 'g'))) {
      for (const part of m[1].split(',')) set.add(part.split(':')[0].split('=')[0].trim());
    }
  };
  for (const file of files) {
    const code = strip(fs.readFileSync(file, 'utf8'));
    collect(reads.film, code, /\b(?:film|config)\??\.([A-Za-z_]\w*)/g);
    destructured(reads.film, code, 'film|config');
    collect(reads.scene, code, /\b(?:scene|entry)\??\.([A-Za-z_]\w*)/g);
    destructured(reads.scene, code, 'scene|entry');
    collect(reads.transition, code, /\btransition\??\.([A-Za-z_]\w*)/g);
    if (file.endsWith(path.join('engine', 'film.js'))) collect(reads.transition, code, /\bt\.([A-Za-z_]\w*)/g);
  }
  // anggota objek buatan createFilm()/film.scenes (bukan konfigurasi proyek) dan teks pratinjau yang tidak digambar
  const filmObject = ['scenes', 'segmentAt', 'render', 'drawScene', 'presenter', 'frameWidth', 'frameHeight', 'loadedModules', 'environment', 'config'];
  const covered = {
    film: new Set([...T.RUNTIME_FIELDS, 'timeline', 'engine', ...filmObject, 'title']),
    scene: new Set([...T.SCENE_FIELDS, 'entry', 'impl']),
    transition: new Set(T.TRANSITION_FIELDS)
  };
  for (const [kind, set] of Object.entries(reads)) {
    assert.ok(set.size > 0, `tidak ada bacaan ${kind} yang ditemukan (pola pemindai rusak?)`);
    const missing = [...set].filter((f) => f && !covered[kind].has(f));
    assert.deepEqual(missing, [], `field ${kind} dibaca browser tetapi tidak ada di runtimeView`);
  }
  // field yang dibaca browser memang ada di daftar putih (bukan hanya di pengecualian)
  for (const f of ['fps', 'totalFrames', 'cast', 'stages', 'cameraTracks', 'palettes', 'rendering']) assert.ok(reads.film.has(f), `pemindai tidak menemukan bacaan film.${f}`);
  for (const f of ['camera', 'lens', 'entities', 'startFrame', 'durationFrames']) assert.ok(reads.scene.has(f), `pemindai tidak menemukan bacaan scene.${f}`);
});
