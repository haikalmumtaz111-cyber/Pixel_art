// Adegan: kereta uap melintasi pedesaan pada malam hari ketika hujan.
// Adegan hanya menyusun aset dan menentukan urutan gambar (dari paling jauh ke paling dekat).
// Semua gerakan dihitung dari waktu (time = frame / fps), jadi frame mana pun bisa dirender langsung.
import { createSky } from '../assets/sky.js';
import { createLandscape } from '../assets/landscape.js';
import { createTrain } from '../assets/train.js';
import { createRain } from '../assets/rain.js';
import { createSmoke } from '../assets/smoke.js';
import { followCamera } from '../engine/camera.js';

export function createScene(config) {
  const { width, height, seed } = config;
  const p = config.sceneParams;
  const railY = p.railY;

  const sky = createSky({ width, height, seed, horizonY: railY - 30 });
  const land = createLandscape({ width, height, seed, railY });
  const train = createTrain({ seed, railY });
  const rain = createRain({ width, height, seed, ...p.rain });
  const smoke = createSmoke({ seed, ...p.smoke });

  // Kereta bergerak dengan kecepatan tetap. headAt(t) = posisi dunia ujung depan lokomotif.
  const headAt = (t) => p.train.startX + p.train.speed * t;

  return {
    render(ctx, { time }) {
      const head = headAt(time);
      const camera = followCamera({ targetX: head, time, ...p.camera });
      const headX = Math.round(head - camera.x);
      const lit = train.isLit(headX);

      sky.draw(ctx, camera, time);
      land.drawBackground(ctx, camera, time);
      rain.drawFar(ctx, camera, time, lit);
      land.drawTrack(ctx, camera, time);
      train.drawLightSpill(ctx, headX, time);
      rain.drawGroundSplashes(ctx, camera, time, railY);
      train.draw(ctx, headX, head, time);
      smoke.draw(ctx, camera, time, (t) => ({ x: headAt(t) + train.stackOffset.x, y: train.stackOffset.y }));
      rain.drawRoofSplashes(ctx, time, train.roofSurfaces(headX));
      train.drawHeadlight(ctx, headX);
      land.drawForeground(ctx, camera);
      rain.drawNear(ctx, camera, time, lit);
      sky.drawVignette(ctx);
    }
  };
}
