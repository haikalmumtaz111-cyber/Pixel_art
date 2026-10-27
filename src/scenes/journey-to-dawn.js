// SCENE 03 - JOURNEY TO DAWN
// Kamera keluar dari jendela, perlahan melambat dan menengadah, lalu kereta menyalip masuk
// ke dalam bingkai menuju matahari terbit. Hujan reda, awan terbuka, kabut muncul di lembah.
// Perubahan langit dan cuaca diatur track "environment" di timeline, bukan di file ini.
import { createCameraTrack } from '../engine/camera.js';

export function createScene({ film, scene, assets, environment }) {
  const countryside = assets.pick(scene.assets, 'countryside');
  const train = countryside.train;
  const camera = createCameraTrack(film.cameraTracks[scene.camera.track], { headAt: train.headAt, fps: film.fps, totalFrames: film.totalFrames });
  const effects = scene.environment.effects;

  return {
    render(ctx, shot) {
      const cam = camera(shot.frame);
      // zoom lensa pecahan (scene.lens): setiap lapisan parallax ke kanvas sendiri agar grid piksel tidak merayap
      const layer = shot.surface?.wantsLayers(shot.lens) ? (fx, fy) => shot.surface.layer(Math.round(cam.x * fx), Math.round((cam.y || 0) * fy)) : null;
      return countryside.render(ctx, { time: shot.time, camera: cam, env: environment.at(shot.frame), effects, layer });
    }
  };
}
