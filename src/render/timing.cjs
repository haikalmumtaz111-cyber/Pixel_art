// Kompiler waktu relatif adegan (Tahap 6A-1). Berjalan di Node sebelum timeline diperiksa (timeline.cjs),
// jadi browser tetap hanya menerima frame bulat global seperti sebelumnya.
//
// Sintaks baru (semuanya opsional, proyek lama tanpa sintaks ini tidak berubah sama sekali):
// - Adegan berbasis durasi: "duration" (detik) menggantikan "start"/"end". Posisi awal adegan = jumlah frame bulat
//   adegan sebelumnya (bukan jumlah detik pecahan). Satu timeline memakai satu mode saja, tidak boleh dicampur.
// - Transisi berbasis durasi: transitionOut { "duration": detik, "lead": detik sebelum batas adegan }.
//   Lead bawaan = setengah durasi, hanya bila hasilnya frame bulat. Mode durasi tidak menerima "start",
//   mode start/end tidak menerima "lead". duration dan lead selalu dalam detik, apa pun unit keyframe-nya.
// - timing: { "unit": "frames" | "seconds", "base": "film" | "scene" } di proyek, di adegan, atau per track
//   (track ditulis { "unit", "base", "keys" }). Prioritas: track > adegan > proyek > bawaan (frames, film).
// - base "scene": waktu 0 = frame pertama adegan. Keyframe harus di dalam rentang tampil adegan (termasuk
//   transisi masuk dan keluar); waktu negatif hanya sah di jendela transisi masuk.
// Track yang dikonversi: track milik adegan tersusun (kamera inline, lensa, motion, paramTracks, dan field
// bertangga visible/state/color/flip/frame entitas adegan). Track global (environment, cameraTracks, stage, cast)
// tetap frame film dan belum menerima objek timing. Adegan kustom (modul sendiri) belum mendukung timing karena
// field keyframe-nya ditentukan modul masing-masing.
const crypto = require('crypto');
const S = require('./schema.cjs');

const UNITS = ['frames', 'seconds'];
const BASES = ['film', 'scene'];
const DEFAULT_TIMING = { unit: 'frames', base: 'film' };
const TRACK_KEYS = ['unit', 'base', 'keys'];
// field kamera inline yang berupa keyframe (gabungan semua jenis kamera, lihat schema.checkCamera)
const CAMERA_TRACKS = ['x', 'y', 'zoom', 'screenX', 'keys', 'liftKeys', 'speedKeys'];
// field bertangga entitas (nilai tetap atau keyframe [[frame, nilai], ...])
const STEP_FIELDS = ['visible', 'state', 'color', 'flip', 'frame'];

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isKeyList = (v) => Array.isArray(v) && (v.length === 0 || Array.isArray(v[0]));
const isDefault = (t) => t.unit === DEFAULT_TIMING.unit && t.base === DEFAULT_TIMING.base;

// Detik -> frame bulat. Mengembalikan null bila tidak pas (tidak dibulatkan diam-diam;
// toleransi 1e-6 hanya untuk galat pecahan biner, misalnya 4.4 x 30 = 132.00000000000003).
function toFrames(seconds, fps) {
  if (!S.isNum(seconds)) return null;
  const frames = Math.round(seconds * fps);
  return Math.abs(frames - seconds * fps) < 1e-6 ? frames : null;
}

function checkTiming(spec, label, issues) {
  if (spec === undefined) return;
  if (!isObject(spec)) {
    issues.push(`${label}: timing harus objek { "unit", "base" }`);
    return;
  }
  for (const key of Object.keys(spec)) if (key !== 'unit' && key !== 'base') issues.push(`${label}: "${key}" tidak dikenal di timing (pilihan: unit, base)`);
  if (spec.unit !== undefined && !UNITS.includes(spec.unit)) issues.push(`${label}: unit "${spec.unit}" tidak dikenal (pilihan: ${UNITS.join(', ')})`);
  if (spec.base !== undefined && !BASES.includes(spec.base)) issues.push(`${label}: base "${spec.base}" tidak dikenal (pilihan: ${BASES.join(', ')})`);
}

// Timing efektif: level pertama yang mengisi unit/base dengan nilai sah menang (urutan: track, adegan, proyek).
function resolveTiming(...levels) {
  const pick = (field, list) => levels.map((l) => (isObject(l) ? l[field] : undefined)).find((v) => list.includes(v)) ?? DEFAULT_TIMING[field];
  return { unit: pick('unit', UNITS), base: pick('base', BASES) };
}

// Objek timing track yang ditulis persis { unit?, base?, keys }. Dipakai untuk mencari objek timing
// di tempat yang belum menerimanya (track global, adegan kustom).
const isTrackObject = (v) => isObject(v) && Object.prototype.hasOwnProperty.call(v, 'keys') && Object.keys(v).every((k) => TRACK_KEYS.includes(k));

function findTrackObjects(value, where, found = []) {
  if (isTrackObject(value)) found.push(where);
  else if (Array.isArray(value)) value.forEach((v, i) => findTrackObjects(v, `${where}[${i}]`, found));
  else if (isObject(value)) for (const [k, v] of Object.entries(value)) findTrackObjects(v, `${where}.${k}`, found);
  return found;
}

// Semua kunci "timing" di dalam value, apa pun nilainya.
function findTimingKeys(value, where, found = []) {
  if (Array.isArray(value)) value.forEach((v, i) => findTimingKeys(v, `${where}[${i}]`, found));
  else if (isObject(value)) {
    for (const [k, v] of Object.entries(value)) {
      if (k === 'timing') found.push(`${where}.timing`);
      else findTimingKeys(v, `${where}.${k}`, found);
    }
  }
  return found;
}

// Track global tetap frame film (6A-1): objek timing di sana ditolak dengan pesan jelas.
function checkGlobalTracks(raw, issues) {
  const groups = { environment: raw.environment, cameraTracks: raw.cameraTracks, stages: raw.stages, cast: raw.cast };
  for (const [name, value] of Object.entries(groups)) {
    for (const where of findTrackObjects(value, name)) {
      issues.push(`${where}: track global tetap frame film dan belum menerima objek timing { unit, base, keys }; tulis [[frame, nilai], ...]`);
    }
  }
}

// Kunci "timing" hanya dibaca di tingkat proyek dan tingkat adegan (satu track memakai unit/base di objek tracknya).
// Di tempat lain, misalnya data film (lighting, validation, stages, cast, environment, cameraTracks), entitas,
// pencahayaan, kamera, lensa, dan transisi adegan, tidak ada kode yang membacanya. Kunci itu ditolak apa pun
// nilainya supaya tidak diabaikan diam-diam (Blueprint 6A v2, A2).
function checkTimingKeys(raw, issues) {
  const found = [];
  for (const [key, value] of Object.entries(raw)) {
    if (key === 'timing') continue;
    if (key !== 'timeline' || !isObject(value)) {
      findTimingKeys(value, key, found);
      continue;
    }
    for (const [k, v] of Object.entries(value)) {
      if (k === 'timing') found.push('timeline.timing');
      else if (k !== 'scenes' || !Array.isArray(v)) findTimingKeys(v, `timeline.${k}`, found);
      else {
        v.forEach((scene, i) => {
          if (!isObject(scene)) return;
          for (const [field, data] of Object.entries(scene)) if (field !== 'timing') findTimingKeys(data, `${sceneLabel(scene, i)} ${field}`, found);
        });
      }
    }
  }
  for (const where of found) issues.push(`${where}: kunci "timing" tidak dibaca di sini; timing hanya berlaku di proyek, di adegan, atau sebagai unit/base objek track milik adegan`);
}

const sceneLabel = (scene, i) => `Adegan ${i + 1} (${scene?.id || 'tanpa id'})`;

// Posisi adegan dan transisi dalam frame film, untuk kedua mode. Mode start/end dihitung seperti timeline.cjs
// (yang tetap melaporkan masalahnya sendiri); mode durasi diperiksa dan dilaporkan di sini.
function planTimeline(raw, ctx, issues) {
  const { fps, totalFrames } = ctx;
  const list = raw.timeline.scenes || [];
  const ids = (items) => items.map(({ s, i }) => s?.id || `adegan ${i + 1}`).join(', ');
  const indexed = list.map((s, i) => ({ s, i }));
  const withDuration = indexed.filter(({ s }) => s?.duration !== undefined);
  const withStartEnd = indexed.filter(({ s }) => s?.start !== undefined || s?.end !== undefined);
  let mode = withDuration.length ? 'duration' : 'legacy';
  if (withDuration.length && withStartEnd.length) {
    issues.push(`Timeline: mode duration dan mode start/end tidak boleh dicampur (duration: ${ids(withDuration)}; start/end: ${ids(withStartEnd)})`);
    mode = 'mixed';
  }

  const scenes = list.map(() => null);
  if (mode === 'legacy') {
    list.forEach((s, i) => {
      const start = toFrames(s?.start, fps);
      const end = toFrames(s?.end, fps);
      if (start !== null && end !== null && end > start) scenes[i] = { startFrame: start, endFrame: end, durationFrames: end - start };
    });
  } else if (mode === 'duration') {
    let cursor = 0;
    list.forEach((s, i) => {
      const label = sceneLabel(s, i);
      const d = s?.duration;
      const frames = toFrames(d, fps);
      let ok = false;
      if (d === undefined) {
        // field wajib yang kosong dilaporkan timeline.cjs
      } else if (!S.isNum(d) || d <= 0) issues.push(`${label}: duration harus angka detik lebih dari 0, bukan ${JSON.stringify(d)}`);
      else if (frames === null) issues.push(`${label}: duration ${d} detik tidak menjadi frame bulat pada ${fps} FPS`);
      else if (frames < 1) issues.push(`${label}: duration ${d} detik kurang dari 1 frame pada ${fps} FPS`);
      else ok = true;
      if (ok && cursor !== null) {
        scenes[i] = { startFrame: cursor, endFrame: cursor + frames, durationFrames: frames };
        cursor += frames;
      } else cursor = null; // posisi adegan sesudahnya tidak bisa dihitung
    });
    if (cursor !== null && list.length && cursor !== totalFrames) {
      issues.push(`Timeline: total duration adegan ${cursor} frame (${cursor / fps} detik) harus sama dengan durationSeconds proyek (${raw.durationSeconds} detik = ${totalFrames} frame)`);
    }
  }

  const transitions = list.map(() => null);
  list.forEach((s, i) => {
    const out = s?.transitionOut;
    if (!isObject(out)) return;
    const label = `Transisi dari ${s.id}`;
    if (mode === 'legacy' && out.lead !== undefined) issues.push(`${label}: "lead" hanya untuk adegan berbasis duration; mode start/end memakai "start"`);
    if (mode === 'duration' && out.start !== undefined) issues.push(`${label}: mode duration tidak menerima "start"; pakai "lead" (detik sebelum batas adegan, bawaan setengah durasi)`);
    if (i === list.length - 1) return; // adegan terakhir dilaporkan timeline.cjs
    if (mode === 'legacy') {
      const start = toFrames(out.start, fps);
      const duration = toFrames(out.duration, fps);
      if (start !== null && duration !== null && duration >= 2) transitions[i] = { startFrame: start, durationFrames: duration };
      return;
    }
    if (mode !== 'duration') return;
    const duration = toFrames(out.duration, fps);
    if (duration === null || duration < 2) {
      issues.push(`${label}: duration (detik) wajib diisi, menjadi frame bulat pada ${fps} FPS, dan minimal 2 frame`);
      return;
    }
    let lead;
    if (out.lead === undefined) {
      if (duration % 2 !== 0) {
        issues.push(`${label}: lead bawaan (setengah durasi ${duration} frame = ${duration / 2} frame) bukan frame bulat; isi "lead" dalam detik`);
        return;
      }
      lead = duration / 2;
    } else {
      lead = toFrames(out.lead, fps);
      if (lead === null) {
        issues.push(`${label}: lead ${JSON.stringify(out.lead)} detik tidak menjadi frame bulat pada ${fps} FPS`);
        return;
      }
      if (lead < 1 || lead > duration - 1) {
        issues.push(`${label}: lead ${out.lead} detik (${lead} frame) harus 1..${duration - 1} frame agar transisi melewati batas adegan`);
        return;
      }
    }
    if (!scenes[i]) return;
    transitions[i] = { startFrame: scenes[i].endFrame - lead, durationFrames: duration, leadFrames: lead };
  });

  // rentang tampil adegan = adegan itu sendiri + bagian transisi masuk/keluar yang sah
  const crosses = (i) => {
    const t = transitions[i];
    const a = scenes[i];
    const b = scenes[i + 1];
    if (!t || !a || !b) return false;
    const end = t.startFrame + t.durationFrames;
    return t.startFrame < b.startFrame && end > b.startFrame && t.startFrame >= a.startFrame && end <= b.endFrame;
  };
  const ranges = scenes.map((s, i) => s && {
    first: i > 0 && crosses(i - 1) ? transitions[i - 1].startFrame : s.startFrame,
    end: crosses(i) ? transitions[i].startFrame + transitions[i].durationFrames : s.endFrame
  });
  return { mode, scenes, transitions, ranges };
}

// Ubah satu track (atau nilai tetap) milik adegan menjadi keyframe frame film. Nilai yang bukan keyframe
// dikembalikan apa adanya. Track dengan timing bawaan tanpa objek timing dikembalikan tanpa disalin.
// Hasil undefined = track tidak bisa dikonversi (masalahnya sudah dilaporkan atau posisi adegan tidak sah).
function convertTrack(value, label, env) {
  const { fps, timing: sceneTiming, position, range, issues } = env;
  let keys = value;
  let timing = sceneTiming;
  if (isObject(value) && TRACK_KEYS.some((k) => Object.prototype.hasOwnProperty.call(value, k))) {
    for (const key of Object.keys(value)) if (!TRACK_KEYS.includes(key)) issues.push(`${label}: "${key}" tidak dikenal di objek track (pilihan: ${TRACK_KEYS.join(', ')})`);
    checkTiming({ unit: value.unit, base: value.base }, label, issues);
    if (!S.isKeys(value.keys)) {
      issues.push(`${label}: keys harus daftar keyframe [[waktu, nilai], ...]`);
      return undefined;
    }
    keys = value.keys;
    timing = resolveTiming(value, sceneTiming);
  } else if (!isKeyList(value) || isDefault(timing)) return value;

  if (timing.base === 'scene' && !position) return undefined;
  const out = [];
  keys.forEach((key, i) => {
    if (!Array.isArray(key)) {
      out.push(key);
      return;
    }
    const t = key[0];
    const where = `${label} key ${i}`;
    let local;
    if (timing.unit === 'frames') {
      if (!S.isInt(t)) return issues.push(`${where}: waktu ${JSON.stringify(t)} harus frame bulat (unit frames)`);
      local = t;
    } else {
      local = toFrames(t, fps);
      if (local === null) return issues.push(`${where}: ${JSON.stringify(t)} detik tidak menjadi frame bulat pada ${fps} FPS`);
    }
    let frame = local;
    if (timing.base === 'scene') {
      frame = position.startFrame + local;
      if (frame < range.first || frame >= range.end) {
        const first = range.first - position.startFrame;
        const last = range.end - 1 - position.startFrame;
        const shown = timing.unit === 'seconds' ? `${t} detik (frame lokal ${local})` : `frame lokal ${local}`;
        return issues.push(local < 0
          ? `${where}: waktu lokal ${shown} di luar jendela transisi masuk (${first < 0 ? `paling awal frame lokal ${first}` : 'adegan ini tanpa transisi masuk'})`
          : `${where}: waktu lokal ${shown} = frame film ${frame} di luar rentang tampil adegan (frame lokal ${first}..${last})`);
      }
    }
    out.push([frame, ...key.slice(1)]);
  });
  return out.length ? out : undefined;
}

function setTrack(target, field, label, env) {
  if (target[field] === undefined) return;
  const converted = convertTrack(target[field], label, env);
  if (converted === undefined) delete target[field];
  else target[field] = converted;
}

function compileEntity(def, label, env, issues) {
  if (!isObject(def)) return def;
  const e = { ...def };
  if (isObject(def.motion)) {
    e.motion = { ...def.motion };
    for (const axis of ['x', 'y']) setTrack(e.motion, axis, `${label} motion.${axis}`, env);
  }
  if (isObject(def.paramTracks)) {
    e.paramTracks = { ...def.paramTracks };
    for (const name of Object.keys(def.paramTracks)) setTrack(e.paramTracks, name, `${label} paramTracks.${name}`, env);
  }
  for (const field of STEP_FIELDS) {
    if (field === 'frame' && isObject(def.frame) && def.frame.cycle) continue;
    setTrack(e, field, `${label} ${field}`, env);
  }
  if (env.timing.base === 'scene' && isObject(def.params) && def.params.sinceFrame !== undefined) {
    issues.push(`${label}: params.sinceFrame belum didukung di adegan berbasis scene (belum ada kontrak katalog untuk parameter frame relatif adegan)`);
  }
  return e;
}

// Salinan adegan dengan semua track milik adegan sudah dalam frame film. Adegan tanpa timing dan tanpa objek timing
// menghasilkan salinan dangkal yang sama persis dengan timeline lama.
function compileScenes(raw, plan, ctx, issues) {
  checkTiming(raw.timing, 'Proyek timing', issues);
  return (raw.timeline.scenes || []).map((scene, i) => {
    const copy = { ...scene };
    if (!isObject(scene)) return copy;
    const label = sceneLabel(scene, i);
    checkTiming(scene.timing, `${label} timing`, issues);
    const timing = resolveTiming(scene.timing, raw.timing);
    const custom = scene.module !== undefined && !ctx.engine.builtinScenes.includes(scene.module);
    if (custom) {
      if (!isDefault(timing)) issues.push(`${label}: adegan kustom (modul "${scene.module}") belum mendukung timing ${timing.unit}/${timing.base}; keyframe modul kustom tetap frame film`);
      for (const where of findTrackObjects(scene, label)) issues.push(`${where}: adegan kustom belum menerima objek timing { unit, base, keys }`);
      return copy;
    }
    const env = { fps: ctx.fps, timing, position: plan.scenes[i], range: plan.ranges[i], issues };
    // kamera dari cameraTracks adalah track global: tidak dikonversi di sini (dan tidak dua kali)
    if (isObject(scene.camera) && scene.camera.track === undefined) {
      copy.camera = { ...scene.camera };
      for (const field of CAMERA_TRACKS) setTrack(copy.camera, field, `${label} kamera ${field}`, env);
      if (scene.camera.refFrame !== undefined && !isDefault(timing)) issues.push(`${label} kamera: refFrame belum didukung dengan timing ${timing.unit}/${timing.base}`);
    }
    if (isObject(scene.lens) && scene.lens.zoom !== undefined) {
      copy.lens = { ...scene.lens };
      setTrack(copy.lens, 'zoom', `${label} lens zoom`, env);
    }
    if (Array.isArray(scene.entities)) copy.entities = scene.entities.map((e) => compileEntity(e, `${label} entitas "${e?.id}"`, env, issues));
    return copy;
  });
}

// ---------- representasi runtime ----------
// Bagian konfigurasi yang dibaca browser saat render (src/engine, src/assets, src/scenes), dalam bentuk kanonik.
// Dipakai untuk mengunci hasil kompiler: dua konfigurasi dengan runtimeView sama menghasilkan render yang sama.
// Field yang hanya dibaca Node (nama, judul, validasi, encoding, lokasi output) atau sudah dikompilasi
// (start, end, duration, timing, transitionOut) sengaja tidak ikut. Kelengkapan daftar ini diuji di
// tests/engine/timing.test.js dengan memindai field yang dibaca kode browser.
const RUNTIME_FIELDS = ['width', 'height', 'outputWidth', 'outputHeight', 'fps', 'totalFrames', 'seed', 'rendering', 'palettes', 'assets', 'stages', 'cast', 'environment', 'cameraTracks', 'lighting', 'sceneParams'];
const SCENE_FIELDS = ['id', 'module', 'startFrame', 'endFrame', 'durationFrames', 'stage', 'cast', 'entities', 'camera', 'lens', 'lighting', 'assets', 'characters', 'environment'];
const TRANSITION_FIELDS = ['id', 'type', 'from', 'to', 'startFrame', 'endFrame', 'lastFrame', 'durationFrames', 'boundaryFrame', 'params'];

const pick = (obj, fields) => Object.fromEntries(fields.filter((f) => obj[f] !== undefined).map((f) => [f, obj[f]]));

// kunci objek diurutkan, nilai undefined dibuang (sama seperti JSON), urutan daftar dipertahankan
function canonical(value) {
  if (Array.isArray(value)) return value.map((v) => (v === undefined ? null : canonical(v)));
  if (isObject(value)) {
    return Object.fromEntries(Object.keys(value).sort().filter((k) => value[k] !== undefined).map((k) => [k, canonical(value[k])]));
  }
  return value;
}

function runtimeView(config) {
  const types = config.engine?.catalog?.types || {};
  return canonical({
    ...pick(config, RUNTIME_FIELDS),
    // modul aset yang dimuat browser (registry.js membaca katalog untuk setiap jenis aset proyek)
    assetModules: Object.fromEntries(Object.entries(config.assets || {}).map(([key, def]) => [key, types[def?.type]?.module ?? null])),
    timeline: {
      scenes: (config.timeline?.scenes || []).map((s) => pick(s, SCENE_FIELDS)),
      transitions: (config.timeline?.transitions || []).map((t) => pick(t, TRANSITION_FIELDS))
    }
  });
}

const runtimeHash = (config) => crypto.createHash('sha256').update(JSON.stringify(runtimeView(config))).digest('hex');

module.exports = {
  UNITS, BASES, DEFAULT_TIMING, RUNTIME_FIELDS, SCENE_FIELDS, TRANSITION_FIELDS,
  toFrames, resolveTiming, planTimeline, compileScenes, checkGlobalTracks, checkTimingKeys, runtimeView, runtimeHash, canonical
};
