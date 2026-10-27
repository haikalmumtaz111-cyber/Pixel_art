// SCENE 01 - NIGHT TRAIN
// Kereta melaju melewati pedesaan pada malam hujan. Kamera mengikuti kereta,
// lalu di akhir adegan mendekati jendela penumpang (transisi portal ke interior).
import { createCameraTrack } from '../engine/camera.js';
import { clamp, lerp, smoothstep } from '../engine/math.js';

export function createScene({ film, scene, assets, environment }) {
  const countryside = assets.pick(scene.assets, 'countryside');
  const train = countryside.train;
  const camera = createCameraTrack(scene.camera, { headAt: train.headAt, fps: film.fps, totalFrames: film.totalFrames });
  const focus = scene.camera.focusWindow;
  const effects = scene.environment.effects;

  return {
    supportsPortal: true,

    render(ctx, shot) {
      const env = environment.at(shot.frame);
      const cam = camera(shot.frame);
      if (!shot.portal) return countryside.render(ctx, { time: shot.time, camera: cam, env, effects });

      // Zoom ke arah jendela penumpang. Titik fokus perlahan digeser ke tengah layar.
      const headX = Math.round(train.headAt(shot.time) - cam.x);
      const win = train.windowRect(headX, focus.coach, focus.window);
      const wx = win.x + win.w / 2;
      const wy = win.y + win.h / 2 - Math.round(cam.y);
      const z = shot.portal.zoom;
      const k = smoothstep(clamp(Math.log(z) / Math.log(scene.camera.centerByZoom), 0, 1));
      const fx = lerp(wx, film.width / 2, k);
      const fy = lerp(wy, film.height / 2, k);
      const zoom = { s: z, ox: fx - wx * z, oy: fy - wy * z };
      // semak di depan kamera lebih dekat, jadi membesar lebih cepat dan keluar layar duluan
      const fz = 1 + (z - 1) * 1.6;
      const foregroundZoom = { s: fz, ox: fx - wx * fz, oy: fy - wy * fz };
      return countryside.render(ctx, {
        time: shot.time, camera: cam, env, effects, zoom, foregroundZoom,
        portal: { coach: focus.coach, window: focus.window, drawInside: shot.portal.drawInside }
      });
    }
  };
}
