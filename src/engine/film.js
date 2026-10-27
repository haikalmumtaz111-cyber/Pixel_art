// Mesin film: membaca timeline, membuat adegan, dan menentukan apa yang digambar di setiap frame.
// Timeline sudah diperiksa dan dirapikan oleh Node (src/render/config.cjs) sebelum sampai di sini.
// Setiap frame bisa dirender langsung tanpa frame sebelumnya, jadi urutan render bebas.
import { createLayer } from './pixel.js';
import { createTrack } from './tracks.js';
import { TRANSITIONS } from './transitions.js';
import { createAssetRegistry } from '../assets/registry.js';

// Nilai lingkungan bawaan bila track tidak ditulis di timeline.
const ENV_DEFAULTS = { dawn: 0, rain: 1, fog: 0, clouds: 0, lights: 1, sun: 0 };

export function createEnvironment(definition = {}, fps = 30) {
  const tracks = {};
  for (const [key, fallback] of Object.entries(ENV_DEFAULTS)) tracks[key] = createTrack(definition[key], fallback);
  const rainAt = (time) => tracks.rain(time * fps);
  return {
    at(frame) {
      const env = { rainAt };
      for (const key of Object.keys(tracks)) env[key] = tracks[key](frame);
      return env;
    }
  };
}

const sceneUrl = (module) => (module.startsWith('/') ? `${module}.js` : `../scenes/${module}.js`);

export async function createFilm(config) {
  const { width, height, fps, timeline } = config;
  const assets = createAssetRegistry(config);
  const environment = createEnvironment(config.environment, fps);

  const scenes = {};
  for (const entry of timeline.scenes) {
    const module = await import(sceneUrl(entry.module));
    scenes[entry.id] = { entry, impl: module.createScene({ film: config, scene: entry, assets, environment }) };
  }
  for (const transition of timeline.transitions) {
    const type = TRANSITIONS[transition.type];
    if (!type) throw new Error(`Jenis transisi tidak dikenal: ${transition.type}`);
    if (type.requiresPortal && !scenes[transition.from].impl.supportsPortal) {
      throw new Error(`Transisi portal butuh adegan "${transition.from}" yang mendukung portal.`);
    }
  }

  const buffers = { next: createLayer(width, height), temp: createLayer(width, height) };

  function shotFor(entry, frame, extra = {}) {
    return {
      frame,
      time: frame / fps,
      local: frame - entry.startFrame,
      progress: (frame - entry.startFrame) / Math.max(1, entry.durationFrames - 1),
      ...extra
    };
  }

  function drawScene(id, ctx, frame, extra) {
    const scene = scenes[id];
    ctx.save();
    try {
      return scene.impl.render(ctx, shotFor(scene.entry, frame, extra)) || {};
    } finally {
      ctx.restore();
    }
  }

  function segmentAt(frame) {
    const transition = timeline.transitions.find((t) => frame >= t.startFrame && frame <= t.endFrame);
    if (transition) return { kind: 'transition', transition, p: (frame - transition.startFrame) / (transition.endFrame - transition.startFrame) };
    const entry = timeline.scenes.find((s) => frame >= s.startFrame && frame <= s.endFrame);
    if (!entry) throw new Error(`Frame ${frame} tidak berada di adegan mana pun.`);
    return { kind: 'scene', id: entry.id };
  }

  function render(ctx, frame) {
    const segment = segmentAt(frame);
    if (segment.kind === 'scene') {
      drawScene(segment.id, ctx, frame);
      return { segment: segment.id };
    }
    const t = segment.transition;
    const result = TRANSITIONS[t.type].render({
      ctx, frame, p: segment.p, transition: t, params: t.params || {}, buffers, width, height,
      drawFrom: (target, extra) => drawScene(t.from, target, frame, extra),
      drawTo: (target, extra) => drawScene(t.to, target, frame, extra)
    });
    return { segment: t.id, ...result };
  }

  return { config, scenes, assets, environment, segmentAt, render, drawScene };
}
