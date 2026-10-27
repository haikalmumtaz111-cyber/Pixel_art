// Unit test track keyframe dan easing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createTrack, createStepTrack, createValue } from '../../src/engine/tracks.js';
import { EASINGS, ease, mod } from '../../src/engine/math.js';

const require = createRequire(import.meta.url);

test('track angka: interpolasi linear di antara keyframe', () => {
  const t = createTrack([[0, 0], [10, 100]]);
  assert.equal(t(0), 0);
  assert.equal(t(5), 50);
  assert.equal(t(10), 100);
});

test('track angka: menahan nilai sebelum key pertama dan sesudah key terakhir', () => {
  const t = createTrack([[20, 3], [40, 7]]);
  assert.equal(t(-5), 3);
  assert.equal(t(0), 3);
  assert.equal(t(1000), 7);
});

test('track angka: easing ditulis di key tujuan', () => {
  const t = createTrack([[0, 0], [10, 1, 'inQuad']]);
  assert.equal(t(5), 0.25);
  const s = createTrack([[0, 0], [10, 1, 'inOutSine'], [20, 0]]);
  assert.ok(Math.abs(s(5) - 0.5) < 1e-12);
  assert.equal(s(15), 0.5); // segmen kedua linear
});

test('track angka kosong memakai nilai cadangan', () => {
  assert.equal(createTrack(undefined, 9)(123), 9);
  assert.equal(createTrack([], 4)(0), 4);
});

test('track bertangga: nilai bertahan sampai key berikutnya', () => {
  const t = createStepTrack([[0, 'idle'], [30, 'walk'], [60, 'idle']]);
  assert.equal(t(0), 'idle');
  assert.equal(t(29), 'idle');
  assert.equal(t(30), 'walk');
  assert.equal(t(59), 'walk');
  assert.equal(t(60), 'idle');
  // sebelum key pertama tetap memakai key pertama
  assert.equal(createStepTrack([[10, true]])(0), true);
});

test('createValue: nilai tetap atau keyframe', () => {
  assert.equal(createValue(5, 0)(99), 5);
  assert.equal(createValue(undefined, 7)(1), 7);
  assert.equal(createValue([[0, 'on'], [5, 'off']], null, { step: true })(5), 'off');
  assert.equal(createValue([[0, 0], [10, 10]], 0)(4), 4);
});

test('easing: semua kurva mulai di 0, berakhir di 1, dan nilai di luar 0..1 dijepit', () => {
  for (const [name, fn] of Object.entries(EASINGS)) {
    assert.ok(Math.abs(fn(0)) < 1e-12, `${name}(0)`);
    assert.ok(Math.abs(fn(1) - 1) < 1e-12, `${name}(1)`);
    assert.equal(ease(name, 2), ease(name, 1));
    assert.equal(ease(name, -1), ease(name, 0));
  }
  assert.throws(() => ease('tidak-ada', 0.5), /Easing tidak dikenal/);
});

test('daftar easing di config/engine.json sama dengan yang ada di mesin', () => {
  const engine = require('../../config/engine.json');
  assert.deepEqual([...engine.easings].sort(), Object.keys(EASINGS).sort());
});

test('mod selalu positif (aman untuk waktu/posisi negatif)', () => {
  assert.equal(mod(-1, 3), 2);
  assert.equal(mod(-3, 3), 0);
  assert.equal(mod(7, 3), 1);
});
