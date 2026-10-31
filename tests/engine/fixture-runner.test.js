// Fungsi murni runner uji browser fixture (src/render/fixture-tests.cjs, Tahap 6A-2b PR 2), tanpa browser dan FFmpeg:
// urutan acak ber-seed, pemeriksaan komposisi dissolve, dan pemeriksaan A13 per frame. Masukannya data buatan, jadi
// uji ini membuktikan setiap pemeriksaan benar-benar GAGAL pada kerusakan yang dimaksud (bukan selalu lulus).
// Uji dengan render sungguhan ada di npm run test:fixtures dan blok fixture npm run test:smoke.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const R = require('../../src/render/fixture-tests.cjs');
const { EXPECT: E } = R;
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

test('urutan acak ber-seed: permutasi 0..269 yang sama setiap kali, hash urutan terkunci', () => {
  const a = R.shuffle(E.TOTAL, E.SHUFFLE_SEED);
  assert.deepEqual(a, R.shuffle(E.TOTAL, E.SHUFFLE_SEED));
  assert.deepEqual([...a].sort((x, y) => x - y), range(0, E.TOTAL - 1));
  assert.equal(crypto.createHash('sha256').update(a.join(',')).digest('hex').slice(0, 16), E.SHUFFLE_HASH);
  assert.notDeepEqual(a, range(0, E.TOTAL - 1));
  assert.notDeepEqual(R.shuffle(E.TOTAL, E.SHUFFLE_SEED + 1), a);
});

test('acuan tulisan tangan konsisten: 228 frame di luar transisi, 312 pasangan frame-adegan, 4.002 entitas tampak', () => {
  const own = Object.values(E.OWN).reduce((n, [a, b]) => n + b - a + 1, 0);
  assert.equal(own, 228);
  const pairs = range(0, E.TOTAL - 1).reduce((n, f) => n + Object.values(E.DRAWN).filter(([a, b]) => f >= a && f <= b).length, 0);
  assert.equal(pairs, E.A13_PAIRS);
  let entities = 0;
  for (const [scene, [a, b]] of Object.entries(E.DRAWN)) for (const f of range(a, b)) entities += E.visibleAt(scene, f).length;
  assert.equal(entities, E.A13_ENTITIES);
  assert.deepEqual(E.TRANSITIONS.map((t) => [t.id, t.first, t.last]), [['a->b', 81, 104], ['b->c', 171, 188]]);
});

// baris komposisi buatan: n frame jendela + 1 sebelum + 1 sesudah, q mengikuti p (seperti dissolve linear)
const total = 1000;
function rows(first, last, qOf) {
  return range(first - 1, last + 1).map((frame) => {
    const q = frame < first ? 0 : frame > last ? 1 : qOf(frame);
    const toOnly = Math.round(q * total);
    return { frame, fromOnly: total - toOnly, toOnly, both: 0, foreign: 0, q: toOnly / total };
  });
}
const t = { id: 'a->b', first: 81, last: 104 };
const p = (f) => (f - t.first) / (t.last - t.first);
const level16 = (f) => Math.round(p(f) * 16) / 16;

test('komposisi dissolve: kemajuan bertahap lolos, potongan kasar, piksel asing, mundur, dan batas yang salah GAGAL', () => {
  assert.deepEqual(R.compositionProblems(rows(t.first, t.last, level16), t), []);
  // subset CI memakai frame sampel yang tidak bersebelahan: tanpa alarm lompatan palsu, batas dan piksel asing tetap diperiksa
  const sampled = rows(t.first, t.last, level16).filter((r) => [80, 81, 92, 104, 105].includes(r.frame));
  assert.deepEqual(R.compositionProblems(sampled, t), []);
  sampled[1].toOnly = 50;
  assert.ok(R.compositionProblems(sampled, t).some((m) => /frame 81: seharusnya sama persis dengan adegan asal/.test(m)));
  // potongan kasar di frame 90: q langsung 0 -> 1
  const cut = R.compositionProblems(rows(t.first, t.last, (f) => (f < 90 ? 0 : 1)), t);
  assert.ok(cut.some((m) => /frame 90: kemajuan melompat 1\.0000/.test(m)), cut.join('; '));
  // piksel asing di satu frame (kilatan, stage salah, frame rusak)
  const foreign = rows(t.first, t.last, level16);
  foreign.find((r) => r.frame === 95).foreign = 12;
  assert.ok(R.compositionProblems(foreign, t).some((m) => /frame 95: 12 piksel bukan milik adegan asal maupun tujuan/.test(m)));
  // kemajuan mundur (kedip bolak-balik)
  const back = R.compositionProblems(rows(t.first, t.last, (f) => (f === 96 ? level16(f) - 0.2 : level16(f))), t);
  assert.ok(back.some((m) => /frame 96: kemajuan mundur/.test(m)), back.join('; '));
  // frame pertama jendela sudah memuat adegan tujuan (transisi mulai terlalu awal)
  const early = R.compositionProblems(rows(t.first, t.last, (f) => Math.min(1, level16(f) + 0.0625)), t);
  assert.ok(early.some((m) => /frame 81: seharusnya sama persis dengan adegan asal/.test(m)), early.join('; '));
  // dither terbalik: q jauh dari p
  const inverted = R.compositionProblems(rows(t.first, t.last, (f) => (f === t.first || f === t.last ? level16(f) : 1 - level16(f))), t);
  assert.ok(inverted.some((m) => /jauh dari p/.test(m)), inverted.join('; '));
});

// layout buatan yang benar menurut acuan, lalu dirusak satu per satu
function layout() {
  return {
    frames: range(0, E.TOTAL - 1).map((frame) => {
      const segment = E.SEGMENTS.find(([a, b]) => frame >= a && frame <= b)[2];
      const drawn = Object.entries(E.DRAWN).filter(([, [a, b]]) => frame >= a && frame <= b).map(([id]) => id);
      return { frame, segment, scenes: Object.fromEntries(drawn.map((id) => [id, E.visibleAt(id, frame)])) };
    })
  };
}

test('A13 per frame: layout sesuai acuan lolos, id ganda, entitas hilang atau berlebih, dan segmen salah GAGAL', () => {
  const ok = R.a13Problems(layout());
  assert.deepEqual(ok.problems, []);
  assert.deepEqual([ok.pairs, ok.entities], [E.A13_PAIRS, E.A13_ENTITIES]);
  const dup = layout();
  dup.frames[200].scenes.c.push('kios-c');
  const d = R.a13Problems(dup);
  assert.deepEqual(d.duplicates, [{ frame: 200, scene: 'c', id: 'kios-c', n: 2 }]);
  assert.ok(d.problems.some((m) => /frame 200 adegan c: id "kios-c" tampil 2 kali/.test(m)));
  const missing = layout();
  missing.frames[10].scenes.a = missing.frames[10].scenes.a.filter((id) => id !== 'pengayuh-a');
  assert.ok(R.a13Problems(missing).problems.some((m) => /frame 10 adegan a: entitas tampak salah, hilang pengayuh-a/.test(m)));
  const leak = layout();
  leak.frames[150].scenes.b.push('pasar-bench');
  assert.ok(R.a13Problems(leak).problems.some((m) => /frame 150 adegan b: entitas tampak salah, berlebih pasar-bench/.test(m)));
  const hidden = layout();
  hidden.frames[245].scenes.c.push('lampu-c');
  assert.ok(R.a13Problems(hidden).problems.some((m) => /frame 245 adegan c: entitas tampak salah, berlebih lampu-c/.test(m)));
  const seg = layout();
  seg.frames[81].segment = 'a';
  assert.ok(R.a13Problems(seg).problems.some((m) => /frame 81: segmen "a", seharusnya "a->b"/.test(m)));
  const drawn = layout();
  delete drawn.frames[170].scenes.b;
  assert.ok(R.a13Problems(drawn).problems.some((m) => /frame 170: adegan yang digambar/.test(m)));
});
