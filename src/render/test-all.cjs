// Menjalankan seluruh pengujian berurutan lalu menampilkan ringkasan.
// Butuh hasil render semua proyek (npm run build -- --all) untuk validasi, uji negatif, regresi, dan uji antar-proyek.
// Pemakaian: npm test
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { listProjects, loadProject } = require('./projects.cjs');
const { validationVerdict } = require('./checks.cjs');

const node = (args) => spawnSync(process.execPath, args, { stdio: 'inherit' }).status === 0;
const script = (name, ...args) => node([path.join(__dirname, name), ...args]);
// catatan langkah validasi yang lolos tetapi berisi KNOWN ISSUE atau TIDAK DIPERIKSA (dibaca dari laporannya)
const validationNote = (id) => {
  const cfg = loadProject(id);
  const file = path.join(cfg.paths.reports, `${cfg.name}-validation.json`);
  const verdict = fs.existsSync(file) ? validationVerdict(JSON.parse(fs.readFileSync(file, 'utf8'))) : 'laporan JSON tidak ditemukan';
  return verdict === 'LULUS' ? '' : verdict;
};
const steps = [
  ['Lint kode dan konfigurasi', () => script('lint.cjs')],
  ['Unit test mesin', () => node(['--test', ...require('fs').readdirSync(path.join(__dirname, '..', '..', 'tests', 'engine')).filter((f) => f.endsWith('.test.js')).map((f) => path.join('tests', 'engine', f))])],
  ['Penjaga baseline historis (vs origin/main)', () => script('baseline-guard.cjs')]
];
const projects = listProjects();
for (const p of projects) steps.push([`Validasi ${p.id}`, () => script('validate.cjs', '--project', p.id), () => validationNote(p.id)]);
// uji negatif butuh timeline (prototipe Tahap 1 memakai format lama satu adegan)
for (const p of projects) if (loadProject(p.id).timeline.scenes.length > 1) steps.push([`Uji negatif ${p.id}`, () => script('negative-tests.cjs', '--project', p.id)]);
steps.push(['Uji regresi terhadap baseline resmi (registry versi)', () => script('regression.cjs')]);
steps.push(['Uji antar-proyek (mesin bersama, isolasi)', () => script('project-tests.cjs')]);
steps.push(['Lab zoom: grid piksel kamera (semua pendekatan)', () => script('zoom-tests.cjs')]);

const results = [];
for (const [name, run, noteOf] of steps) {
  console.log(`\n========== ${name} ==========`);
  const pass = run();
  results.push({ name, pass, note: pass && noteOf ? noteOf() : '' });
}
console.log('\n========== Ringkasan ==========');
for (const r of results) console.log(`${!r.pass ? 'GAGAL' : r.note ? 'TANPA KEGAGALAN' : 'LULUS'}  ${r.name}${r.note ? `: ${r.note}` : ''}`);
const failed = results.filter((r) => !r.pass).length;
const noted = results.filter((r) => r.pass && r.note).length;
console.log(failed ? `\n${failed} dari ${results.length} langkah GAGAL.`
  : noted ? `\nTidak ada langkah yang gagal: ${results.length - noted} langkah LULUS, ${noted} langkah tanpa kegagalan dengan KNOWN ISSUE atau pemeriksaan yang tidak diperiksa (lihat di atas).`
    : `\nSemua ${results.length} langkah LULUS.`);
if (failed) process.exitCode = 1;
