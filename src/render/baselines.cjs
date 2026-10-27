// Registry baseline regresi per versi (tests/baselines/registry.json).
// Setiap proyek punya satu atau lebih versi baseline. Nama versi mengikuti kondisi main setelah tahap itu di-merge
// ("tahap-2", "tahap-3", "tahap-4", ...). File baseline tidak pernah diubah atau dihapus: versi baru selalu file baru,
// dan SHA-256 setiap file dikunci di registry. "official" menunjuk versi yang menjadi patokan uji regresi, uji asap,
// dan uji antar-proyek. Versi lain tetap tersimpan sebagai referensi historis (bisa dipakai lewat --baseline <versi>).
// Penjelasan lengkap: docs/BASELINES.md
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ROOT } = require('./projects.cjs');

const DIR = path.join(ROOT, 'tests', 'baselines');
const REGISTRY = path.join(DIR, 'registry.json');
const PENDING = path.join(DIR, 'pending-changes.json');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

// --- alat bantu rentang frame (rentang tertutup [a, b], sama dengan pending-changes.json) ---

const inRanges = (ranges, f) => ranges.some(([a, b]) => f >= a && f <= b);

// [85, 86, 87, 90] -> [[85, 87], [90, 90]]
function toRanges(frames) {
  const ranges = [];
  for (const f of [...frames].sort((a, b) => a - b)) {
    const r = ranges[ranges.length - 1];
    if (r && r[1] === f - 1) r[1] = f;
    else ranges.push([f, f]);
  }
  return ranges;
}

const formatRanges = (ranges) => ranges.map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(', ');
const listFrames = (frames) => formatRanges(toRanges(frames));
const countRanges = (ranges) => ranges.reduce((n, [a, b]) => n + b - a + 1, 0);

// nomor frame yang hash-nya berbeda di dua daftar
function diffFrames(a = [], b = []) {
  const differ = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) differ.push(i);
  return differ;
}

// JSON rapi dengan indentasi 2 spasi; daftar angka (termasuk rentang frame) tetap satu baris
function stringify(value, pad = '') {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  const next = `${pad}  `;
  const isNum = (x) => typeof x === 'number';
  if (Array.isArray(value)) {
    if (value.every((x) => isNum(x) || (Array.isArray(x) && x.every(isNum)))) {
      return `[${value.map((x) => (Array.isArray(x) ? `[${x.join(', ')}]` : x)).join(', ')}]`;
    }
    return value.length ? `[\n${value.map((x) => next + stringify(x, next)).join(',\n')}\n${pad}]` : '[]';
  }
  const keys = Object.keys(value);
  return keys.length ? `{\n${keys.map((k) => `${next}${JSON.stringify(k)}: ${stringify(value[k], next)}`).join(',\n')}\n${pad}}` : '{}';
}

// --- registry dan perubahan terdeklarasi ---

const readRegistry = (dir = DIR) => readJson(path.join(dir, 'registry.json'));
const readPending = (dir = DIR) => {
  const file = path.join(dir, 'pending-changes.json');
  const data = fs.existsSync(file) ? readJson(file) : {};
  return { ...data, changes: data.changes || {}, resolved: data.resolved || [] };
};

// Entri perubahan terdeklarasi yang berlaku untuk perbandingan proyek dengan versi baseline tertentu.
// Entri hanya berlaku terhadap versi yang disebut di "against" (entri lama tanpa "against" dianggap terhadap versi resmi).
function pendingFor(pending, registry, project, version) {
  const entry = pending.changes[project];
  if (!entry) return null;
  const against = entry.against || registry.projects[project]?.official;
  return against === version ? entry : null;
}

// Urutan versi dari yang paling lama ke versi resmi, mengikuti tautan "previous".
function lineage(info) {
  const chain = [];
  const seen = new Set();
  for (let v = info.official; v; v = info.versions[v]?.previous) {
    if (seen.has(v)) throw new Error(`rantai versi berputar di "${v}"`);
    seen.add(v);
    chain.unshift(v);
  }
  return chain;
}

// Memuat satu versi baseline (bawaan: versi resmi). Mengembalikan null bila proyek belum punya baseline.
function loadBaseline(project, version, dir = DIR) {
  const registry = readRegistry(dir);
  const info = registry.projects[project];
  if (!info) return null;
  const v = version || info.official;
  const record = info.versions[v];
  if (!record) throw new Error(`Proyek "${project}" tidak punya baseline versi "${v}". Versi tersedia: ${Object.keys(info.versions).join(', ')}`);
  return { project, version: v, official: v === info.official, record, data: readJson(path.join(dir, record.file)) };
}

// Hash piksel baseline resmi, atau null bila proyek belum punya baseline
const officialPixels = (project, dir = DIR) => loadBaseline(project, null, dir)?.data.pixelMd5 || null;

// Pemeriksaan registry tanpa render: file utuh (SHA-256), tidak ada file liar, versi resmi ada,
// perubahan antar versi sama persis dengan catatan dan berada di rentang yang dideklarasikan,
// serta perubahan terdeklarasi yang masih aktif menunjuk versi resmi.
function verifyRegistry({ dir = DIR, project = null } = {}) {
  const out = [];
  const add = (id, name, pass, detail) => out.push({ id, name, pass: Boolean(pass), detail: String(detail) });
  const registry = readRegistry(dir);
  const pending = readPending(dir);
  const projects = Object.keys(registry.projects).filter((p) => !project || p === project);

  if (!project) {
    const registered = new Set(Object.values(registry.projects).flatMap((info) => Object.values(info.versions).map((r) => r.file)));
    const loose = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && !['registry.json', 'pending-changes.json'].includes(f) && !registered.has(f));
    add('registry:files', 'Semua file baseline terdaftar di registry', loose.length === 0,
      loose.length ? `file tidak terdaftar: ${loose.join(', ')}` : `${registered.size} file baseline terdaftar`);
  }

  for (const p of projects) {
    const info = registry.projects[p];
    const versions = Object.keys(info.versions);
    const problems = [];
    for (const v of versions) {
      const record = info.versions[v];
      const file = path.join(dir, record.file);
      if (!fs.existsSync(file)) { problems.push(`${v}: file ${record.file} hilang`); continue; }
      if (sha256(file) !== record.sha256) problems.push(`${v}: isi ${record.file} berubah (SHA-256 tidak cocok dengan registry)`);
      const data = readJson(file);
      if (data.project !== p) problems.push(`${v}: file berisi proyek "${data.project}"`);
      if (data.frameCount !== record.frames || data.pixelMd5.length !== record.frames) problems.push(`${v}: jumlah frame ${data.frameCount} (registry ${record.frames})`);
    }
    add(`registry:${p}:files`, `${p}: file baseline utuh (SHA-256 terkunci)`, problems.length === 0,
      problems.length ? problems.join('; ') : `${versions.length} versi (${versions.join(', ')}), isi file sama dengan saat direkam`);
    if (problems.length) continue;

    let chain = [];
    try {
      chain = lineage(info);
    } catch (error) {
      add(`registry:${p}:official`, `${p}: versi resmi terdaftar`, false, error.message);
      continue;
    }
    const orphan = versions.filter((v) => !chain.includes(v));
    add(`registry:${p}:official`, `${p}: versi resmi dan riwayat versi tersambung`, info.versions[info.official] && orphan.length === 0,
      !info.versions[info.official] ? `versi resmi "${info.official}" tidak ada` : orphan.length ? `versi tidak tersambung ke versi resmi: ${orphan.join(', ')}`
        : `resmi ${info.official}; riwayat ${chain.join(' -> ')}`);

    for (let i = 1; i < chain.length; i++) {
      const [prev, v] = [chain[i - 1], chain[i]];
      const changes = info.versions[v].changes || {};
      const a = readJson(path.join(dir, info.versions[prev].file));
      const b = readJson(path.join(dir, info.versions[v].file));
      const changed = diffFrames(a.pixelMd5, b.pixelMd5);
      const recorded = changes.changed || [];
      const exact = formatRanges(toRanges(changed)) === formatRanges(recorded) && changed.length === changes.changedCount;
      const outside = changed.filter((f) => !inRanges(changes.declared || [], f));
      add(`registry:${p}:${prev}->${v}`, `${p}: perubahan ${prev} -> ${v} sama persis dengan catatan persetujuan`, exact && outside.length === 0 && Boolean(info.versions[v].approval),
        `${changed.length} frame berubah (${listFrames(changed) || '-'}), ${b.pixelMd5.length - changed.length} identik; catatan ${changes.changedCount} frame (${formatRanges(recorded) || '-'})`
        + `${outside.length ? `; ${outside.length} frame di luar rentang terdeklarasi: ${listFrames(outside)}` : `; semua di rentang terdeklarasi ${formatRanges(changes.declared || [])}`}`
        + `${info.versions[v].approval ? '' : '; catatan persetujuan pemilik tidak ada'}`);
    }

    const active = pending.changes[p];
    if (active) {
      const against = active.against || info.official;
      add(`registry:${p}:pending`, `${p}: perubahan terdeklarasi menunjuk versi resmi`, against === info.official,
        against === info.official ? `entri "${active.stage}" terhadap ${against}, status ${active.status}`
          : `entri "${active.stage}" terhadap ${against}, padahal versi resmi ${info.official} (selesaikan atau perbarui entri)`);
    }
  }
  for (const p of Object.keys(pending.changes).filter((x) => (!project || x === project) && !registry.projects[x])) {
    add(`registry:${p}:pending`, `${p}: perubahan terdeklarasi menunjuk versi resmi`, false, 'proyek ini belum punya baseline di registry');
  }
  return out;
}

module.exports = {
  DIR, REGISTRY, PENDING, readJson, sha256, stringify,
  inRanges, toRanges, formatRanges, listFrames, countRanges, diffFrames,
  readRegistry, readPending, pendingFor, lineage, loadBaseline, officialPixels, verifyRegistry
};
