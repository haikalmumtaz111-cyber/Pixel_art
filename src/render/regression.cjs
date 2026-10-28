// Uji regresi: membandingkan hasil render sekarang dengan baseline di tests/baselines/.
// Versi baseline per proyek diatur di tests/baselines/registry.json (lihat src/render/baselines.cjs dan docs/BASELINES.md).
// Bawaan: setiap proyek dibandingkan dengan versi resminya. Dengan --baseline <versi>, satu proyek dibandingkan dengan
// versi historis; frame yang berbeda harus sama persis dengan perubahan yang sudah disetujui sejak versi itu.
// Yang dibandingkan: jumlah frame, ukuran frame, hash piksel tiap frame PNG, metadata video
// (codec, profil, level, resolusi, FPS, durasi, jumlah frame), SHA-256 MP4, dan hash tiap frame hasil decode.
// Sebelum membandingkan, registry diperiksa: file baseline utuh dan riwayat versi cocok dengan catatan persetujuan.
// Pemakaian (setelah render): node src/render/regression.cjs [--project <id> [--baseline <versi>]]
const fs = require('fs');
const path = require('path');
const { loadConfig } = require('./config.cjs');
const { ROOT } = require('./projects.cjs');
const { parseArgs } = require('./cli.cjs');
const { fingerprint } = require('./fingerprint.cjs');
const C = require('./checks.cjs');
const M = require('./manifest.cjs');
const B = require('./baselines.cjs');

const VIDEO_FIELDS = ['codec', 'profile', 'level', 'width', 'height', 'fps', 'frames', 'pixelFormat'];

// --baseline <versi> dikeluarkan dulu dari argumen supaya nilainya tidak terbaca sebagai id proyek oleh cli.cjs
function takeOption(argv, name) {
  const i = argv.indexOf(name);
  if (i < 0) return null;
  const [, value] = argv.splice(i, 2);
  if (!value || value.startsWith('--')) throw new Error(`${name} butuh nilai`);
  return value;
}

// Perubahan yang boleh ada saat dibandingkan dengan versi baseline tertentu:
// - approved: frame yang sudah disetujui berubah sejak versi itu (dihitung dari file baseline resmi), hanya untuk versi historis
// - pending: entri pending-changes.json yang dideklarasikan terhadap versi itu (menunggu persetujuan)
function allowed(registry, pending, baseline) {
  const info = registry.projects[baseline.project];
  const chain = B.lineage(info);
  const steps = chain.slice(chain.indexOf(baseline.version) + 1);
  const official = baseline.official ? baseline : B.loadBaseline(baseline.project);
  return {
    steps,
    approved: baseline.official ? [] : B.diffFrames(baseline.data.pixelMd5, official.data.pixelMd5),
    pending: B.pendingFor(pending, registry, baseline.project, baseline.version)
  };
}

function compare(config, baseline, allow) {
  const out = [];
  const label = config.id;
  const base = baseline.data;
  const declared = allow.pending ? allow.pending.frames : [];
  const approved = new Set(allow.approved);
  const changesAllowed = Boolean(allow.pending) || approved.size > 0;
  // hanya hasil render terbaru yang sukses yang boleh dibandingkan
  const fresh = C.manifestChecks(config, M.readManifest(M.manifestFile(config)));
  out.push(C.result(`${label}:manifest`, `${label}: hasil render terbaru dan sukses`, fresh.every((c) => c.pass), fresh.map((c) => c.detail).join(' | ')));
  if (!fresh.every((c) => c.pass)) return out;

  const now = fingerprint({ framesDir: config.paths.frames, count: config.totalFrames, video: config.paths.video });
  out.push(C.result(`${label}:frames`, `${label}: jumlah frame sama`, now.frameCount === base.frameCount, `${now.frameCount} (baseline ${base.frameCount})`));
  const sizeSame = now.frameSize.width === base.frameSize.width && now.frameSize.height === base.frameSize.height;
  out.push(C.result(`${label}:frame-size`, `${label}: ukuran frame sama`, sizeSame, `${now.frameSize.width}x${now.frameSize.height} (baseline ${base.frameSize.width}x${base.frameSize.height})`));

  const pixels = B.diffFrames(now.pixelMd5, base.pixelMd5);
  const undeclared = pixels.filter((f) => !approved.has(f) && !B.inRanges(declared, f));
  const changed = pixels.filter((f) => !approved.has(f) && B.inRanges(declared, f));
  const asApproved = pixels.filter((f) => approved.has(f));
  // frame yang seharusnya sudah berubah (sesuai baseline resmi) tetapi masih sama dengan versi historis
  const reverted = allow.approved.filter((f) => !pixels.includes(f) && !B.inRanges(declared, f));
  const parts = [`${now.pixelMd5.length - pixels.length} frame identik`];
  if (approved.size) parts.push(`${asApproved.length} frame berbeda sesuai perubahan yang disetujui di ${allow.steps.join(', ')} (${B.listFrames(asApproved) || '-'})`);
  if (allow.pending) parts.push(`${changed.length} frame berubah di rentang terdeklarasi (${B.listFrames(changed) || '-'})`);
  out.push(C.result(`${label}:pixels`, changesAllowed ? `${label}: piksel identik di luar perubahan yang disetujui/dideklarasikan` : `${label}: piksel setiap frame identik`,
    undeclared.length === 0 && reverted.length === 0,
    undeclared.length ? `${undeclared.length} frame berbeda TANPA deklarasi: ${B.listFrames(undeclared.slice(0, 40))}`
      : reverted.length ? `${reverted.length} frame tidak sesuai baseline resmi (masih sama dengan ${baseline.version}): ${B.listFrames(reverted.slice(0, 40))}`
        : changesAllowed ? parts.join('; ') : `${now.pixelMd5.length} frame identik piksel demi piksel`));
  if (approved.size) {
    out.push(C.result(`${label}:approved`, `${label}: perubahan sejak ${baseline.version} sama persis dengan yang disetujui`, asApproved.length === approved.size && reverted.length === 0,
      `${asApproved.length} dari ${approved.size} frame yang disetujui berubah; ${now.pixelMd5.length - approved.size} frame lain wajib identik dengan ${baseline.version}`));
  }
  if (allow.pending) {
    out.push(C.result(`${label}:pending`, `${label}: perubahan ${allow.pending.stage} (${allow.pending.backlog}) ${allow.pending.status}`, true,
      `${changed.length} frame berubah, alasan: ${allow.pending.reason}`));
  }

  const video = now.video || {};
  const fields = VIDEO_FIELDS.filter((f) => video[f] !== base.video[f]);
  const durationSame = Math.abs(video.duration - base.video.duration) < 1e-6;
  out.push(C.result(`${label}:video-format`, `${label}: format video sama (decoding kompatibel)`, fields.length === 0 && durationSame,
    fields.length || !durationSame ? `berbeda: ${[...fields, ...(durationSame ? [] : ['duration'])].map((f) => `${f} ${video[f]} vs ${base.video[f]}`).join(', ')}`
      : `${video.codec} ${video.profile} level ${video.level}, ${video.width}x${video.height}, ${video.fps}, ${video.frames} frame, ${video.duration} detik, ${video.pixelFormat}`));
  const decoded = B.diffFrames(video.decodedMd5, base.video.decodedMd5);
  if (!changesAllowed) {
    out.push(C.result(`${label}:decoded`, `${label}: frame hasil decode identik`, decoded.length === 0,
      decoded.length ? `${decoded.length} frame berbeda, contoh: ${B.listFrames(decoded.slice(0, 40))}` : `${(video.decodedMd5 || []).length} frame identik`));
  } else {
    // H.264 memakai frame lain sebagai acuan: bila sebagian frame berubah, keputusan encoder untuk frame di sekitarnya
    // ikut bergeser sedikit. Patokan di luar perubahan adalah piksel PNG (tanpa kompresi) yang diperiksa di atas.
    const decodedOutside = decoded.filter((f) => !approved.has(f) && !B.inRanges(declared, f));
    out.push(C.result(`${label}:decoded`, `${label}: frame hasil decode (informasi, kompresi H.264)`, undeclared.length === 0,
      `${decoded.length} frame hasil decode berbeda (${decodedOutside.length} di luar perubahan, karena encoder H.264 memakai frame sekitar sebagai acuan); sumber PNG di luar perubahan identik`));
  }
  const sameFile = video.sha256 === base.video.sha256;
  out.push(C.result(`${label}:sha256`, changesAllowed ? `${label}: file MP4 identik, atau berbeda hanya karena perubahan yang disetujui/dideklarasikan` : `${label}: file MP4 identik byte demi byte`,
    sameFile || (changesAllowed && undeclared.length === 0 && reverted.length === 0 && pixels.length > 0),
    `${(video.sha256 || '-').slice(0, 16)}... (baseline ${base.video.sha256.slice(0, 16)}...)${sameFile ? '' : changesAllowed ? ', berbeda karena frame yang disetujui/dideklarasikan berubah' : ''}`));
  return out;
}

function main() {
  const argv = process.argv.slice(2);
  const version = takeOption(argv, '--baseline');
  const args = parseArgs(argv);
  if (version && !args.project) throw new Error('--baseline <versi> harus dipakai bersama --project <id>.');
  const registry = B.readRegistry();
  const pending = B.readPending();
  const projects = Object.keys(registry.projects).filter((p) => !args.project || p === args.project).sort();
  if (!projects.length) throw new Error(args.project ? `Tidak ada baseline untuk proyek "${args.project}" di tests/baselines/registry.json.` : 'Registry baseline kosong.');

  const checks = [];
  const print = (c) => {
    checks.push(c);
    console.log(`${c.pass ? 'LULUS' : 'GAGAL'}  ${c.name}: ${c.detail}`);
  };
  console.log('\nRegistry baseline (tests/baselines/registry.json)');
  B.verifyRegistry({ project: args.project }).forEach(print);

  const compared = [];
  for (const id of projects) {
    const baseline = B.loadBaseline(id, version);
    const allow = allowed(registry, pending, baseline);
    const config = loadConfig(id);
    const record = baseline.record;
    compared.push({ project: id, version: baseline.version, official: baseline.official, source: record.source, engineVersion: record.engineVersion });
    console.log(`\nRegresi ${config.title} (${id}) vs baseline ${baseline.version} (${record.source}, ${baseline.official ? 'resmi' : 'historis'})${allow.pending ? ' (ada perubahan terdeklarasi)' : ''}`);
    compare(config, baseline, allow).forEach(print);
  }

  const passed = checks.filter((c) => c.pass).length;
  const allPass = passed === checks.length;
  const awaiting = checks.filter((c) => c.id.endsWith(':pending') && !c.id.startsWith('registry:'));
  const historical = compared.some((c) => !c.official);
  const verdict = !allPass ? 'ADA PERUBAHAN DARI BASELINE'
    : awaiting.length ? 'TIDAK ADA REGRESI TAK TERDUGA (ada perubahan terdeklarasi yang menunggu persetujuan)'
      : historical ? 'TIDAK ADA REGRESI (perbedaan dari versi historis sama persis dengan perubahan yang disetujui)' : 'TIDAK ADA REGRESI';
  const testedAt = new Date().toISOString();
  const reports = path.join(ROOT, 'output', 'reports');
  // laporan resmi di regression.md; perbandingan dengan versi historis ditulis ke file terpisah
  const name = historical ? `regression-${args.project}-${version}` : 'regression';
  fs.mkdirSync(reports, { recursive: true });
  fs.writeFileSync(path.join(reports, `${name}.json`), JSON.stringify({ testedAt, allPass, verdict, passed, total: checks.length, pending: pending.changes, baselines: compared, checks }, null, 2) + '\n');
  const rows = checks.map((c, i) => `| ${i + 1} | ${c.name} | ${c.pass ? 'LULUS' : 'GAGAL'} | ${c.detail.replace(/\|/g, '/')} |`).join('\n');
  fs.writeFileSync(path.join(reports, `${name}.md`), `# Uji Regresi${historical ? ` terhadap Versi Historis` : ''}

Hasil render sekarang dibandingkan dengan baseline ${compared.map((c) => `\`${c.project}\` versi ${c.version} (${c.source}, ${c.official ? 'resmi' : 'historis'})`).join(', ')}.
Versi baseline diatur di \`tests/baselines/registry.json\` (panduan: \`docs/BASELINES.md\`).
Dibuat otomatis oleh \`npm run test:regression${historical ? ` -- --project ${args.project} --baseline ${version}` : ''}\` pada ${testedAt}.

| No | Pemeriksaan | Hasil | Detail |
|----|-------------|-------|--------|
${rows}

Status akhir: **${verdict}** (${passed}/${checks.length})
${awaiting.length ? `\nPerubahan terdeklarasi dicatat di \`tests/baselines/pending-changes.json\` dan belum dianggap diterima. Baseline tidak diubah.\n` : ''}`);
  console.log(`\n${verdict} (${passed}/${checks.length}). Laporan: output/reports/${name}.md`);
  if (!allPass) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(`\nUJI REGRESI GAGAL: ${error.message}`);
  process.exit(1);
}
