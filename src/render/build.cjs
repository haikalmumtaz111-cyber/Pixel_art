// Render lalu validasi satu proyek (atau semua proyek dengan --all).
// Pemakaian: npm run build -- --project old-town-morning   |   npm run build -- --all
const path = require('path');
const { spawnSync } = require('child_process');
const { listProjects, describeProjects } = require('./projects.cjs');
const { parseArgs } = require('./cli.cjs');

const step = (script, project) => spawnSync(process.execPath, [path.join(__dirname, script), '--project', project], { stdio: 'inherit' }).status === 0;

const args = parseArgs(process.argv.slice(2));
const all = args.rest.includes('--all');
if (!args.project && !all) {
  console.log(`Pilih proyek dengan --project <id>, atau --all untuk semua proyek.\nProyek yang tersedia:\n${describeProjects()}`);
  process.exit(1);
}
const ids = all ? listProjects().map((p) => p.id) : [args.project];
const summary = [];
for (const id of ids) {
  console.log(`\n=== ${id}: render ===`);
  const rendered = step('render.cjs', id);
  console.log(`\n=== ${id}: validasi ===`);
  const valid = rendered && step('validate.cjs', id);
  summary.push({ id, rendered, valid });
}
console.log('\nRingkasan build:');
for (const s of summary) console.log(`  ${s.id.padEnd(20)} render ${s.rendered ? 'OK' : 'GAGAL'}, validasi ${s.valid ? 'LULUS' : s.rendered ? 'GAGAL' : 'tidak dijalankan'}`);
if (summary.some((s) => !s.valid)) process.exitCode = 1;
