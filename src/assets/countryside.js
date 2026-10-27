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
    render(ctx, { time, camera, env: rawEnv, zoom = null, foregroundZoom = null, portal = null, effects = EFFECTS }) {
      const env = this.resolveEnv(rawEnv);
      const on = (name) => effects.includes(name);
      const head = train.headAt(time);
      const headX = Math.round(head - camera.x);
      const lit = on('headlight') ? train.isLit(headX, env, zoom) : () => false;

      sky.draw(ctx, camera, time, env);
      land.drawBackground(ctx, camera, time, env);
      if (on('rain')) weather.drawFar(ctx, camera, time, lit, env);
      land.withLift(ctx, camera, 1, () => withView(ctx, zoom, () => {
        land.drawTrack(ctx, camera, time, env);
        if (on('light-spill')) train.drawLightSpill(ctx, headX, time, env);
        if (on('rain')) weather.drawGroundSplashes(ctx, camera, time, railY, env);
        train.draw(ctx, headX, head, time, env, portal);
        if (on('smoke')) steam.draw(ctx, camera, time, emitter, env);
        if (on('rain')) weather.drawRoofSplashes(ctx, time, train.roofSurfaces(headX), env);
        if (on('headlight')) train.drawHeadlight(ctx, headX, env);
      }));
      // Lapisan paling dekat kamera tidak digambar di dalam lubang portal,
      // supaya saat lubang memenuhi layar hasilnya sama persis dengan adegan berikutnya.
      const hole = portal && portal.rect;
      ctx.save();
      if (hole) {
        ctx.beginPath();
        ctx.rect(0, 0, width, height);
        ctx.rect(hole.x, hole.y, hole.w, hole.h);
        ctx.clip('evenodd');
      }
      land.withLift(ctx, camera, 1.3, () => withView(ctx, foregroundZoom, () => land.drawForeground(ctx, camera, env)));
      if (on('rain')) weather.drawNear(ctx, camera, time, lit, env);
      sky.drawVignette(ctx, env);
      ctx.restore();
      return { headX, portalRect: portal ? portal.rect || null : null };
    }
  };
}
