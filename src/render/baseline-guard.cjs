// Penjaga baseline historis: membandingkan tests/baselines/ sekarang dengan referensi tepercaya di Git
// (bawaan origin/main). Menangkap yang tidak bisa ditangkap lint: file baseline lama yang diubah bersama hash-nya
// di registry, versi registry yang dihapus atau diubah, dan riwayat persetujuan yang hilang. Aturannya ada di
// guardAgainst() (src/render/baselines.cjs). Di CI, referensinya cabang tujuan PR atau commit main sebelumnya.
// Pemakaian: node src/render/baseline-guard.cjs [--ref <branch | commit>]
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { ROOT } = require('./projects.cjs');
const B = require('./baselines.cjs');

const FOLDER = 'tests/baselines';

function main() {
  const argv = process.argv.slice(2);
  const at = argv.indexOf('--ref');
  const ref = at >= 0 ? argv[at + 1] : 'origin/main';
  if (!ref || ref.startsWith('--')) throw new Error('--ref butuh nilai, misalnya --ref origin/main');
  const git = (args, encoding = 'utf8') => spawnSync('git', args, { cwd: ROOT, encoding, maxBuffer: 1 << 30 });

  const commit = git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]).stdout.trim();
  if (!commit) throw new Error(`Referensi "${ref}" tidak ditemukan. Ambil dulu, misalnya: git fetch origin main`);
  const listed = git(['ls-tree', '--name-only', commit, `${FOLDER}/`]);
  if (listed.status !== 0) throw new Error(`Tidak bisa membaca ${FOLDER} di ${ref}: ${listed.stderr.trim()}`);

  const reference = {};
  for (const file of listed.stdout.split('\n').filter((f) => f.endsWith('.json'))) {
    const blob = git(['show', `${commit}:${file}`], 'buffer');
    if (blob.status !== 0) throw new Error(`Tidak bisa membaca ${file} di ${ref}`);
    reference[path.basename(file)] = blob.stdout;
  }
  const current = Object.fromEntries(fs.readdirSync(path.join(ROOT, FOLDER)).filter((f) => f.endsWith('.json'))
    .map((f) => [f, fs.readFileSync(path.join(ROOT, FOLDER, f))]));

  console.log(`\nPenjaga baseline historis: ${FOLDER}/ sekarang vs ${ref} (${commit.slice(0, 7)})`);
  const checks = B.guardAgainst(reference, current);
  for (const c of checks) console.log(`${c.pass ? 'LULUS' : 'GAGAL'}  ${c.name}: ${c.detail}`);
  const passed = checks.filter((c) => c.pass).length;
  console.log(`\n${passed === checks.length ? 'BASELINE HISTORIS UTUH' : 'BASELINE HISTORIS BERUBAH'} (${passed}/${checks.length})`);
  if (passed !== checks.length) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(`\nPENJAGA BASELINE GAGAL: ${error.message}`);
  process.exit(1);
}
