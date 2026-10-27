// Pustaka transisi yang bisa dipakai ulang di film mana pun.
// Setiap transisi menerima progress p (0 di frame awal transisi, 1 di frame akhir)
// dan dua adegan: from (adegan lama) dan to (adegan baru).
// Aturan penting: di p = 0 hasilnya sama persis dengan adegan lama,
// di p = 1 sama persis dengan adegan baru, jadi tidak ada lompatan gambar.
import { ditherMask } from './pixel.js';
import { clamp, ease } from './math.js';

const LEVELS = 16;

// Tempel `source` ke ctx di dalam kotak rect, dengan campuran dither level 0..16.
// cell = ukuran satu piksel art di kanvas frame (1 untuk kanvas internal, 4 untuk kanvas 1920x1080).
// gridMask (opsional) = topeng yang sudah selaras dengan grid art adegan tujuan (lihat film.js / presenter.js).
function drawDithered(ctx, source, level, rect, temp, width, height, cell = 1, gridMask = null) {
  const x0 = clamp(Math.floor(rect.x), 0, width);
  const y0 = clamp(Math.floor(rect.y), 0, height);
  const x1 = clamp(Math.ceil(rect.x + rect.w), 0, width);
  const y1 = clamp(Math.ceil(rect.y + rect.h), 0, height);
  const w = x1 - x0;
  const h = y1 - y0;
  if (w <= 0 || h <= 0 || level <= 0) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  if (level >= LEVELS) {
    ctx.drawImage(source, x0, y0, w, h, x0, y0, w, h);
  } else {
    const t = temp.ctx;
    t.clearRect(x0, y0, w, h);
    t.globalCompositeOperation = 'source-over';
    t.drawImage(source, x0, y0, w, h, x0, y0, w, h);
    t.globalCompositeOperation = 'destination-in';
    t.drawImage((gridMask || ditherMask(width, height, level, cell)).canvas, x0, y0, w, h, x0, y0, w, h);
    t.globalCompositeOperation = 'source-over';
    ctx.drawImage(temp.canvas, x0, y0, w, h, x0, y0, w, h);
  }
  ctx.restore();
}

const FULL = (width, height) => ({ x: 0, y: 0, w: width, h: height });

export const TRANSITIONS = {
  // Potong langsung di frame batas adegan. Disediakan untuk kebutuhan khusus.
  cut: {
    render({ ctx, frame, transition, drawFrom, drawTo }) {
      if (frame < transition.boundaryFrame) drawFrom(ctx);
      else drawTo(ctx);
      return { mix: frame < transition.boundaryFrame ? 0 : 1 };
    }
  },

  // Larut berdither: piksel adegan baru muncul bertahap mengikuti pola Bayer.
  dissolve: {
    render({ ctx, p, params, drawFrom, drawTo, buffers, width, height, cell, ditherMask }) {
      const level = Math.round(ease(params.easing || 'linear', p) * LEVELS);
      if (level <= 0) { drawFrom(ctx); return { mix: 0 }; }
      if (level >= LEVELS) { drawTo(ctx); return { mix: 1 }; }
      drawFrom(ctx);
      drawTo(buffers.next.ctx);
      // pola dither mengikuti grid art adegan tujuan, jadi satu piksel art tidak terbelah dua
      const gridMask = ditherMask ? ditherMask(level) : null;
      drawDithered(ctx, buffers.next.canvas, level, FULL(width, height), buffers.temp, width, height, cell, gridMask);
      return { mix: level / LEVELS };
    }
  },

  // Kamera menembus "jendela": adegan lama di-zoom ke arah sebuah lubang (jendela),
  // dan adegan baru terlihat di dalam lubang itu sampai memenuhi layar.
  // Adegan lama wajib mendukung portal (menggambar lubang lewat drawInside).
  portal: {
    requiresPortal: true,
    render({ ctx, p, params, drawFrom, drawTo, buffers, width, height, cell }) {
      if (p >= 1) { drawTo(ctx); return { zoom: params.zoom, mix: 1, covered: true }; }
      const zoom = Math.exp(Math.log(params.zoom) * ease(params.easing || 'inOutCubic', p));
      const [m0, m1] = params.mix || [0, 0];
      const mix = m1 > m0 ? clamp((p - m0) / (m1 - m0), 0, 1) : p >= m0 ? 1 : 0;
      const level = Math.round(mix * LEVELS);
      if (zoom === 1 && level === 0) { drawFrom(ctx); return { zoom, mix: 0, covered: false }; }

      drawTo(buffers.next.ctx);
      let rect = null;
      const drawInside = (target, r) => {
        rect = r;
        drawDithered(target, buffers.next.canvas, level, r, buffers.temp, width, height, cell);
      };
      drawFrom(ctx, { portal: { zoom, progress: p, drawInside } });
      const covered = Boolean(rect && rect.x <= 0 && rect.y <= 0 && rect.x + rect.w >= width && rect.y + rect.h >= height);
      return { zoom, mix, rect, covered };
    }
  }
};
