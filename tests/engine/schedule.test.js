// Unit test jadwal timeline (interval setengah terbuka) dan lingkungan.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSchedule } from '../../src/engine/schedule.js';
import { createEnvironment } from '../../src/engine/environment.js';

const timeline = {
  scenes: [
    { id: 'a', startFrame: 0, endFrame: 120 },
    { id: 'b', startFrame: 120, endFrame: 240 },
    { id: 'c', startFrame: 240, endFrame: 360 }
  ],
  transitions: [{ id: 'a->b', startFrame: 108, endFrame: 132, lastFrame: 131 }]
};

test('adegan memakai interval [awal, akhir): frame akhir milik adegan berikutnya', () => {
  const s = createSchedule({ ...timeline, transitions: [] });
  assert.deepEqual(s.segmentAt(0), { kind: 'scene', id: 'a' });
  assert.deepEqual(s.segmentAt(119), { kind: 'scene', id: 'a' });
  assert.deepEqual(s.segmentAt(120), { kind: 'scene', id: 'b' });
  assert.deepEqual(s.segmentAt(359), { kind: 'scene', id: 'c' });
  assert.throws(() => s.segmentAt(360), /tidak berada di adegan/);
});

test('transisi: p = 0 di frame pertama, p = 1 di frame terakhir, lalu adegan baru', () => {
  const s = createSchedule(timeline);
  assert.equal(s.segmentAt(107).kind, 'scene');
  assert.equal(s.segmentAt(108).p, 0);
  assert.equal(s.segmentAt(131).p, 1);
  assert.ok(s.segmentAt(120).p > 0.4 && s.segmentAt(120).p < 0.6);
  assert.deepEqual(s.segmentAt(132), { kind: 'scene', id: 'b' });
});

test('jadwal tidak bergantung urutan pemanggilan', () => {
  const s = createSchedule(timeline);
  const forward = [...Array(360).keys()].map((f) => JSON.stringify(s.segmentAt(f)));
  const backward = [...Array(360).keys()].reverse().map((f) => JSON.stringify(s.segmentAt(f))).reverse();
  assert.deepEqual(forward, backward);
});

test('lingkungan: track bebas dihitung dari nomor frame', () => {
  const env = createEnvironment({ daylight: [[0, 0], [100, 1]], rain: [[0, 1]] }, 30);
  assert.equal(env.at(50).daylight, 0.5);
  assert.equal(env.at(50).rain, 1);
  assert.equal(env.trackAt('daylight', 100 / 30 / 2), 0.5);
  assert.equal(env.trackAt('tidak-ada', 1, 0.3), 0.3);
  assert.deepEqual(env.keys, ['daylight', 'rain']);
});
