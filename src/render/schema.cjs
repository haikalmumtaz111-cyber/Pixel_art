// Pemeriksa skema konfigurasi proyek. Semua fungsi mengumpulkan masalah ke daftar `issues`
// (bahasa Indonesia), supaya pengguna melihat semua kesalahan sekaligus, bukan satu per satu.
const isInt = (v) => Number.isInteger(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isSlug = (v) => typeof v === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(v);
const isColor = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
const isKeys = (v) => Array.isArray(v) && v.length > 0 && v.every((k) => Array.isArray(k));

// Keyframe angka: [[frame, nilai, easing?], ...]
function checkNumericKeys(keys, label, ctx, issues, { min = -Infinity, max = Infinity } = {}) {
  if (!isKeys(keys)) {
    issues.push(`${label}: harus berupa daftar keyframe [[frame, nilai], ...]`);
    return;
  }
  let previous = -Infinity;
  keys.forEach((key, i) => {
    if (!isInt(key[0]) || !isNum(key[1])) {
      issues.push(`${label} key ${i}: format harus [frame bulat, angka, easing?]`);
      return;
    }
    if (key[0] < 0 || key[0] > ctx.totalFrames - 1) issues.push(`${label} key ${i}: frame ${key[0]} di luar 0..${ctx.totalFrames - 1}`);
    if (key[0] <= previous) issues.push(`${label} key ${i}: frame harus berurutan naik`);
    if (key[1] < min || key[1] > max) issues.push(`${label} key ${i}: nilai ${key[1]} di luar batas ${min}..${max}`);
    if (key[2] !== undefined && !ctx.engine.easings.includes(key[2])) issues.push(`${label} key ${i}: easing "${key[2]}" tidak dikenal`);
    previous = key[0];
  });
}

// Keyframe bertangga: [[frame, nilai], ...] dengan nilai yang lolos `ok`.
function checkStepKeys(keys, label, ctx, issues, ok, expected) {
  if (!isKeys(keys)) {
    issues.push(`${label}: harus berupa nilai tetap atau daftar keyframe [[frame, nilai], ...]`);
    return;
  }
  let previous = -Infinity;
  keys.forEach((key, i) => {
    if (!isInt(key[0]) || key.length !== 2) issues.push(`${label} key ${i}: format harus [frame bulat, nilai]`);
    else if (key[0] < 0 || key[0] > ctx.totalFrames - 1) issues.push(`${label} key ${i}: frame ${key[0]} di luar 0..${ctx.totalFrames - 1}`);
    if (key[0] <= previous) issues.push(`${label} key ${i}: frame harus berurutan naik`);
    if (!ok(key[1])) issues.push(`${label} key ${i}: nilai ${JSON.stringify(key[1])} tidak valid (seharusnya ${expected})`);
    previous = key[0];
  });
}

// Nilai tetap atau keyframe bertangga.
function checkStepValue(value, label, ctx, issues, ok, expected) {
  if (value === undefined) return;
  if (Array.isArray(value)) checkStepKeys(value, label, ctx, issues, ok, expected);
  else if (!ok(value)) issues.push(`${label}: nilai ${JSON.stringify(value)} tidak valid (seharusnya ${expected})`);
}

// Satu parameter menurut spesifikasi katalog: { type, min, max, enum, assetType, required }.
function checkParam(value, spec, label, ctx, issues) {
  const t = spec.type;
  const fail = (msg) => issues.push(`${label}: ${msg}`);
  if (t === 'integer' && !isInt(value)) return fail(`harus bilangan bulat, bukan ${JSON.stringify(value)}`);
  if (t === 'number' && !isNum(value)) return fail(`harus angka, bukan ${JSON.stringify(value)}`);
  if (t === 'string' && typeof value !== 'string') return fail('harus teks');
  if (t === 'boolean' && typeof value !== 'boolean') return fail('harus true atau false');
  if (t === 'color' && !isColor(value)) return fail(`harus warna #rrggbb, bukan ${JSON.stringify(value)}`);
  if (t === 'object' && (typeof value !== 'object' || value === null || Array.isArray(value))) return fail('harus objek');
  if (t === 'array' && !Array.isArray(value)) return fail('harus daftar');
  if (t === 'paletteKey' && typeof value !== 'string') return fail('harus nama warna di palet');
  if (t === 'asset') {
    if (!ctx.assets[value]) return fail(`aset "${value}" tidak ditemukan`);
    if (spec.assetType && ctx.assets[value].type !== spec.assetType) return fail(`aset "${value}" harus berjenis ${spec.assetType}`);
  }
  if ((t === 'integer' || t === 'number') && spec.min !== undefined && value < spec.min) fail(`nilai ${value} lebih kecil dari batas ${spec.min}`);
  if ((t === 'integer' || t === 'number') && spec.max !== undefined && value > spec.max) fail(`nilai ${value} lebih besar dari batas ${spec.max}`);
  if (spec.enum && !spec.enum.includes(value)) fail(`nilai "${value}" bukan salah satu dari: ${spec.enum.join(', ')}`);
  if (t === 'array' && spec.items) value.forEach((v, i) => checkParam(v, spec.items, `${label}[${i}]`, ctx, issues));
}

function checkParams(params, schema = {}, label, ctx, issues, { checkRequired = true } = {}) {
  if (params === undefined) params = {};
  if (typeof params !== 'object' || params === null || Array.isArray(params)) {
    issues.push(`${label}: parameter harus berupa objek`);
    return;
  }
  for (const [key, value] of Object.entries(params)) {
    if (!schema[key]) issues.push(`${label}: parameter "${key}" tidak dikenal`);
    else checkParam(value, schema[key], `${label}.${key}`, ctx, issues);
  }
  if (checkRequired) {
    for (const [key, spec] of Object.entries(schema)) if (spec.required && params[key] === undefined) issues.push(`${label}: parameter wajib "${key}" belum diisi`);
  }
}

function checkAssets(raw, ctx, issues) {
  for (const [key, def] of Object.entries(raw.assets || {})) {
    const label = `Aset "${key}"`;
    if (!isSlug(key)) issues.push(`${label}: nama aset hanya boleh huruf kecil, angka, dan tanda hubung`);
    const type = ctx.catalog[def?.type];
    if (!type) {
      issues.push(`${label}: jenis "${def?.type}" tidak ada di katalog aset`);
      continue;
    }
    const { type: _t, ...params } = def;
    checkParams(params, type.params, label, ctx, issues);
  }
}

// Entitas adegan tersusun. `layers` = id lapisan yang tersedia (null bila belum diketahui).
function checkEntity(def, label, ctx, issues, layers) {
  if (!def || typeof def !== 'object') {
    issues.push(`${label}: entitas harus berupa objek`);
    return;
  }
  if (!isSlug(def.id)) issues.push(`${label}: id entitas wajib diisi (huruf kecil, angka, tanda hubung)`);
  const assetDef = ctx.assets[def.asset];
  if (!assetDef) {
    issues.push(`${label}: aset "${def.asset}" tidak ditemukan`);
    return;
  }
  const type = ctx.catalog[assetDef.type] || {};
  if (!type.entity) issues.push(`${label}: aset "${def.asset}" (${assetDef.type}) tidak bisa dipakai sebagai entitas`);
  if (layers && !layers.includes(def.layer)) issues.push(`${label}: lapisan "${def.layer}" tidak ada (pilihan: ${layers.join(', ')})`);
  if (def.position !== undefined && !(Array.isArray(def.position) && def.position.length === 2 && def.position.every(isNum))) issues.push(`${label}: position harus [x, y]`);
  if (def.motion !== undefined) {
    for (const [axis, keys] of Object.entries(def.motion)) {
      if (axis !== 'x' && axis !== 'y') issues.push(`${label}: motion hanya mengenal x dan y`);
      else checkNumericKeys(keys, `${label} motion.${axis}`, ctx, issues);
    }
  }
  if (def.anchor !== undefined && !ctx.engine.anchors.includes(def.anchor)) issues.push(`${label}: anchor "${def.anchor}" tidak dikenal`);
  checkStepValue(def.visible, `${label} visible`, ctx, issues, (v) => typeof v === 'boolean', 'true atau false');
  checkStepValue(def.flip, `${label} flip`, ctx, issues, (v) => typeof v === 'boolean', 'true atau false');
  const states = type.states || [];
  checkStepValue(def.state, `${label} state`, ctx, issues, (v) => states.includes(v), `salah satu dari: ${states.join(', ') || '(aset tidak punya status)'}`);
  const colors = type.colorStates || [];
  checkStepValue(def.color, `${label} color`, ctx, issues, (v) => colors.includes(v), `salah satu dari: ${colors.join(', ') || '(aset tidak punya status warna)'}`);
  if (def.frame !== undefined) {
    if (def.frame && def.frame.cycle) {
      const c = def.frame.cycle;
      if (!isNum(c.fps) || c.fps <= 0 || !isInt(c.count) || c.count < 1) issues.push(`${label} frame.cycle: fps harus > 0 dan count bilangan bulat >= 1`);
    } else {
      checkStepValue(def.frame, `${label} frame`, ctx, issues, (v) => isInt(v) && v >= 0, 'bilangan bulat >= 0');
    }
  }
  const maxScale = ctx.engine.rendering.maxEntityScale;
  if (def.scale !== undefined && !(isInt(def.scale) && def.scale >= 1 && def.scale <= maxScale)) {
    issues.push(`${label}: scale harus bilangan bulat 1..${maxScale} agar grid piksel tetap rapi`);
  }
  if (def.z !== undefined && !isNum(def.z)) issues.push(`${label}: z harus angka`);
  const schema = { ...(type.params || {}), ...(type.entityParams || {}) };
  checkParams(def.params, schema, `${label} params`, ctx, issues, { checkRequired: false });
  for (const [name, keys] of Object.entries(def.paramTracks || {})) {
    const spec = (type.entityParams || {})[name];
    if (!spec || !spec.animatable) issues.push(`${label} paramTracks: parameter "${name}" tidak bisa dianimasikan`);
    else checkNumericKeys(keys, `${label} paramTracks.${name}`, ctx, issues, { min: spec.min, max: spec.max });
  }
}

function checkCamera(def, label, ctx, issues, entityIds) {
  if (!def || typeof def !== 'object') {
    issues.push(`${label}: kamera wajib diisi`);
    return;
  }
  if (!ctx.engine.cameraTypes.includes(def.type)) {
    issues.push(`${label}: jenis kamera "${def.type}" tidak dikenal (pilihan: ${ctx.engine.cameraTypes.join(', ')})`);
    return;
  }
  const keyed = { keys: ['x', 'y', 'zoom'], 'follow-entity': ['y', 'zoom'], follow: ['keys', 'liftKeys'], speed: ['speedKeys', 'liftKeys'] }[def.type];
  for (const field of keyed) if (def[field] !== undefined) checkNumericKeys(def[field], `${label} ${field}`, ctx, issues, field === 'zoom' ? { min: 1, max: ctx.engine.rendering.maxZoom } : {});
  if (def.type === 'follow-entity') {
    if (!entityIds.has(def.entity)) issues.push(`${label}: entitas yang diikuti "${def.entity}" tidak ditemukan`);
    if (Array.isArray(def.screenX)) checkNumericKeys(def.screenX, `${label} screenX`, ctx, issues);
    else if (def.screenX !== undefined && !isNum(def.screenX)) issues.push(`${label}: screenX harus angka atau keyframe`);
    if (def.smoothing !== undefined && !(isInt(def.smoothing) && def.smoothing >= 1 && def.smoothing <= 120)) issues.push(`${label}: smoothing harus bilangan bulat 1..120`);
  }
  if (def.type === 'speed' && !isNum(def.framing)) issues.push(`${label}: framing wajib berupa angka`);
  const zooms = (def.zoom || []).filter((k) => Array.isArray(k) && k[1] !== 1);
  if (zooms.length && ctx.upscale !== 'browser') issues.push(`${label}: zoom kamera hanya didukung bila rendering.upscale = "browser" (agar piksel tetap tajam)`);
}

// Kunci palet yang dibutuhkan sebuah entitas: bawaan jenis aset + parameter berjenis paletteKey.
function paletteNeeds(def, ctx) {
  const assetDef = ctx.assets[def.asset];
  const type = assetDef && ctx.catalog[assetDef.type];
  if (!type) return { keys: [], arrays: [] };
  const keys = [...(type.paletteKeys || [])];
  const arrays = [...(type.arrayPaletteKeys || [])];
  const schema = { ...(type.params || {}), ...(type.entityParams || {}) };
  const values = { ...assetDef, ...(def.params || {}) };
  for (const [name, spec] of Object.entries(schema)) {
    const v = values[name];
    if (v === undefined) continue;
    // spec.array = nama palet berisi daftar warna (misalnya gradasi langit)
    if (spec.type === 'paletteKey') for (const suffix of spec.suffixes || ['']) (spec.array ? arrays : keys).push(`${v}${suffix}`);
    if (spec.type === 'array' && spec.items?.type === 'paletteKey') v.forEach((k) => keys.push(k));
  }
  return { keys, arrays };
}

module.exports = { isInt, isNum, isSlug, isColor, checkNumericKeys, checkStepKeys, checkParams, checkAssets, checkEntity, checkCamera, paletteNeeds };
