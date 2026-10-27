// SCENE 02 - INSIDE THE TRAIN
// Interior gerbong yang hangat. Penumpang duduk dekat jendela memandangi hujan,
// pemandangan malam bergerak di luar jendela, dan ruangan bergetar halus mengikuti rel.
// Di akhir adegan kamera mengarah ke jendela lalu menembusnya (transisi portal ke fajar).
import { createCameraTrack } from '../engine/camera.js';
import { createTrack } from '../engine/tracks.js';
import { createLayer } from '../engine/pixel.js';
import { clamp, lerp, smoothstep } from '../engine/math.js';

export function createScene({ film, scene, assets, environment }) {
  const interior = assets.pick(scene.assets, 'coach-interior');
  const countryside = assets.pick(scene.assets, 'countryside');
  const traveler = assets.pick(scene.assets, 'character');
  const train = countryside.train;
  const cam = scene.camera;
  const outside = createCameraTrack(film.cameraTracks[cam.windowView.track], { headAt: train.headAt, fps: film.fps, totalFrames: film.totalFrames });
  const pan = createTrack(cam.panKeys, 0);
  const person = scene.characters.traveler;
  const look = createTrack(person.lookKeys, 0);
  const effects = scene.environment.effects;
  const target = interior.glassRect(cam.focusWindow);
  const exterior = createLayer(film.width, film.height);

  return {
    supportsPortal: true,

    render(ctx, shot) {
      const { frame, time } = shot;
      const env = environment.at(frame);
      const distance = train.headAt(time);
      // getaran 1 piksel saat roda depan dan belakang gerbong melewati sambungan rel
      const shake = effects.includes('vibration') ? Math.max(train.bob(distance, 2), train.bob(distance, 5)) : 0;
      let view = { s: 1, ox: Math.round(pan(frame)), oy: shake };
      let glassFade = 1;

      if (shot.portal) {
        const z = shot.portal.zoom;
        const wx = target.x + target.w / 2;
        const wy = target.y + target.h / 2;
        const k = smoothstep(clamp(Math.log(z) / Math.log(cam.centerByZoom), 0, 1));
        const fx = lerp(view.ox + wx, film.width / 2, k);
        const fy = lerp(view.oy + wy, film.height / 2, k);
        view = { s: z, ox: fx - wx * z, oy: fy - wy * z };
        // kamera menembus kaca: tetesan, pantulan, dan cahaya lampu memudar
        glassFade = clamp(1 - (z - 1) / 2.5, 0, 1);
      }

      // pemandangan luar dirender sekali, lalu ditampilkan di setiap kaca jendela
      countryside.render(exterior.ctx, { time, camera: outside(frame), env, effects: cam.windowView.effects });
      let portalRect = null;
      interior.render(ctx, {
        time, env, view, glassFade,
        droplets: effects.includes('rain-on-glass'),
        flicker: effects.includes('lamp-flicker'),
        windowContent(c, rect, w) {
          if (shot.portal && w.id === target.id) {
            portalRect = rect;
            shot.portal.drawInside(c, rect);
            return;
          }
          const x0 = clamp(rect.x, 0, film.width);
          const y0 = clamp(rect.y, 0, film.height);
          const x1 = clamp(rect.x + rect.w, 0, film.width);
          const y1 = clamp(rect.y + rect.h, 0, film.height);
          if (x1 > x0 && y1 > y0) c.drawImage(exterior.canvas, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
        },
        drawPassenger(c) {
          traveler.drawSeated(c, person.seat.x, person.seat.y, traveler.poseAt(time, look(frame), person.motion));
        }
      });
      return { portalRect };
    }
  };
}
