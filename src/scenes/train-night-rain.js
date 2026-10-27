// Adegan Tahap 1: kereta uap melintasi pedesaan pada malam hari ketika hujan.
// Tetap dipertahankan sebagai prototipe. Sejak Tahap 2 adegan ini memakai set pedesaan
// yang sama dengan film multi-adegan, dan hasil render-nya tetap identik dengan Tahap 1.
import { createTrain } from '../assets/train.js';
import { createCountryside } from '../assets/countryside.js';
import { createPaletteRamp, NIGHT, DAWN } from '../assets/palette.js';
import { followCamera } from '../engine/camera.js';

const NIGHT_ENV = { dawn: 0, rain: 1, fog: 0, clouds: 0, lights: 1, sun: 0, rainAt: () => 1 };

export function createScene({ film }) {
  const { width, height, seed } = film;
  const p = film.sceneParams;
  const train = createTrain({ seed, railY: p.railY, motion: p.train });
  const countryside = createCountryside({
    width, height, seed, railY: p.railY, rain: p.rain, smoke: p.smoke, train,
    ramp: createPaletteRamp(NIGHT, DAWN)
  });

  return {
    render(ctx, { time }) {
      const camera = followCamera({ targetX: train.headAt(time), time, ...p.camera });
      countryside.render(ctx, { time, camera, env: NIGHT_ENV });
    }
  };
}
