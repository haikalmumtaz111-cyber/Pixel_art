// Uji antar-proyek: membuktikan semua proyek berjalan di atas mesin yang sama dan tidak saling bergantung.
// 1. Semua proyek terdaftar dan konfigurasinya valid, memakai satu konfigurasi mesin.
// 2. File konfigurasi proyek tidak saling berbagi.
// 3. Semua aset tiap proyek bisa dibuat dan setiap adegan bisa dirender terpisah.
// 4. Proyek-proyek memuat file mesin inti (src/engine) yang persis sama.
// 5. Isolasi: di salinan sementara repository, konfigurasi satu proyek sengaja dirusak, lalu proyek lain
//    tetap dimuat dan dirender identik. Repository asli tidak diubah sama sekali.
// Pemakaian (setelah render semua proyek): node src/render/project-tests.cjs
const fs = require('fs');
const path = require('path');
const { ROOT, listProjects, loadProject } = require('./projects.cjs');
const { openStudio } = require('./browser.cjs');
const { md5List } = require('./fingerprint.cjs');
const { frameFile } = require('./config.cjs');
const { result } = require('./checks.cjs');
const { makeSandbox } = require('./sandbox.cjs');

const A = 'night-to-dawn';
const B = 'old-town-morning';
const pixelMd5 = (file) => md5List(['-i', file, '-pix_fmt', 'rgb24'])[0];

// Di dalam salinan: rusak proyek `broken`, lalu render beberapa frame proyek `other` dan bandingkan pikselnya.
async function isolationTest(broken, other, frames, expected) {
  const sandbox = makeSandbox('pixel-isolasi-');
  try {
    const projects = sandbox.require('src/render/projects.cjs');
    const pipeline = sandbox.require('src/render/pipeline.cjs');
    const file = projects.resolveProjectFile(broken);
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    // kerusakan: durasi tidak cocok dengan adegan, dan satu jenis aset diganti jenis yang tidak ada
    raw.durationSeconds += 1;
    const firstAsset = Object.keys(raw.assets || {})[0];
    if (firstAsset && typeof raw.assets === 'object' && !raw.assets.$include) raw.assets[firstAsset].type = 'aset-rusak';
    fs.writeFileSync(file, JSON.stringify(raw, null, 2));
    let brokenRejected = false;
    try {
      projects.loadProject(broken);
    } catch {
      brokenRejected = true;
    }
    const config = projects.loadProject(other);
    const dir = path.join(sandbox.dir, 'output', 'isolasi');
    const differ = [];
    for (const f of frames) {
      await pipeline.renderFrames(config, { first: f, count: 1, framesDir: dir, globalNames: true });
      if (pixelMd5(frameFile(dir, f)) !== expected[f]) differ.push(f);
    }
    return result(`isolation:${broken}->${other}`, `Merusak konfigurasi ${broken} tidak memengaruhi ${other}`, brokenRejected && differ.length === 0,
      `${broken} ${brokenRejected ? 'ditolak validator' : 'TIDAK ditolak'}, ${other} frame ${frames.join(', ')} ${differ.length ? `BERBEDA di ${differ.join(', ')}` : 'identik dengan render resmi'}`);
  } finally {
    sandbox.cleanup();
  }
}

async function main() {
  const checks = [];
  const add = (c) => {
    checks.push(c);
    console.log(`${c.pass ? 'LULUS' : 'GAGAL'}  ${c.name}: ${c.detail}`);
  };

  const projects = listProjects();
  const ids = projects.map((p) => p.id);
  add(result('projects', 'Proyek terdaftar', [A, B].every((id) => ids.includes(id)), `${ids.length} proyek: ${ids.join(', ')}`));

  const configs = {};
  for (const id of ids) {
    try {
      configs[id] = loadProject(id);
      add(result(`config:${id}`, `Konfigurasi ${id} valid`, true, `${configs[id].timeline.scenes.length} adegan, ${configs[id].totalFrames} frame, ${Object.keys(configs[id].assets || {}).length} aset`));
    } catch (error) {
      add(result(`config:${id}`, `Konfigurasi ${id} valid`, false, error.message.split('\n').slice(0, 3).join(' ')));
    }
  }
  const engines = new Set(Object.values(configs).map((c) => `${c.engine.name} ${c.engine.engineVersion}`));
  add(result('engine-config', 'Semua proyek memakai satu konfigurasi mesin', engines.size === 1, [...engines].join(', ')));

  const files = Object.fromEntries(Object.entries(configs).map(([id, c]) => [id, new Set([c.configFile, ...c.includes])]));
  const shared = [];
  for (const a of ids) for (const b of ids) if (a < b) for (const f of files[a] || []) if (files[b]?.has(f)) shared.push(`${a}/${b}: ${f}`);
  add(result('config-files', 'File konfigurasi proyek tidak saling berbagi', shared.length === 0,
    shared.length ? shared.join(', ') : Object.entries(files).map(([id, set]) => `${id}: ${set.size} file`).join(', ')));

  // mesin inti yang sama, aset bisa dibuat, adegan bisa dirender terpisah
  const engineFiles = {};
  for (const id of ids.filter((x) => configs[x])) {
    const config = configs[id];
    const studio = await openStudio(config);
    try {
      const fetched = await studio.inspect('fetchedScripts');
      engineFiles[id] = fetched.filter((f) => f.startsWith('/src/engine/')).sort();
      const created = await studio.inspect('createAllAssets');
      const expectedAssets = Object.keys(config.assets || {}).length;
      add(result(`assets:${id}`, `Semua aset ${id} bisa dibuat`, created.length === expectedAssets,
        `${created.length}/${expectedAssets} aset (${[...new Set(created.map((a) => a.type))].join(', ') || 'tanpa daftar aset bersama'})`));
      const refs = config.timeline.scenes.flatMap((s) => (s.assets || []).filter((k) => !(config.assets || {})[k]).map((k) => `${s.id}:${k}`));
      add(result(`asset-refs:${id}`, `Referensi aset ${id} utuh`, refs.length === 0 && config.timelineIssues.length === 0,
        refs.length ? `rujukan hilang: ${refs.join(', ')}` : `${config.timeline.scenes.map((s) => `${s.id} (${(s.assets || []).length})`).join(', ')}`));
      const failed = [];
      for (const scene of config.timeline.scenes) {
        try {
          const { png } = await studio.renderFrame(scene.startFrame, scene.id);
          if (png.length < 1000) failed.push(`${scene.id}: gambar kosong`);
        } catch (error) {
          failed.push(`${scene.id}: ${error.message}`);
        }
      }
      add(result(`scenes:${id}`, `Setiap adegan ${id} bisa dirender terpisah`, failed.length === 0,
        failed.length ? failed.join(' | ') : `${config.timeline.scenes.length} adegan dirender sendiri-sendiri tanpa error`));
    } finally {
      await studio.close();
    }
  }
  const sets = Object.values(engineFiles).map((list) => list.join(','));
  add(result('shared-engine', 'Semua proyek memuat file mesin inti yang sama', sets.length > 1 && new Set(sets).size === 1,
    `${Object.keys(engineFiles).length} proyek x ${(Object.values(engineFiles)[0] || []).length} file src/engine: ${(Object.values(engineFiles)[0] || []).map((f) => path.basename(f)).join(', ')}`));

  // isolasi dua arah: A dirusak -> B tetap; B dirusak -> A tetap
  const baselineA = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'baselines', `${A}.json`), 'utf8'));
  const framesA = [0, 225, 449];
  add(await isolationTest(B, A, framesA, baselineA.pixelMd5));
  const cfgB = configs[B];
  const framesB = [0, 180, 359];
  if (cfgB && framesB.every((f) => fs.existsSync(frameFile(cfgB.paths.frames, f)))) {
    const expectedB = Object.fromEntries(framesB.map((f) => [f, pixelMd5(frameFile(cfgB.paths.frames, f))]));
    add(await isolationTest(A, B, framesB, expectedB));
  } else {
    add(result(`isolation:${A}->${B}`, `Merusak konfigurasi ${A} tidak memengaruhi ${B}`, false, `frame ${B} belum dirender (jalankan: npm run render -- --project ${B})`));
  }

  const passed = checks.filter((c) => c.pass).length;
  const allPass = passed === checks.length;
  const testedAt = new Date().toISOString();
  const reports = path.join(ROOT, 'output', 'reports');
  fs.mkdirSync(reports, { recursive: true });
  fs.writeFileSync(path.join(reports, 'project-tests.json'), JSON.stringify({ testedAt, allPass, passed, total: checks.length, engineFiles, checks }, null, 2) + '\n');
  const rows = checks.map((c, i) => `| ${i + 1} | ${c.name} | ${c.pass ? 'LULUS' : 'GAGAL'} | ${c.detail.replace(/\|/g, '/')} |`).join('\n');
  fs.writeFileSync(path.join(reports, 'project-tests.md'), `# Uji Antar-Proyek

Membuktikan semua proyek memakai mesin yang sama dan tidak saling bergantung.
Dibuat otomatis oleh \`npm run test:projects\` pada ${testedAt}.

| No | Pemeriksaan | Hasil | Detail |
|----|-------------|-------|--------|
${rows}

Status akhir: **${allPass ? 'SEMUA LULUS' : 'ADA YANG GAGAL'}** (${passed}/${checks.length})
`);
  console.log(`\n${allPass ? 'SEMUA LULUS' : 'ADA YANG GAGAL'} (${passed}/${checks.length}). Laporan: output/reports/project-tests.md`);
  if (!allPass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`\nUJI ANTAR-PROYEK GAGAL: ${error.message}`);
  process.exit(1);
});
