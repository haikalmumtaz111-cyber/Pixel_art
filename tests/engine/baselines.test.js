// Unit test registry baseline per versi (src/render/baselines.cjs), tanpa render. Memakai folder baseline buatan sendiri.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const B = require('../../src/render/baselines.cjs');

const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');

// proyek mini 10 frame: v1 -> v2 mengubah frame 3-5 dengan deklarasi 2-6
function fixture({ edit } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-baselines-'));
  const v1 = Array.from({ length: 10 }, (_, i) => `a${i}`);
  const v2 = v1.map((h, i) => (i >= 3 && i <= 5 ? `b${i}` : h));
  const files = { 'mini.json': v1, 'mini.v2.json': v2 };
  const texts = {};
  for (const [file, pixelMd5] of Object.entries(files)) {
    texts[file] = `${JSON.stringify({ project: 'mini', frameCount: pixelMd5.length, pixelMd5 }, null, 1)}\n`;
    fs.writeFileSync(path.join(dir, file), texts[file]);
  }
  const registry = {
    projects: {
      mini: {
        official: 'v2',
        versions: {
          v1: { file: 'mini.json', sha256: sha(texts['mini.json']), frames: 10, approval: { evidence: ['uji'] } },
          v2: {
            file: 'mini.v2.json', sha256: sha(texts['mini.v2.json']), frames: 10, previous: 'v1',
            changes: { declared: [[2, 6]], changed: [[3, 5]], changedCount: 3, unchangedCount: 7 }, approval: { by: 'pemilik', evidence: ['uji'] }
          }
        }
      }
    }
  };
  const pending = { changes: {}, resolved: [] };
  if (edit) edit({ registry, pending, dir });
  fs.writeFileSync(path.join(dir, 'registry.json'), JSON.stringify(registry));
  fs.writeFileSync(path.join(dir, 'pending-changes.json'), JSON.stringify(pending));
  return dir;
}

const failed = (checks) => checks.filter((c) => !c.pass).map((c) => c.id);

test('rentang frame: dipadatkan, dibaca, dan dihitung dengan benar', () => {
  assert.deepEqual(B.toRanges([90, 85, 86, 87]), [[85, 87], [90, 90]]);
  assert.equal(B.formatRanges([[85, 130], [262, 262]]), '85-130, 262');
  assert.equal(B.countRanges([[84, 131], [255, 345]]), 139);
  assert.ok(B.inRanges([[84, 131]], 84) && B.inRanges([[84, 131]], 131) && !B.inRanges([[84, 131]], 132));
  assert.deepEqual(B.diffFrames(['a', 'b', 'c'], ['a', 'x', 'c', 'd']), [1, 3]);
});

test('stringify: JSON valid, rentang frame tetap satu baris', () => {
  const value = { frames: [[84, 131], [255, 345]], evidence: ['PR #4, di-merge'], empty: {} };
  const text = B.stringify(value);
  assert.deepEqual(JSON.parse(text), value);
  assert.match(text, /"frames": \[\[84, 131\], \[255, 345\]\]/);
});

test('registry yang benar lulus semua pemeriksaan dan memuat versi resmi', () => {
  const dir = fixture();
  assert.deepEqual(failed(B.verifyRegistry({ dir })), []);
  const official = B.loadBaseline('mini', null, dir);
  assert.equal(official.version, 'v2');
  assert.equal(official.official, true);
  assert.equal(B.loadBaseline('mini', 'v1', dir).official, false);
  assert.equal(B.loadBaseline('lain', null, dir), null);
  assert.throws(() => B.loadBaseline('mini', 'v9', dir), /tidak punya baseline versi "v9"/);
  assert.deepEqual(B.lineage(B.readRegistry(dir).projects.mini), ['v1', 'v2']);
});

test('isi file baseline yang diubah terdeteksi lewat SHA-256', () => {
  const dir = fixture({ edit: ({ dir: d }) => fs.appendFileSync(path.join(d, 'mini.json'), ' ') });
  assert.deepEqual(failed(B.verifyRegistry({ dir })), ['registry:mini:files']);
});

test('file baseline yang tidak terdaftar ditolak', () => {
  const dir = fixture({ edit: ({ dir: d }) => fs.writeFileSync(path.join(d, 'liar.json'), '{}') });
  assert.deepEqual(failed(B.verifyRegistry({ dir })), ['registry:files']);
});

test('catatan perubahan antar versi harus sama persis dengan isi file', () => {
  const wrongCount = fixture({ edit: ({ registry }) => { registry.projects.mini.versions.v2.changes.changed = [[3, 4]]; } });
  assert.deepEqual(failed(B.verifyRegistry({ dir: wrongCount })), ['registry:mini:v1->v2']);
  const outside = fixture({ edit: ({ registry }) => { registry.projects.mini.versions.v2.changes.declared = [[4, 6]]; } });
  assert.deepEqual(failed(B.verifyRegistry({ dir: outside })), ['registry:mini:v1->v2']);
  const unapproved = fixture({ edit: ({ registry }) => { delete registry.projects.mini.versions.v2.approval; } });
  assert.deepEqual(failed(B.verifyRegistry({ dir: unapproved })), ['registry:mini:v1->v2']);
});

test('versi yang tidak tersambung ke versi resmi ditolak', () => {
  const dir = fixture({ edit: ({ registry }) => { delete registry.projects.mini.versions.v2.previous; } });
  assert.deepEqual(failed(B.verifyRegistry({ dir })), ['registry:mini:official']);
});

test('perubahan terdeklarasi hanya berlaku terhadap versi yang disebut', () => {
  const entry = { stage: 'Tahap X', status: 'menunggu persetujuan pemilik', frames: [[1, 2]] };
  const stale = fixture({ edit: ({ pending }) => { pending.changes.mini = { ...entry, against: 'v1' }; } });
  assert.deepEqual(failed(B.verifyRegistry({ dir: stale })), ['registry:mini:pending']);
  const registry = B.readRegistry(stale);
  const pending = B.readPending(stale);
  assert.equal(B.pendingFor(pending, registry, 'mini', 'v2'), null);
  assert.equal(B.pendingFor(pending, registry, 'mini', 'v1').stage, 'Tahap X');
  // entri lama tanpa "against" dianggap terhadap versi resmi
  const legacy = fixture({ edit: ({ pending: p }) => { p.changes.mini = entry; } });
  assert.deepEqual(failed(B.verifyRegistry({ dir: legacy })), []);
  assert.equal(B.pendingFor(B.readPending(legacy), B.readRegistry(legacy), 'mini', 'v2').stage, 'Tahap X');
  assert.equal(B.pendingFor(B.readPending(legacy), B.readRegistry(legacy), 'mini', 'v1'), null);
});
