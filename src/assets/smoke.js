// Aset prosedural asap cerobong. Setiap kepulan lahir pada waktu tetap (n x interval)
// di posisi cerobong saat itu, lalu tertiup angin ke belakang, naik, dan membesar.
import { disc } from '../engine/pixel.js';
import { hash } from '../engine/random.js';

export function createSmoke({ seed, interval, life, wind }) {
  return {
    // emitterAt(t) mengembalikan posisi dunia puncak cerobong pada waktu t.
    draw(ctx, camera, time, emitterAt, env) {
      const colors = env.pal.smoke;
      const first = Math.ceil((time - life) / interval);
      const last = Math.floor(time / interval);
      for (let n = first; n <= last; n++) {
        const born = n * interval;
        const age = time - born;
        if (age < 0 || age > life) continue;
        const k = age / life;
        const origin = emitterAt(born);
        // tiap kepulan punya ukuran, arah, dan goyangan sendiri supaya tidak seragam
        const swirl = Math.sin(age * 4 + hash(seed, n, 4) * 6.28) * 2.5 * k;
        const x = origin.x - wind * age + (hash(seed, n, 1) - 0.5) * 16 * k + swirl;
        const y = origin.y - 24 * age + 5 * age * age + (hash(seed, n, 2) - 0.5) * 14 * k;
        const r = Math.round(1.5 + 7.5 * Math.sqrt(k) * (0.65 + 0.7 * hash(seed, n, 3)));
        const sx = Math.round(x - camera.x);
        const sy = Math.round(y);
        ctx.globalAlpha = k < 0.4 ? 0.95 : k < 0.7 ? 0.7 : 0.4;
        disc(ctx, sx - 1, sy + 1, r, colors[0]);
        disc(ctx, sx, sy, r, colors[1]);
        disc(ctx, sx + 1, sy - 1, Math.max(1, r - 2), colors[2]);
        if (r > 4) disc(ctx, sx + 2, sy - 2, r - 4, colors[3]);
      }
      ctx.globalAlpha = 1;
    }
  };
}
