// Uji regresi: membandingkan hasil render sekarang dengan baseline resmi di tests/baselines/.
// Baseline dibuat dari branch main sebelum Tahap 3 (Project A "night-to-dawn" dan prototipe Tahap 1).
// Yang dibandingkan: jumlah frame, ukuran frame, hash piksel tiap frame PNG, metadata video
// (codec, profil, level, resolusi, FPS, durasi, jumlah frame), SHA-256 MP4, dan hash tiap frame hasil decode.
// Pemakaian (setelah render): node src/render/regression.cjs [--project <id>]
const fs = require('fs');
const path = require('path');
const { loadConfig } = require('./config.cjs');
const { ROOT } = require('./projects.cjs');
const { parseArgs } = require('./cli.cjs');
const { fingerprint } = require('./fingerprint.cjs');
const C = require('./checks.cjs');
const M = require('./manifest.cjs');

const BASELINES = path.join(ROOT, 'tests', 'baselines');
const VIDEO_FIELDS = ['codec', 'profile', 'level', 'width', 'height', 'fps', 'frames', 'pixelFormat'];

function diffList(a = [], b = []) {
  const differ = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) differ.push(i);
  return differ;
}

function compare(config, baseline) {
  const out = [];
  const label = config.id;
  // hanya hasil render terbaru yang sukses yang boleh dibandingkan
  const fresh = C.manifestChecks(config, M.readManifest(M.manifestFile(config)));
  out.push(C.result(`${label}:manifest`, `${label}: hasil render terbaru dan sukses`, fresh.every((c) => c.pass), fresh.map((c) => c.detail).join(' | ')));
  if (!fresh.every((c) => c.pass)) return out;

  const now = fingerprint({ framesDir: config.paths.frames, count: config.totalFrames, video: config.paths.video });
  out.push(C.result(`${label}:frames`, `${label}: jumlah frame sama`, now.frameCount === baseline.frameCount, `${now.frameCount} (baseline ${baseline.frameCount})`));
  const sizeSame = now.frameSize.width === baseline.frameSize.width && now.frameSize.height === baseline.frameSize.height;
  out.push(C.result(`${label}:frame-size`, `${label}: ukuran frame sama`, sizeSame, `${now.frameSize.width}x${now.frameSize.height} (baseline ${baseline.frameSize.width}x${baseline.frameSize.height})`));
  const pixels = diffList(now.pixelMd5, baseline.pixelMd5);
  out.push(C.result(`${label}:pixels`, `${label}: piksel setiap frame identik`, pixels.length === 0,
    pixels.length ? `${pixels.length} frame berbeda, contoh: ${pixels.slice(0, 8).join(', ')}` : `${now.pixelMd5.length} frame identik piksel demi piksel`));

  const video = now.video || {};
  const fields = VIDEO_FIELDS.filter((f) => video[f] !== baseline.video[f]);
  const durationSame = Math.abs(video.duration - baseline.video.duration) < 1e-6;
  out.push(C.result(`${label}:video-format`, `${label}: format video sama (decoding kompatibel)`, fields.length === 0 && durationSame,
    fields.length || !durationSame ? `berbeda: ${[...fields, ...(durationSame ? [] : ['duration'])].map((f) => `${f} ${video[f]} vs ${baseline.video[f]}`).join(', ')}`
      : `${video.codec} ${video.profile} level ${video.level}, ${video.width}x${video.height}, ${video.fps}, ${video.frames} frame, ${video.duration} detik, ${video.pixelFormat}`));
  const decoded = diffList(video.decodedMd5, baseline.video.decodedMd5);
  out.push(C.result(`${label}:decoded`, `${label}: frame hasil decode identik`, decoded.length === 0,
    decoded.length ? `${decoded.length} frame berbeda, contoh: ${decoded.slice(0, 8).join(', ')}` : `${(video.decodedMd5 || []).length} frame identik`));
  out.push(C.result(`${label}:sha256`, `${label}: file MP4 identik byte demi byte`, video.sha256 === baseline.video.sha256,
    `${(video.sha256 || '-').slice(0, 16)}... (baseline ${baseline.video.sha256.slice(0, 16)}...)`));
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const files = fs.readdirSync(BASELINES).filter((f) => f.endsWith('.json')).sort();
  const baselines = files.map((f) => JSON.parse(fs.readFileSync(path.join(BASELINES, f), 'utf8'))).filter((b) => !args.project || b.project === args.project);
  if (!baselines.length) throw new Error(args.project ? `Tidak ada baseline untuk proyek "${args.project}".` : 'Folder tests/baselines kosong.');

  const checks = [];
  for (const baseline of baselines) {
    const config = loadConfig(baseline.project);
    console.log(`\nRegresi ${config.title} (${config.id}) vs baseline ${baseline.source.branch}@${baseline.source.commit}`);
    for (const c of compare(config, baseline)) {
      checks.push(c);
      console.log(`${c.pass ? 'LULUS' : 'GAGAL'}  ${c.name}: ${c.detail}`);
    }
  }
  const passed = checks.filter((c) => c.pass).length;
  const allPass = passed === checks.length;
  const testedAt = new Date().toISOString();
  const reports = path.join(ROOT, 'output', 'reports');
  fs.mkdirSync(reports, { recursive: true });
  fs.writeFileSync(path.join(reports, 'regression.json'), JSON.stringify({ testedAt, allPass, passed, total: checks.length, baselines: baselines.map((b) => ({ project: b.project, source: b.source })), checks }, null, 2) + '\n');
  const rows = checks.map((c, i) => `| ${i + 1} | ${c.name} | ${c.pass ? 'LULUS' : 'GAGAL'} | ${c.detail.replace(/\|/g, '/')} |`).join('\n');
  fs.writeFileSync(path.join(reports, 'regression.md'), `# Uji Regresi

Hasil render sekarang dibandingkan dengan baseline resmi dari ${baselines.map((b) => `\`${b.project}\` (${b.source.branch}@${b.source.commit})`).join(' dan ')}.
Dibuat otomatis oleh \`npm run test:regression\` pada ${testedAt}.

| No | Pemeriksaan | Hasil | Detail |
|----|-------------|-------|--------|
${rows}

Status akhir: **${allPass ? 'TIDAK ADA REGRESI' : 'ADA PERUBAHAN DARI BASELINE'}** (${passed}/${checks.length})
`);
  console.log(`\n${allPass ? 'TIDAK ADA REGRESI' : 'ADA PERUBAHAN DARI BASELINE'} (${passed}/${checks.length}). Laporan: output/reports/regression.md`);
  if (!allPass) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(`\nUJI REGRESI GAGAL: ${error.message}`);
  process.exit(1);
}
