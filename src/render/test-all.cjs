// Menjalankan seluruh pengujian berurutan lalu menampilkan ringkasan.
// Butuh hasil render semua proyek (npm run build -- --all) untuk validasi, uji negatif, regresi, dan uji antar-proyek.
// Pemakaian: npm test
const path = require('path');
const { spawnSync } = require('child_process');
const { listProjects, loadProject } = require('./projects.cjs');

const node = (args) => spawnSync(process.execPath, args, { stdio: 'inherit' }).status === 0;
const script = (name, ...args) => node([path.join(__dirname, name), ...args]);
const steps = [
  ['Lint kode dan konfigurasi', () => script('lint.cjs')],
  ['Unit test mesin', () => node(['--test', ...require('fs').readdirSync(path.join(__dirname, '..', '..', 'tests', 'engine')).filter((f) => f.endsWith('.test.js')).map((f) => path.join('tests', 'engine', f))])],
  ['Penjaga baseline historis (vs origin/main)', () => script('baseline-guard.cjs')]
];
const projects = listProjects();
for (const p of projects) steps.push([`Validasi ${p.id}`, () => script('validate.cjs', '--project', p.id)]);
// uji negatif butuh timeline (prototipe Tahap 1 memakai format lama satu adegan)
for (const p of projects) if (loadProject(p.id).timeline.scenes.length > 1) steps.push([`Uji negatif ${p.id}`, () => script('negative-tests.cjs', '--project', p.id)]);
steps.push(['Uji regresi terhadap baseline resmi (registry versi)', () => script('regression.cjs')]);
steps.push(['Uji antar-proyek (mesin bersama, isolasi)', () => script('project-tests.cjs')]);
steps.push(['Lab zoom: grid piksel kamera (semua pendekatan)', () => script('zoom-tests.cjs')]);

const results = [];
for (const [name, run] of steps) {
  console.log(`\n========== ${name} ==========`);
  results.push({ name, pass: run() });
}
console.log('\n========== Ringkasan ==========');
for (const r of results) console.log(`${r.pass ? 'LULUS' : 'GAGAL'}  ${r.name}`);
const failed = results.filter((r) => !r.pass).length;
console.log(failed ? `\n${failed} dari ${results.length} langkah GAGAL.` : `\nSemua ${results.length} langkah LULUS.`);
if (failed) process.exitCode = 1;
