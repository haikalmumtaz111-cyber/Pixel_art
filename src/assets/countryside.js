// Set pedesaan: menyusun langit, lanskap, hujan, asap, dan kereta menjadi satu dunia luar.
// Set ini dipakai ulang oleh beberapa adegan (luar kereta, pemandangan dari jendela, fajar).
// Urutan gambar dari paling jauh ke paling dekat sama persis dengan prototipe Tahap 1.
import { withView } from '../engine/pixel.js';
import { createSky } from './sky.js';
import { createLandscape } from './landscape.js';
import { createRain } from './rain.js';
import { createSmoke } from './smoke.js';

export const EFFECTS = ['rain', 'smoke', 'headlight', 'light-spill'];

export function createCountryside({ width, height, seed, railY, rain, smoke, train, ramp }) {
  const sky = createSky({ width, height, seed, horizonY: railY - 30, ramp });
  const land = createLandscape({ width, height, seed, railY, ramp });
  const weather = createRain({ width, height, seed, ...rain });
  const steam = createSmoke({ seed, ...smoke });
  const emitter = (t) => ({ x: train.headAt(t) + train.stackOffset.x, y: train.stackOffset.y });

  return {
    railY,
    train,

    // Lengkapi data lingkungan dengan palet aktif sesuai tingkat fajar, dan fungsi intensitas hujan
    // pada waktu tertentu (track "rain" proyek; bila tidak ada, hujan dianggap penuh).
    resolveEnv(env) {
      const palIndex = ramp.index(env.dawn);
      const rainAt = env.rainAt || ((t) => (env.trackAt ? env.trackAt('rain', t, 1) : 1));
      return { ...env, rainAt, palIndex, pal: ramp.at(palIndex) };
    },

    // options:
    // - camera: { x, y } posisi kamera di dunia
    // - env: kondisi lingkungan (dawn, rain, fog, clouds, lights, sun, rainAt)
    // - zoom: view zoom untuk lapisan sejauh kereta (opsional)
    // - foregroundZoom: view zoom untuk semak di depan kamera (opsional)
    // - portal: jendela kereta yang isinya diganti adegan lain (opsional)
    // - effects: daftar efek yang aktif (bawaan semua): rain, smoke, headlight, light-spill
    // - layer: (faktorX, faktorY) -> kanvas, untuk zoom pecahan per lapisan (opsional, lihat presenter.js)
    render(ctx, { time, camera, env: rawEnv, zoom = null, foregroundZoom = null, portal = null, effects = EFFECTS, layer = null }) {
      const env = this.resolveEnv(rawEnv);
      const on = (name) => effects.includes(name);
      const head = train.headAt(time);
      const headX = Math.round(head - camera.x);
      const lit = on('headlight') ? train.isLit(headX, env, zoom) : () => false;
      const at = (factor, liftFactor) => (layer ? layer(factor, liftFactor) : ctx);

      sky.draw(at(0.04, 0.08), camera, time, env);
      land.drawBackground(ctx, camera, time, env, layer);
      if (on('rain')) weather.drawFar(at(0, 0), camera, time, lit, env);
      const t = at(1, 1);
      land.withLift(t, camera, 1, () => withView(t, zoom, () => {
        land.drawTrack(t, camera, time, env);
        if (on('light-spill')) train.drawLightSpill(t, headX, time, env);
        if (on('rain')) weather.drawGroundSplashes(t, camera, time, railY, env);
        train.draw(t, headX, head, time, env, portal);
        if (on('smoke')) steam.draw(t, camera, time, emitter, env);
        if (on('rain')) weather.drawRoofSplashes(t, time, train.roofSurfaces(headX), env);
        if (on('headlight')) train.drawHeadlight(t, headX, env);
      }));
      // Lapisan paling dekat kamera tidak digambar di dalam lubang portal,
      // supaya saat lubang memenuhi layar hasilnya sama persis dengan adegan berikutnya.
      const hole = portal && portal.rect;
      const front = at(1.35, 1.3);
      const screen = at(0, 0);
      const clipped = [...new Set([front, screen])];
      for (const c of clipped) {
        c.save();
        if (hole) {
          c.beginPath();
          c.rect(0, 0, width, height);
          c.rect(hole.x, hole.y, hole.w, hole.h);
          c.clip('evenodd');
        }
      }
      land.withLift(front, camera, 1.3, () => withView(front, foregroundZoom, () => land.drawForeground(front, camera, env)));
      if (on('rain')) weather.drawNear(screen, camera, time, lit, env);
      sky.drawVignette(screen, env);
      for (const c of clipped) c.restore();
      return { headX, portalRect: portal ? portal.rect || null : null };
    }
  };
}
