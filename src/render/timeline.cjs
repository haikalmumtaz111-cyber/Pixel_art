// Memeriksa dan merapikan timeline film sebelum dikirim ke browser.
// Konfigurasi lama (Tahap 1, satu adegan tanpa "timeline") otomatis diubah menjadi timeline satu adegan.
const fs = require('fs');
const path = require('path');

const TRANSITION_TYPES = ['cut', 'dissolve', 'portal'];
const ASSET_TYPES = ['steam-train', 'countryside', 'coach-interior', 'character'];
const EASINGS = ['linear', 'inQuad', 'outQuad', 'inCubic', 'outCubic', 'inOutCubic', 'inOutSine', 'smoothstep'];
const EFFECTS = ['rain', 'smoke', 'headlight', 'light-spill', 'rain-on-glass', 'lamp-flicker', 'vibration', 'dawn-sky', 'sunrise', 'clouds-opening', 'valley-fog'];
const SCENE_FIELDS = ['id', 'name', 'module', 'startFrame', 'endFrame', 'durationFrames', 'assets', 'characters', 'camera', 'environment'];

const isInt = (v) => Number.isInteger(v);

function moduleFile(root, module) {
  return module.startsWith('/') ? path.join(root, `${module}.js`) : path.join(root, 'src', 'scenes', `${module}.js`);
}

function checkKeys(keys, label, totalFrames, issues) {
  if (!Array.isArray(keys) || keys.length === 0) {
    issues.push(`${label}: harus berupa daftar keyframe [[frame, nilai], ...]`);
    return;
  }
  let previous = -Infinity;
  keys.forEach((key, i) => {
    if (!Array.isArray(key) || !isInt(key[0]) || typeof key[1] !== 'number') {
      issues.push(`${label} key ${i}: format harus [frame, nilai, easing?]`);
      return;
    }
    if (key[0] < 0 || key[0] > totalFrames - 1) issues.push(`${label} key ${i}: frame ${key[0]} di luar 0..${totalFrames - 1}`);
    if (key[0] <= previous) issues.push(`${label} key ${i}: frame harus berurutan naik`);
    if (key[2] !== undefined && !EASINGS.includes(key[2])) issues.push(`${label} key ${i}: easing "${key[2]}" tidak dikenal`);
    previous = key[0];
  });
}

function legacyTimeline(raw, totalFrames) {
  return {
    scenes: [{
      id: raw.name, name: raw.title || raw.name, module: raw.sceneModule,
      startFrame: 0, endFrame: totalFrames - 1, durationFrames: totalFrames,
      assets: [], characters: {}, camera: raw.sceneParams?.camera || {}, environment: {}, transitionOut: null
    }],
    transitions: []
  };
}

// Mengembalikan { timeline, issues }. issues kosong berarti timeline valid.
function normalizeTimeline(raw, totalFrames, root) {
  const issues = [];
  if (!raw.timeline) {
    const timeline = legacyTimeline(raw, totalFrames);
    if (!raw.sceneModule) issues.push('Konfigurasi tanpa timeline wajib punya "sceneModule".');
    else if (!fs.existsSync(moduleFile(root, raw.sceneModule))) issues.push(`Modul adegan tidak ditemukan: ${raw.sceneModule}`);
    return { timeline, issues };
  }

  const scenes = (raw.timeline.scenes || []).map((s) => ({ ...s }));
  if (scenes.length === 0) issues.push('Timeline belum punya adegan.');
  const ids = new Set();
  const assets = raw.assets || {};

  for (const [key, def] of Object.entries(assets)) {
    if (!ASSET_TYPES.includes(def.type)) issues.push(`Aset "${key}": jenis "${def.type}" tidak dikenal`);
  }

  scenes.forEach((scene, i) => {
    const label = `Adegan ${i + 1} (${scene.id || 'tanpa id'})`;
    for (const field of SCENE_FIELDS) if (scene[field] === undefined) issues.push(`${label}: field "${field}" belum diisi`);
    if (ids.has(scene.id)) issues.push(`${label}: id ganda`);
    ids.add(scene.id);
    if (!isInt(scene.startFrame) || !isInt(scene.endFrame)) issues.push(`${label}: startFrame dan endFrame harus bilangan bulat`);
    if (scene.endFrame < scene.startFrame) issues.push(`${label}: endFrame lebih kecil dari startFrame`);
    if (scene.durationFrames !== scene.endFrame - scene.startFrame + 1) {
      issues.push(`${label}: durationFrames ${scene.durationFrames} tidak cocok dengan ${scene.startFrame}..${scene.endFrame}`);
    }
    if (i === 0 && scene.startFrame !== 0) issues.push(`${label}: adegan pertama harus mulai di frame 0`);
    if (i > 0 && scene.startFrame !== scenes[i - 1].endFrame + 1) {
      issues.push(`${label}: harus mulai tepat setelah adegan sebelumnya (frame ${scenes[i - 1].endFrame + 1}), tidak boleh ada celah atau tumpang tindih`);
    }
    if (i === scenes.length - 1 && scene.endFrame !== totalFrames - 1) issues.push(`${label}: adegan terakhir harus berakhir di frame ${totalFrames - 1}`);
    if (scene.module && !fs.existsSync(moduleFile(root, scene.module))) issues.push(`${label}: modul "${scene.module}" tidak ditemukan`);
    for (const key of scene.assets || []) if (!assets[key]) issues.push(`${label}: aset "${key}" tidak ada di bagian assets`);
    const track = scene.camera?.track;
    if (track && !(raw.cameraTracks || {})[track]) issues.push(`${label}: track kamera "${track}" tidak ditemukan`);
    if (scene.camera?.keys) checkKeys(scene.camera.keys, `${label} kamera`, totalFrames, issues);
    const viewTrack = scene.camera?.windowView?.track;
    if (viewTrack && !(raw.cameraTracks || {})[viewTrack]) issues.push(`${label}: track kamera jendela "${viewTrack}" tidak ditemukan`);
    const effects = [...(scene.environment?.effects || []), ...(scene.camera?.windowView?.effects || [])];
    for (const effect of effects) if (!EFFECTS.includes(effect)) issues.push(`${label}: efek "${effect}" tidak dikenal`);
  });

  const transitions = [];
  scenes.forEach((scene, i) => {
    const out = scene.transitionOut;
    const label = `Transisi dari ${scene.id}`;
    if (i === scenes.length - 1) {
      if (out) issues.push(`${label}: adegan terakhir tidak boleh punya transisi keluar`);
      return;
    }
    if (out === undefined) issues.push(`${label}: field "transitionOut" belum diisi`);
    if (!out) return;
    const next = scenes[i + 1];
    if (!TRANSITION_TYPES.includes(out.type)) issues.push(`${label}: jenis "${out.type}" tidak dikenal`);
    if (out.to !== next.id) issues.push(`${label}: harus menuju adegan berikutnya (${next.id}), bukan ${out.to}`);
    if (!(out.startFrame < next.startFrame && out.endFrame >= next.startFrame)) {
      issues.push(`${label}: rentang ${out.startFrame}..${out.endFrame} harus melewati batas adegan di frame ${next.startFrame}`);
    }
    if (out.startFrame < scene.startFrame || out.endFrame > next.endFrame) issues.push(`${label}: rentang keluar dari kedua adegan`);
    if (out.params?.easing && !EASINGS.includes(out.params.easing)) issues.push(`${label}: easing "${out.params.easing}" tidak dikenal`);
    transitions.push({
      id: `${scene.id}->${next.id}`, type: out.type, from: scene.id, to: next.id,
      startFrame: out.startFrame, endFrame: out.endFrame, boundaryFrame: next.startFrame, params: out.params || {}
    });
  });
  for (let i = 1; i < transitions.length; i++) {
    if (transitions[i].startFrame <= transitions[i - 1].endFrame) issues.push(`Transisi ${transitions[i].id} tumpang tindih dengan ${transitions[i - 1].id}`);
  }

  for (const [key, keys] of Object.entries(raw.environment || {})) checkKeys(keys, `Lingkungan "${key}"`, totalFrames, issues);
  for (const [key, track] of Object.entries(raw.cameraTracks || {})) {
    if (track.keys) checkKeys(track.keys, `Track kamera "${key}"`, totalFrames, issues);
    if (track.speedKeys) checkKeys(track.speedKeys, `Track kamera "${key}" (kecepatan)`, totalFrames, issues);
    if (track.liftKeys) checkKeys(track.liftKeys, `Track kamera "${key}" (naik-turun)`, totalFrames, issues);
  }

  return { timeline: { scenes, transitions }, issues };
}

module.exports = { normalizeTimeline, TRANSITION_TYPES, ASSET_TYPES, EFFECTS };
