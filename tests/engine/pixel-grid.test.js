// Unit test pemetaan grid piksel untuk zoom kamera (src/engine/pixel-grid.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { axisMap, nearestAxisMap, cellOf, gridRank, mergeRuns, coverIndex } from '../../src/engine/pixel-grid.js';

const X = { size: 480, outSize: 1920 };
const Y = { size: 270, outSize: 1080, axis: 'y' };
const INTEGER_ZOOMS = [1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];
const FRACTIONAL_ZOOMS = [1.01, 1.1, 1.2, 1.3333, 1.6, 1.9, 2.2, 3.7];

const visible = (m) => {
  const list = [];
  for (let s = m.first; s <= m.last; s++) list.push({ s, d: m.start[s], w: m.size[s] });
  return list;
};

// kolom bersambung tanpa celah/tumpang tindih dan menutupi seluruh layar
function assertTiles(m, outSize, label) {
  const cols = visible(m);
  for (let i = 1; i < cols.length; i++) assert.equal(cols[i].d, cols[i - 1].d + cols[i - 1].w, `${label}: celah di kolom ${cols[i].s}`);
  assert.ok(cols[0].d <= 0, `${label}: sisi kiri tidak tertutup`);
  assert.ok(cols.at(-1).d + cols.at(-1).w >= outSize, `${label}: sisi kanan tidak tertutup`);
}

test('zoom kelipatan 0,25: semua piksel art berukuran sama persis', () => {
  for (const zoom of INTEGER_ZOOMS) {
    for (const axis of [X, Y]) {
      for (const anchor of [0, 7, -13, 250]) {
        const m = axisMap({ ...axis, zoom, anchor });
        assert.equal(m.f, 0, `zoom ${zoom}`);
        assert.ok(visible(m).every((c) => c.w === 4 * zoom), `zoom ${zoom}: ukuran tidak seragam`);
        assertTiles(m, axis.outSize, `zoom ${zoom}`);
      }
    }
  }
});

test('zoom kelipatan 0,25 memakai posisi yang sama dengan cara Tahap 3 (potongan tengah)', () => {
  for (const zoom of INTEGER_ZOOMS) {
    const m = axisMap({ ...X, zoom });
    const near = nearestAxisMap({ ...X, zoom });
    for (let s = m.first; s <= m.last; s++) {
      if (m.start[s] < 0 || m.start[s] + m.size[s] > 1920) continue; // kolom terpotong di tepi
      assert.equal(m.start[s], near.start[s], `zoom ${zoom} kolom ${s}`);
    }
  }
});

test('zoom pecahan: hanya dua ukuran berdampingan (c dan c+1), bersambung, pusat tetap', () => {
  for (const zoom of FRACTIONAL_ZOOMS) {
    for (const axis of [X, Y]) {
      const m = axisMap({ ...axis, zoom, anchor: 11 });
      const { c } = cellOf(4, zoom);
      assert.ok(visible(m).every((col) => col.w === c || col.w === c + 1), `zoom ${zoom}`);
      assert.equal(m.start[axis.size / 2], axis.outSize / 2, `zoom ${zoom}: pusat bergeser`);
      assertTiles(m, axis.outSize, `zoom ${zoom}`);
    }
  }
});

test('sebaran piksel ekstra merata: setiap jendela kolom berselisih paling banyak 2 dari ideal', () => {
  for (const f of [0.05, 0.25, 0.4, 0.5, 0.77, 0.95]) {
    const wide = (j) => (gridRank(j) < f ? 1 : 0);
    for (const n of [8, 20, 60, 240]) {
      for (let a = -300; a < 300; a += 7) {
        let count = 0;
        for (let j = a; j < a + n; j++) count += wide(j);
        assert.ok(Math.abs(count - f * n) <= 2, `f=${f} jendela ${n} di ${a}: ${count} vs ${(f * n).toFixed(1)}`);
      }
    }
  }
});

test('zoom naik: setiap kolom tumbuh paling banyak satu kali per level (tidak bolak-balik)', () => {
  const anchor = 37;
  const widths = (zoom) => {
    const m = axisMap({ ...X, zoom, anchor });
    const out = new Map();
    for (let s = m.first; s <= m.last; s++) out.set(s + anchor, m.size[s]);
    return out;
  };
  const changes = new Map();
  let prev = widths(1);
  for (let k = 1; k <= 100; k++) {
    const now = widths(1 + (0.25 * k) / 100);
    for (const [j, w] of now) {
      if (prev.has(j) && prev.get(j) !== w) {
        assert.ok(w > prev.get(j), `kolom ${j} mengecil saat zoom naik`);
        changes.set(j, (changes.get(j) || 0) + 1);
      }
    }
    prev = now;
  }
  assert.ok(Math.max(...changes.values()) === 1, 'ada kolom yang berubah lebih dari sekali');
});

test('kamera bergeser: semua kolom dunia bergeser sama jauh (gerak kaku, tidak merayap)', () => {
  for (const zoom of [1.1, 1.37, 2.2]) {
    for (const axis of [X, Y]) {
      for (const step of [1, 3, -2]) {
        const a = axisMap({ ...axis, zoom, anchor: 100 });
        const b = axisMap({ ...axis, zoom, anchor: 100 + step });
        const shifts = new Set();
        for (let s = a.first; s <= a.last; s++) {
          const t = s - step; // kolom dunia yang sama di kanvas setelah bergeser
          if (t >= b.first && t <= b.last) {
            assert.equal(b.size[t], a.size[s], `zoom ${zoom}: ukuran kolom dunia berubah saat geser`);
            shifts.add(b.start[t] - a.start[s]);
          }
        }
        assert.equal(shifts.size, 1, `zoom ${zoom}: geseran tidak seragam (${[...shifts]})`);
      }
    }
  }
});

test('pembanding: cara nearest Tahap 3 menempel layar, jadi ukuran kolom dunia berubah saat kamera geser', () => {
  const zoom = 1.1;
  const m = nearestAxisMap({ ...X, zoom });
  let changed = 0;
  for (let s = m.first + 1; s < m.last - 1; s++) if (m.size[s] !== m.size[s + 1]) changed++;
  // geser 1 kolom = kolom dunia j kini memakai lebar kolom layar tetangganya
  assert.ok(changed > 20, 'model nearest seharusnya punya pola 4/5 yang berubah antar kolom');
});

test('mode steps: zoom dibulatkan ke ukuran piksel bulat terdekat', () => {
  assert.deepEqual(cellOf(4, 1.1, 'steps'), { c: 4, f: 0, eff: 4 });
  assert.deepEqual(cellOf(4, 1.2, 'steps'), { c: 5, f: 0, eff: 5 });
  assert.deepEqual(cellOf(4, 1.4, 'steps'), { c: 6, f: 0, eff: 6 });
  const m = axisMap({ ...X, zoom: 1.4, mode: 'steps', anchor: 5 });
  assert.ok(visible(m).every((c) => c.w === 6));
});

test('penggabungan potongan dan indeks penutup konsisten dengan pemetaan', () => {
  const m = axisMap({ ...X, zoom: 1.3, anchor: -4 });
  let covered = 0;
  for (const r of mergeRuns(m)) {
    for (let k = 0; k < r.n; k++) {
      assert.equal(m.start[r.s + k], r.d + k * r.w);
      assert.equal(m.size[r.s + k], r.w);
    }
    covered += r.n;
  }
  assert.equal(covered, m.last - m.first + 1);
  const index = coverIndex(m, 1920);
  for (let X0 = 0; X0 < 1920; X0 += 37) {
    const s = index[X0];
    assert.ok(m.start[s] <= X0 && X0 < m.start[s] + m.size[s]);
  }
});
