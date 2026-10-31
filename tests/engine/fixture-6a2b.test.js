// Fixture uji Tahap 6A-2b (PR 1, tanpa browser): golden equivalence lapis Node (AC14 lapis Node, Blueprint 6A v2 §3.6),
// tabel hitungan tangan, kontrol sensitivitas, mutasi kompiler Kelas A/B (AC2b-16 revisi audit delta), dan penjaga isolasi.
// Golden piksel di browser (AC14 lapis piksel), AC12, AC13, A13 per frame, AC16, dan NT-STALE-2B milik PR 2.
//
// Kembaran uji-6a2b-global.json ditulis eksplisit dengan sintaks lama (start/end, keyframe frame film). Angka di
// TABLE di bawah adalah hitungan tangan dari fixture, bukan keluaran kompiler. Independensi penulisan kembaran
// belum terbukti secara terpisah: kembaran dan tabel ini ditulis oleh pihak yang sama yang membaca rumus kompiler.
// Yang dibuktikan uji di sini hanya (1) kembaran tidak dibuat kompiler saat uji, dan (2) golden sensitif terhadap
// mutasi kompiler.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const P = require('../../src/render/projects.cjs');
const T = require('../../src/render/timing.cjs');
const { makeSandbox } = require('../../src/render/sandbox.cjs');

const FIX = 'tests/fixtures/projects/uji-6a2b.json';
const GLO = 'tests/fixtures/projects/uji-6a2b-global.json';
const FIXTURES = [FIX, GLO];
// hash runtimeView fixture dan kembaran (sama). Diganti hanya bila fixture sengaja diubah, dengan alasan di PR.
const FIXTURE_HASH = 'eeb5b8ea54130c0e87ce566f3f84fc62ad60405641846c03cf364ad0695edd8f';

const clone = (v) => JSON.parse(JSON.stringify(v));
const load = (ref) => P.loadProject(ref, { strict: false });

// path nilai yang berbeda antara dua nilai JSON (kosong = sama persis)
function diffPaths(a, b, at = '$', found = []) {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) found.push({ path: at, kind: 'panjang' });
    for (let i = 0; i < Math.min(a.length, b.length); i++) diffPaths(a[i], b[i], `${at}[${i}]`, found);
  } else if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!(k in a) || !(k in b)) found.push({ path: `${at}.${k}`, kind: 'hilang' });
      else diffPaths(a[k], b[k], `${at}.${k}`, found);
    }
  } else if (JSON.stringify(a) !== JSON.stringify(b)) found.push({ path: at, kind: 'nilai', a, b });
  return found;
}

// ---------- hitungan tangan (30 FPS) ----------
// Adegan a 0-89 (3 detik), b 90-179, c 180-269. Transisi a->b: duration 0,8 = 24 frame, lead 0,3 = 9 -> 81-104.
// Transisi b->c: duration 0,6 = 18 frame, lead bawaan 9 -> 171-188. Rentang tampil a [0,105), b [81,189), c [171,270).
// Key lokal -> frame film = awal adegan + frame lokal (detik x 30 bila unit detik):
const TABLE = [
  ['a kamera x', (c) => c.timeline.scenes[0].camera.x, [[0, 0], [93, 93]], 'detik/adegan: 0 -> 0, 3,1 x 30 = 93 -> 93'],
  ['a kamera y', (c) => c.timeline.scenes[0].camera.y, [[0, 30]], '0 -> 0'],
  ['a sepeda-a motion.x', (c) => c.timeline.scenes[0].entities[0].motion.x, [[0, 100], [93, 348]], '3,1 detik -> 93'],
  ['a sepeda-a motion.y', (c) => c.timeline.scenes[0].entities[0].motion.y, [[0, 244]], 'objek track frames/film: frame film 0 tetap 0'],
  ['b kamera x', (c) => c.timeline.scenes[1].camera.x, [[84, 303], [185, 404]], 'frames/adegan: 90 + (-6) = 84, 90 + 95 = 185'],
  ['b kamera y', (c) => c.timeline.scenes[1].camera.y, [[90, 20]], '90 + 0'],
  ['b lens.zoom', (c) => c.timeline.scenes[1].lens.zoom, [[90, 1], [150, 1.5, 'inOutSine']], 'objek track detik: 90 + 0, 90 + 2 x 30 = 150'],
  ['b lampu-b color', (c) => c.timeline.scenes[1].entities[0].color, [[90, 'off'], [120, 'on']], '90 + 0, 90 + 30'],
  ['b sepeda-b motion.x', (c) => c.timeline.scenes[1].entities[1].motion.x, [[90, 350], [183, 610]], 'objek track detik: 90 + 0, 90 + 3,1 x 30 = 183'],
  ['b sepeda-b flip', (c) => c.timeline.scenes[1].entities[1].flip, [[90, false], [150, true]], '90 + 0, 90 + 60'],
  ['c kamera x', (c) => c.timeline.scenes[2].camera.x, [[174, 503], [269, 598]], '180 + (-6) = 174, 180 + 89 = 269'],
  ['c kamera y', (c) => c.timeline.scenes[2].camera.y, [[180, 30]], '180 + 0'],
  ['c kamera zoom', (c) => c.timeline.scenes[2].camera.zoom, [[180, 1.25], [260, 1]], '180 + 0, 180 + 80'],
  ['c kios-c paramTracks.open', (c) => c.timeline.scenes[2].entities[0].paramTracks.open, [[180, 0], [240, 1]], '180 + 0, 180 + 60'],
  ['c lampu-c visible', (c) => c.timeline.scenes[2].entities[1].visible, [[180, true], [240, false]], 'objek track detik: 180 + 0, 180 + 2 x 30 = 240']
];
const SCENES = [['a', 0, 90, 90], ['b', 90, 180, 90], ['c', 180, 270, 90]];
const TRANSITIONS = [['a->b', 'dissolve', 81, 105, 104, 24, 90], ['b->c', 'dissolve', 171, 189, 188, 18, 180]];

test('fixture: satu fixture utama 9 detik, 270 frame, 3 adegan, 2 stage, mode browser (K6, K15)', () => {
  const c = load(FIX);
  assert.deepEqual([c.fps, c.durationSeconds, c.totalFrames, c.timeline.scenes.length, Object.keys(c.stages).length, c.rendering.upscale], [30, 9, 270, 3, 2, 'browser']);
});

test('fixture memakai sintaks 6A-1 yang diuji (daftar cakupan), kembaran hanya sintaks lama', () => {
  const { raw } = P.readProject(FIX);
  const [a, b, c] = raw.timeline.scenes;
  const covered = {
    'timing proyek seconds/scene': raw.timing?.unit === 'seconds' && raw.timing?.base === 'scene',
    'duration di semua adegan': raw.timeline.scenes.every((s) => s.duration !== undefined && s.start === undefined && s.end === undefined),
    'lead eksplisit asimetris (a->b)': a.transitionOut.lead !== undefined && a.transitionOut.lead * 2 !== a.transitionOut.duration,
    'lead bawaan (b->c)': b.transitionOut.lead === undefined,
    'timing adegan unit frames (b)': b.timing?.unit === 'frames',
    'timing adegan frames/scene (c)': c.timing?.unit === 'frames' && c.timing?.base === 'scene',
    'objek track base film (a motion.y)': a.entities[0].motion.y?.base === 'film',
    'objek track unit seconds (b lens, b motion.x, c visible)': b.lens.zoom.unit === 'seconds' && b.entities[1].motion.x.unit === 'seconds' && c.entities[1].visible.unit === 'seconds',
    'key lokal negatif di jendela transisi masuk (b, c)': b.camera.x[0][0] < 0 && c.camera.x[0][0] < 0,
    'zoom kamera dan lensa': Array.isArray(c.camera.zoom) && b.lens.zoom.keys.length > 1,
    'track bertangga color, flip, visible dan paramTracks': Boolean(b.entities[0].color && b.entities[1].flip && c.entities[1].visible && c.entities[0].paramTracks.open)
  };
  for (const [what, ok] of Object.entries(covered)) assert.ok(ok, `cakupan hilang: ${what}`);
  // kembaran: dicek per nama properti di timeline (bukan teks, karena "keys" juga jenis kamera dan "base" parameter aset)
  const twin = P.readProject(GLO).raw;
  const props = (v, at, hits = []) => {
    if (Array.isArray(v)) v.forEach((x, i) => props(x, `${at}[${i}]`, hits));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (['keys', 'base', 'unit', 'timing', 'lead'].includes(k)) hits.push(`${at}.${k}`); props(x, `${at}.${k}`, hits); }
    return hits;
  };
  assert.equal(twin.timing, undefined);
  assert.deepEqual(props(twin.timeline, '$.timeline'), []);
  assert.ok(twin.timeline.scenes.every((s) => s.duration === undefined && s.start !== undefined && s.end !== undefined));
});

test('AC14 lapis Node: runtimeView fixture = runtimeView kembaran tulisan tangan (deep equality penuh)', () => {
  const fresh = load(FIX);
  const twin = load(GLO);
  assert.deepEqual(fresh.timelineIssues, []);
  assert.deepEqual(twin.timelineIssues, []);
  assert.deepEqual(T.runtimeView(fresh), T.runtimeView(twin));
  assert.deepEqual(diffPaths(T.runtimeView(fresh), T.runtimeView(twin)), []);
  assert.equal(T.runtimeHash(fresh), FIXTURE_HASH);
  assert.equal(T.runtimeHash(twin), FIXTURE_HASH);
});

test('AC14 lapis Node: posisi adegan, transisi, dan setiap track sama dengan tabel hitungan tangan', () => {
  for (const ref of FIXTURES) {
    const c = load(ref);
    assert.deepEqual(c.timeline.scenes.map((s) => [s.id, s.startFrame, s.endFrame, s.durationFrames]), SCENES, ref);
    assert.deepEqual(c.timeline.transitions.map((t) => [t.id, t.type, t.startFrame, t.endFrame, t.lastFrame, t.durationFrames, t.boundaryFrame]), TRANSITIONS, ref);
    for (const [name, get, expected, why] of TABLE) assert.deepEqual(get(c), expected, `${ref} ${name} (${why})`);
  }
});

test('kontrol sensitivitas: kembaran yang salah 1 frame membuat golden gagal tepat di satu path', () => {
  const { file, raw, includes } = P.readProject(GLO);
  const wrong = clone(raw);
  wrong.timeline.scenes[1].entities[0].color = [[90, 'off'], [121, 'on']];
  const view = T.runtimeView(P.buildProject(wrong, file, { strict: false, includes }));
  const expected = T.runtimeView(load(FIX));
  assert.throws(() => assert.deepEqual(view, expected));
  assert.deepEqual(diffPaths(view, expected), [{ path: '$.timeline.scenes[1].entities[0].color[1][0]', kind: 'nilai', a: 121, b: 120 }]);
  assert.notEqual(T.runtimeHash(P.buildProject(wrong, file, { strict: false, includes })), FIXTURE_HASH);
});

// ---------- mutasi kompiler (AC2b-16, revisi audit delta) ----------
// Kelas A = akibat langsung perubahan kompilasi (dihitung sebagai deteksi): path di timeline.transitions, nilai key yang
// bergeser di array yang panjangnya tetap, dan invariant transisi yang dilanggar posisi hasil kompilasi.
// Kelas B = efek samping isi fixture (tidak dihitung): key di luar rentang tampil yang dibuang kompiler, beserta seluruh
// isi array yang panjangnya berubah karenanya. transitionBoundaryChecks (browser) tidak mendeteksi M2 dan tidak dipakai.
const PROBE = `const [root, fix, glo] = process.argv.slice(1);
const P = require(root + '/src/render/projects.cjs'); const T = require(root + '/src/render/timing.cjs');
const f = P.loadProject(fix, { strict: false }); const g = P.loadProject(glo, { strict: false });
console.log(JSON.stringify({ issues: f.timelineIssues, transitions: f.timeline.transitions.map((t) => [t.startFrame, t.lastFrame]), twinIssues: g.timelineIssues, fresh: T.runtimeView(f), twin: T.runtimeView(g) }));`;
const MUTATIONS = {
  M2a: ['timing.cjs', 'startFrame: scenes[i].endFrame - lead,', 'startFrame: scenes[i].endFrame - (duration - lead),'],
  M2b: ['timing.cjs', 'startFrame: scenes[i].endFrame - lead,', 'startFrame: scenes[i].endFrame + lead,'],
  'XM-D1': ['timing.cjs', 'startFrame: scenes[i].endFrame - lead,', 'startFrame: scenes[i].endFrame - lead + 1,'],
  'XM-C1': ['timing.cjs', 'frame = position.startFrame + local;', 'frame = position.startFrame + local + 1;']
};
const isTransition = (d) => d.path.startsWith('$.timeline.transitions[');
const crossing = (m) => /harus melewati batas adegan|rentang keluar dari kedua adegan|tumpang tindih/.test(m);
const outOfRange = (m) => /di luar rentang tampil|di luar jendela transisi masuk/.test(m);
function classify(r) {
  const paths = diffPaths(r.fresh, r.twin);
  const cut = paths.filter((d) => d.kind !== 'nilai').map((d) => d.path);
  const tainted = (p) => cut.some((t) => p === t || p.startsWith(`${t}[`) || p.startsWith(`${t}.`));
  return {
    paths, pathsA: paths.filter((d) => !tainted(d.path)), pathsB: paths.filter((d) => tainted(d.path)),
    issuesA: r.issues.filter(crossing), issuesB: r.issues.filter(outOfRange), other: r.issues.filter((m) => !crossing(m) && !outOfRange(m))
  };
}

test('mutasi kompiler di salinan: golden Node mendeteksi lewat Kelas A, efek samping Kelas B tidak dihitung', (t) => {
  const box = makeSandbox('pixel-fixture-6a2b-');
  t.after(() => box.cleanup());
  const source = path.join(box.dir, 'src', 'render', 'timing.cjs');
  const original = fs.readFileSync(source, 'utf8');
  const run = () => {
    const r = spawnSync(process.execPath, ['-e', PROBE, box.dir, FIX, GLO], { cwd: box.dir, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    return JSON.parse(r.stdout);
  };
  const results = { kontrol: classify(run()) };
  for (const [name, [, from, to]] of Object.entries(MUTATIONS)) {
    assert.equal(original.split(from).length, 2, `titik mutasi ${name} tidak ditemukan tepat sekali`);
    fs.writeFileSync(source, original.replace(from, to));
    try {
      const raw = run();
      assert.deepEqual(raw.twinIssues, [], `${name}: kembaran jalur lama tidak boleh terpengaruh mutasi jalur sintaks baru`);
      results[name] = { ...classify(raw), transitions: raw.transitions };
    } finally {
      fs.writeFileSync(source, original);
    }
  }
  // kontrol tanpa mutasi
  assert.deepEqual(results.kontrol.paths, []);
  // XM-K1: komentar saja di kedua file kompiler
  const timeline = path.join(box.dir, 'src', 'render', 'timeline.cjs');
  const originalTimeline = fs.readFileSync(timeline, 'utf8');
  fs.writeFileSync(source, `// komentar tambahan uji\n${original}\n/* komentar */\n`);
  fs.writeFileSync(timeline, `// komentar tambahan uji\n${originalTimeline}\n/* komentar */\n`);
  try {
    assert.deepEqual(classify(run()).paths, [], 'XM-K1 tidak boleh mengubah runtimeView');
  } finally {
    fs.writeFileSync(source, original);
    fs.writeFileSync(timeline, originalTimeline);
  }

  // M2a dan XM-D1: tanpa masalah validasi sama sekali, beda hanya di posisi transisi (deteksi murni Kelas A)
  const m2a = results.M2a;
  assert.deepEqual([m2a.issuesA, m2a.issuesB, m2a.other], [[], [], []], 'M2a tidak boleh menimbulkan masalah validasi di fixture final');
  assert.deepEqual(m2a.transitions, [[75, 98], [171, 188]]);
  assert.deepEqual(m2a.paths.map((d) => [d.path, d.a, d.b]), [
    ['$.timeline.transitions[0].endFrame', 99, 105], ['$.timeline.transitions[0].lastFrame', 98, 104], ['$.timeline.transitions[0].startFrame', 75, 81]
  ]);
  const d1 = results['XM-D1'];
  assert.deepEqual([d1.issuesA, d1.issuesB, d1.other], [[], [], []], 'XM-D1 tidak boleh menimbulkan masalah validasi di fixture final');
  assert.equal(d1.paths.length, 6);
  assert.ok(d1.paths.every(isTransition));
  // M2b: dua masalah Kelas A (transisi tidak melewati batas), golden beda di posisi kedua transisi.
  // Masalah key di luar rentang (Kelas B) memang muncul tetapi tidak dihitung.
  const m2b = results.M2b;
  assert.deepEqual(m2b.issuesA, ['Transisi dari a: rentang frame 99..122 harus melewati batas adegan di frame 90', 'Transisi dari b: rentang frame 189..206 harus melewati batas adegan di frame 180']);
  assert.ok(m2b.pathsA.some((d) => d.path === '$.timeline.transitions[0].startFrame') && m2b.pathsA.some((d) => d.path === '$.timeline.transitions[1].startFrame'));
  assert.deepEqual(m2b.other, []);
  // XM-C1: key berbasis adegan bergeser +1 (Kelas A). Satu key kamera c di frame lokal 89 jatuh ke frame 270 dan dibuang
  // (Kelas B, disengaja: kamera c harus bergerak sampai frame terakhir supaya setiap frame unik)
  const c1 = results['XM-C1'];
  assert.deepEqual(c1.issuesB, ['Adegan 3 (c) kamera x key 1: waktu lokal frame lokal 89 = frame film 270 di luar rentang tampil adegan (frame lokal -9..89)']);
  assert.deepEqual([c1.issuesA, c1.other], [[], []]);
  assert.ok(c1.pathsA.some((d) => d.path === '$.timeline.scenes[1].camera.x[0][0]' && d.a === 85 && d.b === 84));
  assert.ok(!c1.pathsA.some(isTransition));
});

// ---------- penjaga isolasi (AC2b-01, AC2b-02, AC2b-23 sebagian) ----------

test('fixture bukan proyek resmi: tidak ada di listProjects, tidak ada di registry baseline, tidak bertabrakan dengan id atau nama resmi', () => {
  const official = P.listProjects();
  const registry = JSON.parse(fs.readFileSync(path.join(P.ROOT, 'tests', 'baselines', 'registry.json'), 'utf8'));
  const officialNames = official.map((p) => P.loadProject(p.id).name);
  for (const ref of FIXTURES) {
    const c = load(ref);
    assert.match(c.id, /^uji-/, ref);
    assert.equal(c.id, c.name, ref);
    assert.ok(!official.some((p) => p.id === c.id || p.file === path.resolve(P.ROOT, c.configFile)), ref);
    assert.ok(!officialNames.includes(c.name), ref);
    assert.ok(!Object.keys(registry.projects).includes(c.id), ref);
  }
});

test('fixture mandiri (K7): tidak ada $include ke config/ atau ke luar folder fixture', () => {
  for (const ref of FIXTURES) {
    const { includes } = P.readProject(ref);
    assert.ok(includes.length > 0, ref);
    for (const f of includes) assert.ok(f.startsWith('tests/fixtures/projects/uji-6a2b/'), `${ref}: ${f}`);
  }
  const dir = path.join(P.ROOT, 'tests', 'fixtures', 'projects');
  for (const name of fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith('.json'))) {
    assert.ok(!/config\//.test(fs.readFileSync(path.join(dir, name), 'utf8')), `${name} merujuk config/`);
  }
});

test('output fixture (K8): semua path di bawah output/frames/<fixture>/ yang sudah di-ignore Git, bukan folder ter-commit', () => {
  const git = spawnSync('git', ['--version'], { encoding: 'utf8' });
  assert.equal(git.status, 0, 'git dibutuhkan untuk memeriksa .gitignore');
  for (const ref of FIXTURES) {
    const c = load(ref);
    const base = path.join(P.ROOT, 'output', 'frames', c.name) + path.sep;
    const samples = [path.join(c.paths.frames, 'frame_0000.png'), c.paths.video, path.join(c.paths.reports, `${c.name}-render.json`), path.join(c.paths.reports, `${c.name}-validation.json`)];
    for (const file of samples) {
      assert.ok(file.startsWith(base), `${ref}: ${file} di luar ${base}`);
      const r = spawnSync('git', ['check-ignore', '-q', path.relative(P.ROOT, file)], { cwd: P.ROOT, encoding: 'utf8' });
      assert.equal(r.status, 0, `${ref}: ${file} tidak di-ignore Git`);
    }
  }
});

test('D6 tetap tertutup: proyek resmi di config/ tidak memakai sintaks waktu relatif adegan', () => {
  const props = (v, hits = []) => {
    if (Array.isArray(v)) v.forEach((x) => props(x, hits));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (k === 'timing' || k === 'lead') hits.push(k); props(x, hits); }
    return hits;
  };
  for (const p of P.listProjects()) {
    const { raw } = P.readProject(p.id);
    assert.deepEqual(props(raw), [], p.id);
    for (const s of raw.timeline?.scenes || []) assert.equal(s.duration, undefined, `${p.id} ${s.id}`);
  }
});
