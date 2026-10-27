// Penyaji frame (presenter). Ada dua cara memperbesar gambar 480x270 menjadi 1920x1080:
// - "ffmpeg" (bawaan): browser menyimpan frame beresolusi internal, FFmpeg memperbesar 4x nearest neighbor.
// - "browser": browser langsung menyusun frame 1920x1080. Cara ini dipakai bila kamera perlu zoom:
//   dunia tetap digambar di resolusi internal, lalu diperbesar tanpa blur sesuai mode zoom
//   (rendering.zoomMode, lihat pixel-grid.js): "anchored" (bawaan), "steps", atau "nearest" (Tahap 3).
//
// Mode "anchored" butuh tahu geseran setiap lapisan, supaya ukuran piksel menempel pada gambar, bukan pada layar.
// Karena itu adegan menerima `surface`: bila surface.wantsLayers(zoom) bernilai true, adegan menggambar setiap
// lapisan ke kanvas sendiri lewat surface.layer(geseranX, geseranY). Adegan yang tidak memakai surface
// (adegan kustom) tetap menggambar ke satu kanvas, dan boleh mengembalikan anchor: [x, y] untuk geseran kameranya.
// Di zoom kelipatan 0,25 tidak ada lapisan terpisah: hasilnya sama persis dengan cara Tahap 3.
import { createLayer } from './pixel.js';
import { axisMap, cellOf, mergeRuns, coverIndex } from './pixel-grid.js';

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export function createPresenter(config) {
  const { width, height, outputWidth, outputHeight } = config;
  if ((config.rendering?.upscale || 'ffmpeg') !== 'browser') {
    return {
      mode: 'ffmpeg', zoomMode: null, frameWidth: width, frameHeight: height, cell: 1,
      draw: (ctx, drawWorld) => drawWorld(ctx) || {},
      gridInfo: () => null,
      ditherGrid: () => null
    };
  }
  const zoomMode = config.rendering?.zoomMode || 'anchored';
  // diagnosis: zoomLayers = false memaksa satu kanvas (pola menempel layar), dipakai lab untuk perbandingan
  const perLayer = config.rendering?.zoomLayers !== false;
  const cell = outputWidth / width;
  const world = createLayer(width, height);
  const strip = createLayer(outputWidth, height);
  const pool = [];
  let used = 0;
  let last = null; // info grid dari gambar terakhir (untuk transisi dan laporan)

  const fractional = (zoom) => {
    const x = cellOf(cell, zoom, zoomMode);
    const y = cellOf(outputHeight / height, zoom, zoomMode);
    return x.f > 0 || y.f > 0;
  };

  const surface = {
    wantsLayers: (zoom) => zoomMode === 'anchored' && perLayer && fractional(zoom || 1),
    // kanvas transparan untuk satu lapisan dengan geseran (anchor) tertentu
    layer(ax, ay) {
      if (!pool[used]) pool[used] = createLayer(width, height);
      const layer = pool[used++];
      layer.anchor = [ax, ay];
      layer.ctx.setTransform(1, 0, 0, 1, 0, 0);
      layer.ctx.globalAlpha = 1;
      layer.ctx.clearRect(0, 0, width, height);
      return layer.ctx;
    }
  };

  const maps = (zoom, [ax, ay]) => ({
    x: axisMap({ size: width, outSize: outputWidth, zoom, anchor: ax, mode: zoomMode, axis: 'x' }),
    y: axisMap({ size: height, outSize: outputHeight, zoom, anchor: ay, mode: zoomMode, axis: 'y' })
  });

  // Gambar kanvas internal ke layar sesuai pemetaan per sumbu: dua tahap (kolom lalu baris),
  // setiap potongan diperbesar dengan faktor bulat, jadi tidak ada piksel yang dicampur.
  function blitMapped(ctx, source, m) {
    strip.ctx.setTransform(1, 0, 0, 1, 0, 0);
    strip.ctx.clearRect(0, 0, outputWidth, height);
    for (const r of mergeRuns(m.x)) strip.ctx.drawImage(source, r.s, 0, r.n, height, r.d, 0, r.n * r.w, height);
    for (const r of mergeRuns(m.y)) ctx.drawImage(strip.canvas, 0, r.s, outputWidth, r.n, 0, r.d, outputWidth, r.n * r.w);
  }

  return {
    mode: 'browser',
    zoomMode,
    frameWidth: outputWidth,
    frameHeight: outputHeight,
    cell,
    // drawWorld(ctx, surface) menggambar dunia dan mengembalikan { zoom, anchor? }.
    draw(ctx, drawWorld) {
      used = 0;
      world.ctx.save();
      const result = drawWorld(world.ctx, surface) || {};
      world.ctx.restore();
      const zoom = Math.max(1, result.zoom || 1);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = false;
      const layers = pool.slice(0, used);
      if (zoomMode === 'nearest') {
        // cara Tahap 3: potongan tengah diperbesar langsung (ukuran piksel bisa campur 4/5 dan ikut layar)
        const sw = width / zoom;
        const sh = height / zoom;
        ctx.drawImage(world.canvas, (width - sw) / 2, (height - sh) / 2, sw, sh, 0, 0, outputWidth, outputHeight);
        last = { zoomMode, zoom, layers: [[0, 0]] };
      } else if (!layers.length && !fractional(zoom)) {
        // ukuran piksel bulat: satu kali perbesaran (identik dengan cara Tahap 3 di zoom kelipatan 0,25)
        const { c } = cellOf(cell, zoom, zoomMode);
        const sw = outputWidth / c;
        const sh = outputHeight / c;
        ctx.drawImage(world.canvas, width / 2 - sw / 2, height / 2 - sh / 2, sw, sh, 0, 0, outputWidth, outputHeight);
        last = { zoomMode, zoom, layers: [[0, 0]] };
      } else if (layers.length) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, outputWidth, outputHeight);
        for (const layer of layers) blitMapped(ctx, layer.canvas, maps(zoom, layer.anchor));
        last = { zoomMode, zoom, layers: layers.map((l) => l.anchor) };
      } else {
        const anchor = result.anchor || [0, 0];
        blitMapped(ctx, world.canvas, maps(zoom, anchor));
        last = { zoomMode, zoom, layers: [anchor] };
      }
      ctx.restore();
      return result;
    },
    // info grid gambar terakhir: mode, zoom, dan geseran setiap lapisan
    gridInfo: () => last,
    // Topeng dither yang selaras dengan grid art gambar terakhir (adegan tujuan transisi).
    // null = pakai topeng lama berukuran sel tetap (mode "nearest", sama dengan Tahap 3).
    ditherGrid() {
      if (!last || zoomMode === 'nearest') return null;
      const m = maps(last.zoom, [0, 0]);
      return { cols: coverIndex(m.x, outputWidth), rows: coverIndex(m.y, outputHeight), key: `${last.zoom}` };
    }
  };
}

// Topeng dither berbasis indeks grid: piksel layar terlihat bila nilai Bayer sel art-nya di bawah level.
const gridMaskCache = new Map();
export function gridDitherMask(grid, width, height, level) {
  const key = `${grid.key}:${level}:${width}x${height}`;
  if (!gridMaskCache.has(key)) {
    if (gridMaskCache.size > 64) gridMaskCache.clear();
    const layer = createLayer(width, height);
    const image = layer.ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      const ry = (grid.rows[y] & 3) * 4;
      for (let x = 0; x < width; x++) if (BAYER4[ry + (grid.cols[x] & 3)] < level) image.data[(y * width + x) * 4 + 3] = 255;
    }
    layer.ctx.putImageData(image, 0, 0);
    gridMaskCache.set(key, layer);
  }
  return gridMaskCache.get(key);
}
