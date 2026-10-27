// Unit test angka acak deterministik.
import test from 'node:test';
import assert from 'node:assert/strict';
import { hash, noise1D, fbm1D } from '../../src/engine/random.js';

test('hash: input sama selalu menghasilkan angka sama', () => {
  for (let i = 0; i < 200; i++) assert.equal(hash(1958, i, 3), hash(1958, i, 3));
});

test('hash: hasil di rentang 0..1 dan tersebar', () => {
  const values = [...Array(5000)].map((_, i) => hash(7, i));
  assert.ok(values.every((v) => v >= 0 && v < 1));
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  assert.ok(Math.abs(mean - 0.5) < 0.03, `rata-rata ${mean}`);
  const buckets = new Array(10).fill(0);
  values.forEach((v) => buckets[Math.floor(v * 10)]++);
  assert.ok(buckets.every((n) => n > 400 && n < 600), `sebaran ${buckets}`);
});

test('hash: seed berbeda menghasilkan deret berbeda', () => {
  const a = [...Array(50)].map((_, i) => hash(1, i));
  const b = [...Array(50)].map((_, i) => hash(2, i));
  assert.notDeepEqual(a, b);
});

test('noise dan fbm deterministik, halus, dan di rentang 0..1', () => {
  for (let x = 0; x < 50; x += 0.37) {
    assert.equal(fbm1D(4321, x), fbm1D(4321, x));
    const v = noise1D(9, x);
    assert.ok(v >= 0 && v <= 1);
    assert.ok(Math.abs(noise1D(9, x + 0.01) - v) < 0.05, 'noise tidak melompat');
  }
});
