// Contoh proyek di docs/REUSABILITY_GUIDE.md harus selalu valid untuk versi mesin ini.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const P = require('../../src/render/projects.cjs');

test('contoh proyek di panduan reusability lolos validasi', () => {
  const guide = fs.readFileSync(new URL('../../docs/REUSABILITY_GUIDE.md', import.meta.url), 'utf8');
  const block = guide.split('```json').map((b) => b.split('```')[0]).find((b) => b.includes('"id": "contoh-pasar"'));
  assert.ok(block, 'blok JSON contoh-pasar tidak ditemukan di panduan');
  const config = P.buildProject(JSON.parse(block), `${P.ROOT}/config/contoh-pasar.json`, { strict: false });
  assert.deepEqual(config.timelineIssues, []);
  assert.equal(config.totalFrames, 120);
  assert.equal(config.timeline.scenes[0].assets.length, 4);
});
