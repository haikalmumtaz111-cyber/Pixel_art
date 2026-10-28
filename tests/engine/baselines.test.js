// Unit test registry baseline per versi (src/render/baselines.cjs), tanpa render. Memakai folder baseline buatan sendiri.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const B = require('../../src/render/baselines.cjs');

const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');

// Folder sementara milik fixture. Setiap folder dihapus oleh hook t.after() dari tes yang membuatnya; hook itu
// tetap berjalan walau assertion di tes tersebut gagal. Hook after() di akhir file menjadi jaring pengaman.
// Pembersih hanya menghapus folder yang tercatat dibuat fixture, tidak pernah folder lain.
const TEMP_PREFIX = path.join(os.tmpdir(), 'pixel-baselines-');
const ownedDirs = new Set();
const createdDirs = [];
// jalur folder fixture yang sah: tepat satu tingkat di bawah folder sementara sistem dan berawalan pixel-baselines-
function isFixturePath(dir) {
  const full = path.resolve(dir);
  const name = path.basename(full);
  return path.dirname(full) === path.resolve(os.tmpdir()) && name.startsWith('pixel-baselines-') && name.length > 'pixel-baselines-'.length;
}
function removeOwnedDir(dir) {
  if (!ownedDirs.has(dir) || !isFixturePath(dir)) return false;
  fs.rmSync(dir, { recursive: true, force: true });
  ownedDirs.delete(dir);
  return true;
}
after(() => {
  for (const dir of [...ownedDirs]) removeOwnedDir(dir);
});

// proyek mini 10 frame: v1 -> v2 mengubah frame 3-5 dengan deklarasi 2-6
function fixture(t, { edit } = {}) {
  const dir = fs.mkdtempSync(TEMP_PREFIX);
  ownedDirs.add(dir);
  createdDirs.push(dir);
  t.after(() => removeOwnedDir(dir));
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

test('registry yang benar lulus semua pemeriksaan dan memuat versi resmi', (t) => {
  const dir = fixture(t);
  assert.deepEqual(failed(B.verifyRegistry({ dir })), []);
  const official = B.loadBaseline('mini', null, dir);
  assert.equal(official.version, 'v2');
  assert.equal(official.official, true);
  assert.equal(B.loadBaseline('mini', 'v1', dir).official, false);
  assert.equal(B.loadBaseline('lain', null, dir), null);
  assert.throws(() => B.loadBaseline('mini', 'v9', dir), /tidak punya baseline versi "v9"/);
  assert.deepEqual(B.lineage(B.readRegistry(dir).projects.mini), ['v1', 'v2']);
});

test('isi file baseline yang diubah terdeteksi lewat SHA-256', (t) => {
  const dir = fixture(t, { edit: ({ dir: d }) => fs.appendFileSync(path.join(d, 'mini.json'), ' ') });
  assert.deepEqual(failed(B.verifyRegistry({ dir })), ['registry:mini:files']);
});

test('file baseline yang tidak terdaftar ditolak', (t) => {
  const dir = fixture(t, { edit: ({ dir: d }) => fs.writeFileSync(path.join(d, 'liar.json'), '{}') });
  assert.deepEqual(failed(B.verifyRegistry({ dir })), ['registry:files']);
});

test('catatan perubahan antar versi harus sama persis dengan isi file', (t) => {
  const wrongCount = fixture(t, { edit: ({ registry }) => { registry.projects.mini.versions.v2.changes.changed = [[3, 4]]; } });
  assert.deepEqual(failed(B.verifyRegistry({ dir: wrongCount })), ['registry:mini:v1->v2']);
  const outside = fixture(t, { edit: ({ registry }) => { registry.projects.mini.versions.v2.changes.declared = [[4, 6]]; } });
  assert.deepEqual(failed(B.verifyRegistry({ dir: outside })), ['registry:mini:v1->v2']);
  const unapproved = fixture(t, { edit: ({ registry }) => { delete registry.projects.mini.versions.v2.approval; } });
  assert.deepEqual(failed(B.verifyRegistry({ dir: unapproved })), ['registry:mini:v1->v2']);
});

test('versi yang tidak tersambung ke versi resmi ditolak', (t) => {
  const dir = fixture(t, { edit: ({ registry }) => { delete registry.projects.mini.versions.v2.previous; } });
  assert.deepEqual(failed(B.verifyRegistry({ dir })), ['registry:mini:official']);
});

test('perubahan terdeklarasi hanya berlaku terhadap versi yang disebut', (t) => {
  const entry = { stage: 'Tahap X', status: 'menunggu persetujuan pemilik', frames: [[1, 2]] };
  const stale = fixture(t, { edit: ({ pending }) => { pending.changes.mini = { ...entry, against: 'v1' }; } });
  assert.deepEqual(failed(B.verifyRegistry({ dir: stale })), ['registry:mini:pending']);
  const registry = B.readRegistry(stale);
  const pending = B.readPending(stale);
  assert.equal(B.pendingFor(pending, registry, 'mini', 'v2'), null);
  assert.equal(B.pendingFor(pending, registry, 'mini', 'v1').stage, 'Tahap X');
  // entri lama tanpa "against" dianggap terhadap versi resmi
  const legacy = fixture(t, { edit: ({ pending: p }) => { p.changes.mini = entry; } });
  assert.deepEqual(failed(B.verifyRegistry({ dir: legacy })), []);
  assert.equal(B.pendingFor(B.readPending(legacy), B.readRegistry(legacy), 'mini', 'v2').stage, 'Tahap X');
  assert.equal(B.pendingFor(B.readPending(legacy), B.readRegistry(legacy), 'mini', 'v1'), null);
});

// penjaga baseline historis: folder sekarang dibandingkan dengan referensi tepercaya (misalnya main)
function guardFixture() {
  const registry = {
    projects: {
      mini: {
        official: 'v1',
        versions: { v1: { file: 'mini.json', sha256: 'aaa', source: 'main@1', frames: 2, approval: { evidence: ['uji'] }, note: 'lama' } }
      }
    }
  };
  const pending = { changes: {}, resolved: [{ project: 'mini', stage: 'Tahap X', frames: [[0, 1]], status: 'disetujui pemilik' }] };
  return { 'mini.json': '{"project":"mini"}\n', 'registry.json': JSON.stringify(registry), 'pending-changes.json': JSON.stringify(pending) };
}
const edit = (files, name, fn) => {
  const data = JSON.parse(files[name]);
  fn(data);
  return { ...files, [name]: JSON.stringify(data) };
};

test('penjaga: folder yang sama dengan referensi lulus, versi dan file baru boleh ditambah', () => {
  const ref = guardFixture();
  assert.deepEqual(failed(B.guardAgainst(ref, ref)), []);
  let now = { ...ref, 'mini.v2.json': '{"project":"mini"}\n' };
  now = edit(now, 'registry.json', (r) => {
    r.projects.mini.versions.v2 = { file: 'mini.v2.json', sha256: 'bbb', previous: 'v1' };
    r.projects.mini.official = 'v2';
    r.projects.mini.versions.v1.note = 'catatan diperbaiki';
  });
  now = edit(now, 'pending-changes.json', (p) => p.resolved.push({ project: 'mini', stage: 'Tahap Y' }));
  // urutan kunci berbeda tidak dianggap perubahan
  now = edit(now, 'registry.json', (r) => { r.projects.mini.versions.v1 = Object.fromEntries(Object.entries(r.projects.mini.versions.v1).reverse()); });
  assert.deepEqual(failed(B.guardAgainst(ref, now)), []);
});

test('penjaga: file baseline lama diubah bersama hash registry tetap tertangkap', () => {
  const ref = guardFixture();
  let now = { ...ref, 'mini.json': '{"project":"mini","x":1}\n' };
  now = edit(now, 'registry.json', (r) => { r.projects.mini.versions.v1.sha256 = 'hash-baru'; });
  assert.deepEqual(failed(B.guardAgainst(ref, now)), ['guard:files', 'guard:registry']);
});

test('penjaga: file lama yang dihapus, versi yang dihapus, dan riwayat yang hilang ditolak', () => {
  const ref = guardFixture();
  const { 'mini.json': _, ...withoutFile } = ref;
  assert.deepEqual(failed(B.guardAgainst(ref, withoutFile)), ['guard:files']);
  assert.deepEqual(failed(B.guardAgainst(ref, edit(ref, 'registry.json', (r) => { delete r.projects.mini.versions.v1; }))), ['guard:registry']);
  assert.deepEqual(failed(B.guardAgainst(ref, edit(ref, 'registry.json', (r) => { delete r.projects.mini.versions.v1.approval; }))), ['guard:registry']);
  assert.deepEqual(failed(B.guardAgainst(ref, edit(ref, 'pending-changes.json', (p) => { p.resolved = []; }))), ['guard:resolved']);
  assert.deepEqual(failed(B.guardAgainst(ref, edit(ref, 'pending-changes.json', (p) => { p.resolved[0].frames = [[0, 5]]; }))), ['guard:resolved']);
});

test('penjaga: referensi tanpa registry (sebelum ada versi) hanya mengunci file baseline', () => {
  const ref = { 'mini.json': '{"project":"mini"}\n' };
  assert.deepEqual(failed(B.guardAgainst(ref, guardFixture())), []);
  assert.deepEqual(failed(B.guardAgainst(ref, { ...guardFixture(), 'mini.json': 'beda' })), ['guard:files']);
});

// ---------- pembersihan folder sementara fixture ----------
// Tes yang sengaja gagal hanya didaftarkan di proses anak (variabel lingkungan di bawah), jadi rangkaian tes biasa
// tidak pernah gagal karenanya.
const FAILING_DEMO = 'DEMO_FIXTURE_GAGAL';
if (process.env.PIXEL_BASELINES_FIXTURE_DEMO === '1') {
  test(`${FAILING_DEMO}: fixture dipakai lalu assertion sengaja gagal`, (t) => {
    const dir = fixture(t);
    process.stdout.write(`FIXTURE_DIR=${dir}\n`);
    assert.equal('dibersihkan', 'tidak', 'kegagalan yang disengaja di proses anak');
  });
}

test('fixture: folder sementara dihapus begitu tes yang memakainya selesai', async (t) => {
  let dir;
  await t.test('memakai fixture', (st) => {
    dir = fixture(st);
    assert.ok(fs.existsSync(path.join(dir, 'registry.json')));
  });
  assert.equal(fs.existsSync(dir), false);
});

test('fixture: folder tetap dihapus ketika assertion di tesnya gagal (diuji di proses anak)', (t) => {
  // proses anak menjalankan file ini dengan hanya tes yang sengaja gagal; NODE_TEST_CONTEXT dibuang supaya
  // keluarannya tidak dikirim ke runner induk
  const env = { ...process.env, PIXEL_BASELINES_FIXTURE_DEMO: '1' };
  delete env.NODE_TEST_CONTEXT;
  const r = spawnSync(process.execPath, [`--test-name-pattern=^${FAILING_DEMO}`, fileURLToPath(import.meta.url)], { env, encoding: 'utf8' });
  const dir = (r.stdout.match(/FIXTURE_DIR=(\S+)/) || [])[1];
  // bila pembersihan rusak, folder yang dilaporkan anak tetap dihapus di sini supaya tidak tertinggal
  t.after(() => {
    if (dir && isFixturePath(dir)) fs.rmSync(dir, { recursive: true, force: true });
  });
  assert.notEqual(r.status, 0, 'tes di proses anak seharusnya gagal');
  assert.match(`${r.stdout}${r.stderr}`, /kegagalan yang disengaja di proses anak/);
  assert.ok(dir && isFixturePath(dir), `folder fixture proses anak: ${dir}`);
  assert.equal(fs.existsSync(dir), false, 'folder fixture harus sudah dihapus walau tesnya gagal');
});

test('fixture: pembersih hanya menghapus folder yang dibuat fixture', (t) => {
  assert.equal(removeOwnedDir(os.tmpdir()), false);
  assert.ok(fs.existsSync(os.tmpdir()));
  assert.equal(isFixturePath(path.join(os.tmpdir(), 'pixel-baselines-abc')), true);
  assert.equal(isFixturePath(path.join(os.tmpdir(), 'pixel-baselines-abc', '..', '..', 'etc')), false);
  assert.equal(isFixturePath(path.join(os.tmpdir(), 'pixel-baselines-')), false);
  assert.equal(isFixturePath(path.join(os.tmpdir(), 'pixel-smoke-abc')), false);
  const dir = fixture(t);
  const inside = path.join(dir, 'mini.json');
  assert.equal(removeOwnedDir(inside), false);
  assert.ok(fs.existsSync(inside));
  assert.equal(removeOwnedDir(dir), true);
  assert.equal(fs.existsSync(dir), false);
  assert.equal(removeOwnedDir(dir), false);
});

// harus tetap menjadi tes terakhir di file ini
test('fixture: semua folder sementara dari tes sebelumnya sudah dihapus', () => {
  assert.ok(createdDirs.length >= 11, `${createdDirs.length} folder fixture dibuat`);
  assert.deepEqual(createdDirs.filter((dir) => fs.existsSync(dir)), []);
  assert.equal(ownedDirs.size, 0);
});
