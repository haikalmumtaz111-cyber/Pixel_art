// Sidik kompilasi manifest dan --encode-only yang aman (Tahap 6A-2a, BACKLOG T22).
// Uji di sini tidak butuh browser atau FFmpeg: hasil render diganti file tiruan kecil, dan langkah encode,
// rename, probe, serta penulisan manifest bisa diganti tiruan untuk mensimulasikan kegagalan.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const P = require('../../src/render/projects.cjs');
const M = require('../../src/render/manifest.cjs');
const C = require('../../src/render/checks.cjs');
const R = require('../../src/render/render.cjs');
const { replaceFile } = require('../../src/render/pipeline.cjs');
const { RENDER_INPUTS, renderBlock } = require('../../src/render/baseline.cjs');
const { makeSandbox } = require('../../src/render/sandbox.cjs');

// hash runtimeView keempat proyek resmi, sama dengan kunci LOCKED di timing.test.js (main@b37862c)
const LOCKED = {
  'night-to-dawn': 'dcf06bb78043f49efef31aec8a6d079e30051d1e1e4fb4e5448ea95b65cf0336',
  'old-town-morning': '5a3e23b26c75e8b041fbdf1d375bc18e34f6d3d99d3a56f65744a2b42da32730',
  'character-lab': '0b7240f42afa8a99ad34f468d8d77f65a325dd691eac288b35856c5d712702c7',
  'train-night-rain': '16123b4613bb25949fde9be6ff8b547dd021db3ea385a08c25bfff7b9192b91d'
};
const frameName = (i) => `frame_${String(i).padStart(4, '0')}.png`;

// menjalankan potongan kode di proses baru dengan modul dari folder root tertentu (salinan repository)
const inProcess = (code, args) => {
  const r = spawnSync(process.execPath, ['-e', code, ...args], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
};
const HASHES = `const [root, ...ids] = process.argv.slice(1);
const P = require(root + '/src/render/projects.cjs'); const M = require(root + '/src/render/manifest.cjs');
console.log(JSON.stringify(Object.fromEntries(ids.map((id) => { const c = P.loadProject(id); return [id, { compiledHash: M.compiledHash(c), inputsHash: M.inputsHash(c.configFile) }]; }))));`;

test('AC2a-01: compiledHash = runtimeHash = kunci LOCKED keempat proyek (SHA-256 penuh)', () => {
  for (const [id, locked] of Object.entries(LOCKED)) {
    const config = P.loadProject(id);
    const f = M.fingerprints(config);
    assert.deepEqual(Object.keys(f), M.FINGERPRINT_KEYS);
    assert.match(f.compiledHash, /^[0-9a-f]{64}$/);
    assert.equal(f.compiledHash, locked, id);
  }
});

test('AC2a-06: compiledHash deterministik di proses lain, di path absolut lain, dan tidak peka urutan kunci JSON', (t) => {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
  const ids = Object.keys(LOCKED);
  // dua proses terpisah dari repository yang sama
  const a = inProcess(HASHES, [root, ...ids]);
  const b = inProcess(HASHES, [root, ...ids]);
  assert.deepEqual(a, b);
  for (const id of ids) assert.equal(a[id].compiledHash, LOCKED[id]);
  // salinan repository di path absolut lain
  const box = makeSandbox('pixel-compiled-');
  t.after(() => box.cleanup());
  const copy = inProcess(HASHES, [box.dir, ...ids]);
  for (const id of ids) assert.equal(copy[id].compiledHash, LOCKED[id], `${id} di salinan`);
  // urutan kunci teratas JSON proyek dibalik: inputsHash berubah (peka urutan), compiledHash tidak
  const file = path.join(box.dir, 'config', 'character-lab.json');
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  fs.writeFileSync(file, `${JSON.stringify(Object.fromEntries(Object.entries(raw).reverse()), null, 2)}\n`);
  const reversed = inProcess(HASHES, [box.dir, 'character-lab'])['character-lab'];
  assert.equal(reversed.compiledHash, LOCKED['character-lab']);
  assert.notEqual(reversed.inputsHash, copy['character-lab'].inputsHash);
});

// ---------- NT-STALE-2S: kompiler jalur sintaks baru berubah, manifest wajib basi ----------

const PALETTE = {
  sky: ['#000000', '#111111'], sunCore: '#ffffff', sun: '#ffeeaa', sunGlow: '#ffddaa', sunGlowFar: '#eeccaa',
  tire: '#111111', spoke: '#222222', wheelGap: '#333333', saddle: '#444444', basket: '#555555', bikeFrame: '#666666',
  iron: '#101010', ironLight: '#202020', lampLit: '#ffee88', lampGlass: '#ddddaa', lampGlow: '#ffcc66', steam: '#cccccc'
};
// proyek mini 5 detik di 24 FPS: adegan berbasis duration, transisi duration + lead, keyframe relatif adegan
const MINI = {
  id: 'mini-kompilasi', name: 'mini-kompilasi', title: 'Mini kompilasi', seed: 1, width: 480, height: 270, outputWidth: 1920, outputHeight: 1080,
  fps: 24, durationSeconds: 5, rendering: { upscale: 'browser' },
  palettes: { pagi: { ...PALETTE }, siang: { extends: 'pagi', sun: '#ffffff' } },
  lighting: { from: 'pagi', to: 'siang', track: 'terang' },
  environment: { terang: [[0, 0], [119, 1]] },
  assets: { langit: { type: 'gradient-sky', horizon: 150 }, sepeda: { type: 'bicycle', wheelRadius: 8 }, lampu: { type: 'street-lamp' } },
  stages: { jalan: { layers: [{ id: 'langit', parallax: 0 }, { id: 'jalan' }], entities: [{ id: 'langit-1', asset: 'langit', layer: 'langit' }] } },
  cast: { sepeda: { asset: 'sepeda', layer: 'jalan', position: [0, 240], motion: { x: [[0, 0], [119, 300]] } } },
  timing: { unit: 'seconds', base: 'scene' },
  timeline: {
    scenes: [
      { id: 'a', name: 'A', module: 'compose', stage: 'jalan', duration: 2, cast: ['sepeda'], camera: { type: 'keys', x: [[0, 0], [1.5, 60]] }, transitionOut: { type: 'dissolve', duration: 0.5 } },
      {
        id: 'b', name: 'B', module: 'compose', stage: 'jalan', duration: 1.5, cast: ['sepeda'], camera: { type: 'keys', x: [[-0.125, 10], [1, 40]] },
        entities: [{ id: 'lampu-1', asset: 'lampu', layer: 'jalan', position: [100, 240], visible: [[0, true], [1, false]] }],
        transitionOut: { type: 'dissolve', duration: 0.25, lead: 0.125 }
      },
      { id: 'c', name: 'C', module: 'compose', stage: 'jalan', duration: 1.5, cast: ['sepeda'], camera: { type: 'keys', x: [[0, 0], [1.25, 30]] } }
    ]
  }
};
const STALE = `const fs = require('fs');
const [root, mode, fixture, framesDir, video, manifestFile] = process.argv.slice(1);
const P = require(root + '/src/render/projects.cjs'); const M = require(root + '/src/render/manifest.cjs'); const C = require(root + '/src/render/checks.cjs');
const config = P.loadProject(fixture, { strict: false });
if (config.timelineIssues.length) throw new Error(config.timelineIssues.join('\\n'));
if (mode === 'buat') {
  fs.writeFileSync(manifestFile, JSON.stringify({ status: 'complete', finishedAt: 'uji', ...M.fingerprints(config), framesHash: M.framesHash(framesDir, config.totalFrames), videoSha256: M.sha256(fs.readFileSync(video)) }));
  console.log(JSON.stringify({ totalFrames: config.totalFrames }));
} else {
  console.log(JSON.stringify(C.manifestChecks(config, JSON.parse(fs.readFileSync(manifestFile, 'utf8')), { framesDir, video }).find((c) => c.id === 'manifest:fresh')));
}`;

test('NT-STALE-2S: mutasi kompiler sintaks baru (XM-C1, XM-D1) membuat manifest basi "hasil kompilasi", mutasi komentar (XM-K1) tidak', (t) => {
  const box = makeSandbox('pixel-ntstale2s-');
  t.after(() => box.cleanup());
  const fixture = 'mini-kompilasi.json';
  fs.writeFileSync(path.join(box.dir, fixture), JSON.stringify(MINI));
  const framesDir = path.join(box.dir, 'frame-tiruan');
  const video = path.join(box.dir, 'tiruan.mp4');
  const manifestFile = path.join(box.dir, 'tiruan-render.json');
  fs.mkdirSync(framesDir);
  for (let i = 0; i < 120; i++) fs.writeFileSync(path.join(framesDir, frameName(i)), `frame ${i}`);
  fs.writeFileSync(video, 'mp4 tiruan');
  const args = [box.dir, '', fixture, framesDir, video, manifestFile];
  const run = (mode) => inProcess(STALE, [box.dir, mode, ...args.slice(2)]);
  assert.equal(run('buat').totalFrames, 120);
  assert.equal(run('cek').pass, true, 'manifest dari kode asli harus segar');

  const timing = path.join(box.dir, 'src', 'render', 'timing.cjs');
  const timeline = path.join(box.dir, 'src', 'render', 'timeline.cjs');
  const original = { [timing]: fs.readFileSync(timing, 'utf8'), [timeline]: fs.readFileSync(timeline, 'utf8') };
  const mutate = (file, from, to) => {
    assert.equal(original[file].split(from).length, 2, `titik mutasi ${from}`);
    fs.writeFileSync(file, original[file].replace(from, to));
  };
  const restore = () => Object.entries(original).forEach(([f, code]) => fs.writeFileSync(f, code));

  mutate(timing, 'frame = position.startFrame + local;', 'frame = position.startFrame + local + 1;');
  const c1 = run('cek');
  restore();
  mutate(timing, 'transitions[i] = { startFrame: scenes[i].endFrame - lead,', 'transitions[i] = { startFrame: scenes[i].endFrame - lead + 1,');
  const d1 = run('cek');
  restore();
  for (const f of [timing, timeline]) fs.writeFileSync(f, `// komentar tambahan uji\n${original[f]}\n/* komentar */\n`);
  const k1 = run('cek');
  restore();

  for (const [name, r] of [['XM-C1', c1], ['XM-D1', d1]]) {
    assert.equal(r.pass, false, `${name} harus terdeteksi`);
    assert.equal(r.detail, 'berubah sejak render terakhir: hasil kompilasi', name);
  }
  assert.equal(k1.pass, true, 'XM-K1 (komentar) tidak boleh membuat manifest basi');
});

// ---------- --encode-only dengan langkah tiruan ----------

const config = P.loadProject('character-lab');

function encodeFixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-encode-only-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const framesDir = path.join(dir, 'frames');
  fs.mkdirSync(framesDir);
  for (let i = 0; i < config.totalFrames; i++) fs.writeFileSync(path.join(framesDir, frameName(i)), `frame ${i}`);
  const video = path.join(dir, 'film.mp4');
  fs.writeFileSync(video, 'mp4 lama');
  const manifestFile = path.join(dir, 'film-render.json');
  const old = {
    project: config.id, name: config.name, job: { kind: 'film', first: 0, count: config.totalFrames, scene: null }, configFile: config.configFile,
    ...M.fingerprints(config), engineVersion: config.engine.engineVersion, status: 'complete', finishedAt: '2026-10-31T00:00:00.000Z',
    framesHash: M.framesHash(framesDir, config.totalFrames), videoSha256: M.sha256(fs.readFileSync(video))
  };
  const writeOld = (m = old) => fs.writeFileSync(manifestFile, `${JSON.stringify(m, null, 2)}\n`);
  writeOld();
  const temp = path.join(dir, '.film.mp4.partial');
  const snapshot = () => ({
    manifest: fs.existsSync(manifestFile) ? fs.readFileSync(manifestFile).toString('hex') : null,
    video: M.sha256(fs.readFileSync(video)),
    files: fs.readdirSync(dir).sort()
  });
  const run = ({ bytes = 'mp4 baru', deps = {} } = {}) => R.encodeOnlyFilm(config, {
    manifestFile, framesDir, video,
    deps: {
      encodeToTemp: () => {
        fs.writeFileSync(temp, bytes);
        return { temp, command: 'ffmpeg -i frame_%04d.png film.mp4' };
      },
      probe: () => ({ codec: 'h264', width: config.outputWidth, height: config.outputHeight, frames: config.totalFrames }),
      ...deps
    }
  });
  const read = () => JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const checks = () => C.manifestChecks(config, read(), { framesDir, video });
  const fresh = () => checks().find((c) => c.id === 'manifest:fresh');
  return { dir, framesDir, video, manifestFile, old, writeOld, temp, snapshot, run, read, checks, fresh };
}

// kegagalan setelah praperiksa: MP4 lama identik byte, file sementara dihapus, percobaan tercatat "failed"
function assertFailedRun(f, before, error, pattern) {
  assert.match(error.message, pattern);
  const after = f.snapshot();
  assert.equal(after.video, before.video, 'MP4 lama harus identik byte');
  assert.ok(!fs.existsSync(f.temp), 'file sementara tidak boleh tersisa');
  assert.deepEqual(after.files, before.files);
  const m = f.read();
  assert.equal(m.status, 'failed');
  for (const k of M.FINGERPRINT_KEYS) assert.equal(m[k], f.old[k], `${k} diwariskan`);
  assert.equal(f.checks().find((c) => c.id === 'manifest:status').pass, false, 'validator menolak MP4 lama setelah percobaan gagal');
}
const failing = (fn) => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  assert.fail('seharusnya gagal');
};

test('encode-only jalur sukses: sidik jari diwariskan, MP4 terpasang, manifest segar, tanpa file sementara', (t) => {
  const f = encodeFixture(t);
  const { videoSha256 } = f.run();
  const m = f.read();
  assert.equal(m.status, 'complete');
  assert.equal(m.encodeOnly, true);
  for (const k of [...M.FINGERPRINT_KEYS, 'framesHash']) assert.equal(m[k], f.old[k], k);
  assert.equal(videoSha256, M.sha256(Buffer.from('mp4 baru')));
  assert.equal(m.videoSha256, videoSha256);
  assert.equal(fs.readFileSync(f.video, 'utf8'), 'mp4 baru');
  assert.ok(!fs.existsSync(f.temp));
  assert.equal(f.fresh().pass, true);
});

test('ENC-4 dan TK1-TK6: praperiksa menolak tanpa menyentuh manifest, MP4, frame, atau membuat file sementara', (t) => {
  const cases = [
    ['TK1', (f) => fs.rmSync(f.manifestFile)],
    ['TK1', (f) => fs.writeFileSync(f.manifestFile, '{ rusak')],
    ['TK2', (f) => f.writeOld({ ...f.old, status: 'failed' })],
    ['TK2', (f) => f.writeOld({ ...f.old, status: 'rendering' })],
    ['TK3', (f) => f.writeOld({ ...f.old, job: { ...f.old.job, count: config.totalFrames - 1 } })],
    ['TK3', (f) => f.writeOld({ ...f.old, job: { ...f.old.job, kind: 'scene' } })],
    ['TK4', (f) => f.writeOld({ ...f.old, compiledHash: undefined })],
    ['TK5', (f) => f.writeOld({ ...f.old, compiledHash: 'a'.repeat(64) })],
    ['TK5', (f) => f.writeOld({ ...f.old, inputsHash: 'b'.repeat(64) })],
    ['TK6', (f) => fs.writeFileSync(path.join(f.framesDir, frameName(7)), 'frame lain')]
  ];
  for (const [code, setup] of cases) {
    const f = encodeFixture(t);
    setup(f);
    const before = f.snapshot();
    let encodeCalled = false;
    const error = failing(() => f.run({ deps: { encodeToTemp: () => { encodeCalled = true; throw new Error('tidak boleh dipanggil'); } } }));
    assert.ok(error instanceof R.EncodeRefused, `${code}: ${error.message}`);
    assert.match(error.message, new RegExp(`^${code}:`));
    assert.equal(encodeCalled, false, `${code}: encode tidak boleh dimulai`);
    assert.deepEqual(f.snapshot(), before, `${code}: tidak ada file yang berubah`);
  }
});

test('ENC-6 (S2): FFmpeg gagal, MP4 lama identik byte, percobaan tercatat failed', (t) => {
  const f = encodeFixture(t);
  const before = f.snapshot();
  const error = failing(() => f.run({ deps: { encodeToTemp: () => { throw new Error('FFmpeg gagal: tiruan'); } } }));
  assertFailedRun(f, before, error, /FFmpeg gagal/);
});

test('C1, ENC-7 (C2), ENC-8 (C3): verifikasi file sementara gagal sebelum MP4 lama diganti', (t) => {
  const variants = [
    ['C1', /^C1:/, (f) => ({ bytes: '' })],
    ['C2', /^C2: frame PNG berubah selama encode/, (f) => ({
      deps: {
        encodeToTemp: () => {
          fs.writeFileSync(f.temp, 'mp4 baru');
          fs.appendFileSync(path.join(f.framesDir, frameName(0)), 'x');
          return { temp: f.temp, command: 'ffmpeg' };
        }
      }
    })],
    ['C3', /^C3: MP4 sementara tidak utuh/, () => ({ deps: { probe: () => ({ codec: 'h264', width: config.outputWidth, height: config.outputHeight, frames: config.totalFrames - 180 }) } })]
  ];
  for (const [name, pattern, options] of variants) {
    const f = encodeFixture(t);
    const before = f.snapshot();
    const error = failing(() => f.run(options(f)));
    assertFailedRun(f, before, error, pattern);
    assert.match(f.read().error, pattern, name);
  }
});

test('ENC-9 (S4): rename MP4 gagal, MP4 lama identik byte, file sementara dihapus', (t) => {
  const f = encodeFixture(t);
  const before = f.snapshot();
  const error = failing(() => f.run({ deps: { replaceFile: (temp) => replaceFile(temp, path.join(f.dir, 'tidak-ada', 'film.mp4')) } }));
  assertFailedRun(f, before, error, /ENOENT/);
});

test('ENC-9 (S8): rename gagal dan status failed juga gagal dicatat: integritas pasangan lama terjaga, kegagalan hanya dilaporkan lewat error', (t) => {
  const f = encodeFixture(t);
  const before = f.snapshot();
  const error = failing(() => f.run({
    deps: {
      replaceFile: (temp) => replaceFile(temp, path.join(f.dir, 'tidak-ada', 'film.mp4')),
      writeManifest: () => { throw new Error('disk penuh (tiruan)'); }
    }
  }));
  assert.match(error.message, /status "failed" juga gagal dicatat: disk penuh \(tiruan\); manifest dan MP4 lama tidak berubah/);
  assert.deepEqual(f.snapshot(), before, 'manifest dan MP4 lama identik byte');
  // integritas artefak: pasangan lama tetap sah. Percobaan terakhir tidak tercatat di manifest
  assert.equal(f.read().status, 'complete');
  assert.equal(f.fresh().pass, true);
});

test('ENC-10 (S5/S7): manifest gagal ditulis setelah MP4 terpasang, segar hanya bila MP4 baru identik byte dengan yang tercatat', (t) => {
  const failComplete = (file, data) => {
    if (data.status === 'complete') throw new Error('disk penuh (tiruan)');
    M.writeManifest(file, data);
  };
  // MP4 baru identik byte dengan MP4 lama: manifest lama tetap cocok, boleh LULUS
  const same = encodeFixture(t);
  const sameBefore = same.snapshot();
  const e1 = failing(() => same.run({ bytes: 'mp4 lama', deps: { writeManifest: failComplete } }));
  assert.match(e1.message, /^MP4 baru sudah terpasang, tetapi manifest gagal ditulis/);
  assert.deepEqual(same.snapshot(), sameBefore);
  assert.equal(same.fresh().pass, true, 'artefak identik: manifest:fresh LULUS');

  // MP4 baru berbeda: manifest lama tidak cocok lagi, wajib GAGAL "file MP4"
  const diff = encodeFixture(t);
  const e2 = failing(() => diff.run({ bytes: 'mp4 berbeda', deps: { writeManifest: failComplete } }));
  assert.match(e2.message, /^MP4 baru sudah terpasang/);
  assert.equal(diff.read().status, 'complete', 'manifest lama tidak berubah');
  const fresh = diff.fresh();
  assert.equal(fresh.pass, false);
  assert.equal(fresh.detail, 'berubah sejak render terakhir: file MP4');
  assert.ok(!fs.existsSync(diff.temp));
  // pemulihan: menjalankan ulang --encode-only lolos praperiksa dan menulis manifest yang cocok
  diff.run({ bytes: 'mp4 berbeda' });
  assert.equal(diff.fresh().pass, true);
});

test('manifestChecks: compiledHash wajib (opsi B), manifest lama tanpa field itu atau dengan nilai lain dianggap basi', (t) => {
  const f = encodeFixture(t);
  const check = (m) => C.manifestChecks(config, m, { framesDir: f.framesDir, video: f.video }).find((c) => c.id === 'manifest:fresh');
  assert.equal(check(f.old).pass, true);
  const legacy = check({ ...f.old, compiledHash: undefined });
  assert.equal(legacy.pass, false);
  assert.equal(legacy.detail, 'berubah sejak render terakhir: sidik kompilasi tidak ada (manifest lama, render ulang)');
  const other = check({ ...f.old, compiledHash: 'c'.repeat(64) });
  assert.equal(other.pass, false);
  assert.equal(other.detail, 'berubah sejak render terakhir: hasil kompilasi');
});

test('writeManifest atomik: tanpa file sementara tersisa, file lama utuh bila penulisan gagal', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-manifest-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'uji-render.json');
  M.writeManifest(file, { status: 'complete', n: 1 });
  assert.deepEqual(M.readManifest(file), { status: 'complete', n: 1 });
  assert.deepEqual(fs.readdirSync(dir), ['uji-render.json']);
  const before = fs.readFileSync(file);
  assert.throws(() => M.writeManifest(file, { n: 2n }));
  assert.deepEqual(fs.readFileSync(file), before);
  assert.deepEqual(fs.readdirSync(dir), ['uji-render.json']);
});

test('replaceFile: rename gagal tidak mengubah target dan menghapus file sementara', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-replace-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const temp = path.join(dir, '.film.mp4.partial');
  fs.writeFileSync(temp, 'baru');
  assert.throws(() => replaceFile(temp, path.join(dir, 'tidak-ada', 'film.mp4')), /ENOENT/);
  assert.ok(!fs.existsSync(temp));
  fs.writeFileSync(temp, 'baru');
  fs.writeFileSync(path.join(dir, 'film.mp4'), 'lama');
  replaceFile(temp, path.join(dir, 'film.mp4'));
  assert.equal(fs.readFileSync(path.join(dir, 'film.mp4'), 'utf8'), 'baru');
  assert.deepEqual(fs.readdirSync(dir), ['film.mp4']);
});

test('D5: RENDER_INPUTS baseline mencakup kompiler Node, dan blok render baseline baru memuat compiledHash', () => {
  assert.deepEqual(RENDER_INPUTS, ['src/engine', 'src/assets', 'src/scenes', 'config', 'src/render/timeline.cjs', 'src/render/timing.cjs', 'src/render/projects.cjs', 'src/render/schema.cjs']);
  const manifest = { chromiumVersion: 'x', inputsHash: 'i', engineHash: 'e', libraryHash: 'l', compiledHash: 'k', framesHash: 'f', lain: 'tidak ikut' };
  assert.deepEqual(renderBlock(manifest), { chromiumVersion: 'x', inputsHash: 'i', engineHash: 'e', libraryHash: 'l', compiledHash: 'k', framesHash: 'f' });
});

test('M-c: diagnosis kode Node hanya ditambahkan bila manifest segar tetapi render atau encode ulang berbeda', () => {
  const fresh = (pass) => [{ id: 'manifest:fresh', pass }];
  const failed = [{ id: 'determinism', pass: false, detail: '16 frame berbeda' }, { id: 'reencode', pass: false, detail: 'SHA-256 berbeda' }, { id: 'lain', pass: false, detail: 'x' }];
  const hinted = C.withNodeDriftHint(fresh(true), failed);
  assert.equal(hinted[0].detail, `16 frame berbeda | ${C.NODE_DRIFT_HINT}`);
  assert.equal(hinted[1].detail, `SHA-256 berbeda | ${C.NODE_DRIFT_HINT}`);
  assert.equal(hinted[2].detail, 'x');
  assert.equal(hinted[0].pass, false, 'status tidak berubah');
  assert.deepEqual(C.withNodeDriftHint(fresh(false), failed), failed, 'manifest basi: penyebabnya sudah jelas, tanpa catatan');
  const passed = [{ id: 'determinism', pass: true, detail: '360/360' }];
  assert.deepEqual(C.withNodeDriftHint(fresh(true), passed), passed);
});

test('AC2a-07: config yang diubah setelah compiledHash dicatat ditolak pemeriksaan pasca-render, config yang tidak berubah lulus', () => {
  const MESSAGE = { name: 'Error', message: 'konfigurasi hasil kompilasi berubah selama render' };
  // jalur tidak berubah: keempat proyek resmi lulus terhadap hash yang dicatat sebelum render
  for (const id of Object.keys(LOCKED)) {
    const config = P.loadProject(id);
    const recorded = M.fingerprints(config).compiledHash;
    assert.doesNotThrow(() => R.assertCompiledUnchanged(config, recorded), id);
  }
  // perubahan bagian runtime setelah hash dicatat: tingkat atas, timeline hasil kompilasi, dan objek bersarang
  const mutations = {
    seed: (c) => { c.seed += 1; },
    'timeline.transitions[0].startFrame': (c) => { c.timeline.transitions[0].startFrame += 1; },
    'timeline.scenes[1].endFrame': (c) => { c.timeline.scenes[1].endFrame -= 1; },
    'rendering.upscale': (c) => { c.rendering.upscale = 'browser'; }
  };
  for (const [field, mutate] of Object.entries(mutations)) {
    const config = P.loadProject('night-to-dawn');
    const recorded = M.fingerprints(config).compiledHash;
    mutate(config);
    assert.throws(() => R.assertCompiledUnchanged(config, recorded), MESSAGE, field);
  }
  // field yang hanya dibaca Node (judul) tidak ikut runtimeView, jadi tidak ditolak
  const config = P.loadProject('night-to-dawn');
  const recorded = M.fingerprints(config).compiledHash;
  config.title = 'judul lain';
  assert.doesNotThrow(() => R.assertCompiledUnchanged(config, recorded));
});
