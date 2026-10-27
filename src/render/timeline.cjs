// Memeriksa dan merapikan timeline proyek sebelum dikirim ke browser.
// Aturan waktu:
// - durasi ditulis dalam detik, lalu diubah menjadi frame bulat (harus pas, misalnya 4 detik x 30 FPS = 120)
// - adegan memakai interval setengah terbuka [start, end): frame awal ikut, frame akhir tidak
// - adegan berurutan tanpa celah dan tanpa tumpang tindih, menutup seluruh durasi film
// Konfigurasi lama tanpa "timeline" (prototipe Tahap 1) otomatis menjadi timeline satu adegan.
const fs = require('fs');
const path = require('path');
const S = require('./schema.cjs');

function moduleFile(root, module) {
  return module.startsWith('/') ? path.join(root, module.endsWith('.js') ? module : `${module}.js`) : path.join(root, 'src', 'scenes', `${module}.js`);
}

// Detik -> frame bulat. Mengembalikan null bila tidak pas.
function toFrames(seconds, fps) {
  if (!S.isNum(seconds)) return null;
  const frames = Math.round(seconds * fps);
  return Math.abs(frames - seconds * fps) < 1e-6 ? frames : null;
}

function legacyTimeline(raw, totalFrames) {
  return {
    scenes: [{
      id: raw.name, name: raw.title || raw.name, module: raw.sceneModule,
      startFrame: 0, endFrame: totalFrames, durationFrames: totalFrames,
      assets: [], characters: {}, camera: raw.sceneParams?.camera || {}, environment: {}, transitionOut: null
    }],
    transitions: []
  };
}

// Semua id entitas yang bisa dirujuk (stage + pemeran + entitas adegan).
function entityIndex(raw) {
  const ids = new Map();
  for (const [stageId, stage] of Object.entries(raw.stages || {})) for (const e of stage.entities || []) ids.set(e.id, { where: `stage ${stageId}`, def: e });
  for (const [id, def] of Object.entries(raw.cast || {})) ids.set(id, { where: 'cast', def: { ...def, id } });
  return ids;
}

function checkWorld(raw, ctx, issues) {
  const seen = new Map();
  const note = (id, where) => {
    if (seen.has(id)) issues.push(`Entitas "${id}" ganda (di ${seen.get(id)} dan ${where})`);
    else seen.set(id, where);
  };
  for (const [stageId, stage] of Object.entries(raw.stages || {})) {
    const label = `Stage "${stageId}"`;
    if (!Array.isArray(stage.layers) || stage.layers.length === 0) {
      issues.push(`${label}: wajib punya daftar layers`);
      continue;
    }
    const layerIds = new Set();
    for (const layer of stage.layers) {
      if (!S.isSlug(layer.id)) issues.push(`${label}: lapisan wajib punya id`);
      if (layerIds.has(layer.id)) issues.push(`${label}: lapisan "${layer.id}" ganda`);
      layerIds.add(layer.id);
      for (const f of ['parallax', 'parallaxY']) if (layer[f] !== undefined && !S.isNum(layer[f])) issues.push(`${label} lapisan ${layer.id}: ${f} harus angka`);
    }
    for (const e of stage.entities || []) {
      note(e.id, `stage ${stageId}`);
      S.checkEntity(e, `${label} entitas "${e.id}"`, ctx, issues, [...layerIds]);
    }
  }
  for (const [id, def] of Object.entries(raw.cast || {})) {
    note(id, 'cast');
    S.checkEntity({ ...def, id }, `Pemeran "${id}"`, ctx, issues, null);
  }
  // induk harus ada dan tidak boleh berputar
  const index = entityIndex(raw);
  for (const [id, { def }] of index) {
    let current = def;
    const chain = [id];
    while (current && current.parent) {
      if (!index.has(current.parent)) {
        issues.push(`Entitas "${id}": induk "${current.parent}" tidak ditemukan`);
        break;
      }
      if (chain.includes(current.parent)) {
        issues.push(`Entitas "${id}": rantai induk berputar (${[...chain, current.parent].join(' -> ')})`);
        break;
      }
      chain.push(current.parent);
      current = index.get(current.parent).def;
    }
  }
  return index;
}

function normalizeTimeline(raw, ctx) {
  const issues = [];
  const { totalFrames, fps, root } = ctx;
  if (!raw.timeline) {
    const timeline = legacyTimeline(raw, totalFrames);
    if (!raw.sceneModule) issues.push('Konfigurasi tanpa timeline wajib punya "sceneModule".');
    else if (!fs.existsSync(moduleFile(root, raw.sceneModule))) issues.push(`Modul adegan tidak ditemukan: ${raw.sceneModule}`);
    return { timeline, issues };
  }

  S.checkAssets(raw, ctx, issues);
  const entities = checkWorld(raw, ctx, issues);
  const entityIds = new Set(entities.keys());

  for (const [key, keys] of Object.entries(raw.environment || {})) S.checkNumericKeys(keys, `Lingkungan "${key}"`, ctx, issues);
  for (const [name, palette] of Object.entries(raw.palettes || {})) {
    if (!palette || typeof palette !== 'object' || Array.isArray(palette)) issues.push(`Palet "${name}": harus berupa objek warna`);
  }
  const checkLighting = (lighting, label) => {
    if (!lighting) return;
    for (const f of ['from', 'to']) if (!(raw.palettes || {})[lighting[f]]) issues.push(`${label}: palet "${lighting[f]}" tidak ditemukan`);
    if (!(raw.environment || {})[lighting.track]) issues.push(`${label}: track lingkungan "${lighting.track}" tidak ditemukan`);
  };
  checkLighting(raw.lighting, 'Pencahayaan proyek');
  for (const [key, track] of Object.entries(raw.cameraTracks || {})) S.checkCamera(track, `Track kamera "${key}"`, ctx, issues, entityIds);

  const scenes = (raw.timeline.scenes || []).map((s) => ({ ...s }));
  if (scenes.length === 0) issues.push('Timeline belum punya adegan.');
  const ids = new Set();
  const effects = new Set(Object.values(ctx.catalog).flatMap((t) => t.effects || []));
  let cursor = 0;

  scenes.forEach((scene, i) => {
    const label = `Adegan ${i + 1} (${scene.id || 'tanpa id'})`;
    for (const field of ['id', 'name', 'module', 'start', 'end']) if (scene[field] === undefined) issues.push(`${label}: field "${field}" belum diisi`);
    if (scene.id !== undefined && !S.isSlug(scene.id)) issues.push(`${label}: id hanya boleh huruf kecil, angka, dan tanda hubung`);
    if (ids.has(scene.id)) issues.push(`${label}: id adegan ganda`);
    ids.add(scene.id);

    const start = toFrames(scene.start, fps);
    const end = toFrames(scene.end, fps);
    if (scene.start !== undefined && start === null) issues.push(`${label}: start ${scene.start} detik tidak menjadi frame bulat pada ${fps} FPS`);
    if (scene.end !== undefined && end === null) issues.push(`${label}: end ${scene.end} detik tidak menjadi frame bulat pada ${fps} FPS`);
    if (start !== null && end !== null) {
      if (end <= start) issues.push(`${label}: durasi tidak valid (end harus lebih besar dari start)`);
      if (start !== cursor) {
        issues.push(start > cursor
          ? `${label}: ada celah, adegan seharusnya mulai di frame ${cursor} tetapi mulai di ${start}`
          : `${label}: tumpang tindih, adegan mulai di frame ${start} padahal adegan sebelumnya berakhir di ${cursor}`);
      }
      scene.startFrame = start;
      scene.endFrame = end;
      scene.durationFrames = end - start;
      cursor = end;
    }

    const builtin = ctx.engine.builtinScenes.includes(scene.module);
    if (scene.module && !builtin && !fs.existsSync(moduleFile(root, scene.module))) issues.push(`${label}: modul "${scene.module}" tidak ditemukan`);
    const sceneEffects = [...(scene.environment?.effects || []), ...(scene.camera?.windowView?.effects || [])];
    for (const effect of sceneEffects) if (!effects.has(effect)) issues.push(`${label}: efek "${effect}" tidak dikenal`);

    if (builtin) {
      // adegan tersusun: lingkungan, pemeran, dan kamera dari data
      const stage = (raw.stages || {})[scene.stage];
      if (!stage) issues.push(`${label}: stage "${scene.stage}" tidak ditemukan`);
      const layers = stage ? stage.layers.map((l) => l.id) : null;
      for (const id of scene.cast || []) {
        if (!(raw.cast || {})[id]) issues.push(`${label}: pemeran "${id}" tidak ada di cast`);
        else if (layers && !layers.includes(raw.cast[id].layer)) issues.push(`${label}: pemeran "${id}" memakai lapisan "${raw.cast[id].layer}" yang tidak ada di stage ${scene.stage}`);
      }
      const local = new Set(entityIds);
      for (const e of scene.entities || []) {
        if (local.has(e.id)) issues.push(`${label}: entitas "${e.id}" ganda`);
        local.add(e.id);
        S.checkEntity(e, `${label} entitas "${e.id}"`, ctx, issues, layers);
      }
      const cam = scene.camera?.track ? (raw.cameraTracks || {})[scene.camera.track] : scene.camera;
      if (scene.camera?.track && !cam) issues.push(`${label}: track kamera "${scene.camera.track}" tidak ditemukan`);
      else S.checkCamera(cam, `${label} kamera`, ctx, issues, local);
      checkLighting(scene.lighting, `${label} pencahayaan`);
      // setiap warna yang dibutuhkan aset harus ada di palet yang dipakai adegan ini
      const lighting = scene.lighting || raw.lighting;
      const paletteNames = lighting ? [lighting.from, lighting.to] : ['default'];
      const shown = [...(stage?.entities || []), ...(scene.cast || []).map((id) => ({ ...(raw.cast || {})[id], id })), ...(scene.entities || [])];
      for (const name of paletteNames) {
        const palette = (raw.palettes || {})[name];
        if (!palette) {
          if (!lighting) issues.push(`${label}: tidak ada pencahayaan, jadi palet "default" wajib ada`);
          continue;
        }
        const missing = new Set();
        for (const def of shown) {
          const need = S.paletteNeeds(def, ctx);
          for (const key of need.keys) if (typeof palette[key] !== 'string') missing.add(key);
          for (const key of need.arrays) if (!Array.isArray(palette[key])) missing.add(`${key} (daftar warna)`);
        }
        if (missing.size) issues.push(`${label}: palet "${name}" belum punya warna: ${[...missing].join(', ')}`);
      }
      // referensi aset adegan dihitung dari entitas yang tampil
      const used = new Set();
      for (const e of stage?.entities || []) used.add(e.asset);
      for (const id of scene.cast || []) used.add((raw.cast || {})[id]?.asset);
      for (const e of scene.entities || []) used.add(e.asset);
      scene.assets = [...used].filter(Boolean);
    } else {
      // adegan kustom (modul sendiri), seperti film kereta Tahap 2
      for (const field of ['assets', 'characters', 'camera', 'environment']) if (scene[field] === undefined) issues.push(`${label}: field "${field}" belum diisi`);
      for (const key of scene.assets || []) if (!(raw.assets || {})[key]) issues.push(`${label}: aset "${key}" tidak ada di bagian assets`);
      const track = scene.camera?.track;
      if (track && !(raw.cameraTracks || {})[track]) issues.push(`${label}: track kamera "${track}" tidak ditemukan`);
      const viewTrack = scene.camera?.windowView?.track;
      if (viewTrack && !(raw.cameraTracks || {})[viewTrack]) issues.push(`${label}: track kamera jendela "${viewTrack}" tidak ditemukan`);
      if (scene.camera?.type && scene.camera.type !== 'interior') S.checkCamera(scene.camera, `${label} kamera`, ctx, issues, entityIds);
      if (scene.camera?.panKeys) S.checkNumericKeys(scene.camera.panKeys, `${label} kamera panKeys`, ctx, issues);
    }
  });
  if (scenes.length && cursor !== totalFrames) issues.push(`Adegan terakhir harus berakhir tepat di akhir film (frame ${totalFrames}), bukan ${cursor}`);

  const transitions = [];
  scenes.forEach((scene, i) => {
    const out = scene.transitionOut;
    const label = `Transisi dari ${scene.id}`;
    if (i === scenes.length - 1) {
      if (out) issues.push(`${label}: adegan terakhir tidak boleh punya transisi keluar`);
      return;
    }
    if (!out) return; // null = adegan berikutnya langsung menyambung (misalnya kamera yang sama terus berjalan)
    const next = scenes[i + 1];
    if (!ctx.engine.transitions.includes(out.type)) issues.push(`${label}: jenis "${out.type}" tidak dikenal (pilihan: ${ctx.engine.transitions.join(', ')})`);
    if (out.to !== undefined && out.to !== next.id) issues.push(`${label}: harus menuju adegan berikutnya (${next.id}), bukan ${out.to}`);
    const start = toFrames(out.start, fps);
    const duration = toFrames(out.duration, fps);
    if (start === null || duration === null || duration < 2) {
      issues.push(`${label}: start dan duration (detik) wajib diisi, menjadi frame bulat, dan durasi minimal 2 frame`);
      return;
    }
    const end = start + duration;
    if (next.startFrame !== undefined && !(start < next.startFrame && end > next.startFrame)) {
      issues.push(`${label}: rentang frame ${start}..${end - 1} harus melewati batas adegan di frame ${next.startFrame}`);
    }
    if (scene.startFrame !== undefined && next.endFrame !== undefined && (start < scene.startFrame || end > next.endFrame)) issues.push(`${label}: rentang keluar dari kedua adegan`);
    const params = out.params || {};
    if (params.easing && !ctx.engine.easings.includes(params.easing)) issues.push(`${label}: easing "${params.easing}" tidak dikenal`);
    if (out.type === 'portal' && !(S.isNum(params.zoom) && params.zoom > 1)) issues.push(`${label}: transisi portal butuh params.zoom > 1`);
    transitions.push({
      id: `${scene.id}->${next.id}`, type: out.type, from: scene.id, to: next.id,
      startFrame: start, endFrame: end, lastFrame: end - 1, durationFrames: duration, boundaryFrame: next.startFrame, params
    });
  });
  for (let i = 1; i < transitions.length; i++) {
    if (transitions[i].startFrame < transitions[i - 1].endFrame) issues.push(`Transisi ${transitions[i].id} tumpang tindih dengan ${transitions[i - 1].id}`);
  }

  for (const [i, rule] of (raw.validation?.consistency || []).entries()) {
    const label = `Aturan konsistensi ${i + 1}`;
    if (rule.assetType && !ctx.catalog[rule.assetType]) issues.push(`${label}: jenis aset "${rule.assetType}" tidak dikenal`);
    if (rule.asset && !(raw.assets || {})[rule.asset]) issues.push(`${label}: aset "${rule.asset}" tidak ditemukan`);
    if (!Array.isArray(rule.frames) || !rule.frames.every((f) => S.isInt(f) && f >= 0 && f < totalFrames)) issues.push(`${label}: frames harus daftar frame di dalam 0..${totalFrames - 1}`);
  }

  return { timeline: { scenes, transitions }, issues };
}

module.exports = { normalizeTimeline, toFrames };
