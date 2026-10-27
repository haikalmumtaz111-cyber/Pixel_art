// Unit test project loader dan validasi skema (tanpa browser). Memakai proyek kecil buatan sendiri.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const P = require('../../src/render/projects.cjs');
const { toFrames } = require('../../src/render/timeline.cjs');

// proyek mini 4 detik: dua adegan tersusun dengan satu pemeran
function mini() {
  return {
    id: 'mini', name: 'mini', title: 'Mini', seed: 1, width: 480, height: 270, outputWidth: 1920, outputHeight: 1080,
    fps: 30, durationSeconds: 4, rendering: { upscale: 'browser' },
    palettes: {
      pagi: { sky: ['#000000', '#111111'], sunCore: '#ffffff', sun: '#ffeeaa', sunGlow: '#ffddaa', sunGlowFar: '#eeccaa', tire: '#111111', spoke: '#222222', wheelGap: '#333333', saddle: '#444444', basket: '#555555', bikeFrame: '#666666' },
      siang: { extends: 'pagi', sun: '#ffffff' }
    },
    lighting: { from: 'pagi', to: 'siang', track: 'terang' },
    environment: { terang: [[0, 0], [119, 1]] },
    assets: { langit: { type: 'gradient-sky', horizon: 150 }, sepeda: { type: 'bicycle', wheelRadius: 8 } },
    stages: { jalan: { layers: [{ id: 'langit', parallax: 0 }, { id: 'jalan' }], entities: [{ id: 'langit-1', asset: 'langit', layer: 'langit' }] } },
    cast: { sepeda: { asset: 'sepeda', layer: 'jalan', position: [0, 240], motion: { x: [[0, 0], [119, 300]] } } },
    cameraTracks: { ikut: { type: 'follow-entity', entity: 'sepeda', screenX: 200, zoom: [[0, 1.25], [119, 1]] } },
    timeline: {
      scenes: [
        { id: 'satu', name: 'Satu', module: 'compose', stage: 'jalan', start: 0, end: 2, cast: ['sepeda'], camera: { track: 'ikut' },
          transitionOut: { type: 'dissolve', start: 1.8, duration: 0.4 } },
        { id: 'dua', name: 'Dua', module: 'compose', stage: 'jalan', start: 2, end: 4, cast: ['sepeda'], camera: { type: 'keys', x: [[60, 0], [119, 40]] } }
      ]
    }
  };
}
const build = (raw) => P.buildProject(raw, `${P.ROOT}/config/mini.json`, { strict: false });
const issuesOf = (mutate) => {
  const raw = mini();
  mutate(raw);
  return build(raw).timelineIssues;
};
const has = (issues, pattern) => assert.ok(issues.some((i) => pattern.test(i)), `tidak ada masalah ${pattern}:\n${issues.join('\n')}`);

test('proyek mini yang benar lolos dan durasi menjadi frame bulat', () => {
  const c = build(mini());
  assert.deepEqual(c.timelineIssues, []);
  assert.equal(c.totalFrames, 120);
  assert.deepEqual(c.timeline.scenes.map((s) => [s.startFrame, s.endFrame]), [[0, 60], [60, 120]]);
  const t = c.timeline.transitions[0];
  assert.deepEqual([t.startFrame, t.endFrame, t.lastFrame, t.durationFrames], [54, 66, 65, 12]);
  assert.deepEqual(c.frameSize, { width: 1920, height: 1080 });
  assert.deepEqual(c.timeline.scenes[0].assets.sort(), ['langit', 'sepeda']);
});

test('palet mewarisi palet lain lewat "extends"', () => {
  const c = build(mini());
  assert.equal(c.palettes.siang.sun, '#ffffff');
  assert.equal(c.palettes.siang.sunCore, '#ffffff');
  assert.equal(c.palettes.siang.extends, undefined);
  has(issuesOf((r) => { r.palettes.siang.extends = 'hantu'; }), /extends ke palet "hantu"/);
});

test('detik ke frame: harus pas, tidak dibulatkan diam-diam', () => {
  assert.equal(toFrames(4, 30), 120);
  assert.equal(toFrames(1.8, 30), 54);
  assert.equal(toFrames(0.01, 30), null);
});

test('celah, tumpang tindih, ID ganda, dan durasi tidak valid ditolak', () => {
  has(issuesOf((r) => { r.timeline.scenes[1].start = 2.1; }), /celah/);
  has(issuesOf((r) => { r.timeline.scenes[1].start = 1.9; }), /tumpang tindih/);
  has(issuesOf((r) => { r.timeline.scenes[1].id = 'satu'; }), /id adegan ganda/);
  has(issuesOf((r) => { r.timeline.scenes[0].end = 0; }), /durasi tidak valid/);
  has(issuesOf((r) => { r.timeline.scenes[1].end = 3.9; }), /berakhir tepat di akhir film/);
});

test('rujukan aset, lapisan, kamera, dan induk yang salah ditolak', () => {
  has(issuesOf((r) => { r.cast.sepeda.asset = 'hantu'; }), /aset "hantu" tidak ditemukan/);
  has(issuesOf((r) => { r.cast.sepeda.layer = 'awan'; }), /lapisan "awan" yang tidak ada/);
  has(issuesOf((r) => { r.timeline.scenes[0].camera = { track: 'hantu' }; }), /track kamera "hantu" tidak ditemukan/);
  has(issuesOf((r) => { r.cameraTracks.ikut.entity = 'hantu'; }), /entitas yang diikuti "hantu" tidak ditemukan/);
  has(issuesOf((r) => { r.cast.sepeda.parent = 'hantu'; }), /induk "hantu" tidak ditemukan/);
  has(issuesOf((r) => { r.assets.naga = { type: 'naga' }; }), /jenis "naga" tidak ada di katalog/);
});

test('keyframe dan parameter entitas yang salah ditolak', () => {
  has(issuesOf((r) => { r.cast.sepeda.motion.x = [[50, 0], [10, 1]]; }), /berurutan naik/);
  has(issuesOf((r) => { r.cast.sepeda.motion.x = [[0, 0], [500, 1]]; }), /di luar 0\.\.119/);
  has(issuesOf((r) => { r.cast.sepeda.motion.x = [[0, 0], [10, 1, 'hantu']]; }), /easing "hantu"/);
  has(issuesOf((r) => { r.cast.sepeda.params = { roda: 3 }; }), /parameter "roda" tidak dikenal/);
  has(issuesOf((r) => { r.cast.sepeda.params = { wheelRadius: 30 }; }), /lebih besar dari batas 12/);
  has(issuesOf((r) => { r.cast.sepeda.state = 'terbang'; }), /state.*tidak valid/);
  has(issuesOf((r) => { r.cast.sepeda.scale = 2.5; }), /scale harus bilangan bulat/);
  has(issuesOf((r) => { r.cast.sepeda.paramTracks = { wheelRadius: [[0, 8]] }; }), /tidak bisa dianimasikan/);
});

test('palet yang kurang warna untuk aset yang tampil ditolak', () => {
  has(issuesOf((r) => { delete r.palettes.pagi.tire; }), /belum punya warna: .*tire/);
});

test('zoom kamera hanya boleh di mode upscale browser', () => {
  has(issuesOf((r) => { r.rendering.upscale = 'ffmpeg'; }), /zoom kamera hanya didukung/);
  has(issuesOf((r) => { r.cameraTracks.ikut.zoom = [[0, 9]]; }), /di luar batas 1\.\.4/);
});

test('transisi: jenis dan rentang diperiksa', () => {
  has(issuesOf((r) => { r.timeline.scenes[0].transitionOut.type = 'wipe'; }), /jenis "wipe" tidak dikenal/);
  has(issuesOf((r) => { r.timeline.scenes[0].transitionOut.start = 1; }), /harus melewati batas adegan/);
  has(issuesOf((r) => { r.timeline.scenes[1].transitionOut = { type: 'dissolve', start: 3, duration: 0.5 }; }), /adegan terakhir tidak boleh punya transisi/);
});

test('proyek yang tidak ada ditolak dengan daftar proyek yang tersedia', () => {
  assert.throws(() => P.resolveProjectFile('proyek-hantu'), /tidak ditemukan[\s\S]*night-to-dawn[\s\S]*old-town-morning/);
  assert.throws(() => P.resolveProjectFile(null), /Pilih proyek/);
});

test('$include tidak boleh keluar dari folder proyek', () => {
  assert.throws(() => P.resolveIncludes({ a: { $include: '../../../etc/passwd' } }, `${P.ROOT}/config`, []), /keluar dari folder proyek/);
});

test('semua proyek di folder config valid dan memakai mesin yang sama', () => {
  const projects = P.listProjects();
  assert.ok(projects.length >= 3);
  const engines = new Set(projects.map((p) => {
    const c = P.loadProject(p.id);
    assert.deepEqual(c.timelineIssues, [], `${p.id}: ${c.timelineIssues.join(', ')}`);
    return `${c.engine.name}@${c.engine.engineVersion}`;
  }));
  assert.equal(engines.size, 1);
});
