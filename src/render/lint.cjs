// Pemeriksaan cepat kode dan konfigurasi (tanpa browser, tanpa render). Dipakai lokal dan di GitHub Actions.
// 1. Sintaks semua file JavaScript (.js dan .cjs) benar.
// 2. Semua file JSON bisa dibaca.
// 3. Aturan determinisme: kode browser tidak memakai Math.random(), Date, atau performance.now().
// 4. Kemurnian mesin inti: src/engine tidak mengimpor aset/adegan dan tidak menyebut jenis aset tertentu.
// 5. Konvensi modul: kode browser ES module .js, kode Node CommonJS .cjs.
// 6. Registry baseline utuh: file baseline tidak berubah (SHA-256) dan riwayat versinya cocok dengan catatan persetujuan.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { ROOT, loadEngine } = require('./projects.cjs');
const { verifyRegistry } = require('./baselines.cjs');

const IGNORE = new Set(['node_modules', 'output', '.git']);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    if (IGNORE.has(d.name)) return [];
    const full = path.join(dir, d.name);
    return d.isDirectory() ? walk(full) : [full];
  });
}

// buang komentar baris dan blok agar aturan tidak tersandung penjelasan di komentar
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

function main() {
  const files = walk(ROOT).map((f) => path.relative(ROOT, f));
  const problems = [];
  const scripts = files.filter((f) => /\.(c?js)$/.test(f));
  const jsons = files.filter((f) => f.endsWith('.json') && !f.endsWith('package-lock.json'));

  for (const f of scripts) {
    const r = spawnSync(process.execPath, ['--check', path.join(ROOT, f)], { encoding: 'utf8' });
    if (r.status !== 0) problems.push(`${f}: sintaks salah\n${r.stderr.trim().split('\n').slice(0, 4).join('\n')}`);
  }
  for (const f of jsons) {
    try {
      JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
    } catch (error) {
      problems.push(`${f}: JSON tidak valid (${error.message})`);
    }
  }

  const browserCode = scripts.filter((f) => /^src[\\/](engine|assets|scenes)[\\/]/.test(f));
  for (const f of browserCode) {
    if (f.endsWith('.cjs')) problems.push(`${f}: kode browser harus ES module .js, bukan .cjs`);
    const code = stripComments(fs.readFileSync(path.join(ROOT, f), 'utf8'));
    for (const [pattern, what] of [[/Math\.random\s*\(/, 'Math.random()'], [/\bDate\b/, 'Date'], [/performance\.now\s*\(/, 'performance.now()']]) {
      // runtime.js boleh memakai performance.now() khusus untuk pratinjau langsung di browser
      if (what === 'performance.now()' && f.endsWith(path.join('engine', 'runtime.js'))) continue;
      if (pattern.test(code)) problems.push(`${f}: memakai ${what}, padahal animasi harus deterministik (pakai hash() dari src/engine/random.js)`);
    }
  }
  for (const f of scripts.filter((x) => /^src[\\/]render[\\/]/.test(x))) {
    if (f.endsWith('.js')) problems.push(`${f}: kode Node harus CommonJS .cjs`);
  }

  // mesin inti tidak boleh tahu tentang aset atau cerita tertentu
  const types = Object.keys(loadEngine().catalog.types);
  for (const f of browserCode.filter((x) => /^src[\\/]engine[\\/]/.test(x))) {
    const code = stripComments(fs.readFileSync(path.join(ROOT, f), 'utf8'));
    if (/from\s+['"]\.\.\/(assets|scenes)\//.test(code) || /import\(\s*['"]\.\.\/(assets|scenes)\//.test(code)) problems.push(`${f}: mesin inti mengimpor modul aset/adegan secara langsung`);
    for (const type of types) if (new RegExp(`['"\`]${type}['"\`]`).test(code)) problems.push(`${f}: mesin inti menyebut jenis aset "${type}"`);
  }

  // registry baseline (tanpa render): file utuh, riwayat versi dan perubahan terdeklarasi konsisten
  let registry = [];
  try {
    registry = verifyRegistry();
    for (const c of registry.filter((x) => !x.pass)) problems.push(`tests/baselines: ${c.name} (${c.detail})`);
  } catch (error) {
    problems.push(`tests/baselines: registry tidak bisa diperiksa (${error.message})`);
  }

  if (problems.length) {
    console.error(`LINT GAGAL (${problems.length} masalah):\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }
  console.log(`LINT LULUS: ${scripts.length} file JavaScript, ${jsons.length} file JSON, ${browserCode.length} file kode browser deterministik, mesin inti bebas dari ${types.length} jenis aset, ${registry.length} pemeriksaan registry baseline.`);
}

main();
