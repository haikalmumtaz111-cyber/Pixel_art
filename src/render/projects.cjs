// Project loader: menemukan, membaca, dan memeriksa proyek film.
// - Konfigurasi global mesin: config/engine.json (katalog aset, jenis transisi, default encoding, batas validasi)
// - Setiap proyek: satu file JSON di config/ yang punya "id". Bagian besar boleh dipisah ke file lain
//   dengan { "$include": "folder/file.json" } (jalur relatif terhadap file yang memanggilnya).
const fs = require('fs');
const path = require('path');
const { normalizeTimeline } = require('./timeline.cjs');
const S = require('./schema.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const ENGINE_FILE = path.join(ROOT, 'config', 'engine.json');

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`Gagal membaca ${path.relative(ROOT, file)}: ${error.message}`);
  }
}

// Ganti setiap { "$include": "..." } dengan isi file yang dirujuk (bisa bertingkat).
function resolveIncludes(value, baseDir, files, depth = 0) {
  if (depth > 20) throw new Error('$include terlalu dalam (mungkin saling merujuk).');
  if (Array.isArray(value)) return value.map((v) => resolveIncludes(v, baseDir, files, depth));
  if (value && typeof value === 'object') {
    if (typeof value.$include === 'string' && Object.keys(value).length === 1) {
      const file = path.resolve(baseDir, value.$include);
      if (!file.startsWith(ROOT + path.sep)) throw new Error(`$include keluar dari folder proyek: ${value.$include}`);
      if (!fs.existsSync(file)) throw new Error(`File $include tidak ditemukan: ${path.relative(ROOT, file)}`);
      files.push(path.relative(ROOT, file));
      return resolveIncludes(readJson(file), path.dirname(file), files, depth + 1);
    }
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveIncludes(v, baseDir, files, depth)]));
  }
  return value;
}

function loadEngine() {
  const engine = readJson(ENGINE_FILE);
  const types = {};
  for (const rel of engine.assetCatalogs) {
    const catalog = readJson(path.join(ROOT, rel));
    for (const [type, spec] of Object.entries(catalog.types)) {
      if (types[type]) throw new Error(`Jenis aset "${type}" terdaftar ganda di katalog.`);
      types[type] = spec;
    }
  }
  return { ...engine, catalog: { types } };
}

function projectsDir(engine) {
  return path.join(ROOT, engine.projectsDir || 'config');
}

// Daftar semua proyek yang tersedia.
function listProjects() {
  const engine = loadEngine();
  const dir = projectsDir(engine);
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.json') && path.join(dir, f) !== ENGINE_FILE)
    .map((f) => {
      const raw = readJson(path.join(dir, f));
      return { id: raw.id, title: raw.title || raw.name, file: path.join(dir, f), name: raw.name, durationSeconds: raw.durationSeconds, fps: raw.fps };
    })
    .filter((p) => p.id)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function describeProjects() {
  return listProjects().map((p) => `  - ${p.id.padEnd(20)} ${p.title} (${p.durationSeconds} detik, ${p.fps} FPS)`).join('\n');
}

// Terima id proyek atau jalur file JSON.
function resolveProjectFile(ref) {
  if (!ref) throw new Error(`Pilih proyek dengan --project <id>. Proyek yang tersedia:\n${describeProjects()}`);
  const asFile = path.resolve(ROOT, ref);
  if (ref.endsWith('.json') && fs.existsSync(asFile)) return asFile;
  const found = listProjects().find((p) => p.id === ref);
  if (!found) throw new Error(`Proyek "${ref}" tidak ditemukan. Proyek yang tersedia:\n${describeProjects()}`);
  return found.file;
}

function readProject(ref) {
  const file = resolveProjectFile(ref);
  const includes = [];
  const raw = resolveIncludes(readJson(file), path.dirname(file), includes);
  return { file, raw, includes };
}

// Palet boleh mewarisi palet lain: { "extends": "pagi", "sky": [...] } = semua warna "pagi",
// lalu warna yang ditulis di sini menimpanya. Hasilnya palet lengkap tanpa kunci "extends".
function resolvePalettes(palettes, issues) {
  const out = {};
  const resolve = (name, chain) => {
    if (out[name]) return out[name];
    const { extends: base, ...colors } = palettes[name] || {};
    if (base === undefined) return (out[name] = colors);
    if (!palettes[base]) issues.push(`Palet "${name}": extends ke palet "${base}" yang tidak ada`);
    else if (chain.includes(base)) issues.push(`Palet "${name}": extends berputar (${[...chain, base].join(' -> ')})`);
    else return (out[name] = { ...resolve(base, [...chain, base]), ...colors });
    return (out[name] = colors);
  };
  for (const name of Object.keys(palettes)) resolve(name, [name]);
  return out;
}

// Ubah isi JSON proyek menjadi konfigurasi lengkap. strict = tolak bila ada masalah.
function buildProject(raw, file, { strict = true, engine = loadEngine(), includes = [] } = {}) {
  const issues = [];
  if (raw.palettes && typeof raw.palettes === 'object') raw = { ...raw, palettes: resolvePalettes(raw.palettes, issues) };
  for (const key of ['id', 'name', 'seed', 'width', 'height', 'outputWidth', 'outputHeight', 'fps', 'durationSeconds']) {
    if (raw[key] === undefined) issues.push(`Proyek: "${key}" belum diisi`);
  }
  if (raw.id !== undefined && !S.isSlug(raw.id)) issues.push('Proyek: id hanya boleh huruf kecil, angka, dan tanda hubung');
  for (const key of ['seed', 'width', 'height', 'outputWidth', 'outputHeight', 'fps']) if (raw[key] !== undefined && !S.isInt(raw[key])) issues.push(`Proyek: "${key}" harus bilangan bulat`);
  if (raw.fps !== undefined && (raw.fps < 1 || raw.fps > 120)) issues.push('Proyek: fps harus 1..120');
  if (raw.durationSeconds !== undefined && !(S.isNum(raw.durationSeconds) && raw.durationSeconds > 0)) issues.push('Proyek: durationSeconds harus angka lebih dari 0');
  const totalFrames = raw.fps * raw.durationSeconds;
  if (issues.length === 0 && !Number.isInteger(totalFrames)) issues.push(`Proyek: ${raw.durationSeconds} detik x ${raw.fps} FPS tidak menghasilkan jumlah frame bulat`);
  const scale = raw.outputWidth / raw.width;
  if (issues.length === 0) {
    if (!Number.isInteger(scale) || raw.outputHeight / raw.height !== scale) issues.push('Proyek: resolusi output harus kelipatan bulat yang sama dari resolusi internal, supaya piksel tetap tajam');
    if (raw.width * 9 !== raw.height * 16) issues.push('Proyek: resolusi internal harus berformat 16:9');
    if (raw.aspectRatio !== undefined && raw.aspectRatio !== '16:9') issues.push('Proyek: aspectRatio yang didukung saat ini hanya "16:9"');
  }
  const rendering = { upscale: engine.rendering.upscale, ...(raw.rendering || {}) };
  if (!['ffmpeg', 'browser'].includes(rendering.upscale)) issues.push('Proyek: rendering.upscale harus "ffmpeg" atau "browser"');
  // mode zoom hanya berarti di upscale "browser"; proyek lama tanpa zoomMode memakai bawaan mesin ("anchored")
  if (rendering.upscale === 'browser' && rendering.zoomMode === undefined) rendering.zoomMode = engine.rendering.zoomMode;
  if (rendering.zoomMode !== undefined && !engine.rendering.zoomModes.includes(rendering.zoomMode)) {
    issues.push(`Proyek: rendering.zoomMode "${rendering.zoomMode}" tidak dikenal (pilihan: ${engine.rendering.zoomModes.join(', ')})`);
  }
  if (rendering.zoomLayers !== undefined && typeof rendering.zoomLayers !== 'boolean') issues.push('Proyek: rendering.zoomLayers harus true atau false');
  const encoding = { ...engine.rendering.encoding, ...(raw.encoding || {}) };
  if (strict && issues.length) throw new Error(`Konfigurasi proyek tidak valid:\n- ${issues.join('\n- ')}`);

  const ctx = { engine, catalog: engine.catalog.types, assets: raw.assets || {}, totalFrames, fps: raw.fps, root: ROOT, upscale: rendering.upscale };
  const { timeline, issues: timelineIssues } = issues.length ? { timeline: { scenes: [], transitions: [] }, issues: [] } : normalizeTimeline(raw, ctx);
  issues.push(...timelineIssues);
  if (strict && issues.length) throw new Error(`Konfigurasi proyek tidak valid:\n- ${issues.join('\n- ')}`);

  const name = raw.name;
  const output = {
    framesDir: `output/frames/${name}`,
    video: `output/video/${name}.mp4`,
    reportDir: 'output/reports',
    ...(raw.output || {})
  };
  return {
    ...raw,
    title: raw.title || raw.name,
    output,
    rendering,
    encoding,
    totalFrames,
    scale,
    // ukuran PNG per frame: mode "browser" langsung berukuran output, mode "ffmpeg" berukuran internal
    frameSize: rendering.upscale === 'browser' ? { width: raw.outputWidth, height: raw.outputHeight } : { width: raw.width, height: raw.height },
    timeline,
    timelineIssues: issues,
    // bagian global mesin yang dibutuhkan browser
    engine: { name: engine.name, engineVersion: engine.engineVersion, builtinScenes: engine.builtinScenes, catalog: engine.catalog },
    validationLimits: engine.validation,
    configFile: path.relative(ROOT, file),
    includes,
    paths: {
      root: ROOT,
      frames: path.resolve(ROOT, output.framesDir),
      video: path.resolve(ROOT, output.video),
      reports: path.resolve(ROOT, output.reportDir)
    }
  };
}

function loadProject(ref, options = {}) {
  const { file, raw, includes } = readProject(ref);
  return buildProject(raw, file, { ...options, includes });
}

module.exports = { ROOT, loadEngine, listProjects, describeProjects, resolveProjectFile, readProject, buildProject, loadProject, resolveIncludes };
