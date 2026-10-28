// Adegan tersusun (composed scene): adegan generik yang dibangun sepenuhnya dari data.
// Dipakai lewat "module": "compose" di timeline. Tidak ada logika cerita di sini.
//
// Data yang dibaca:
// - film.stages[scene.stage]   = { layers: [...], entities: [...] }   lingkungan (set) yang dipakai
// - film.cast                  = entitas bergerak milik proyek (karakter, kendaraan) yang bisa tampil di banyak adegan
// - scene.cast                 = daftar id pemeran yang tampil di adegan ini
// - scene.entities             = entitas tambahan khusus adegan ini
// - scene.camera               = definisi kamera atau { "track": id } dari film.cameraTracks
// - scene.lighting / film.lighting = { from, to, track, steps }: palet berubah mengikuti track lingkungan
//
// Lapisan: { id, parallax, parallaxY?, sortByY? }. Digambar berurutan dari jauh ke dekat.
// Di dalam lapisan, entitas diurutkan menurut z, lalu (bila sortByY) posisi y, lalu urutan definisi.
import { withView } from './pixel.js';
import { createCameraTrack } from './camera.js';
import { createEntity } from './entities.js';
import { createPaletteRamp } from './palette.js';

function createLighting(film, lighting) {
  const palettes = film.palettes || {};
  if (!lighting) {
    const pal = palettes.default || {};
    return () => pal;
  }
  const ramp = createPaletteRamp(palettes[lighting.from], palettes[lighting.to], lighting.steps || 24);
  return (env) => ramp.at(ramp.index(env[lighting.track] ?? 0));
}

export function createComposedScene({ film, scene, assets, environment }) {
  const stage = film.stages?.[scene.stage];
  if (!stage) throw new Error(`Adegan "${scene.id}": stage "${scene.stage}" tidak ditemukan.`);
  const { width, height, fps } = film;

  const layers = stage.layers.map((l) => ({
    id: l.id,
    px: l.parallax ?? 1,
    py: l.parallaxY ?? l.parallax ?? 1,
    sortByY: Boolean(l.sortByY)
  }));

  // Semua entitas yang mungkin dirujuk (untuk induk dan kamera), dibuat saat pertama dibutuhkan.
  const defs = new Map();
  for (const def of stage.entities || []) defs.set(def.id, def);
  for (const [id, def] of Object.entries(film.cast || {})) defs.set(id, { ...def, id });
  for (const def of scene.entities || []) defs.set(def.id, def);
  const built = new Map();
  const lookup = (id) => {
    if (!built.has(id)) {
      const def = defs.get(id);
      if (!def) throw new Error(`Entitas "${id}" tidak ditemukan.`);
      built.set(id, createEntity(def, { assets, fps, lookup }));
    }
    return built.get(id);
  };

  const shown = [...(stage.entities || []).map((d) => d.id), ...(scene.cast || []), ...(scene.entities || []).map((d) => d.id)];
  const byLayer = new Map(layers.map((l) => [l.id, []]));
  shown.forEach((id, order) => {
    const entity = lookup(id);
    if (!byLayer.has(entity.layer)) throw new Error(`Entitas "${id}" memakai lapisan "${entity.layer}" yang tidak ada di stage.`);
    byLayer.get(entity.layer).push({ entity, order });
  });

  const cameraDef = scene.camera?.track ? film.cameraTracks[scene.camera.track] : scene.camera;
  const camera = createCameraTrack(cameraDef, {
    fps, totalFrames: film.totalFrames,
    entityX: (id, frame) => lookup(id).world(frame).x
  });
  const palette = createLighting(film, scene.lighting || film.lighting);

  return {
    // palet aktif pada frame tertentu (dipakai pengujian, misalnya warna identitas aset yang diterangi palet)
    paletteAt: (frame) => palette(environment.at(frame)),
    // keadaan entitas yang tampil pada frame tertentu, tanpa menggambar (dipakai pengujian gerak)
    entitiesAt(frame) {
      const out = [];
      for (const layer of layers) {
        for (const { entity } of byLayer.get(layer.id)) {
          const st = entity.stateAt(frame, frame / fps);
          if (st.visible) out.push({ id: entity.id, asset: entity.asset, state: { ...st, scale: entity.scale } });
        }
      }
      return out;
    },
    render(ctx, shot) {
      const { frame, time } = shot;
      const env = environment.at(frame);
      const cam = camera(frame);
      const zoom = (cam.zoom ?? 1) * (shot.lens ?? 1);
      const fc = { frame, time, fps, env, pal: palette(env), camera: cam, width, height, seed: film.seed, scene: scene.id };
      // zoom pecahan pada mode "anchored": setiap lapisan digambar ke kanvas sendiri bersama geserannya,
      // supaya penyaji bisa menempelkan ukuran piksel pada gambar lapisan itu (lihat presenter.js)
      const layered = Boolean(shot.surface && shot.surface.wantsLayers(zoom));

      for (const layer of layers) {
        const ox = Math.round(cam.x * layer.px);
        const oy = Math.round(cam.y * layer.py);
        if (layered) ctx = shot.surface.layer(ox, oy);
        const items = byLayer.get(layer.id)
          .map(({ entity, order }) => ({ entity, order, st: entity.stateAt(frame, time) }))
          .filter((item) => item.st.visible)
          .sort((a, b) => a.entity.z - b.entity.z || (layer.sortByY ? a.st.worldY - b.st.worldY : 0) || a.order - b.order);

        for (const { entity, st } of items) {
          const size = entity.asset.size ? entity.asset.size(st, fc) : { w: 0, h: 0 };
          const s = entity.scale;
          const left = Math.round(st.worldX) - ox - Math.round(entity.anchor[0] * size.w * s);
          const top = Math.round(st.worldY) - oy - Math.round(entity.anchor[1] * size.h * s);
          const right = left + size.w * s;
          const view = st.flip ? { s, ox: right, oy: top, flip: true } : { s, ox: left, oy: top };
          // bagian lokal aset yang terlihat di layar (untuk aset yang mengisi seluruh lebar layar)
          const local = st.flip
            ? { x0: (right - width) / s, x1: right / s, y0: -top / s, y1: (height - top) / s }
            : { x0: -left / s, x1: (width - left) / s, y0: -top / s, y1: (height - top) / s };
          withView(ctx, view, () => entity.asset.draw(ctx, { ...st, size, local, scale: s, layer: { id: layer.id, ox, oy } }, fc));
        }
      }
      return { zoom, lensApplied: true };
    }
  };
}
