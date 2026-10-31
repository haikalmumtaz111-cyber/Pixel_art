// Uji browser fixture Tahap 6A-2b (PR 2): fixture tests/fixtures/projects/uji-6a2b.json (sintaks waktu relatif adegan)
// dibandingkan dengan kembaran tulisan tangan uji-6a2b-global.json (sintaks lama), lewat pipeline render browser yang
// sama dengan proyek resmi (render.cjs, renderFrames, openStudio). Tidak ada mesin render kedua.
//
// Kelompok uji (AC2b di docs/CHANGELOG.md dan tests/fixtures/projects/README.md):
//   golden       AC14 lapis piksel: 270 frame fixture vs 270 frame kembaran, hash piksel hasil decode (RGB24, SHA-256),
//                jumlah, nama, ukuran, urutan, frame unik, plus kontrol negatif (kembaran salah 1 frame, frame ditukar,
//                digandakan, hilang, salah ukuran)
//   validasi     validasi penuh fixture (validate.cjs apa adanya): transisi, luma, determinisme urutan terbalik, pose
//   isolasi      AC12: setiap frame di luar transisi (228) = render adegan itu saja
//   transisi     AC12 dan M5: frame di jendela dissolve dibandingkan dengan KOMPOSISI dua adegan, bukan satu adegan
//   determinisme AC12: render ulang dengan urutan acak ber-seed di browser baru identik dengan render berurutan
//   ac13         AC13: adegan a diperpanjang 1 detik tidak mengubah piksel lokal b dan c, dengan kontrol sensitivitas
//   a13          A13 per frame di browser (import() dinamis, tanpa mengubah src/engine): id dan entitas yang tampil
//   pose         AC16: pemeriksaan pose di setiap frame pengayuh tampil, motion-feet/motion-bob kosong (BACKLOG T26)
//   m5           M5: varian cut dan tanpa transisi antar stage harus terdeteksi di piksel dan luma
//   stale        NT-STALE-2B dan M2 lapis piksel di salinan sekali pakai: manifest kedaluwarsa, --encode-only ditolak
//   kebersihan   AC2b-02: status Git sama sebelum dan sesudah, output sementara dibersihkan
//
// Pemakaian:
//   npm run test:fixtures                            semua kelompok (lokal, beberapa menit)
//   npm run test:fixtures -- --only golden,isolasi   kelompok tertentu
//   npm run test:fixtures -- --keep                  output render tidak dihapus (untuk diperiksa)
//   npm run test:fixtures -- --evidence <folder>     tulis log per frame (TSV) dan ringkasan JSON ke folder itu
//   npm run test:fixtures -- --summary <file>        ringkasan JSON (dipakai npm test)
// Subset ringan untuk CI ada di fungsi smoke() (dipanggil npm run test:smoke).
//
// Output fixture ada di bawah output/frames/<fixture>/ yang di-ignore Git (keputusan K8). Folder yang dibuat runner
// dihapus lagi di akhir (kecuali --keep). Folder yang sudah ada sebelum runner jalan tidak dihapus.
// Sintaks waktu relatif adegan tetap hanya untuk fixture uji, belum untuk produksi atau baseline resmi (D6).
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { ROOT, readProject, buildProject, loadProject } = require('./projects.cjs');
const { openStudio } = require('./browser.cjs');
const { FFMPEG, run, encodeVideo } = require('./pipeline.cjs');
const { frameFile } = require('./config.cjs');
const { makeSandbox } = require('./sandbox.cjs');
const T = require('./timing.cjs');
const M = require('./manifest.cjs');
const C = require('./checks.cjs');
const B = require('./browser-checks.cjs');
const PC = require('./pose-checks.cjs');

const FIX = 'tests/fixtures/projects/uji-6a2b.json';
const GLO = 'tests/fixtures/projects/uji-6a2b-global.json';
const NODE = process.execPath;
const GROUPS = ['golden', 'validasi', 'isolasi', 'transisi', 'determinisme', 'ac13', 'a13', 'pose', 'm5', 'stale', 'kebersihan'];

// ---------- acuan hitungan tangan (dibaca dari file fixture dan tabel README, bukan dari keluaran kompiler) ----------
const TOTAL = 270;
const SIZE = { width: 1920, height: 1080 };
const RAW_BYTES = SIZE.width * SIZE.height * 3;
// segmen film: adegan a sendiri 0-80, transisi a->b 81-104, b sendiri 105-170, transisi b->c 171-188, c sendiri 189-269
const SEGMENTS = [[0, 80, 'a'], [81, 104, 'a->b'], [105, 170, 'b'], [171, 188, 'b->c'], [189, 269, 'c']];
const SCENES = { a: { stage: 'pasar', start: 0, end: 90 }, b: { stage: 'bukit', start: 90, end: 180 }, c: { stage: 'pasar', start: 180, end: 270 } };
// rentang frame tempat setiap adegan digambar (adegan itu sendiri + transisi masuk/keluar)
const DRAWN = { a: [0, 104], b: [81, 188], c: [171, 269] };
const TRANSITIONS = [{ id: 'a->b', from: 'a', to: 'b', first: 81, last: 104 }, { id: 'b->c', from: 'b', to: 'c', first: 171, last: 188 }];
// frame di luar transisi per adegan: a 0-80 (81), b 105-170 (66), c 189-269 (81) = 228
const OWN = { a: [0, 80], b: [105, 170], c: [189, 269] };
const PASAR = ['pasar-sky', 'pasar-hills', 'pasar-skyline', 'pasar-ruko-1', 'pasar-ruko-2', 'pasar-ruko-3', 'pasar-ruko-4', 'pasar-ruko-5', 'pasar-ruko-6', 'pasar-street', 'pasar-lamp-1', 'pasar-lamp-2', 'pasar-bench'];
const BUKIT = ['bukit-sky', 'bukit-volcano', 'bukit-hills', 'bukit-street', 'bukit-lamp-1', 'bukit-lamp-2', 'bukit-lamp-3'];
const SHOWN = { a: [...PASAR, 'sepeda-a', 'pengayuh-a'], b: [...BUKIT, 'lampu-b', 'sepeda-b'], c: [...PASAR, 'kios-c', 'lampu-c'] };
// lampu-c disembunyikan mulai c lokal 2 detik = frame 240 (visible bertangga)
const visibleAt = (scene, f) => SHOWN[scene].filter((id) => !(id === 'lampu-c' && f >= 240)).sort();
// 105 + 108 + 99 pasangan (frame, adegan yang digambar); 105 x 15 + 108 x 9 + 69 x 15 + 30 x 14 entitas tampak
const A13_PAIRS = 312;
const A13_ENTITIES = 4002;
// pengayuh-a (rig natural, status cycle) tampil selama adegan a digambar: frame 0-104
const RIDER = { id: 'pengayuh-a', first: 0, last: 104 };
// AC13: varian adegan a +1 detik (durationSeconds 10, duration a 4). Adegan b [120,210), c [210,300),
// transisi 111-134 dan 201-218. Frame lokal yang dibandingkan: b 15..80 (66), c 9..89 (81), transisi b->c 18 frame.
const SHIFT = { scenes: [['a', 0, 120], ['b', 120, 210], ['c', 210, 300]], transitions: [['a->b', 111, 134], ['b->c', 201, 218]] };
const AC13 = { b: [15, 80], c: [9, 89] };
// kontrol rig di adegan b: kedip rig memakai jam film, jadi frame lokal 42-44 berbeda (review T-10, audit delta 1.5)
const RIG_BLINK = [42, 43, 44];
// urutan acak ber-seed: mulberry32 dengan seed tetap, hash urutan dikunci (sama dengan review kesiapan AC2b-09)
const SHUFFLE_SEED = 20261031;
const SHUFFLE_HASH = '1786fcd7103ccc8e';
// batas komposisi dissolve: kemajuan q (bagian piksel yang sudah milik adegan tujuan) dibanding p = (f - awal) / (n - 1)
const DISSOLVE = { maxStep: 0.1, backTolerance: 0.01, maxLag: 0.05 };

// ---------- alat bantu umum ----------
class Fail extends Error {}
const ensure = (cond, message) => {
  if (!cond) throw new Fail(message);
};
const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const rel = (p) => path.relative(ROOT, p) || '.';
const clone = (v) => JSON.parse(JSON.stringify(v));
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const segmentOf = (f) => (SEGMENTS.find(([a, b]) => f >= a && f <= b) || [0, 0, '?'])[2];
const ranges = (list) => {
  const out = [];
  for (const f of [...list].sort((a, b) => a - b)) {
    const last = out[out.length - 1];
    if (last && last[1] === f - 1) last[1] = f;
    else out.push([f, f]);
  }
  return out.map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(', ') || '-';
};
const fmt = (n) => n.toLocaleString('id-ID');

// varian fixture yang dibuat di memori dari JSON fixture (bukan file baru)
function variant(ref, mutate) {
  const { file, raw, includes } = readProject(ref);
  const r = clone(raw);
  mutate(r);
  return buildProject(r, file, { strict: false, includes });
}

// mulberry32: pembangkit acak ber-seed di Node (bukan kode browser), sama dengan review kesiapan
const rng = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
function shuffle(n, seed) {
  const a = [...Array(n).keys()];
  const r = rng(seed);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- piksel ----------
// Hash piksel hasil decode: setiap frame_<n>.png di-decode FFmpeg ke RGB24, lalu SHA-256 per frame (framehash).
// -autoscale 0: frame yang ukurannya berbeda tidak diskalakan diam-diam, jadi ukurannya terbaca di kolom size.
function pixelHashes(dir, first, count) {
  const r = run(FFMPEG, ['-v', 'error', '-start_number', String(first), '-i', path.join(dir, 'frame_%04d.png'), '-frames:v', String(count),
    '-autoscale', '0', '-pix_fmt', 'rgb24', '-f', 'framehash', '-hash', 'sha256', '-']);
  if (r.status !== 0) throw new Fail(`FFmpeg gagal men-decode frame ${first}-${first + count - 1} di ${rel(dir)}: ${r.stderr.trim().slice(0, 300)}`);
  const dims = (r.stdout.match(/^#dimensions 0: (\d+)x(\d+)/m) || []).slice(1).map(Number);
  const rows = r.stdout.split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').map((x) => x.trim()));
  return { hashes: rows.map((x) => x[5]), sizes: rows.map((x) => Number(x[4])), width: dims[0], height: dims[1] };
}

// hash piksel frame tertentu (boleh tidak berurutan); setiap rentang berurutan cukup satu panggilan FFmpeg
function hashFrames(dir, frames) {
  const out = new Map();
  const sorted = [...new Set(frames)].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length;) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    const { hashes, sizes } = pixelHashes(dir, sorted[i], j - i + 1);
    ensure(hashes.length === j - i + 1, `${rel(dir)}: ${hashes.length} frame ter-decode dari ${j - i + 1} (frame ${sorted[i]}-${sorted[j]})`);
    sizes.forEach((s, k) => ensure(s === RAW_BYTES, `${rel(dir)} frame ${sorted[i] + k}: ${s} byte RGB24, seharusnya ${RAW_BYTES} (${SIZE.width}x${SIZE.height})`));
    hashes.forEach((h, k) => out.set(sorted[i] + k, h));
    i = j + 1;
  }
  return out;
}

function decodeRgb(file) {
  const r = spawnSync(FFMPEG, ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Fail(`FFmpeg gagal men-decode ${rel(file)}: ${String(r.stderr).trim().slice(0, 200)}`);
  ensure(r.stdout.length === RAW_BYTES, `${rel(file)}: ${r.stdout.length} byte RGB24, seharusnya ${RAW_BYTES}`);
  return r.stdout;
}

// selisih dua frame dalam piksel: jumlah piksel berbeda dan kotak pembatasnya (untuk pesan GAGAL yang jelas)
function pixelDiff(fileA, fileB) {
  const a = decodeRgb(fileA);
  const b = decodeRgb(fileB);
  let count = 0;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -1;
  let y1 = -1;
  for (let i = 0, p = 0; i < a.length; i += 3, p++) {
    if (a[i] === b[i] && a[i + 1] === b[i + 1] && a[i + 2] === b[i + 2]) continue;
    count++;
    const x = p % SIZE.width;
    const y = (p - x) / SIZE.width;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return count ? `${fmt(count)} piksel berbeda di kotak x ${x0}-${x1}, y ${y0}-${y1}` : '0 piksel berbeda';
}

// Memeriksa satu urutan frame film: tepat frame_0000..frame_<count-1> (tidak hilang, tidak berlebih), setiap PNG
// berukuran 1920x1080, ter-decode utuh (RGB24), dan setiap frame unik (tidak ada frame yang tergandakan; fixture
// sengaja bergerak di setiap frame). Mengembalikan masalah dan hash piksel per frame.
function inspectSequence(dir, { label, count = TOTAL }) {
  const problems = [];
  const names = fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => n.endsWith('.png')).sort() : [];
  const want = range(0, count - 1).map((i) => path.basename(frameFile(dir, i)));
  const missing = want.filter((n) => !names.includes(n));
  const extra = names.filter((n) => !want.includes(n));
  if (missing.length) problems.push(`${label}: ${missing.length} file frame hilang (${missing.slice(0, 4).join(', ')})`);
  if (extra.length) problems.push(`${label}: ${extra.length} file frame berlebih (${extra.slice(0, 4).join(', ')})`);
  for (const n of want.filter((x) => names.includes(x))) {
    const png = fs.readFileSync(path.join(dir, n));
    const w = png.readUInt32BE(16);
    const h = png.readUInt32BE(20);
    if (w !== SIZE.width || h !== SIZE.height) problems.push(`${label}: ${n} berukuran ${w}x${h}, seharusnya ${SIZE.width}x${SIZE.height}`);
  }
  if (problems.length) return { problems, hashes: [] };
  const { hashes, sizes } = pixelHashes(dir, 0, count);
  if (hashes.length !== count) problems.push(`${label}: ${hashes.length} frame ter-decode dari ${count}`);
  sizes.forEach((s, i) => {
    if (s !== RAW_BYTES) problems.push(`${label}: frame ${i} hasil decode ${s} byte, seharusnya ${RAW_BYTES}`);
  });
  const seen = new Map();
  hashes.forEach((h, i) => {
    if (seen.has(h)) problems.push(`${label}: frame ${i} tergandakan (piksel sama persis dengan frame ${seen.get(h)})`);
    else seen.set(h, i);
  });
  return { problems, hashes };
}

// Membandingkan satu urutan frame dengan urutan acuan, frame demi frame (setelah inspectSequence). Frame yang berbeda
// dilaporkan sebagai tertukar (pikselnya sama dengan frame acuan di posisi lain) atau dengan selisih pikselnya.
function compareSequence(actualDir, expected, { label, expectedDir = null, count = TOTAL }) {
  const { problems, hashes } = inspectSequence(actualDir, { label, count });
  if (!hashes.length) return { problems, hashes, differ: null };
  const position = new Map(expected.map((h, i) => [h, i]));
  const differ = [];
  hashes.forEach((h, i) => {
    if (h === expected[i]) return;
    differ.push(i);
    const j = position.get(h);
    const where = j !== undefined ? `tertukar: pikselnya sama dengan frame acuan ${j}` : expectedDir ? pixelDiff(frameFile(expectedDir, i), frameFile(actualDir, i)) : 'hash piksel berbeda';
    if (differ.length <= 6) problems.push(`${label}: frame ${i} (adegan ${segmentOf(i)}) berbeda dari acuan, ${where}`);
  });
  if (differ.length > 6) problems.push(`${label}: total ${differ.length} frame berbeda (${ranges(differ)})`);
  return { problems, hashes, differ };
}

// ---------- render ----------
async function withStudio(config, fn) {
  const studio = await openStudio(config);
  try {
    const out = await fn(studio);
    ensure(studio.errors.length === 0, `error JavaScript di browser: ${studio.errors[0]?.message}`);
    return out;
  } finally {
    await studio.close();
  }
}

// render frame tertentu (urutan sesuai daftar) ke folder dengan nama frame global
async function renderList(studio, frames, dir, sceneId = null) {
  fs.mkdirSync(dir, { recursive: true });
  for (const f of frames) fs.writeFileSync(frameFile(dir, f), (await studio.renderFrame(f, sceneId)).png);
}

// render film penuh lewat perintah proyek yang sama dengan proyek resmi (proses dan browser sendiri)
function renderCli(ref, root = ROOT, extra = []) {
  const t0 = Date.now();
  const r = spawnSync(NODE, [path.join(root, 'src', 'render', 'render.cjs'), '--project', ref, ...extra], { cwd: root, encoding: 'utf8' });
  return { status: r.status, out: `${r.stdout}${r.stderr}`, stderr: r.stderr, seconds: (Date.now() - t0) / 1000 };
}

// ---------- komposisi transisi ----------
// Untuk setiap frame di jendela transisi (plus satu frame sebelum dan sesudah), setiap piksel film dibandingkan dengan
// render adegan asal saja dan adegan tujuan saja pada frame yang sama:
//   asing   = piksel yang tidak sama dengan adegan asal maupun tujuan (kilatan, stage atau entitas salah, frame rusak)
//   q       = bagian piksel (yang berbeda antara asal dan tujuan) yang sudah milik adegan tujuan
// Dissolve sah bila asing = 0 di setiap frame, q = 0 dan film = asal di frame pertama, q = 1 dan film = tujuan di frame
// terakhir, q tidak mundur, tidak melompat (potongan kasar), dan mengikuti p = (f - awal) / (n - 1) dengan easing linear.
// Rumus campuran (pola dither) tidak ditiru: uji hanya membaca hasil piksel dan batas komposisi.
function compositionRows(filmDir, fromDir, toDir, frames) {
  return frames.map((f) => {
    const film = decodeRgb(frameFile(filmDir, f));
    const a = decodeRgb(frameFile(fromDir, f));
    const b = decodeRgb(frameFile(toDir, f));
    let fromOnly = 0;
    let toOnly = 0;
    let both = 0;
    let foreign = 0;
    for (let i = 0; i < film.length; i += 3) {
      const isA = film[i] === a[i] && film[i + 1] === a[i + 1] && film[i + 2] === a[i + 2];
      const isB = film[i] === b[i] && film[i + 1] === b[i + 1] && film[i + 2] === b[i + 2];
      if (isA && isB) both++;
      else if (isA) fromOnly++;
      else if (isB) toOnly++;
      else foreign++;
    }
    return { frame: f, fromOnly, toOnly, both, foreign, q: fromOnly + toOnly ? toOnly / (fromOnly + toOnly) : null };
  });
}

function compositionProblems(rows, { id, first, last }) {
  const problems = [];
  const at = (f) => rows.find((r) => r.frame === f);
  const n = last - first + 1;
  for (const r of rows) if (r.foreign) problems.push(`${id} frame ${r.frame}: ${fmt(r.foreign)} piksel bukan milik adegan asal maupun tujuan`);
  for (const [f, side] of [[first - 1, 'asal'], [first, 'asal'], [last, 'tujuan'], [last + 1, 'tujuan']]) {
    const r = at(f);
    if (!r) continue;
    const exact = side === 'asal' ? r.toOnly === 0 && r.foreign === 0 : r.fromOnly === 0 && r.foreign === 0;
    if (!exact) problems.push(`${id} frame ${f}: seharusnya sama persis dengan adegan ${side} (q ${r.q?.toFixed(4)})`);
  }
  const inside = rows.filter((r) => r.frame >= first && r.frame <= last);
  for (let i = 1; i < inside.length; i++) {
    const [a, b] = [inside[i - 1], inside[i]];
    // mundur dan melompat hanya berarti untuk frame yang bersebelahan (subset CI memakai frame sampel)
    if (a.q === null || b.q === null || b.frame !== a.frame + 1) continue;
    if (b.q < a.q - DISSOLVE.backTolerance) problems.push(`${id} frame ${b.frame}: kemajuan mundur (q ${a.q.toFixed(4)} -> ${b.q.toFixed(4)})`);
    if (b.q - a.q > DISSOLVE.maxStep) problems.push(`${id} frame ${b.frame}: kemajuan melompat ${(b.q - a.q).toFixed(4)} dalam 1 frame (potongan kasar, batas ${DISSOLVE.maxStep})`);
  }
  for (const r of inside) {
    const p = (r.frame - first) / (n - 1);
    if (r.q !== null && Math.abs(r.q - p) > DISSOLVE.maxLag) problems.push(`${id} frame ${r.frame}: q ${r.q.toFixed(4)} jauh dari p ${p.toFixed(4)} (batas ${DISSOLVE.maxLag})`);
  }
  return problems;
}

// ---------- A13 per frame di browser ----------
// Film kedua dibuat di halaman lewat import() dinamis (tanpa API baru di src/engine), lalu layoutAt setiap adegan
// yang digambar di setiap frame dibaca. Hasil: segmen, adegan yang digambar, dan id entitas tampak per frame.
async function layoutFrames(studio, config) {
  return studio.evaluate(async (c) => {
    const { createFilm } = await import('/src/engine/film.js');
    const film = await createFilm(c);
    const frames = [];
    for (let f = 0; f < c.totalFrames; f++) {
      const seg = film.segmentAt(f);
      const drawn = seg.kind === 'scene' ? [seg.id] : [seg.transition.from, seg.transition.to];
      frames.push({ frame: f, segment: seg.kind === 'scene' ? seg.id : seg.transition.id, scenes: Object.fromEntries(drawn.map((id) => [id, film.scenes[id].impl.layoutAt(f).map((x) => x.id)])) });
    }
    return { frames, stages: Object.fromEntries(Object.entries(film.scenes).map(([id, s]) => [id, s.entry.stage])) };
  }, config);
}

function a13Problems(layout) {
  const problems = [];
  let pairs = 0;
  let entities = 0;
  const duplicates = [];
  for (const { frame, segment, scenes } of layout.frames) {
    if (segment !== segmentOf(frame)) problems.push(`frame ${frame}: segmen "${segment}", seharusnya "${segmentOf(frame)}"`);
    const drawn = Object.keys(scenes).sort();
    const want = Object.entries(DRAWN).filter(([, [a, b]]) => frame >= a && frame <= b).map(([id]) => id).sort();
    if (drawn.join() !== want.join()) problems.push(`frame ${frame}: adegan yang digambar ${drawn.join(', ')}, seharusnya ${want.join(', ')}`);
    for (const [scene, ids] of Object.entries(scenes)) {
      pairs++;
      entities += ids.length;
      const count = {};
      for (const id of ids) count[id] = (count[id] || 0) + 1;
      for (const [id, n] of Object.entries(count)) if (n > 1) duplicates.push({ frame, scene, id, n });
      const visible = [...new Set(ids)].sort();
      const expect = SHOWN[scene] ? visibleAt(scene, frame) : [];
      if (visible.join() !== expect.join()) {
        const extra = visible.filter((x) => !expect.includes(x));
        const absent = expect.filter((x) => !visible.includes(x));
        problems.push(`frame ${frame} adegan ${scene}: entitas tampak salah${extra.length ? `, berlebih ${extra.join(', ')}` : ''}${absent.length ? `, hilang ${absent.join(', ')}` : ''}`);
      }
    }
  }
  for (const d of duplicates.slice(0, 6)) problems.push(`frame ${d.frame} adegan ${d.scene}: id "${d.id}" tampil ${d.n} kali (A13)`);
  if (duplicates.length > 6) problems.push(`total ${duplicates.length} pelanggaran id ganda di frame ${ranges(duplicates.map((d) => d.frame))}`);
  return { problems, pairs, entities, duplicates };
}

// ---------- pengumpul hasil ----------
function createRun(options) {
  const results = [];
  const evidence = options.evidence ? path.resolve(options.evidence) : null;
  if (evidence) fs.mkdirSync(evidence, { recursive: true });
  return {
    results,
    // simpan log per frame (hanya dengan --evidence)
    save(name, rows) {
      if (evidence) fs.writeFileSync(path.join(evidence, name), Array.isArray(rows) ? `${rows.join('\n')}\n` : `${JSON.stringify(rows, null, 2)}\n`);
    },
    async check(group, id, name, fn) {
      const t0 = Date.now();
      let entry;
      try {
        const out = await fn();
        const { status = 'LULUS', detail = '' } = typeof out === 'string' ? { detail: out } : out;
        entry = { group, id, name, status, detail };
      } catch (error) {
        entry = { group, id, name, status: 'GAGAL', detail: error instanceof Fail ? error.message : `${error.message}\n${error.stack}` };
      }
      entry.seconds = (Date.now() - t0) / 1000;
      results.push(entry);
      console.log(`${entry.status.padEnd(15)} [${group}] ${name}: ${entry.detail} (${entry.seconds.toFixed(1)} s)`);
      return entry.status !== 'GAGAL';
    }
  };
}

// ---------- kelompok uji ----------
async function goldenGroup(R, ctx) {
  const { F, G, work } = ctx;
  await R.check('golden', 'golden-render', 'Fixture dan kembaran dirender penuh di proses dan browser terpisah, manifest lengkap', () => {
    const lines = [];
    for (const [label, cfg, r] of [['fixture', F, ctx.renderF], ['kembaran', G, ctx.renderG]]) {
      ensure(r.status === 0, `render ${label} gagal (exit ${r.status}): ${r.out.trim().split('\n').slice(-3).join(' | ')}`);
      const m = M.readManifest(M.manifestFile(cfg));
      const mc = C.manifestChecks(cfg, m);
      ensure(mc.every((c) => c.pass), `manifest ${label}: ${mc.filter((c) => !c.pass).map((c) => c.detail).join('; ')}`);
      ensure(m.job.kind === 'film' && m.job.first === 0 && m.job.count === TOTAL, `manifest ${label}: job ${JSON.stringify(m.job)}`);
      ensure(m.segments.length === TOTAL && m.segments.every((s, i) => s.frame === i), `manifest ${label}: urutan frame di catatan render bukan 0..${TOTAL - 1}`);
      const wrongSeg = m.segments.filter((s) => s.segment !== segmentOf(s.frame));
      ensure(wrongSeg.length === 0, `manifest ${label}: segmen salah di frame ${ranges(wrongSeg.map((s) => s.frame))}`);
      ensure(m.jsErrors === 0, `manifest ${label}: ${m.jsErrors} error JavaScript`);
      lines.push(`${label} ${r.seconds.toFixed(1)} s, compiledHash ${m.compiledHash.slice(0, 16)}, Chromium ${m.chromiumVersion}`);
    }
    const [mf, mg] = [M.readManifest(M.manifestFile(F)), M.readManifest(M.manifestFile(G))];
    ensure(mf.compiledHash === mg.compiledHash, `compiledHash fixture ${mf.compiledHash} != kembaran ${mg.compiledHash}`);
    return lines.join('; ');
  });

  await R.check('golden', 'golden-pixels', 'AC14 lapis piksel: 270/270 frame fixture identik piksel dengan kembaran (RGB24 hasil decode)', () => {
    const twin = inspectSequence(G.paths.frames, { label: 'kembaran' });
    ensure(twin.problems.length === 0, twin.problems.join('; '));
    const twinHashes = twin.hashes;
    const fix = compareSequence(F.paths.frames, twinHashes, { label: 'fixture', expectedDir: G.paths.frames });
    ctx.hF = fix.hashes;
    ctx.hG = twinHashes;
    R.save('ac14-frames.tsv', ['frame\tsegmen\tpiksel_sha256_fixture\tpiksel_sha256_kembaran\tstatus', ...range(0, TOTAL - 1).map((i) => `${i}\t${segmentOf(i)}\t${fix.hashes[i] || '-'}\t${twinHashes[i]}\t${fix.hashes[i] === twinHashes[i] ? 'SAMA' : 'BEDA'}`)]);
    ensure(fix.problems.length === 0, fix.problems.join('; '));
    ctx.filmPixelHash = sha256(fix.hashes.join('\n'));
    return `270/270 identik, 270 frame unik, ${SIZE.width}x${SIZE.height}, urutan 0-269 lengkap. Hash piksel film (SHA-256 dari 270 hash RGB24) ${ctx.filmPixelHash}`;
  });

  await R.check('golden', 'golden-control-twin', 'Kontrol negatif: kembaran salah 1 frame (lampu-b menyala di 121, bukan 120) membuat golden gagal tepat di frame 120', async () => {
    ensure(ctx.hF?.length === TOTAL, 'hash piksel fixture belum ada (golden-pixels gagal)');
    const wrong = variant(GLO, (r) => {
      r.timeline.scenes[1].entities[0].color = [[90, 'off'], [121, 'on']];
    });
    ensure(wrong.timelineIssues.length === 0, `kembaran salah tidak valid: ${wrong.timelineIssues.join('; ')}`);
    const dir = path.join(work, 'kembaran-salah');
    await withStudio(wrong, (s) => renderList(s, range(0, TOTAL - 1), dir));
    const cmp = compareSequence(dir, ctx.hF, { label: 'kembaran salah', expectedDir: F.paths.frames });
    R.save('ac14-kontrol-kembaran-salah.tsv', ['frame\tpiksel_sha256_fixture\tpiksel_sha256_kembaran_salah\tstatus', ...range(0, TOTAL - 1).map((i) => `${i}\t${ctx.hF[i]}\t${cmp.hashes[i]}\t${ctx.hF[i] === cmp.hashes[i] ? 'SAMA' : 'BEDA'}`)]);
    ensure(JSON.stringify(cmp.differ) === '[120]', `seharusnya tepat frame 120 yang berbeda, ternyata ${ranges(cmp.differ || [])} (${cmp.problems.join('; ')})`);
    return `terdeteksi: ${cmp.problems[0]}`;
  });

  await R.check('golden', 'golden-control-sequence', 'Kontrol negatif pembanding: frame ditukar, digandakan, hilang, dan salah ukuran terdeteksi', () => {
    ensure(ctx.hG?.length === TOTAL, 'hash piksel kembaran belum ada');
    const dir = path.join(work, 'urutan-rusak');
    const fresh = () => {
      fs.rmSync(dir, { recursive: true, force: true });
      fs.cpSync(G.paths.frames, dir, { recursive: true });
    };
    const cases = [
      ['ditukar 10 dan 11', () => {
        const [a, b] = [frameFile(dir, 10), frameFile(dir, 11)];
        const t = `${a}.tmp`;
        fs.renameSync(a, t);
        fs.renameSync(b, a);
        fs.renameSync(t, b);
      }, /frame 10 .*tertukar: pikselnya sama dengan frame acuan 11/],
      ['frame 136 diganti salinan frame 135', () => fs.copyFileSync(frameFile(dir, 135), frameFile(dir, 136)), /frame 136 tergandakan \(piksel sama persis dengan frame 135\)/],
      ['frame 269 hilang', () => fs.rmSync(frameFile(dir, 269)), /1 file frame hilang \(frame_0269\.png\)/],
      ['frame 270 berlebih', () => fs.copyFileSync(frameFile(dir, 0), frameFile(dir, 270)), /1 file frame berlebih \(frame_0270\.png\)/],
      ['frame 50 diperkecil 960x540', () => {
        const r = run(FFMPEG, ['-v', 'error', '-y', '-i', frameFile(dir, 50), '-vf', 'scale=960:540:flags=neighbor', `${frameFile(dir, 50)}.png`]);
        ensure(r.status === 0, `FFmpeg gagal: ${r.stderr}`);
        fs.renameSync(`${frameFile(dir, 50)}.png`, frameFile(dir, 50));
      }, /frame_0050\.png berukuran 960x540/]
    ];
    const lines = [];
    try {
      for (const [name, damage, expect] of cases) {
        fresh();
        damage();
        const cmp = compareSequence(dir, ctx.hG, { label: 'salinan' });
        ensure(cmp.problems.some((p) => expect.test(p)), `"${name}" tidak terdeteksi dengan alasan yang benar: ${cmp.problems.join('; ') || 'tanpa masalah'}`);
        lines.push(`${name}: ${cmp.problems.find((p) => expect.test(p)).replace('salinan: ', '')}`);
      }
      fresh();
      const clean = compareSequence(dir, ctx.hG, { label: 'salinan' });
      ensure(clean.problems.length === 0, `salinan utuh seharusnya lolos: ${clean.problems.join('; ')}`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    return `5/5 terdeteksi, salinan utuh lolos. ${lines.join(' | ')}`;
  });
}

async function validationGroup(R, ctx) {
  const { F } = ctx;
  await R.check('validasi', 'validate-fixture', 'Validasi penuh fixture (validate.cjs apa adanya): transisi, luma, determinisme urutan terbalik, pose', () => {
    const t0 = Date.now();
    const r = spawnSync(NODE, [path.join(__dirname, 'validate.cjs'), '--project', FIX], { cwd: ROOT, encoding: 'utf8' });
    const file = path.join(F.paths.reports, `${F.name}-validation.json`);
    ensure(fs.existsSync(file), `laporan validasi tidak ada (exit ${r.status}): ${r.stderr.slice(0, 300)}`);
    const v = JSON.parse(fs.readFileSync(file, 'utf8'));
    R.save('validasi-uji-6a2b.json', v);
    const byId = Object.fromEntries(v.checks.map((c) => [c.id, c]));
    const failed = v.checks.filter((c) => c.status !== 'pass');
    ensure(r.status === 0 && failed.length === 0, `${failed.length} pemeriksaan tidak LULUS: ${failed.map((c) => `${c.id} ${c.status} (${c.detail})`).join('; ')}`);
    ensure(v.known === 0 && v.skipped === 0, `KNOWN ISSUE ${v.known}, TIDAK DIPERIKSA ${v.skipped}`);
    const required = ['timeline', 'timeline-transitions', 'manifest:status', 'manifest:fresh', 'frame-count', 'duration', 'resolution', 'fps', 'png-frames',
      'decoded-frames', 'blank', 'end-frame', 'motion', 'no-flash', 'no-hard-cut', 'boundary:a->b', 'boundary:b->c', 'scene:a', 'scene:b', 'scene:c',
      'grid-stability', 'js-errors', 'determinism', 'reencode', 'engine-modules', 'engine-isolation', 'motion-joints', 'motion-limbs', 'motion-contact', 'motion-seat', 'motion-stable'];
    const absent = required.filter((id) => !byId[id]);
    ensure(absent.length === 0, `pemeriksaan tidak ada di laporan: ${absent.join(', ')}`);
    ensure(/^270\/270 frame identik/.test(byId.determinism.detail), `determinisme: ${byId.determinism.detail}`);
    ensure(/270 frame unik, 0 pasang/.test(byId.motion.detail), `gerak per frame: ${byId.motion.detail}`);
    // motion-feet dan motion-bob LULUS tanpa subjek: dicatat terpisah (kelompok pose), bukan bukti
    const empty = ['motion-feet', 'motion-bob'].filter((id) => /tidak ada karakter bergerak natural yang berjalan/.test(byId[id]?.detail || ''));
    ctx.validation = v;
    return `${v.total} pemeriksaan tanpa GAGAL, KNOWN ISSUE, atau TIDAK DIPERIKSA (${(Date.now() - t0) / 1000 | 0} s). Dua di antaranya (${empty.join(', ')}) LULUS tanpa subjek (cakupan kosong, BACKLOG T26), jadi yang bermakna ${v.total - empty.length}. Determinisme: ${byId.determinism.detail}. Luma: ${byId['no-flash'].detail}`;
  });
}

async function isolationGroup(R, ctx) {
  const { F, work } = ctx;
  await R.check('isolasi', 'scene-isolation', 'AC12 isolasi: semua 228 frame di luar transisi = render adegan itu saja (browser baru)', async () => {
    ensure(ctx.hF?.length === TOTAL, 'hash piksel fixture belum ada (golden-pixels gagal)');
    const rows = ['adegan\tframe\tpiksel_sha256_film\tpiksel_sha256_adegan_saja\tstatus'];
    const differ = [];
    let total = 0;
    await withStudio(F, async (s) => {
      for (const [scene, [a, b]] of Object.entries(OWN)) {
        const dir = path.join(work, `isolasi-${scene}`);
        await renderList(s, range(a, b), dir, scene);
        const h = hashFrames(dir, range(a, b));
        for (const f of range(a, b)) {
          total++;
          const same = h.get(f) === ctx.hF[f];
          if (!same) differ.push(`${f} (adegan ${scene}, ${pixelDiff(frameFile(F.paths.frames, f), frameFile(dir, f))})`);
          rows.push(`${scene}\t${f}\t${ctx.hF[f]}\t${h.get(f)}\t${same ? 'SAMA' : 'BEDA'}`);
        }
      }
    });
    R.save('ac12-isolasi.tsv', rows);
    ensure(total === 228, `${total} frame di luar transisi, seharusnya 228`);
    ensure(differ.length === 0, `${differ.length} frame berbeda dari render adegan saja: ${differ.slice(0, 4).join('; ')}`);
    return 'a 0-80 (81), b 105-170 (66), c 189-269 (81): 228/228 identik piksel';
  });
}

async function transitionGroup(R, ctx) {
  const { F, work } = ctx;
  await R.check('transisi', 'dissolve-composition', 'AC12 dan M5: setiap frame transisi adalah komposisi adegan asal dan tujuan, tanpa piksel asing, kilatan, atau potongan kasar', async () => {
    const tsv = ['transisi\tframe\tp\tq\tpiksel_asal\tpiksel_tujuan\tpiksel_sama_keduanya\tpiksel_asing'];
    const problems = [];
    const lines = [];
    await withStudio(F, async (s) => {
      for (const t of TRANSITIONS) {
        const frames = range(t.first - 1, t.last + 1);
        const fromDir = path.join(work, `transisi-${t.from}-asal`);
        const toDir = path.join(work, `transisi-${t.to}-tujuan`);
        await renderList(s, frames, fromDir, t.from);
        await renderList(s, frames, toDir, t.to);
        const rows = compositionRows(F.paths.frames, fromDir, toDir, frames);
        for (const r of rows) tsv.push(`${t.id}\t${r.frame}\t${((r.frame - t.first) / (t.last - t.first)).toFixed(4)}\t${r.q === null ? '-' : r.q.toFixed(4)}\t${r.fromOnly}\t${r.toOnly}\t${r.both}\t${r.foreign}`);
        problems.push(...compositionProblems(rows, t));
        const inside = rows.filter((r) => r.frame >= t.first && r.frame <= t.last);
        const steps = inside.slice(1).map((r, i) => r.q - inside[i].q);
        const lag = Math.max(...inside.map((r) => Math.abs(r.q - (r.frame - t.first) / (t.last - t.first))));
        lines.push(`${t.id} frame ${t.first}-${t.last}: ${inside.length} frame, piksel asing ${rows.reduce((n, r) => n + r.foreign, 0)}, q 0 -> 1, langkah terbesar ${Math.max(...steps).toFixed(4)}, selisih terbesar dari p ${lag.toFixed(4)}`);
        fs.rmSync(fromDir, { recursive: true, force: true });
        fs.rmSync(toDir, { recursive: true, force: true });
      }
    });
    R.save('ac12-transisi-komposisi.tsv', tsv);
    ensure(problems.length === 0, problems.slice(0, 8).join('; '));
    return lines.join('; ');
  });
}

async function determinismGroup(R, ctx) {
  const { F, work } = ctx;
  await R.check('determinisme', 'determinism-shuffled', 'AC12 determinisme: urutan acak ber-seed di browser baru identik piksel dengan render berurutan', async () => {
    ensure(ctx.hF?.length === TOTAL, 'hash piksel fixture belum ada (golden-pixels gagal)');
    const order = shuffle(TOTAL, SHUFFLE_SEED);
    ensure(JSON.stringify(order) === JSON.stringify(shuffle(TOTAL, SHUFFLE_SEED)), 'seed sama memberi urutan berbeda');
    const orderHash = sha256(order.join(',')).slice(0, 16);
    ensure(orderHash === SHUFFLE_HASH, `hash urutan ${orderHash}, seharusnya ${SHUFFLE_HASH} (pembangkit acak berubah)`);
    ensure([...order].sort((a, b) => a - b).every((f, i) => f === i), 'urutan bukan permutasi 0..269');
    const dir = path.join(work, 'acak');
    await withStudio(F, (s) => renderList(s, order, dir));
    const h = hashFrames(dir, range(0, TOTAL - 1));
    const differ = range(0, TOTAL - 1).filter((f) => h.get(f) !== ctx.hF[f]);
    R.save('ac12-determinisme-acak.tsv', ['urutan_ke\tframe\tpiksel_sha256_berurutan\tpiksel_sha256_acak\tstatus', ...order.map((f, k) => `${k}\t${f}\t${ctx.hF[f]}\t${h.get(f)}\t${h.get(f) === ctx.hF[f] ? 'SAMA' : 'BEDA'}`)]);
    ensure(differ.length === 0, `${differ.length} frame berbeda: ${differ.slice(0, 4).map((f) => `${f} (${pixelDiff(frameFile(F.paths.frames, f), frameFile(dir, f))})`).join('; ')}`);
    return `seed ${SHUFFLE_SEED}, urutan ${order.slice(0, 8).join(', ')}, ... (hash urutan ${orderHash}): 270/270 identik piksel. Seed proyek fixture tidak dipakai aset fixture (variasi aset dari seedOffset tetap)`;
  });
}

async function ac13Group(R, ctx) {
  const { F, work } = ctx;
  const shift = (r) => {
    r.durationSeconds = 10;
    r.timeline.scenes[0].duration = 4;
  };
  const filmCamera = (r) => {
    r.timeline.scenes[1].camera = { type: 'keys', x: { unit: 'frames', base: 'film', keys: [[84, 303], [185, 404]] }, y: { unit: 'frames', base: 'film', keys: [[90, 20]] } };
  };
  const rider = (r) => {
    r.timeline.scenes[1].entities.push({ id: 'pengayuh-b', asset: 'pengayuh', layer: 'road', anchor: 'bottom-center', parent: 'sepeda-b', position: [-3, -7], state: 'cycle', z: 1, params: { phaseOffset: 3 } });
  };
  // frame lokal adegan yang tidak berada di jendela transisi, dihitung dari timeline varian
  const ownLocal = (cfg, id) => {
    const s = cfg.timeline.scenes.find((x) => x.id === id);
    const inT = (f) => cfg.timeline.transitions.some((t) => f >= t.startFrame && f <= t.lastFrame);
    return { start: s.startFrame, list: [...Array(s.durationFrames).keys()].filter((k) => !inT(s.startFrame + k)) };
  };
  // bandingkan frame lokal k adegan `scene` di dua render (hash per frame film); offset = geser frame lokal kedua
  const compare = (name, scene, hashA, startA, hashB, startB, locals, offset = 0) => {
    const rows = ['adegan\tframe_lokal\tframe_film_A\tframe_film_B\tpiksel_sha256_A\tpiksel_sha256_B\tstatus'];
    const differ = [];
    for (const k of locals) {
      const [fa, fb] = [startA + k, startB + k + offset];
      const same = hashA.get(fa) !== undefined && hashA.get(fa) === hashB.get(fb);
      ensure(hashA.get(fa) && hashB.get(fb), `${name}: hash frame ${fa} atau ${fb} tidak ada`);
      if (!same) differ.push(k);
      rows.push(`${scene}\t${k}\t${fa}\t${fb}\t${hashA.get(fa)}\t${hashB.get(fb)}\t${same ? 'SAMA' : 'BEDA'}`);
    }
    R.save(`${name}.tsv`, rows);
    return differ;
  };
  const hF = () => new Map(ctx.hF.map((h, i) => [i, h]));
  const renderHashes = async (cfg, frames, name) => {
    const dir = path.join(work, name);
    await withStudio(cfg, (s) => renderList(s, frames, dir));
    const h = hashFrames(dir, frames);
    fs.rmSync(dir, { recursive: true, force: true });
    return h;
  };

  let geser = null;
  let hGeser = null;
  await R.check('ac13', 'ac13-invariance', 'AC13: adegan a diperpanjang 1 detik, frame lokal b 15-80 (66) dan c 9-89 (81) identik piksel', async () => {
    ensure(ctx.hF?.length === TOTAL, 'hash piksel fixture belum ada (golden-pixels gagal)');
    geser = variant(FIX, shift);
    ensure(geser.timelineIssues.length === 0, `varian geser tidak valid: ${geser.timelineIssues.join('; ')}`);
    const got = { scenes: geser.timeline.scenes.map((s) => [s.id, s.startFrame, s.endFrame]), transitions: geser.timeline.transitions.map((t) => [t.id, t.startFrame, t.lastFrame]) };
    ensure(JSON.stringify(got) === JSON.stringify(SHIFT), `timeline varian geser ${JSON.stringify(got)}, seharusnya ${JSON.stringify(SHIFT)}`);
    for (const [scene, [a, b]] of Object.entries(AC13)) {
      const [x, y] = [ownLocal(F, scene), ownLocal(geser, scene)];
      ensure(JSON.stringify(x.list) === JSON.stringify(range(a, b)), `daftar lokal ${scene} fixture ${x.list[0]}..${x.list[x.list.length - 1]} (${x.list.length}), seharusnya ${a}..${b}`);
      ensure(JSON.stringify(y.list) === JSON.stringify(range(a, b)), `daftar lokal ${scene} varian geser berbeda dari fixture`);
    }
    hGeser = await renderHashes(geser, range(135, 299), 'ac13-geser');
    const db = compare('ac13-b', 'b', hF(), 90, hGeser, 120, range(...AC13.b));
    const dc = compare('ac13-c', 'c', hF(), 180, hGeser, 210, range(...AC13.c));
    const dt = compare('ac13-transisi-b-c', 'b->c', hF(), 171, hGeser, 201, range(0, 17));
    ensure(db.length === 0 && dc.length === 0 && dt.length === 0, `berbeda: b lokal ${ranges(db)}, c lokal ${ranges(dc)}, transisi b->c ke-${ranges(dt)}`);
    return 'b 0/66 berbeda (film 105-170 vs 135-200), c 0/81 (189-269 vs 219-299), transisi b->c 0/18 (171-188 vs 201-218)';
  });

  await R.check('ac13', 'ac13-control-alignment', 'AC13 kontrol penyelarasan: frame lokal k dibanding k+1 berbeda di setiap pasangan (uji tidak lulus karena salah selaras)', () => {
    ensure(hGeser, 'render varian geser belum ada (ac13-invariance gagal)');
    const db = compare('ac13-kontrol-geser-1-b', 'b', hF(), 90, hGeser, 120, range(AC13.b[0], AC13.b[1] - 1), 1);
    const dc = compare('ac13-kontrol-geser-1-c', 'c', hF(), 180, hGeser, 210, range(AC13.c[0], AC13.c[1] - 1), 1);
    ensure(db.length === 65 && dc.length === 80, `salah selaras 1 frame hanya beda di b ${db.length}/65, c ${dc.length}/80`);
    return 'b 65/65 dan c 80/80 pasangan berbeda bila frame lokal digeser 1';
  });

  await R.check('ac13', 'ac13-control-camera', 'AC13 kontrol kamera: kamera b berbasis frame film berbeda di 66/66 frame lokal, adegan c tidak ikut berubah', async () => {
    const control = variant(FIX, filmCamera);
    const controlShift = variant(FIX, (r) => {
      filmCamera(r);
      shift(r);
    });
    ensure(control.timelineIssues.length === 0 && controlShift.timelineIssues.length === 0, `varian kontrol tidak valid: ${[...control.timelineIssues, ...controlShift.timelineIssues].join('; ')}`);
    const hc = await renderHashes(control, [...range(105, 170), ...range(189, 269)], 'ac13-kontrol-kamera');
    const hcs = await renderHashes(controlShift, range(135, 200), 'ac13-kontrol-kamera-geser');
    const db = compare('ac13-kontrol-kamera-film-b', 'b', hc, 90, hcs, 120, range(...AC13.b));
    ensure(db.length === 66, `kamera berbasis film hanya terdeteksi di ${db.length}/66 frame lokal b`);
    // kebocoran: kamera b diubah, c (frame 189-269) harus tetap sama dengan fixture
    const leak = range(189, 269).filter((f) => hc.get(f) !== ctx.hF[f]);
    ensure(leak.length === 0, `perubahan kamera b bocor ke adegan c di frame ${ranges(leak)}`);
    return 'b 66/66 berbeda (uji sensitif terhadap track berbasis film); adegan c 0/81 berubah (perubahan b tidak bocor)';
  });

  await R.check('ac13', 'ac13-control-rig', 'AC13 kontrol rig: pengayuh di adegan b berbeda tepat di frame lokal 42-44 (kedip berjam film), adegan a tidak ikut berubah', async () => {
    const rig = variant(FIX, rider);
    const rigShift = variant(FIX, (r) => {
      rider(r);
      shift(r);
    });
    ensure(rig.timelineIssues.length === 0 && rigShift.timelineIssues.length === 0, `varian rig tidak valid: ${[...rig.timelineIssues, ...rigShift.timelineIssues].join('; ')}`);
    const hr = await renderHashes(rig, [...range(0, 80), ...range(105, 170)], 'ac13-kontrol-rig');
    const hrs = await renderHashes(rigShift, range(135, 200), 'ac13-kontrol-rig-geser');
    const db = compare('ac13-kontrol-rig-b', 'b', hr, 90, hrs, 120, range(...AC13.b));
    ensure(JSON.stringify(db) === JSON.stringify(RIG_BLINK), `rig di b berbeda di frame lokal ${ranges(db)}, seharusnya ${RIG_BLINK.join(', ')}`);
    const leak = range(0, 80).filter((f) => hr.get(f) !== ctx.hF[f]);
    ensure(leak.length === 0, `pengayuh tambahan di adegan b bocor ke adegan a di frame ${ranges(leak)}`);
    return `b berbeda tepat di frame lokal ${RIG_BLINK.join(', ')} (unsur berjam film, G2 milik 6A-3); adegan a 0/81 berubah`;
  });
}

async function a13Group(R, ctx) {
  const { F } = ctx;
  await R.check('a13', 'a13-layout', 'A13 per frame di browser (layoutAt lewat import() dinamis): id sekali per adegan, entitas tampak sesuai stage dan adegan', async () => {
    const layout = await withStudio(F, (s) => layoutFrames(s, F));
    ensure(JSON.stringify(layout.stages) === JSON.stringify({ a: 'pasar', b: 'bukit', c: 'pasar' }), `stage per adegan ${JSON.stringify(layout.stages)}`);
    const res = a13Problems(layout);
    R.save('a13-layout.tsv', ['frame\tsegmen\tadegan\tjumlah_entitas\tid', ...layout.frames.flatMap((x) => Object.entries(x.scenes).map(([scene, ids]) => `${x.frame}\t${x.segment}\t${scene}\t${ids.length}\t${ids.join(',')}`))]);
    ensure(res.problems.length === 0, res.problems.slice(0, 8).join('; '));
    ensure(res.pairs === A13_PAIRS && res.entities === A13_ENTITIES, `${res.pairs} pasangan dan ${res.entities} entitas, seharusnya ${A13_PAIRS} dan ${A13_ENTITIES}`);
    return `270 frame, ${res.pairs} pasangan (frame, adegan), ${fmt(res.entities)} entitas tampak, 0 id ganda, stage a pasar, b bukit, c pasar, segmen dan entitas sesuai daftar tulisan tangan`;
  });

  await R.check('a13', 'a13-control-duplicate', 'Kontrol A13: id ganda di scene.cast adegan c ditolak validator Node dan terhitung di setiap frame c digambar (171-269)', async () => {
    const dup = variant(FIX, (r) => {
      r.cast = { 'bangku-x': { asset: 'bench', layer: 'sidewalk', position: [300, 208], anchor: 'bottom-center' } };
      r.timeline.scenes[2].cast = ['bangku-x', 'bangku-x'];
    });
    ensure(dup.timelineIssues.length === 1 && /bangku-x" tampil 2 kali.*\(A13\)/.test(dup.timelineIssues[0]), `validator Node: ${dup.timelineIssues.join('; ') || 'tidak ada masalah'}`);
    const layout = await withStudio(dup, (s) => layoutFrames(s, dup));
    const res = a13Problems(layout);
    const frames = [...new Set(res.duplicates.map((d) => d.frame))];
    ensure(res.duplicates.every((d) => d.scene === 'c' && d.id === 'bangku-x' && d.n === 2), `pelanggaran di luar dugaan: ${JSON.stringify(res.duplicates.slice(0, 3))}`);
    ensure(JSON.stringify(frames) === JSON.stringify(range(171, 269)), `id ganda terhitung di frame ${ranges(frames)}, seharusnya 171-269`);
    return `Node: "${dup.timelineIssues[0]}"; browser: ${res.duplicates.length} pelanggaran di frame 171-269`;
  });
}

async function poseGroup(R, ctx) {
  const { F } = ctx;
  let probes = null;
  await R.check('pose', 'pose-checks', 'AC16: lima pemeriksaan pose memeriksa pengayuh-a di setiap frame ia tampil (0-104)', async () => {
    probes = await withStudio(F, (s) => s.inspect('poseProbes', 0, F.totalFrames));
    ensure(probes.length === TOTAL, `${probes.length} frame data pose`);
    const subjectFrames = probes.map((p, f) => (p[RIDER.id]?.pose?.mode === 'natural' && p[RIDER.id].pose.strict && p[RIDER.id].place.scale === 1 ? f : null)).filter((f) => f !== null);
    ensure(JSON.stringify(subjectFrames) === JSON.stringify(range(RIDER.first, RIDER.last)), `pengayuh-a punya data pose di frame ${ranges(subjectFrames)}, seharusnya ${RIDER.first}-${RIDER.last}`);
    const others = probes.flatMap((p, f) => Object.keys(p).filter((id) => id !== RIDER.id && p[id].pose).map((id) => `${id}@${f}`));
    ensure(others.length === 0, `karakter lain berdata pose: ${others.slice(0, 4).join(', ')}`);
    const checks = PC.poseChecks(probes, { project: F.id });
    const ids = checks.map((c) => `${c.id}:${C.statusOf(c)}`);
    ensure(checks.length === 5 && checks.every((c) => C.statusOf(c) === 'pass'), `hasil pose: ${checks.map((c) => `${c.id} ${C.statusOf(c)} (${c.detail})`).join('; ')}`);
    R.save('ac16-pose.json', checks);
    return `${subjectFrames.length} pose pengayuh-a (status cycle) diperiksa, ${ids.join(', ')}`;
  });

  await R.check('pose', 'pose-control', 'Kontrol AC16: data pose yang dirusak (tangan pengayuh digeser 6 px dari setang di frame 50) membuat motion-contact GAGAL', () => {
    ensure(probes, 'data pose belum ada (pose-checks gagal)');
    const broken = clone(probes);
    const items = broken[50][RIDER.id].pose.items.filter((i) => i.kind === 'touch' && i.name === 'hand-grip');
    ensure(items.length === 2, `frame 50: ${items.length} sentuhan tangan-setang`);
    for (const i of items) i.a.y -= 6;
    const contact = PC.poseChecks(broken, { project: F.id }).find((c) => c.id === 'motion-contact');
    ensure(C.statusOf(contact) === 'fail' && /50/.test(contact.detail), `motion-contact ${C.statusOf(contact)}: ${contact.detail}`);
    return `terdeteksi: ${contact.detail.slice(0, 160)}`;
  });

  await R.check('pose', 'motion-walk', 'motion-feet dan motion-bob: cakupan kosong di fixture (tidak ada karakter berjalan natural, BACKLOG T26)', async () => {
    const res = await withStudio(F, (s) => B.motionChecks(s, F));
    const vacuous = res.filter((c) => c.pass && /tidak ada karakter bergerak natural yang berjalan/.test(c.detail));
    ensure(res.length === 2 && vacuous.length === 2, `motion-feet/motion-bob tidak kosong seperti yang diharapkan: ${res.map((c) => `${c.id} ${c.pass} (${c.detail})`).join('; ')}`);
    return { status: 'TIDAK DIPERIKSA', detail: 'validator memberi LULUS tanpa subjek pada keduanya. Ini bukan bukti gerak jalan tervalidasi (K16, BACKLOG T26)' };
  });
}

async function m5Group(R, ctx) {
  const { F, work } = ctx;
  // kunci kamera dan sepeda dirapatkan ke 0..89 supaya satu-satunya masalah validasi varian adalah N24
  const fit = (r) => {
    r.timeline.scenes[0].camera.x = [[0, 0], [2.9, 87]];
    r.timeline.scenes[0].entities[0].motion.x = [[0, 100], [2.9, 332]];
    r.timeline.scenes[1].camera.x = [[0, 303], [95, 404]];
  };
  const first = 78;
  const count = 24;
  const lumaOf = (cfg, dir) => {
    const video = path.join(dir, 'potongan.mp4');
    const tmp = path.join(dir, 'urut');
    fs.mkdirSync(tmp, { recursive: true });
    range(first, first + count - 1).forEach((f, i) => fs.copyFileSync(frameFile(dir, f), frameFile(tmp, i)));
    encodeVideo(cfg, { framesDir: tmp, count, video, overrides: { preset: 'ultrafast' } });
    return C.transitionLumaChecks(C.lumaStats(video), cfg.timeline.transitions, first, cfg.validationLimits);
  };
  const cases = [
    ['cut', 'cut biasa a->b (pasar ke bukit)', (r) => {
      fit(r);
      r.timeline.scenes[0].transitionOut = { type: 'cut', duration: 0.2, lead: 0.1 };
    }],
    ['tanpa', 'tanpa transisi a->b', (r) => {
      fit(r);
      r.timeline.scenes[0].transitionOut = null;
    }]
  ];
  await R.check('m5', 'm5-control-dissolve', 'M5 kontrol: potongan frame 78-101 fixture asli (dissolve) lolos no-flash dan no-hard-cut', () => {
    const dir = path.join(work, 'm5-asli');
    fs.mkdirSync(dir, { recursive: true });
    for (const f of range(first, first + count - 1)) fs.copyFileSync(frameFile(F.paths.frames, f), frameFile(dir, f));
    const luma = lumaOf(F, dir);
    fs.rmSync(dir, { recursive: true, force: true });
    ensure(luma.every((c) => c.pass), luma.map((c) => `${c.id}: ${c.detail}`).join('; '));
    return luma.map((c) => `${c.id} LULUS (${c.detail})`).join('; ');
  });
  for (const [key, label, mutate] of cases) {
    await R.check('m5', `m5-${key}`, `M5: ${label} ditolak N24 dan terdeteksi di piksel dan luma`, async () => {
      const cfg = variant(FIX, mutate);
      ensure(cfg.timelineIssues.length === 1 && /N24/.test(cfg.timelineIssues[0]), `masalah validasi varian: ${cfg.timelineIssues.join('; ') || 'tidak ada (N24 tidak menolak)'}`);
      const dir = path.join(work, `m5-${key}`);
      const lines = [`Node: "${cfg.timelineIssues[0]}"`];
      await withStudio(cfg, async (s) => {
        await renderList(s, range(first, first + count - 1), dir);
        const t = cfg.timeline.transitions.find((x) => x.from === 'a');
        if (t) {
          const frames = range(t.startFrame - 1, t.lastFrame + 1);
          await renderList(s, frames, path.join(dir, 'asal'), 'a');
          await renderList(s, frames, path.join(dir, 'tujuan'), 'b');
          const problems = compositionProblems(compositionRows(dir, path.join(dir, 'asal'), path.join(dir, 'tujuan'), frames), { id: t.id, first: t.startFrame, last: t.lastFrame });
          ensure(problems.some((p) => /frame 90: kemajuan melompat 1\.0000/.test(p)), `komposisi piksel tidak mendeteksi potongan di frame 90: ${problems.join('; ') || 'tanpa masalah'}`);
          lines.push(`piksel: ${problems.find((p) => /frame 90: kemajuan melompat/.test(p))}`);
        } else {
          // tanpa jendela transisi: frame 88-89 harus seluruhnya adegan a dan 90-91 seluruhnya adegan b, jadi 100% piksel
          // berganti stage dalam satu frame (potongan kasar yang terbaca di piksel)
          const frames = [88, 89, 90, 91];
          await renderList(s, frames, path.join(dir, 'asal'), 'a');
          await renderList(s, frames, path.join(dir, 'tujuan'), 'b');
          const rows = compositionRows(dir, path.join(dir, 'asal'), path.join(dir, 'tujuan'), frames);
          ensure(JSON.stringify(rows.map((r) => r.q)) === '[0,0,1,1]' && rows.every((r) => !r.foreign && !r.both), `piksel frame 88-91: q ${rows.map((r) => r.q).join(', ')}`);
          lines.push(`piksel: frame 89 seluruhnya adegan a, frame 90 seluruhnya adegan b (${fmt(rows[2].toOnly)} piksel berganti stage dalam 1 frame, potongan kasar)`);
        }
      });
      const luma = lumaOf(cfg, dir);
      fs.rmSync(dir, { recursive: true, force: true });
      const flash = luma.find((c) => c.id === 'no-flash');
      const cut = luma.find((c) => c.id === 'no-hard-cut');
      ensure(!flash.pass && /frame 90 /.test(flash.detail) && !cut.pass && /frame 90 /.test(cut.detail), `luma: ${luma.map((c) => `${c.id} ${c.pass ? 'LULUS' : 'GAGAL'} (${c.detail})`).join('; ')}`);
      lines.push(`luma: no-flash GAGAL (${flash.detail}), no-hard-cut GAGAL (${cut.detail})`);
      return lines.join('; ');
    });
  }
}

// NT-STALE-2B dan M2 lapis piksel: semuanya di salinan sekali pakai (src, config, tests; render langsung di dalam salinan)
async function staleGroup(R) {
  const box = makeSandbox('pixel-fixture-stale-');
  const source = path.join(box.dir, 'src', 'render', 'timing.cjs');
  const timeline = path.join(box.dir, 'src', 'render', 'timeline.cjs');
  const original = { timing: fs.readFileSync(source, 'utf8'), timeline: fs.readFileSync(timeline, 'utf8') };
  const MUT = {
    'XM-C1': ['frame = position.startFrame + local;', 'frame = position.startFrame + local + 1;'],
    'XM-D1': ['startFrame: scenes[i].endFrame - lead,', 'startFrame: scenes[i].endFrame - lead + 1,'],
    M2a: ['startFrame: scenes[i].endFrame - lead,', 'startFrame: scenes[i].endFrame - (duration - lead),'],
    M2b: ['startFrame: scenes[i].endFrame - lead,', 'startFrame: scenes[i].endFrame + lead,']
  };
  const mutate = (name) => {
    const [from, to] = MUT[name];
    ensure(original.timing.split(from).length === 2, `titik mutasi ${name} tidak ditemukan tepat sekali di timing.cjs`);
    fs.writeFileSync(source, original.timing.replace(from, to));
  };
  const restore = () => {
    fs.writeFileSync(source, original.timing);
    fs.writeFileSync(timeline, original.timeline);
  };
  // keadaan fixture di salinan, dibaca kode salinan di proses baru: kesegaran manifest, transisi, masalah validasi
  // (Kelas A = invariant transisi dilanggar posisi hasil kompilasi, Kelas B = key di luar rentang yang dibuang),
  // dan path runtimeView yang berbeda dari kembaran (A = posisi transisi atau nilai key yang bergeser, B = array terpotong)
  const STATE = `const [root, fix, glo] = process.argv.slice(1);
    const P = require(root + '/src/render/projects.cjs'); const C = require(root + '/src/render/checks.cjs');
    const M = require(root + '/src/render/manifest.cjs'); const T = require(root + '/src/render/timing.cjs');
    const diff = (a, b, at = '$', out = []) => {
      if (Array.isArray(a) && Array.isArray(b)) { if (a.length !== b.length) out.push({ path: at, kind: 'panjang' }); for (let i = 0; i < Math.min(a.length, b.length); i++) diff(a[i], b[i], at + '[' + i + ']', out); }
      else if (a && b && typeof a === 'object' && typeof b === 'object') { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { if (!(k in a) || !(k in b)) out.push({ path: at + '.' + k, kind: 'hilang' }); else diff(a[k], b[k], at + '.' + k, out); } }
      else if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ path: at, kind: 'nilai' });
      return out; };
    const out = {};
    for (const [key, ref] of [['fix', fix], ['glo', glo]]) {
      const c = P.loadProject(ref, { strict: false });
      const fresh = C.manifestChecks(c, M.readManifest(M.manifestFile(c))).find((x) => x.id === 'manifest:fresh');
      out[key] = { fresh: { pass: fresh.pass, detail: fresh.detail }, issues: c.timelineIssues, transitions: c.timeline.transitions.map((t) => [t.id, t.startFrame, t.lastFrame]), view: T.runtimeView(c) };
    }
    const paths = diff(out.fix.view, out.glo.view);
    const cut = new Set(paths.filter((d) => d.kind !== 'nilai').map((d) => d.path));
    out.paths = paths.map((d) => ({ ...d, kelas: d.path.startsWith('$.timeline.transitions') ? 'A' : d.kind !== 'nilai' || [...cut].some((p) => d.path.startsWith(p + '[')) ? 'B' : 'A' }));
    out.issues = out.fix.issues.map((m) => ({ kelas: /harus melewati batas adegan|rentang keluar dari kedua adegan|tumpang tindih/.test(m) ? 'A' : /di luar rentang tampil|di luar jendela transisi masuk/.test(m) ? 'B' : 'lain', pesan: m }));
    delete out.fix.view; delete out.glo.view;
    console.log(JSON.stringify(out));`;
  const state = () => {
    const r = spawnSync(NODE, ['-e', STATE, box.dir, FIX, GLO], { encoding: 'utf8' });
    if (r.status !== 0) throw new Fail(`pembacaan keadaan salinan gagal: ${r.stderr.slice(0, 300)}`);
    return JSON.parse(r.stdout);
  };
  const RENDER = `const [root, ref, dir] = process.argv.slice(1);
    const P = require(root + '/src/render/projects.cjs'); const { renderFrames } = require(root + '/src/render/pipeline.cjs');
    (async () => { const c = P.loadProject(ref, { strict: false }); await renderFrames(c, { first: 0, count: c.totalFrames, framesDir: dir, globalNames: true });
      console.log(JSON.stringify(c.timeline.transitions.map((t) => [t.startFrame, t.lastFrame]))); })().catch((e) => { console.error(e.message); process.exit(1); });`;
  const inBox = (p) => path.join(box.dir, path.relative(ROOT, p));
  const F = loadProject(FIX);
  const G = loadProject(GLO);
  const boxF = { manifest: inBox(M.manifestFile(F)), video: inBox(F.paths.video), frames: inBox(F.paths.frames) };
  const boxG = { frames: inBox(G.paths.frames) };
  const partials = () => (fs.existsSync(path.dirname(boxF.video)) ? fs.readdirSync(path.dirname(boxF.video)).filter((n) => n.endsWith('.partial')) : []);
  const exactlyCompiled = (fresh) => !fresh.pass && fresh.detail === 'berubah sejak render terakhir: hasil kompilasi';
  const classes = (s) => `masalah validasi A/B ${s.issues.filter((i) => i.kelas === 'A').length}/${s.issues.filter((i) => i.kelas === 'B').length}, path runtimeView A/B ${s.paths.filter((p) => p.kelas === 'A').length}/${s.paths.filter((p) => p.kelas === 'B').length}`;
  const log = {};
  try {
    const ok = await R.check('stale', 'stale-render', 'NT-STALE-2B: fixture dan kembaran dirender di browser di dalam salinan, manifest:fresh LULUS', () => {
      for (const ref of [FIX, GLO]) {
        const r = renderCli(ref, box.dir);
        ensure(r.status === 0, `render ${ref} di salinan gagal: ${r.out.trim().split('\n').slice(-3).join(' | ')}`);
      }
      const s = state();
      log.awal = s;
      ensure(s.fix.fresh.pass && s.glo.fresh.pass, `manifest:fresh fixture ${s.fix.fresh.detail}; kembaran ${s.glo.fresh.detail}`);
      ensure(s.paths.length === 0 && s.issues.length === 0, `salinan tanpa mutasi: ${classes(s)}`);
      return `fixture dan kembaran: ${s.fix.fresh.detail}`;
    });
    if (!ok) return;

    const expectations = {
      'XM-C1': { issues: [0, 1], transitions: [['a->b', 81, 104], ['b->c', 171, 188]] },
      'XM-D1': { issues: [0, 0], transitions: [['a->b', 82, 105], ['b->c', 172, 189]] },
      M2a: { issues: [0, 0], transitions: [['a->b', 75, 98], ['b->c', 171, 188]] },
      M2b: { issues: [2, 6], transitions: [['a->b', 99, 122], ['b->c', 189, 206]] }
    };
    for (const [name, want] of Object.entries(expectations)) {
      await R.check('stale', `stale-${name}`, `NT-STALE-2B: mutasi ${name} di kompiler salinan membuat manifest fixture kedaluwarsa karena hasil kompilasi, kembaran jalur lama tetap segar`, () => {
        try {
          mutate(name);
          const s = state();
          log[name] = s;
          ensure(exactlyCompiled(s.fix.fresh), `manifest:fresh fixture ${s.fix.fresh.pass ? 'LULUS' : 'GAGAL'} (${s.fix.fresh.detail}); seharusnya GAGAL hanya karena "hasil kompilasi"`);
          ensure(s.glo.fresh.pass, `kembaran (jalur lama) ikut kedaluwarsa: ${s.glo.fresh.detail}`);
          ensure(JSON.stringify(s.fix.transitions) === JSON.stringify(want.transitions), `transisi ${JSON.stringify(s.fix.transitions)}, seharusnya ${JSON.stringify(want.transitions)}`);
          const got = [s.issues.filter((i) => i.kelas === 'A').length, s.issues.filter((i) => i.kelas === 'B').length];
          ensure(JSON.stringify(got) === JSON.stringify(want.issues) && s.issues.every((i) => i.kelas !== 'lain'), `masalah validasi ${JSON.stringify(s.issues)}`);
          ensure(s.paths.some((p) => p.kelas === 'A'), `tidak ada path Kelas A, deteksi tidak boleh dihitung (${classes(s)})`);
          return `fixture: ${s.fix.fresh.detail}; kembaran: segar; transisi ${s.fix.transitions.map((t) => `${t[0]} ${t[1]}-${t[2]}`).join(', ')}; ${classes(s)} (deteksi dihitung dari Kelas A)`;
        } finally {
          restore();
        }
      });
    }

    await R.check('stale', 'stale-XM-K1', 'NT-STALE-2B kontrol: mutasi komentar (XM-K1) di timing.cjs dan timeline.cjs tidak membuat manifest kedaluwarsa', () => {
      try {
        fs.writeFileSync(source, `// komentar uji\n${original.timing}\n/* komentar */\n`);
        fs.writeFileSync(timeline, `// komentar uji\n${original.timeline}\n`);
        const s = state();
        ensure(s.fix.fresh.pass && s.glo.fresh.pass && s.paths.length === 0, `fixture ${s.fix.fresh.detail}; kembaran ${s.glo.fresh.detail}`);
        return 'fixture dan kembaran tetap segar, runtimeView identik';
      } finally {
        restore();
      }
    });

    // XM-D1 tidak menimbulkan masalah validasi, jadi --encode-only sampai ke praperiksa sidik jari (TK5).
    // XM-C1 menimbulkan satu masalah validasi (Kelas B), jadi --encode-only sudah berhenti di pemuatan proyek ketat.
    const encodeCases = [
      ['XM-D1', 'ditolak praperiksa TK5 (compiledHash)', (r) => /TK5: .*compiledHash/.test(r.stderr), (r) => (r.stderr.match(/TK5: [^\n]*/) || [''])[0]],
      ['XM-C1', 'ditolak saat memuat proyek (konfigurasi hasil kompilasi tidak valid)', (r) => /Konfigurasi proyek tidak valid/.test(r.stderr) && !/TK\d:/.test(r.stderr), (r) => `Konfigurasi proyek tidak valid: ${r.stderr.trim().split('\n').slice(-1)[0].replace(/^- /, '')}`]
    ];
    for (const [name, label, expected, quote] of encodeCases) {
      await R.check('stale', `stale-encode-only-${name}`, `NT-STALE-2B: --encode-only fixture setelah ${name} ${label}, MP4 dan manifest lama identik byte`, () => {
        const before = { manifest: fs.readFileSync(boxF.manifest), video: M.sha256(fs.readFileSync(boxF.video)) };
        try {
          mutate(name);
          const r = renderCli(FIX, box.dir, ['--encode-only']);
          const same = fs.readFileSync(boxF.manifest).equals(before.manifest);
          const videoSame = M.sha256(fs.readFileSync(boxF.video)) === before.video;
          ensure(r.status !== 0 && expected(r), `exit ${r.status}: ${r.stderr.trim().slice(0, 300)}`);
          ensure(same && videoSame && partials().length === 0, `manifest ${same ? 'identik' : 'BERUBAH'}, MP4 ${videoSame ? 'identik' : 'BERUBAH'}, file sementara ${partials().length}`);
          return `exit ${r.status}, ${quote(r)}; manifest dan MP4 identik byte, tanpa file sementara`;
        } finally {
          restore();
        }
      });
    }

    await R.check('stale', 'stale-encode-only-control', 'NT-STALE-2B kontrol: --encode-only fixture tanpa mutasi berhasil dan MP4-nya identik byte dengan render penuh', () => {
      const video = M.sha256(fs.readFileSync(boxF.video));
      const r = renderCli(FIX, box.dir, ['--encode-only']);
      ensure(r.status === 0, `exit ${r.status}: ${r.stderr.trim().slice(0, 200)}`);
      const m = M.readManifest(boxF.manifest);
      ensure(m.status === 'complete' && m.encodeOnly === true && m.videoSha256 === video, `manifest ${m.status}, encodeOnly ${m.encodeOnly}, MP4 ${m.videoSha256?.slice(0, 12)} vs ${video.slice(0, 12)}`);
      ensure(M.sha256(fs.readFileSync(boxF.video)) === video && partials().length === 0, 'MP4 berubah atau file sementara tertinggal');
      const s = state();
      ensure(s.fix.fresh.pass, `manifest:fresh setelah --encode-only: ${s.fix.fresh.detail}`);
      return `MP4 ${video.slice(0, 16)} identik, manifest complete (encodeOnly), tetap segar`;
    });

    const twinHashes = pixelHashes(boxG.frames, 0, TOTAL).hashes;
    const union = { M2a: [[75, 104], [171, 188]], 'XM-D1': [[81, 105], [171, 189]] };
    for (const name of ['M2a', 'XM-D1']) {
      await R.check('stale', `m2-pixels-${name}`, `M2 lapis piksel: ${name} (tanpa masalah validasi) membuat golden piksel berbeda hanya di jendela transisi`, () => {
        const dir = path.join(box.dir, 'output', 'frames', `mutasi-${name}`);
        try {
          mutate(name);
          const r = spawnSync(NODE, ['-e', RENDER, box.dir, FIX, dir], { encoding: 'utf8' });
          ensure(r.status === 0, `render ${name} gagal: ${r.stderr.slice(0, 200)}`);
          const h = pixelHashes(dir, 0, TOTAL).hashes;
          ensure(h.length === TOTAL, `${h.length} frame ter-decode`);
          const differ = range(0, TOTAL - 1).filter((f) => h[f] !== twinHashes[f]);
          const outside = differ.filter((f) => !union[name].some(([a, b]) => f >= a && f <= b));
          R.save(`m2-piksel-${name}.tsv`, ['frame\tpiksel_sha256_mutasi\tpiksel_sha256_kembaran\tstatus', ...range(0, TOTAL - 1).map((f) => `${f}\t${h[f]}\t${twinHashes[f]}\t${h[f] === twinHashes[f] ? 'SAMA' : 'BEDA'}`)]);
          ensure(differ.length > 0, `${name} tidak mengubah piksel apa pun (golden piksel tidak mendeteksi)`);
          ensure(outside.length === 0, `${name} mengubah frame di luar jendela transisi: ${ranges(outside)}`);
          return `${differ.length}/270 frame berbeda dari kembaran, semuanya di ${union[name].map(([a, b]) => `${a}-${b}`).join(' dan ')} (gabungan jendela asli dan mutasi): ${ranges(differ)}`;
        } finally {
          restore();
          fs.rmSync(dir, { recursive: true, force: true });
        }
      });
    }
    R.save('nt-stale-2b.json', log);
  } finally {
    box.cleanup();
  }
}

// ---------- Git dan folder output ----------
function gitStatus() {
  const r = spawnSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8' });
  return r.status === 0 ? r.stdout : null;
}
function ignored(p) {
  return spawnSync('git', ['check-ignore', '-q', rel(p)], { cwd: ROOT }).status === 0;
}
// folder yang dibuat runner (termasuk induknya yang belum ada), supaya bisa dihapus lagi tanpa menyentuh yang sudah ada
function mkdirTracked(dir, created) {
  const missing = [];
  for (let d = dir; !fs.existsSync(d); d = path.dirname(d)) missing.unshift(d);
  fs.mkdirSync(dir, { recursive: true });
  created.push(...missing);
}

async function main() {
  const argv = process.argv.slice(2);
  const opt = { only: null, keep: false, evidence: null, summary: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--only') opt.only = argv[++i].split(',');
    else if (argv[i] === '--keep') opt.keep = true;
    else if (argv[i] === '--evidence') opt.evidence = argv[++i];
    else if (argv[i] === '--summary') opt.summary = argv[++i];
    else throw new Error(`Argumen tidak dikenal: ${argv[i]}`);
  }
  const unknown = (opt.only || []).filter((g) => !GROUPS.includes(g));
  if (unknown.length) throw new Error(`Kelompok tidak dikenal: ${unknown.join(', ')}. Pilihan: ${GROUPS.join(', ')}`);
  const want = (g) => !opt.only || opt.only.includes(g);
  const R = createRun(opt);
  const started = Date.now();
  const gitBefore = gitStatus();
  const F = loadProject(FIX);
  const G = loadProject(GLO);
  const roots = [path.dirname(F.paths.frames), path.dirname(G.paths.frames)];
  const created = [];
  console.log(`Uji browser fixture ${F.id} vs kembaran ${G.id} (Tahap 6A-2b PR 2). Kelompok: ${GROUPS.filter(want).join(', ')}\n`);

  // penjaga K8: semua output fixture di bawah output/frames/ dan di-ignore Git
  const outputs = [F.paths.frames, F.paths.video, F.paths.reports, G.paths.frames, G.paths.video, G.paths.reports];
  for (const p of outputs) {
    if (!p.startsWith(path.join(ROOT, 'output', 'frames') + path.sep)) throw new Error(`output fixture ${rel(p)} di luar output/frames/ (K8)`);
    if (gitBefore !== null && !ignored(p)) throw new Error(`output fixture ${rel(p)} tidak di-ignore Git (K8)`);
  }
  const needsFilm = GROUPS.filter((g) => !['stale', 'kebersihan'].includes(g)).some(want);
  const ctx = { F, G };
  try {
    if (needsFilm) {
      for (const r of roots) mkdirTracked(r, created);
      ctx.work = fs.mkdtempSync(path.join(roots[0], 'runner-'));
      ctx.renderF = renderCli(FIX);
      ctx.renderG = renderCli(GLO);
      // golden-render dan golden-pixels selalu dijalankan: kelompok lain memakai hash piksel film fixture
      await goldenGroup(R, ctx);
      if (want('validasi')) await validationGroup(R, ctx);
      if (want('isolasi')) await isolationGroup(R, ctx);
      if (want('transisi')) await transitionGroup(R, ctx);
      if (want('determinisme')) await determinismGroup(R, ctx);
      if (want('ac13')) await ac13Group(R, ctx);
      if (want('a13')) await a13Group(R, ctx);
      if (want('pose')) await poseGroup(R, ctx);
      if (want('m5')) await m5Group(R, ctx);
    }
    if (want('stale')) await staleGroup(R);
  } finally {
    if (ctx.work) fs.rmSync(ctx.work, { recursive: true, force: true });
    if (!opt.keep) for (const d of [...created].reverse()) fs.rmSync(d, { recursive: true, force: true });
    else if (created.length) console.log(`\nOutput fixture disimpan (--keep): ${roots.map(rel).join(', ')}`);
  }

  if (want('kebersihan')) {
    await R.check('kebersihan', 'git-clean', 'AC2b-02: status Git sama sebelum dan sesudah runner, folder output yang dibuat runner sudah dihapus', () => {
      if (gitBefore === null) return { status: 'TIDAK DIPERIKSA', detail: 'bukan repository Git (misalnya salinan sekali pakai)' };
      const after = gitStatus();
      ensure(after === gitBefore, `status Git berubah:\nsebelum:\n${gitBefore || '(bersih)'}\nsesudah:\n${after || '(bersih)'}`);
      const left = opt.keep ? [] : created.filter((d) => fs.existsSync(d));
      ensure(left.length === 0, `folder tertinggal: ${left.map(rel).join(', ')}`);
      return `status Git identik (${gitBefore ? `${gitBefore.trim().split('\n').length} baris` : 'bersih'}), ${opt.keep ? 'output disimpan karena --keep' : `${created.length} folder yang dibuat runner sudah dihapus`}`;
    });
  }

  const count = (s) => R.results.filter((r) => r.status === s).length;
  const summary = { fixture: F.id, twin: G.id, seconds: (Date.now() - started) / 1000, passed: count('LULUS'), failed: count('GAGAL'), skipped: count('TIDAK DIPERIKSA'), total: R.results.length, filmPixelHash: ctx.filmPixelHash || null, results: R.results };
  R.save('ringkasan.json', summary);
  if (opt.summary) fs.writeFileSync(opt.summary, JSON.stringify(summary, null, 2));
  console.log(`\n${summary.failed ? 'ADA YANG GAGAL' : summary.skipped ? 'TIDAK ADA YANG GAGAL' : 'SEMUA LULUS'}: ${summary.passed} LULUS, ${summary.failed} GAGAL, ${summary.skipped} TIDAK DIPERIKSA, dari ${summary.total} pemeriksaan (${summary.seconds.toFixed(0)} detik)`);
  if (summary.failed) {
    console.log('\nYang GAGAL:');
    for (const r of R.results.filter((x) => x.status === 'GAGAL')) console.log(`- [${r.group}] ${r.name}: ${r.detail}`);
    process.exitCode = 1;
  }
}

// ---------- subset ringan untuk CI (npm run test:smoke, keputusan K9) ----------
// Sampel AC14 di frame biasa dan batas transisi, kontrol kembaran salah 1 frame, komposisi di awal/tengah/akhir
// transisi, isolasi sampel, sampel AC13 dengan kontrol kamera, A13 layoutAt seluruh frame, dan pose seluruh frame.
// NT-STALE-2B dan render 270 frame penuh hanya lokal (npm run test:fixtures). Mengembalikan daftar baris hasil.
async function smoke() {
  const F = loadProject(FIX);
  const G = loadProject(GLO);
  const created = [];
  const root = path.dirname(F.paths.frames);
  mkdirTracked(root, created);
  const work = fs.mkdtempSync(path.join(root, 'smoke-'));
  const lines = [];
  let failed = 0;
  const step = async (name, fn) => {
    try {
      lines.push(`LULUS  ${F.id} ${name}: ${await fn()}`);
    } catch (error) {
      failed++;
      lines.push(`GAGAL  ${F.id} ${name}: ${error instanceof Fail ? error.message : error.stack}`);
    }
    console.log(lines[lines.length - 1]);
  };
  const own = Object.values(OWN).flatMap(([a, b]) => [a, Math.floor((a + b) / 2), b]);
  // sampel jendela transisi: batas, seperempat, tengah, tiga perempat. Frame tengah dissolve linear simetris (dither yang
  // terbalik pun memberi q 0,5), jadi seperempat dan tiga perempat wajib ikut supaya arah campuran terbaca.
  const windowSample = (t) => {
    const n = t.last - t.first;
    return [...new Set([t.first - 1, t.first, t.first + Math.round(n / 4), Math.floor((t.first + t.last) / 2), t.first + Math.round((3 * n) / 4), t.last, t.last + 1])];
  };
  const edges = TRANSITIONS.flatMap(windowSample);
  const sample = [...new Set([...own, ...edges, 119, 120, 121, 239, 240])].sort((a, b) => a - b);
  try {
    await step('(fixture, subset CI) validasi Node', () => {
      ensure(F.timelineIssues.length === 0 && G.timelineIssues.length === 0, `masalah validasi: ${[...F.timelineIssues, ...G.timelineIssues].join('; ')}`);
      ensure(T.runtimeHash(F) === T.runtimeHash(G), 'runtimeView fixture berbeda dari kembaran');
      return `fixture dan kembaran valid, runtimeHash sama (${T.runtimeHash(F).slice(0, 16)})`;
    });
    const dirs = { film: path.join(work, 'film'), twin: path.join(work, 'kembaran'), wrong: path.join(work, 'salah'), shift: path.join(work, 'geser'), cam: path.join(work, 'kamera'), camShift: path.join(work, 'kamera-geser') };
    let layout = null;
    let probes = null;
    await withStudio(F, async (s) => {
      await renderList(s, sample, dirs.film);
      for (const [scene, [a, b]] of Object.entries(OWN)) await renderList(s, [a, Math.floor((a + b) / 2), b], path.join(work, `iso-${scene}`), scene);
      for (const t of TRANSITIONS) {
        const frames = windowSample(t);
        await renderList(s, frames, path.join(work, `asal-${t.id}`), t.from);
        await renderList(s, frames, path.join(work, `tujuan-${t.id}`), t.to);
      }
      layout = await layoutFrames(s, F);
      probes = await s.inspect('poseProbes', 0, F.totalFrames);
    });
    await withStudio(G, (s) => renderList(s, sample, dirs.twin));
    const hFilm = hashFrames(dirs.film, sample);
    const hTwin = hashFrames(dirs.twin, sample);
    await step('AC14 sampel', async () => {
      const differ = sample.filter((f) => hFilm.get(f) !== hTwin.get(f));
      ensure(differ.length === 0, `berbeda dari kembaran di frame ${differ.map((f) => `${f} (${pixelDiff(frameFile(dirs.film, f), frameFile(dirs.twin, f))})`).join('; ')}`);
      const wrong = variant(GLO, (r) => {
        r.timeline.scenes[1].entities[0].color = [[90, 'off'], [121, 'on']];
      });
      await withStudio(wrong, (s) => renderList(s, [119, 120, 121], dirs.wrong));
      const hw = hashFrames(dirs.wrong, [119, 120, 121]);
      const caught = [119, 120, 121].filter((f) => hw.get(f) !== hFilm.get(f));
      ensure(JSON.stringify(caught) === '[120]', `kontrol kembaran salah 1 frame: beda di ${ranges(caught)}, seharusnya 120`);
      return `${sample.length}/${sample.length} frame sampel identik piksel dengan kembaran (${sample.join(', ')}); kontrol kembaran salah terdeteksi tepat di frame 120`;
    });
    await step('AC12 isolasi dan komposisi transisi sampel', () => {
      const differ = [];
      for (const [scene, [a, b]] of Object.entries(OWN)) {
        const h = hashFrames(path.join(work, `iso-${scene}`), [a, Math.floor((a + b) / 2), b]);
        for (const [f, x] of h) if (x !== hFilm.get(f)) differ.push(f);
      }
      ensure(differ.length === 0, `film berbeda dari render adegan saja di frame ${differ.join(', ')}`);
      const problems = [];
      for (const t of TRANSITIONS) {
        const frames = windowSample(t);
        problems.push(...compositionProblems(compositionRows(dirs.film, path.join(work, `asal-${t.id}`), path.join(work, `tujuan-${t.id}`), frames), t));
      }
      ensure(problems.length === 0, problems.join('; '));
      return `isolasi 9/9 frame sampel; komposisi ${TRANSITIONS.map((t) => `${t.id} frame ${windowSample(t).join(', ')}`).join(' dan ')}: tanpa piksel asing, batas sama persis, kemajuan mengikuti p`;
    });
    await step('AC13 sampel', async () => {
      const locals = { b: [15, 47, 80], c: [9, 49, 89] };
      const shift = (r) => {
        r.durationSeconds = 10;
        r.timeline.scenes[0].duration = 4;
      };
      const filmCam = (r) => {
        r.timeline.scenes[1].camera = { type: 'keys', x: { unit: 'frames', base: 'film', keys: [[84, 303], [185, 404]] }, y: { unit: 'frames', base: 'film', keys: [[90, 20]] } };
      };
      const geser = variant(FIX, shift);
      const want = [...locals.b.map((k) => 120 + k), ...locals.c.map((k) => 210 + k)];
      await withStudio(geser, (s) => renderList(s, want, dirs.shift));
      const hs = hashFrames(dirs.shift, want);
      const differ = [...locals.b.map((k) => [90 + k, 120 + k]), ...locals.c.map((k) => [180 + k, 210 + k])].filter(([a, b]) => hFilm.get(a) !== hs.get(b));
      ensure(differ.length === 0, `frame lokal berbeda setelah adegan a diperpanjang: ${differ.map(([a, b]) => `${a} vs ${b}`).join(', ')}`);
      await withStudio(variant(FIX, filmCam), (s) => renderList(s, [137], dirs.cam));
      await withStudio(variant(FIX, (r) => {
        filmCam(r);
        shift(r);
      }), (s) => renderList(s, [167], dirs.camShift));
      ensure(hashFrames(dirs.cam, [137]).get(137) !== hashFrames(dirs.camShift, [167]).get(167), 'kontrol kamera berbasis film tidak terdeteksi');
      return `b lokal ${locals.b.join(', ')} dan c lokal ${locals.c.join(', ')} identik; kontrol kamera b berbasis film terdeteksi`;
    });
    await step('A13 layoutAt seluruh frame', () => {
      const res = a13Problems(layout);
      ensure(res.problems.length === 0, res.problems.slice(0, 6).join('; '));
      ensure(res.pairs === A13_PAIRS && res.entities === A13_ENTITIES, `${res.pairs} pasangan, ${res.entities} entitas`);
      return `270 frame, ${res.pairs} pasangan (frame, adegan), ${res.entities} entitas tampak, 0 id ganda`;
    });
    await step('AC16 pose seluruh frame', () => {
      const subjects = probes.filter((p) => p[RIDER.id]?.pose?.mode === 'natural').length;
      const checks = PC.poseChecks(probes, { project: F.id });
      ensure(subjects === RIDER.last - RIDER.first + 1, `${subjects} frame pose pengayuh-a, seharusnya ${RIDER.last - RIDER.first + 1}`);
      ensure(checks.length === 5 && checks.every((c) => C.statusOf(c) === 'pass'), checks.map((c) => `${c.id} ${C.statusOf(c)} (${c.detail})`).join('; '));
      return `${subjects} pose pengayuh-a, 5/5 pemeriksaan pose LULUS (motion-feet/motion-bob kosong di fixture, T26, tidak dihitung)`;
    });
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
    for (const d of [...created].reverse()) fs.rmSync(d, { recursive: true, force: true });
  }
  return { failed, lines };
}

module.exports = {
  smoke, inspectSequence, compareSequence, compositionRows, compositionProblems, a13Problems, pixelHashes, shuffle,
  EXPECT: { TOTAL, SEGMENTS, SCENES, DRAWN, TRANSITIONS, OWN, SHOWN, visibleAt, A13_PAIRS, A13_ENTITIES, SHUFFLE_SEED, SHUFFLE_HASH, DISSOLVE }
};

if (require.main === module) {
  main().catch((error) => {
    console.error(`\nUJI FIXTURE GAGAL: ${error.message}`);
    process.exit(1);
  });
}
