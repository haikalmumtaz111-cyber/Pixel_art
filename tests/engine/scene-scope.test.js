// Cakupan rujukan adegan tersusun (Tahap 6A-2b PR 1): A12 (rujukan harus bisa diselesaikan di dalam adegan itu,
// induk tidak boleh berputar), A13 (setiap id sekali di daftar tampil adegan), dan N24 (pergantian stage wajib dissolve).
// Tanpa browser. Varian dibuat di memori dari fixture tests/fixtures/projects/uji-6a2b.json
// (stage "pasar" di adegan a dan c, stage "bukit" di adegan b).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const P = require('../../src/render/projects.cjs');

const FIX = 'tests/fixtures/projects/uji-6a2b.json';
const OFFICIAL = ['character-lab', 'night-to-dawn', 'old-town-morning', 'train-night-rain'];
const RULE = /\((A12|A13|N24)[;)]/;

const { file, raw: fixtureRaw, includes } = P.readProject(FIX);
const clone = (v) => JSON.parse(JSON.stringify(v));
function variant(mutate) {
  const r = clone(fixtureRaw);
  mutate(r);
  return { raw: r, config: P.buildProject(r, file, { strict: false, includes }) };
}
const issuesOf = (mutate) => variant(mutate).config.timelineIssues;
// konfigurasi yang ditolak tidak pernah sampai ke render: loader ketat langsung melempar error dengan pesan aturannya
const assertRejected = (mutate, pattern) => {
  const { raw } = variant(mutate);
  assert.throws(() => P.buildProject(raw, file, { includes }), pattern);
};
const has = (issues, pattern) => assert.ok(issues.some((i) => pattern.test(i)), `tidak ada masalah ${pattern}:\n${issues.join('\n') || '(kosong)'}`);
const bench = { asset: 'bench', layer: 'sidewalk', anchor: 'bottom-center', position: [300, 208] };
// key adegan a dan b digeser menjauhi tepi rentang supaya varian "tanpa transisi" tidak menimbulkan masalah lain
const fitWithoutTransitionAB = (r) => {
  const [a, b] = r.timeline.scenes;
  a.camera.x = [[0, 0], [2.9, 87]];
  a.entities[0].motion.x = [[0, 100], [2.9, 332]];
  b.camera.x = [[0, 303], [89, 392]];
};

// ---------- kontrol: konfigurasi sah ----------

test('keempat proyek resmi tetap tanpa masalah validasi, termasuk rujukan induk dan kamera yang mereka pakai', () => {
  for (const id of OFFICIAL) {
    const c = P.loadProject(id, { strict: false });
    assert.deepEqual(c.timelineIssues, [], id);
    assert.doesNotThrow(() => P.loadProject(id), id);
  }
  // rujukan yang memang dipakai proyek resmi (supaya kontrol di atas bermakna)
  const lab = P.loadProject('character-lab');
  assert.equal(lab.cast.pengayuh.parent, 'sepeda');
  assert.ok(lab.timeline.scenes.find((s) => s.id === 's02-pose').cast.includes('pengayuh'));
  const town = P.loadProject('old-town-morning');
  const follow = town.timeline.scenes.map((s) => (s.camera?.track ? town.cameraTracks[s.camera.track] : s.camera)).filter((c) => c?.type === 'follow-entity');
  assert.ok(follow.length > 0 && follow.every((c) => c.entity === 'pak-darto'));
  assert.equal(town.cast.pengayuh.parent, 'sepeda');
});

test('fixture uji-6a2b dan kembarannya sah: dua stage, induk entitas adegan (pengayuh-a -> sepeda-a), pindah stage lewat dissolve', () => {
  for (const ref of [FIX, 'tests/fixtures/projects/uji-6a2b-global.json']) assert.deepEqual(P.loadProject(ref, { strict: false }).timelineIssues, [], ref);
  const a = fixtureRaw.timeline.scenes[0];
  assert.equal(a.entities.find((e) => e.id === 'pengayuh-a').parent, 'sepeda-a');
  assert.deepEqual(fixtureRaw.timeline.scenes.map((s) => s.stage), ['pasar', 'bukit', 'pasar']);
  assert.deepEqual(fixtureRaw.timeline.scenes.slice(0, 2).map((s) => s.transitionOut.type), ['dissolve', 'dissolve']);
});

test('A12 kontrol (K2, semantik composer): pemeran film.cast boleh dirujuk walau tidak ada di scene.cast, induk satu stage sah', () => {
  // kamera adegan b mengikuti pemeran film.cast yang tidak tampil di adegan itu (composer membangunnya saat dirujuk)
  assert.deepEqual(issuesOf((r) => {
    r.cast = { 'sepeda-x': { asset: 'bicycle', layer: 'road', position: [200, 244] } };
    r.timeline.scenes[1].camera = { type: 'follow-entity', entity: 'sepeda-x', screenX: 200, y: [[0, 20]] };
  }), []);
  // pemeran dengan induk entitas stage "pasar", tampil di adegan a (stage pasar)
  assert.deepEqual(issuesOf((r) => {
    r.cast = { 'bangku-anak': { ...bench, parent: 'pasar-bench', position: [10, 0] } };
    r.timeline.scenes[0].cast = ['bangku-anak'];
  }), []);
  // rantai induk di dalam entitas adegan: lampu -> sepeda-b (sepeda-b milik adegan b)
  assert.deepEqual(issuesOf((r) => {
    r.timeline.scenes[1].entities.push({ id: 'lampu-anak', asset: 'lamp', layer: 'sidewalk', parent: 'sepeda-b', position: [0, -30] });
  }), []);
});

// ---------- A12: rujukan di luar cakupan adegan ----------

const A12_CASES = [
  ['kamera follow-entity (langsung) ke entitas stage lain', (r) => {
    r.timeline.scenes[1].camera = { type: 'follow-entity', entity: 'pasar-bench', screenX: 200, y: [[0, 20]] };
  }, /^Adegan 2 \(b\) kamera: entitas yang diikuti "pasar-bench" tidak ada di adegan ini \(stage bukit, cast, atau entitas adegan\) \(A12\)$/],
  ['kamera follow-entity (cameraTracks) ke entitas stage lain', (r) => {
    r.cameraTracks = { ikut: { type: 'follow-entity', entity: 'pasar-bench', screenX: 200 } };
    r.timeline.scenes[1].camera = { track: 'ikut' };
  }, /^Adegan 2 \(b\) kamera: entitas yang diikuti "pasar-bench" tidak ada di adegan ini .* \(A12\)$/],
  ['induk entitas adegan ke entitas stage lain', (r) => {
    r.timeline.scenes[1].entities.push({ id: 'lampu-anak', asset: 'lamp', layer: 'sidewalk', parent: 'pasar-bench', position: [0, 0] });
  }, /^Adegan 2 \(b\): entitas "lampu-anak": induk "pasar-bench" tidak ada di adegan ini \(stage bukit, cast, atau entitas adegan\) \(A12\)$/],
  ['induk pemeran film.cast ke entitas stage lain, pemeran tampil di stage bukit', (r) => {
    r.cast = { 'bangku-anak': { ...bench, parent: 'pasar-bench', position: [10, 0] } };
    r.timeline.scenes[1].cast = ['bangku-anak'];
  }, /^Adegan 2 \(b\): entitas "bangku-anak": induk "pasar-bench" tidak ada di adegan ini .* \(A12\)$/],
  ['induk entitas adegan ke id yang tidak ada di mana pun', (r) => {
    r.timeline.scenes[1].entities[1].parent = 'hantu';
  }, /^Adegan 2 \(b\): entitas "sepeda-b": induk "hantu" tidak ada di adegan ini .* \(A12\)$/],
  ['rantai induk lewat entitas adegan berakhir di entitas stage lain (transitif)', (r) => {
    r.timeline.scenes[1].entities.push({ id: 'lampu-anak', asset: 'lamp', layer: 'sidewalk', parent: 'sepeda-b', position: [0, -30] });
    r.timeline.scenes[1].entities[1].parent = 'pasar-bench';
  }, /^Adegan 2 \(b\): entitas "lampu-anak": induk "pasar-bench" tidak ada di adegan ini .* \(A12\)$/],
  ['induk berputar antar entitas adegan', (r) => {
    const e = r.timeline.scenes[1].entities;
    e[0].parent = 'sepeda-b';
    e[1].parent = 'lampu-b';
  }, /^Adegan 2 \(b\): entitas "lampu-b": rantai induk berputar \(lampu-b -> sepeda-b -> lampu-b\) \(A12\)$/]
];

for (const [name, mutate, pattern] of A12_CASES) {
  test(`A12 (N22, M8): ${name} ditolak saat validasi, bukan baru gagal saat render`, () => {
    const issues = issuesOf(mutate);
    has(issues, pattern);
    assert.ok(issues.every((i) => /\(A12\)$/.test(i)), `hanya masalah A12 yang diharapkan:\n${issues.join('\n')}`);
    assertRejected(mutate, /\(A12\)/);
  });
}

test('A12: sebelum aturan ini, kasus lintas stage di atas lolos pemeriksaan global (gabungan semua stage)', () => {
  // pemeriksaan global lama hanya melihat apakah id ada di stage MANA PUN; jadi buktinya: id itu memang ada di stage lain
  assert.ok(fixtureRaw.stages.pasar.entities.some((e) => e.id === 'pasar-bench'));
  assert.ok(!fixtureRaw.stages.bukit.entities.some((e) => e.id === 'pasar-bench'));
});

// ---------- A13: id tampil sekali per adegan ----------

test('A13: id ganda di scene.cast ditolak (dulu lolos dan tergambar dua kali)', () => {
  const mutate = (r) => {
    r.cast = { 'bangku-x': bench };
    r.timeline.scenes[2].cast = ['bangku-x', 'bangku-x'];
  };
  assert.deepEqual(issuesOf(mutate), ['Adegan 3 (c): entitas "bangku-x" tampil 2 kali di daftar tampil adegan ini; setiap id hanya boleh sekali (A13)']);
  assertRejected(mutate, /\(A13\)/);
});

test('A13: id yang sama di stage dan scene.cast, atau dua kali di scene.entities, ditolak oleh aturan lama dan A13', () => {
  const stageAndCast = issuesOf((r) => {
    r.cast = { 'pasar-bench': bench };
    r.timeline.scenes[0].cast = ['pasar-bench'];
  });
  has(stageAndCast, /Entitas "pasar-bench" ganda/);
  has(stageAndCast, /^Adegan 1 \(a\): entitas "pasar-bench" tampil 2 kali .* \(A13\)$/);
  const twiceEntities = issuesOf((r) => {
    const s = r.timeline.scenes[1];
    s.entities.push({ ...s.entities[0] });
  });
  has(twiceEntities, /entitas "lampu-b" ganda/);
  has(twiceEntities, /^Adegan 2 \(b\): entitas "lampu-b" tampil 2 kali .* \(A13\)$/);
});

test('A13 kontrol: pemeran yang sama di dua adegan berbeda tetap sah (aturannya per adegan)', () => {
  assert.deepEqual(issuesOf((r) => {
    r.cast = { 'bangku-x': bench };
    r.timeline.scenes[0].cast = ['bangku-x'];
    r.timeline.scenes[2].cast = ['bangku-x'];
  }), []);
});

// ---------- N24: pergantian stage ----------

test('N24: cut biasa antara dua stage berbeda ditolak (jendela transisi sama dengan dissolve, jadi hanya jenisnya yang berubah)', () => {
  const mutate = (r) => {
    r.timeline.scenes[0].transitionOut = { type: 'cut', duration: 0.8, lead: 0.3 };
  };
  assert.deepEqual(issuesOf(mutate), ['Adegan a -> b: pergantian stage "pasar" ke "bukit" wajib memakai transisi dissolve, bukan "cut" (N24; potongan disengaja belum didukung)']);
  assertRejected(mutate, /N24/);
});

test('N24: tanpa transisi antara dua stage berbeda ditolak', () => {
  const mutate = (r) => {
    fitWithoutTransitionAB(r);
    r.timeline.scenes[0].transitionOut = null;
  };
  assert.deepEqual(issuesOf(mutate), ['Adegan a -> b: pergantian stage "pasar" ke "bukit" wajib memakai transisi dissolve, bukan tanpa transisi (N24; potongan disengaja belum didukung)']);
  assertRejected(mutate, /N24/);
});

test('N24: portal antara dua stage berbeda juga ditolak (portal tidak tersedia dari adegan compose, A14)', () => {
  has(issuesOf((r) => {
    r.timeline.scenes[0].transitionOut = { type: 'portal', duration: 0.8, lead: 0.3, params: { zoom: 2 } };
  }), /^Adegan a -> b: pergantian stage "pasar" ke "bukit" wajib memakai transisi dissolve, bukan "portal" \(N24/);
});

test('N24 kontrol: dissolve antar stage sah, dan stage sama tanpa transisi tetap sah', () => {
  assert.deepEqual(issuesOf(() => {}), []);
  assert.deepEqual(issuesOf((r) => {
    fitWithoutTransitionAB(r);
    r.timeline.scenes[1].stage = 'pasar';
    r.timeline.scenes[0].transitionOut = null;
  }), []);
});

test('aturan A12, A13, dan N24 tidak menambah masalah di proyek resmi mana pun', () => {
  for (const id of OFFICIAL) assert.ok(!P.loadProject(id, { strict: false }).timelineIssues.some((i) => RULE.test(i)), id);
});
