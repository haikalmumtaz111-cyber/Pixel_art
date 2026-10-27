// Penyaji frame (presenter). Ada dua cara memperbesar gambar 480x270 menjadi 1920x1080:
// - "ffmpeg" (bawaan): browser menyimpan frame beresolusi internal, FFmpeg memperbesar 4x nearest neighbor.
// - "browser": browser langsung menyusun frame 1920x1080. Cara ini dipakai bila kamera perlu zoom:
//   dunia tetap digambar di resolusi internal, lalu diperbesar nearest neighbor dengan faktor 4 x zoom.
//   Pada zoom bilangan "pas" (1, 1.25, 1.5, 2) setiap piksel art berukuran sama persis (4, 5, 6, 8 piksel layar).
//   Di antaranya, selisih ukuran paling banyak 1 piksel layar, tanpa blur dan tanpa anti-aliasing.
import { createLayer } from './pixel.js';

export function createPresenter(config) {
  const { width, height, outputWidth, outputHeight } = config;
  if ((config.rendering?.upscale || 'ffmpeg') !== 'browser') {
    return { mode: 'ffmpeg', frameWidth: width, frameHeight: height, cell: 1, draw: (ctx, drawWorld) => drawWorld(ctx) };
  }
  const world = createLayer(width, height);
  return {
    mode: 'browser',
    frameWidth: outputWidth,
    frameHeight: outputHeight,
    cell: outputWidth / width,
    // drawWorld menggambar dunia ke kanvas internal dan mengembalikan { zoom }.
    draw(ctx, drawWorld) {
      world.ctx.save();
      const result = drawWorld(world.ctx) || {};
      world.ctx.restore();
      const zoom = Math.max(1, result.zoom || 1);
      const sw = width / zoom;
      const sh = height / zoom;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(world.canvas, (width - sw) / 2, (height - sh) / 2, sw, sh, 0, 0, outputWidth, outputHeight);
      ctx.restore();
      return result;
    }
  };
}
