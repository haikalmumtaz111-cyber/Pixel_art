// Sistem entitas sederhana. Entitas = objek visual yang ditempatkan dan dianimasikan di adegan
// (karakter, rumah, pohon, sepeda, awan, lampu jalan, ...). Setiap entitas memakai satu aset.
//
// Definisi entitas di JSON:
// {
//   "id": "pejalan",               id unik
//   "asset": "pak-darto",          kunci aset di bagian "assets" proyek
//   "layer": "trotoar",            lapisan gambar (lihat stage.layers)
//   "position": [x, y],            posisi dunia (atau relatif terhadap induk)
//   "motion": { "x": keys, "y": keys },   gerak berbasis keyframe (opsional)
//   "anchor": "bottom-center",     titik tumpu: top-left, top-center, center, bottom-left, bottom-center, bottom-right
//   "visible": true | [[frame, true/false], ...]
//   "state": "walk" | [[frame, "idle"], [frame, "walk"]]     status animasi (diskrit)
//   "frame": 0 | [[frame, n]] | { "cycle": { "fps": 8, "count": 4 } }   pilihan frame sprite
//   "color": "on" | [[frame, "on"], [frame, "off"]]             status warna (diskrit)
//   "flip": false | [[frame, bool]]                             cermin horizontal
//   "scale": 1                     skala bilangan bulat (menjaga grid piksel)
//   "z": 0                         urutan dalam lapisan
//   "parent": "sepeda"             induk (posisi ikut induk)
//   "params": { ... }              parameter tampilan tetap
//   "paramTracks": { "headTurn": keys }   parameter animasi berbasis keyframe
// }
// Semua nilai dihitung langsung dari nomor frame global, jadi frame bisa dirender dalam urutan apa pun.
import { createTrack, createValue } from './tracks.js';

const ANCHORS = {
  'top-left': [0, 0], 'top-center': [0.5, 0], 'top-right': [1, 0],
  'center-left': [0, 0.5], center: [0.5, 0.5], 'center-right': [1, 0.5],
  'bottom-left': [0, 1], 'bottom-center': [0.5, 1], 'bottom-right': [1, 1]
};

export function anchorOf(name) {
  return Array.isArray(name) ? name : ANCHORS[name || 'top-left'];
}

export function createEntity(def, { assets, fps, lookup }) {
  const asset = assets.get(def.asset);
  const [px, py] = def.position || [0, 0];
  const x = def.motion?.x ? createTrack(def.motion.x, px) : () => px;
  const y = def.motion?.y ? createTrack(def.motion.y, py) : () => py;
  const visible = createValue(def.visible ?? true, true, { step: true });
  const state = createValue(def.state ?? asset.defaultState ?? 'idle', 'idle', { step: true });
  const color = createValue(def.color ?? null, null, { step: true });
  const flip = createValue(def.flip ?? false, false, { step: true });
  const cycle = def.frame && def.frame.cycle;
  const frameSel = cycle ? null : createValue(def.frame ?? 0, 0, { step: true });
  const paramTracks = Object.entries(def.paramTracks || {}).map(([name, keys]) => [name, createTrack(keys, 0)]);
  const params = { ...(def.params || {}) };

  const entity = {
    id: def.id,
    def,
    asset,
    layer: def.layer,
    z: def.z || 0,
    scale: def.scale || 1,
    anchor: anchorOf(def.anchor),

    // Posisi dunia pada frame tertentu, termasuk posisi induk.
    world(frame, depth = 0) {
      let wx = x(frame);
      let wy = y(frame);
      if (def.parent) {
        if (depth > 16) throw new Error(`Rantai induk entitas "${def.id}" terlalu panjang (mungkin berputar).`);
        const p = lookup(def.parent).world(frame, depth + 1);
        wx += p.x;
        wy += p.y;
      }
      return { x: wx, y: wy };
    },

    // Keadaan lengkap entitas pada frame tertentu.
    stateAt(frame, time) {
      const now = entity.world(frame);
      const before = entity.world(frame - 1);
      const p = { ...params };
      for (const [name, track] of paramTracks) p[name] = track(frame);
      return {
        id: def.id,
        visible: Boolean(visible(frame)),
        state: state(frame),
        frame: cycle ? Math.floor(time * cycle.fps + (cycle.offset || 0)) % cycle.count : frameSel(frame),
        color: color(frame),
        flip: Boolean(flip(frame)),
        params: p,
        worldX: now.x,
        worldY: now.y,
        // kecepatan dunia per frame, dipakai misalnya agar langkah kaki tidak "meluncur"
        speedX: now.x - before.x,
        time
      };
    }
  };
  return entity;
}
