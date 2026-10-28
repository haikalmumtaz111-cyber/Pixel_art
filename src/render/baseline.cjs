// Mengelola versi baseline regresi (tests/baselines/registry.json). Panduan lengkap: docs/BASELINES.md
//
// Tanpa --version: menampilkan daftar versi baseline setiap proyek dan perubahan terdeklarasi yang masih aktif.
//   npm run baseline [-- --project <id>]
//
// Dengan --version: merekam hasil render terbaru sebagai versi baseline baru dan menjadikannya versi resmi.
// Hanya dipakai setelah pemilik menyetujui perubahan hasil render.
//   npm run baseline -- --project <id> --version tahap-<n> --source main@<commit> \
//     --approved-at <YYYY-MM-DD> --evidence "<bukti persetujuan>" [--evidence "..."] [--note "..."] [--dry-run]
//
// Syarat sebelum menulis apa pun:
// - render terbaru proyek sukses dan masih cocok dengan konfigurasi, mesin, dan aset (manifest render)
// - kode yang menentukan hasil render (src/engine, src/assets, src/scenes, config) sama dengan commit --source,
//   dan bila commit itu menyimpan MP4 proyek, MP4 hasil render harus identik byte demi byte dengannya
// - setiap frame yang berbeda dari baseline resmi berada di rentang entri pending-changes.json proyek itu
// - nama versi dan nama file belum dipakai (file baseline lama tidak pernah ditimpa)
// Hasilnya: file baru tests/baselines/<proyek>.<versi>.json, entri registry (SHA-256, sumber, perubahan, bukti persetujuan),
// versi resmi berpindah, dan entri pending-changes.json dipindah ke "resolved" sebagai catatan historis.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { loadConfig } = require('./config.cjs');
const { ROOT } = require('./projects.cjs');
const { fingerprint } = require('./fingerprint.cjs');
const C = require('./checks.cjs');
const M = require('./manifest.cjs');
const B = require('./baselines.cjs');

const RENDER_INPUTS = ['src/engine', 'src/assets', 'src/scenes', 'config'];

// argumen dibaca sendiri (bukan cli.cjs) supaya urutan --project dan nilai teks bebas tidak tertukar
function options(argv) {
  const out = { project: null, evidence: [], dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key === '--dry-run') { out.dryRun = true; continue; }
    const value = argv[++i];
    if (value === undefined || value.startsWith('--')) throw new Error(`${key} butuh nilai`);
    if (key === '--evidence') out.evidence.push(value);
    else if (['--project', '--version', '--source', '--approved-at', '--note'].includes(key)) out[key.slice(2).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = value;
    else throw new Error(`argumen tidak dikenal: ${key}`);
  }
  return out;
}

const git = (args, encoding = 'utf8') => spawnSync('git', args, { cwd: ROOT, encoding, maxBuffer: 1 << 30 });

function list(project) {
  const registry = B.readRegistry();
  const pending = B.readPending();
  for (const [id, info] of Object.entries(registry.projects).filter(([id]) => !project || id === project)) {
    console.log(`\n${id} (resmi: ${info.official})`);
    for (const v of B.lineage(info)) {
      const r = info.versions[v];
      const changes = r.changes ? `, ${r.changes.changedCount} frame berubah dari ${r.previous}` : '';
      console.log(`  ${v === info.official ? '*' : ' '} ${v.padEnd(10)} ${r.file.padEnd(32)} ${r.source}, mesin ${r.engineVersion}, ${r.frames} frame${changes}`);
    }
    const active = pending.changes[id];
    if (active) console.log(`    perubahan terdeklarasi aktif: ${active.stage} (${active.backlog}) terhadap ${active.against || info.official}, frame ${B.formatRanges(active.frames)}, status ${active.status}`);
  }
  console.log('\n* = versi resmi. Versi lain = referensi historis (npm run test:regression -- --project <id> --baseline <versi>).');
}

function capture(project, opt) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(opt.version)) throw new Error('--version hanya boleh huruf kecil, angka, dan tanda hubung, misalnya tahap-5');
  const sourceMatch = String(opt.source || '').match(/^([\w./-]+)@([0-9a-f]{7,40})$/);
  if (!sourceMatch) throw new Error('--source wajib berbentuk <branch>@<commit>, misalnya main@a1fd4a1');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(opt.approvedAt || '') || !opt.evidence.length) {
    throw new Error('Versi baseline baru butuh persetujuan pemilik: --approved-at <YYYY-MM-DD> dan minimal satu --evidence "<bukti>"');
  }
  const [, branch, commit] = sourceMatch;
  const registry = B.readRegistry();
  const pending = B.readPending();
  const info = registry.projects[project] || null;
  const file = `${project}.${opt.version}.json`;
  if (info?.versions[opt.version]) throw new Error(`Versi "${opt.version}" sudah ada untuk ${project}. Versi lama tidak boleh ditimpa.`);
  if (fs.existsSync(path.join(B.DIR, file))) throw new Error(`File ${file} sudah ada. Baseline lama tidak boleh ditimpa.`);

  const config = loadConfig(project);
  const manifest = M.readManifest(M.manifestFile(config));
  const fresh = C.manifestChecks(config, manifest);
  if (!fresh.every((c) => c.pass)) throw new Error(`Render ${project} tidak terbaru atau gagal, render ulang dulu: ${fresh.filter((c) => !c.pass).map((c) => c.detail).join(' | ')}`);

  // hasil render harus berasal dari kode yang sama dengan commit sumber
  if (git(['rev-parse', '--verify', '--quiet', `${commit}^{commit}`]).status !== 0) throw new Error(`Commit ${commit} tidak ditemukan.`);
  const drift = git(['diff', '--name-only', commit, '--', ...RENDER_INPUTS]).stdout.trim();
  const untracked = git(['ls-files', '--others', '--exclude-standard', '--', ...RENDER_INPUTS]).stdout.trim();
  if (drift || untracked) throw new Error(`Kode render berbeda dari ${commit}: ${[drift, untracked].filter(Boolean).join('\n')}`);
  const fp = fingerprint({ framesDir: config.paths.frames, count: config.totalFrames, video: config.paths.video });
  const videoPath = path.relative(ROOT, config.paths.video).split(path.sep).join('/');
  const merged = git(['show', `${commit}:${videoPath}`], 'buffer');
  const mergedSha = merged.status === 0 ? crypto.createHash('sha256').update(merged.stdout).digest('hex') : null;
  if (mergedSha && mergedSha !== fp.video.sha256) throw new Error(`MP4 hasil render (${fp.video.sha256.slice(0, 16)}...) berbeda dari MP4 di ${commit} (${mergedSha.slice(0, 16)}...).`);

  // perubahan terhadap baseline resmi harus sudah dideklarasikan
  const official = info ? B.loadBaseline(project) : null;
  const entry = info ? B.pendingFor(pending, registry, project, info.official) : null;
  let changes = null;
  if (official) {
    const changed = B.diffFrames(official.data.pixelMd5, fp.pixelMd5);
    const sameVideo = official.data.video.sha256 === fp.video.sha256;
    if (!changed.length && sameVideo) throw new Error(`Hasil render identik dengan baseline resmi ${official.version}; versi baru tidak diperlukan.`);
    if (!entry) throw new Error(`${changed.length} frame berbeda dari ${official.version} (${B.listFrames(changed.slice(0, 40))}) tanpa entri di pending-changes.json.`);
    const outside = changed.filter((f) => !B.inRanges(entry.frames, f));
    if (outside.length) throw new Error(`${outside.length} frame berubah di luar rentang terdeklarasi: ${B.listFrames(outside.slice(0, 40))}`);
    changes = {
      stage: entry.stage, backlog: entry.backlog, reason: entry.reason, declared: entry.frames,
      changed: B.toRanges(changed), changedCount: changed.length, unchangedCount: fp.pixelMd5.length - changed.length
    };
  }

  const approval = { by: 'pemilik', date: opt.approvedAt, evidence: opt.evidence };
  const baseline = {
    project,
    version: opt.version,
    previous: official ? official.version : null,
    source: { branch, commit, note: opt.note || `Baseline resmi ${project} versi ${opt.version}` },
    capturedAt: new Date().toISOString(),
    engineVersion: manifest.engineVersion,
    render: { chromiumVersion: manifest.chromiumVersion, inputsHash: manifest.inputsHash, engineHash: manifest.engineHash, libraryHash: manifest.libraryHash, framesHash: manifest.framesHash },
    frameCount: fp.frameCount,
    frameSize: fp.frameSize,
    pixelMd5: fp.pixelMd5,
    video: fp.video
  };
  const text = `${JSON.stringify(baseline, null, 1)}\n`;
  const record = {
    file,
    sha256: crypto.createHash('sha256').update(text).digest('hex'),
    source: `${branch}@${commit}`,
    engineVersion: manifest.engineVersion,
    frames: fp.frameCount,
    ...(official ? { previous: official.version, changes } : {}),
    note: baseline.source.note,
    mergedVideo: mergedSha ? `identik dengan ${videoPath} di ${commit}` : `${videoPath} tidak ada di ${commit}`,
    approval
  };

  console.log(`\nBaseline baru ${project} versi ${opt.version} dari ${branch}@${commit} (mesin ${manifest.engineVersion})`);
  console.log(`  frame: ${fp.frameCount}, ${fp.frameSize.width}x${fp.frameSize.height}; MP4 ${fp.video.sha256.slice(0, 16)}... ${record.mergedVideo}`);
  if (changes) {
    console.log(`  dibanding ${official.version}: ${changes.changedCount} frame berubah (${B.formatRanges(changes.changed)}), ${changes.unchangedCount} identik; semua di rentang terdeklarasi ${B.formatRanges(changes.declared)}`);
    console.log(`  entri pending-changes.json "${entry.stage}" (${entry.backlog}) dipindah ke "resolved" sebagai disetujui pemilik (${opt.approvedAt})`);
  }
  if (opt.dryRun) {
    console.log('\n--dry-run: tidak ada file yang ditulis.');
    return;
  }

  fs.writeFileSync(path.join(B.DIR, file), text, { flag: 'wx' });
  const next = registry.projects[project] || { official: null, versions: {} };
  next.versions[opt.version] = record;
  next.official = opt.version;
  registry.projects[project] = next;
  fs.writeFileSync(B.REGISTRY, `${B.stringify(registry)}\n`);
  if (entry) {
    delete pending.changes[project];
    pending.resolved.push({
      project, ...entry, against: official.version, status: 'disetujui pemilik', approvedAt: opt.approvedAt,
      resolvedBy: `baseline ${project} versi ${opt.version}`, changedFrames: changes.changed, changedCount: changes.changedCount, evidence: opt.evidence
    });
    fs.writeFileSync(B.PENDING, `${B.stringify(pending)}\n`);
  }

  const verify = B.verifyRegistry({ project });
  verify.forEach((c) => console.log(`${c.pass ? 'LULUS' : 'GAGAL'}  ${c.name}: ${c.detail}`));
  if (!verify.every((c) => c.pass)) throw new Error('Registry tidak konsisten setelah baseline baru ditulis. Periksa perubahan di tests/baselines/.');
  console.log(`\nSelesai: tests/baselines/${file} menjadi baseline resmi ${project}. Versi sebelumnya tetap tersimpan sebagai referensi historis.`);
}

try {
  const opt = options(process.argv.slice(2));
  if (!opt.version) list(opt.project);
  else if (!opt.project) throw new Error('--version harus dipakai bersama --project <id>.');
  else capture(opt.project, opt);
} catch (error) {
  console.error(`\nBASELINE GAGAL: ${error.message}`);
  process.exit(1);
}
