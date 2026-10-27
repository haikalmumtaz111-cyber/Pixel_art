// Alat gambar dasar pixel art.
// Semua koordinat dibulatkan ke bilangan bulat supaya tidak ada anti-aliasing,
// sehingga gambar selalu tajam dan hasilnya sama persis di setiap render.
//
// View (opsional) dipakai untuk zoom kamera: posisi layar = o + posisi * s.
// Bentuk tidak diperbesar seperti foto, melainkan digambar ulang di resolusi asli,
// jadi tepinya tetap tajam walau di-zoom.

export function createLayer(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx, width, height };
}

// Jalankan fn dengan view tertentu, lalu kembalikan view sebelumnya.
// view = { s, ox, oy } atau null (tanpa zoom).
export function withView(ctx, view, fn) {
  const previous = ctx.pixelView || null;
  ctx.pixelView = view || null;
  try {
    return fn();
  } finally {
    ctx.pixelView = previous;
  }
}

export function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  const v = ctx.pixelView;
  if (!v) {
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    return;
  }
  const x0 = Math.round(v.ox + x * v.s);
  const y0 = Math.round(v.oy + y * v.s);
  ctx.fillRect(x0, y0, Math.round(v.ox + (x + w) * v.s) - x0, Math.round(v.oy + (y + h) * v.s) - y0);
}

export function pixel(ctx, x, y, color) {
  if (ctx.pixelView) {
    rect(ctx, Math.round(x), Math.round(y), 1, 1, color);
    return;
  }
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}

// Posisi persegi di layar (setelah view dan geseran kanvas), dibulatkan sama seperti rect().
export function screenRect(ctx, x, y, w, h) {
  const v = ctx.pixelView;
  const m = ctx.getTransform();
  const map = (px, py) => (v ? [v.ox + px * v.s, v.oy + py * v.s] : [px, py]);
  const [ax, ay] = map(x, y);
  const [bx, by] = map(x + w, y + h);
  const x0 = Math.round(ax) + Math.round(m.e);
  const y0 = Math.round(ay) + Math.round(m.f);
  return { x: x0, y: y0, w: Math.round(bx) + Math.round(m.e) - x0, h: Math.round(by) + Math.round(m.f) - y0 };
}

// Garis 1 piksel dengan algoritma Bresenham. Saat di-zoom, ketebalannya ikut membesar.
export function line(ctx, x0, y0, x1, y1, color) {
  ctx.fillStyle = color;
  let size = 1;
  const v = ctx.pixelView;
  if (v) {
    size = Math.max(1, Math.round(v.s));
    [x0, y0, x1, y1] = [v.ox + x0 * v.s, v.oy + y0 * v.s, v.ox + x1 * v.s, v.oy + y1 * v.s];
  }
  x0 = Math.round(x0); y0 = Math.round(y0);
  x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    ctx.fillRect(x0, y0, size, size);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

// Lingkaran penuh bergaya pixel art.
export function disc(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  const v = ctx.pixelView;
  if (v) {
    // lingkaran digambar ulang pada ukuran besar, bukan diperbesar kotak-kotak
    const ccx = v.ox + (Math.round(cx) + 0.5) * v.s;
    const ccy = v.oy + (Math.round(cy) + 0.5) * v.s;
    const R = (r + 0.5) * v.s;
    for (let y = Math.floor(ccy - R); y < Math.ceil(ccy + R); y++) {
      const dy = y + 0.5 - ccy;
      if (Math.abs(dy) >= R) continue;
      const half = Math.sqrt(R * R - dy * dy);
      const x0 = Math.round(ccx - half);
      const x1 = Math.round(ccx + half);
      if (x1 > x0) ctx.fillRect(x0, y, x1 - x0, 1);
    }
    return;
  }
  cx = Math.round(cx); cy = Math.round(cy);
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt((r + 0.5) ** 2 - dy * dy));
    ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
}

// Tempel gambar (sprite atau petak) di posisi bulat. Saat di-zoom, ukurannya ikut view.
export function blit(ctx, image, x, y) {
  const v = ctx.pixelView;
  if (!v) {
    ctx.drawImage(image, x, y);
    return;
  }
  const x0 = Math.round(v.ox + x * v.s);
  const y0 = Math.round(v.oy + y * v.s);
  const x1 = Math.round(v.ox + (x + image.width) * v.s);
  const y1 = Math.round(v.oy + (y + image.height) * v.s);
  ctx.drawImage(image, x0, y0, x1 - x0, y1 - y0);
}

// Matriks Bayer 4x4 untuk dithering ala konsol 16-bit.
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// Ambang 0..1 untuk posisi piksel tertentu.
export function bayer(x, y) {
  return (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
}

// Topeng dither: piksel terlihat jika nilai Bayer-nya di bawah level (0..16).
// Dipakai transisi agar campuran dua gambar tetap berupa piksel tegas, bukan blur.
const maskCache = new Map();
export function ditherMask(width, height, level) {
  const key = `${width}x${height}:${level}`;
  if (!maskCache.has(key)) {
    const layer = createLayer(width, height);
    const image = layer.ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (BAYER4[(y & 3) * 4 + (x & 3)] < level) image.data[(y * width + x) * 4 + 3] = 255;
      }
    }
    layer.ctx.putImageData(image, 0, 0);
    maskCache.set(key, layer);
  }
  return maskCache.get(key);
}

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

export function mixHex(a, b, t) {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex(ca.map((v, i) => v + (cb[i] - v) * t));
}
