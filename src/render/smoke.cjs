// Uji asap (smoke test) yang ringan untuk CI: setiap proyek dirender di beberapa frame saja
// (awal, tengah, akhir, dan satu frame transisi), tanpa membuat MP4.
// - frame harus berukuran benar dan tidak kosong
// - proyek yang punya baseline (tests/baselines) harus identik piksel demi piksel di frame tersebut
// Pemakaian: npm run test:smoke
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ROOT, listProjects, loadProject } = require('./projects.cjs');
const { renderFrames } = require('./pipeline.cjs');
const { md5List } = require('./fingerprint.cjs');
const { frameFile } = require('./config.cjs');

async function main() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-smoke-'));
  let failed = 0;
  try {
    for (const p of listProjects()) {
      const config = loadProject(p.id);
      const total = config.totalFrames;
      const frames = [...new Set([0, Math.floor(total / 2), total - 1, ...config.timeline.transitions.map((t) => t.startFrame + Math.floor(t.durationFrames / 2))])].sort((a, b) => a - b);
      const baselineFile = path.join(ROOT, 'tests', 'baselines', `${p.id}.json`);
      const baseline = fs.existsSync(baselineFile) ? JSON.parse(fs.readFileSync(baselineFile, 'utf8')) : null;
      // frame yang masuk perubahan terdeklarasi (tests/baselines/pending-changes.json) tidak dicocokkan dengan baseline
      const pendingFile = path.join(ROOT, 'tests', 'baselines', 'pending-changes.json');
      const declared = fs.existsSync(pendingFile) ? (JSON.parse(fs.readFileSync(pendingFile, 'utf8')).changes?.[p.id]?.frames || []) : [];
      const isDeclared = (f) => declared.some(([a, b]) => f >= a && f <= b);
      const dir = path.join(temp, p.id);
      const problems = [];
      for (const f of frames) {
        const info = await renderFrames(config, { first: f, count: 1, framesDir: dir, globalNames: true });
        const file = frameFile(dir, f);
        const png = fs.readFileSync(file);
        const size = { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
        if (size.width !== config.frameSize.width || size.height !== config.frameSize.height) problems.push(`frame ${f} berukuran ${size.width}x${size.height}`);
        // gambar polos satu warna terkompresi menjadi PNG yang sangat kecil
        if (png.length < 2048) problems.push(`frame ${f} kosong (${png.length} byte)`);
        if (info.jsErrors) problems.push(`frame ${f}: ${info.jsErrors} error JavaScript`);
        if (baseline && !isDeclared(f) && md5List(['-i', file, '-pix_fmt', 'rgb24'])[0] !== baseline.pixelMd5[f]) problems.push(`frame ${f} berbeda dari baseline`);
      }
      const ok = problems.length === 0;
      if (!ok) failed++;
      const skipped = frames.filter(isDeclared);
      const note = baseline ? `, identik dengan baseline${skipped.length ? ` (frame ${skipped.join(', ')} masuk perubahan terdeklarasi, tidak dicocokkan)` : ''}` : '';
      console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${p.id}: frame ${frames.join(', ')} ${ok ? `dirender ${config.frameSize.width}x${config.frameSize.height}${note}` : problems.join('; ')}`);
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`\nUJI ASAP GAGAL: ${error.message}`);
  process.exit(1);
});
