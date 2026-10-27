// Mesin film: membaca proyek yang sudah diperiksa Node (src/render/projects.cjs),
// membuat adegan, dan menentukan apa yang digambar di setiap frame.
// Mesin ini tidak mengenal cerita apa pun: aset dimuat lewat katalog, lingkungan berupa track bebas,
// dan adegan berupa modul (atau adegan tersusun bawaan "compose").
// Setiap frame bisa dirender langsung tanpa frame sebelumnya, jadi urutan render bebas.
import { createLayer } from './pixel.js';
import { TRANSITIONS } from './transitions.js';
import { createAssetRegistry } from './registry.js';
import { createEnvironment } from './environment.js';
import { createSchedule } from './schedule.js';
import { createComposedScene } from './composer.js';
import { createPresenter, gridDitherMask } from './presenter.js';
import { createTrack } from './tracks.js';

// Adegan bawaan mesin yang bisa dipakai proyek mana pun tanpa menulis kode.
const BUILTIN_SCENES = { compose: { createScene: createComposedScene } };

// Lokasi modul adegan: nama biasa dicari di src/scenes, path diawali "/" dihitung dari akar proyek.
const sceneUrl = (module) => (module.startsWith('/') ? (module.endsWith('.js') ? module : `${module}.js`) : `/src/scenes/${module}.js`);

export async function createFilm(config) {
  const { fps, timeline } = config;
  const assets = await createAssetRegistry(config);
  const environment = createEnvironment(config.environment, fps);
  const schedule = createSchedule(timeline);
  const presenter = createPresenter(config);
  const width = presenter.frameWidth;
  const height = presenter.frameHeight;

  const scenes = {};
  const sceneModules = [];
  // lensa: zoom tambahan per adegan dari timeline (scene.lens.zoom), berlaku untuk adegan jenis apa pun
  const lenses = {};
  for (const entry of timeline.scenes) {
    if (entry.lens?.zoom) lenses[entry.id] = createTrack(entry.lens.zoom, 1);
    let module = BUILTIN_SCENES[entry.module];
    if (!module) {
      sceneModules.push(sceneUrl(entry.module));
      module = await import(sceneUrl(entry.module));
    }
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

  const grids = [];
  function drawScene(id, ctx, frame, extra) {
    const scene = scenes[id];
    const lens = lenses[id] ? lenses[id](frame) : 1;
    ctx.save();
    try {
      const result = presenter.draw(ctx, (target, surface) => {
        const r = scene.impl.render(target, shotFor(scene.entry, frame, { ...extra, surface, lens })) || {};
        return r.lensApplied || lens === 1 ? r : { ...r, zoom: (r.zoom || 1) * lens };
      }) || {};
      const grid = presenter.gridInfo();
      if (grid) grids.push({ scene: id, ...grid });
      return result;
    } finally {
      ctx.restore();
    }
  }

  // Topeng dither transisi yang selaras dengan grid art adegan yang terakhir digambar (adegan tujuan).
  const ditherMask = (level) => {
    const grid = presenter.ditherGrid();
    return grid ? gridDitherMask(grid, width, height, level) : null;
  };

  // info.grid = mode zoom, nilai zoom, dan geseran lapisan setiap adegan yang digambar di frame ini
  // (dipakai validator untuk memeriksa bahwa grid piksel tidak merayap)
  function render(ctx, frame) {
    grids.length = 0;
    const segment = schedule.segmentAt(frame);
    if (segment.kind === 'scene') {
      drawScene(segment.id, ctx, frame);
      return { segment: segment.id, ...(grids.length ? { grid: [...grids] } : {}) };
    }
    const t = segment.transition;
    const result = TRANSITIONS[t.type].render({
      ctx, frame, p: segment.p, transition: t, params: t.params || {}, buffers, width, height, cell: presenter.cell, ditherMask,
      drawFrom: (target, extra) => drawScene(t.from, target, frame, extra),
      drawTo: (target, extra) => drawScene(t.to, target, frame, extra)
    });
    return { segment: t.id, ...result, ...(grids.length ? { grid: [...grids] } : {}) };
  }

  return {
    config, scenes, assets, environment, presenter, frameWidth: width, frameHeight: height,
    segmentAt: schedule.segmentAt, render, drawScene,
    loadedModules: () => [...assets.loadedModules(), ...sceneModules]
  };
}
