// Aset lingkungan umum yang bisa dipakai proyek apa pun:
// langit gradasi + matahari, punggung bukit/gunung, awan bergerak, burung, partikel (uap/asap), dan berkas cahaya.
// Semua aset mengikuti kontrak entitas: size(e, fc) dan draw(ctx, e, fc) dalam koordinat lokal.
import { createLayer, rect, pixel, disc, bayer, blit, hexToRgb } from '../../engine/pixel.js';
import { clamp, mod, lerp } from '../../engine/math.js';
import { hash, fbm1D } from '../../engine/random.js';
import { pick, perPalette } from './colors.js';

// ---------- langit ----------
function gradientSky(def, { width, height }) {
  const horizon = def.horizon ?? 180;
  const sunRadius = def.sunRadius ?? 12;
  const glow = def.sunGlow ?? 26;
  const sprites = perPalette((pal) => {
    const sky = createLayer(width, height);
    const colors = (pal[def.colors || 'sky'] || ['#ff00ff']).map(hexToRgb);
    const image = sky.ctx.createImageData(width, height);
    const last = colors.length - 1;
    for (let y = 0; y < height; y++) {
      const t = clamp(y / horizon, 0, 1) * last;
      const base = Math.floor(t);
      const frac = t - base;
      for (let x = 0; x < width; x++) {
        const c = colors[Math.min(last, frac > bayer(x, y) ? base + 1 : base)];
        const i = (y * width + x) * 4;
        image.data[i] = c[0]; image.data[i + 1] = c[1]; image.data[i + 2] = c[2]; image.data[i + 3] = 255;
      }
    }
    sky.ctx.putImageData(image, 0, 0);
    const size = sunRadius + glow;
    const sun = createLayer(size * 2 + 1, size * 2 + 1);
    for (let dy = -size; dy <= size; dy++) {
      for (let dx = -size; dx <= size; dx++) {
        const d = Math.hypot(dx, dy);
        if (d <= sunRadius + 0.3) rect(sun.ctx, dx + size, dy + size, 1, 1, d < sunRadius * 0.6 ? pal.sunCore : pal.sun);
        else if (d < size) {
          const v = 1 - (d - sunRadius) / glow;
          if (bayer(dx + size, dy + size) < v * v * 0.6) rect(sun.ctx, dx + size, dy + size, 1, 1, v > 0.55 ? pal.sunGlow : pal.sunGlowFar);
        }
      }
    }
    return { sky, sun, sunSize: size };
  });
  return {
    size: () => ({ w: width, h: height }),
    draw(ctx, e, fc) {
      const s = sprites(fc.pal);
      blit(ctx, s.sky.canvas, 0, 0);
      const sunX = e.params.sunX ?? def.sunX;
      const sunY = e.params.sunY ?? def.sunY;
      if (sunX !== undefined) blit(ctx, s.sun.canvas, Math.round(sunX) - s.sunSize, Math.round(sunY) - s.sunSize);
    }
  };
}

// ---------- punggung bukit / gunung ----------
function ridge(def) {
  const seed = (def.seedOffset || 0) + 4321;
  const surface = (wx) => {
    let n = fbm1D(seed, wx * (def.freq ?? 1 / 70), 3);
    if (def.shape === 'ridged') n = Math.pow(1 - Math.abs(2 * n - 1), 1.4);
    let y = (def.base ?? 180) - (def.amp ?? 30) * n;
    if (def.shape === 'volcano') {
      // kerucut gunung berapi dengan kawah datar di puncak
      const d = Math.abs(wx - def.peakX);
      const cone = def.peakY + Math.max(0, d - (def.crater ?? 6)) * (def.slope ?? 0.42) + (fbm1D(seed + 7, wx / 9, 2) - 0.5) * 3;
      y = Math.min(y, cone);
    }
    return Math.round(y);
  };
  return {
    size: () => ({ w: 0, h: 0 }),
    draw(ctx, e, fc) {
      const color = pick(fc, def.color || 'mountain');
      const rim = pick(fc, def.rim || 'mountainRim');
      const bottom = def.bottom ?? 270;
      for (let x = Math.floor(e.local.x0); x < Math.ceil(e.local.x1); x++) {
        const y = surface(x);
        rect(ctx, x, y, 1, bottom - y, color);
        rect(ctx, x, y, 1, surface(x - 1) > y ? 2 : 1, rim); // lereng menghadap matahari pagi (kiri) lebih terang
      }
    }
  };
}

// ---------- awan ----------
function cloudField(def) {
  const count = def.count ?? 6;
  const span = def.span ?? 900;
  const seed = (def.seedOffset || 0) + 777;
  const shapes = [...Array(count)].map((_, i) => {
    const puffs = 3 + Math.floor(hash(seed, i, 1) * 3);
    const w = 30 + Math.floor(hash(seed, i, 2) * 40);
    return {
      x0: hash(seed, i, 3) * span,
      y: (def.yMin ?? 20) + Math.floor(hash(seed, i, 4) * ((def.yMax ?? 90) - (def.yMin ?? 20))),
      speed: (def.speed ?? 3) * (0.7 + 0.6 * hash(seed, i, 5)),
      w,
      puffs: [...Array(puffs)].map((__, k) => ({ x: Math.round((k + 0.5) * (w / puffs)), r: 5 + Math.floor(hash(seed, i * 10 + k, 6) * 7) }))
    };
  });
  const sprites = perPalette((pal) => shapes.map((c) => {
    const maxR = Math.max(...c.puffs.map((p) => p.r));
    const layer = createLayer(c.w + maxR * 2 + 2, maxR * 2 + 4);
    const base = maxR * 2;
    for (const p of c.puffs) disc(layer.ctx, p.x + maxR, base - p.r, p.r, pal.cloud);
    for (const p of c.puffs) disc(layer.ctx, p.x + maxR - 1, base - p.r - 2, Math.max(2, p.r - 3), pal.cloudLight);
    layer.ctx.clearRect(0, base + 1, layer.width, layer.height);
    rect(layer.ctx, maxR - 2, base - 1, c.w + 4, 2, pal.cloudShade);
    return { layer, base };
  }));
  return {
    size: () => ({ w: 0, h: 0 }),
    draw(ctx, e, fc) {
      const list = sprites(fc.pal);
      shapes.forEach((c, i) => {
        const x = mod(c.x0 + fc.time * c.speed - e.local.x0, span) + e.local.x0 - 80;
        blit(ctx, list[i].layer.canvas, Math.round(x), c.y - list[i].base);
      });
    }
  };
}

// ---------- burung ----------
const WINGS = [
  [[-2, -1], [-1, 0], [1, 0], [2, -1]],
  [[-2, 0], [-1, 0], [1, 0], [2, 0]],
  [[-2, 1], [-1, 0], [1, 0], [2, 1]]
];
function birds(def) {
  const count = def.count ?? 5;
  const seed = (def.seedOffset || 0) + 991;
  return {
    size: () => ({ w: 0, h: 0 }),
    draw(ctx, e, fc) {
      const color = pick(fc, def.color || 'bird');
      if ((def.mode || 'fly') === 'fly') {
        for (let i = 0; i < count; i++) {
          // kawanan terbang bersama: tiap burung sedikit tertinggal dari burung di depannya
          const t = fc.time - i * 0.12;
          const x = Math.round((def.speed ?? 40) * t + (hash(seed, i, 1) - 0.5) * (def.spread ?? 30) - i * 7);
          const y = Math.round(Math.sin(t * 1.7 + i) * 2 + (hash(seed, i, 2) - 0.5) * (def.spread ?? 30) * 0.4 + i * 2);
          const wing = WINGS[mod(Math.floor(t * (def.flapFps ?? 8) + i), 3)];
          pixel(ctx, x, y, color);
          for (const [dx, dy] of wing) pixel(ctx, x + dx, y + dy, color);
        }
      } else {
        // merpati di jalan: mematuk dan sesekali melompat kecil
        for (let i = 0; i < count; i++) {
          const x = Math.round(hash(seed, i, 3) * (def.spread ?? 40));
          const peck = Math.floor(fc.time * 2 + hash(seed, i, 4) * 4) % 4 === 0;
          const hop = Math.floor(fc.time * 0.7 + hash(seed, i, 5) * 3) % 5 === 0 ? 1 : 0;
          const body = pick(fc, def.bodyColor || 'pigeon');
          rect(ctx, x, -3 - hop, 4, 2, body);
          rect(ctx, x + 1, -1 - hop, 2, 1, body);
          pixel(ctx, peck ? x + 4 : x + 3, peck ? -2 - hop : -4 - hop, color);
          pixel(ctx, x - 1, -3 - hop, color);
        }
      }
    }
  };
}

// ---------- partikel (uap, asap) ----------
function particles(def) {
  const seed = (def.seedOffset || 0) + 313;
  const rate = def.rate ?? 6;
  const life = def.life ?? 2;
  return {
    size: () => ({ w: 0, h: 0 }),
    draw(ctx, e, fc) {
      const colors = (def.colors || ['steam']).map((k) => pick(fc, k));
      const t = fc.time;
      // sinceFrame (parameter entitas): partikel yang "lahir" sebelum frame ini tidak ada,
      // jadi uap mulai dari nol saat muncul, bukan langsung berupa kolom penuh
      const since = e.params.sinceFrame !== undefined ? e.params.sinceFrame / fc.fps : -Infinity;
      const first = Math.max(Math.ceil((t - life) * rate), Math.ceil(since * rate));
      const last = Math.floor(t * rate);
      for (let n = first; n <= last; n++) {
        const age = t - n / rate;
        if (age < 0 || age > life) continue;
        const k = age / life;
        const x = (def.vx ?? 4) * age + (hash(seed, n, 1) - 0.5) * (def.spread ?? 6) * k + Math.sin(age * 3 + n) * k * 1.5;
        const y = (def.vy ?? -14) * age;
        const r = Math.round(lerp(def.size0 ?? 1, def.size1 ?? 4, k));
        ctx.globalAlpha = (def.alpha ?? 0.8) * (k < 0.5 ? 1 : k < 0.8 ? 0.6 : 0.3);
        disc(ctx, Math.round(x), Math.round(y), r, colors[Math.min(colors.length - 1, Math.floor(k * colors.length))]);
      }
      ctx.globalAlpha = 1;
    }
  };
}

// ---------- berkas cahaya matahari ----------
function lightRays(def) {
  return {
    size: () => ({ w: 0, h: 0 }),
    draw(ctx, e, fc) {
      const intensity = clamp(e.params.intensity ?? (def.track ? fc.env[def.track] ?? 0 : 1), 0, 1);
      if (intensity <= 0) return;
      const color = pick(fc, def.color || 'ray');
      const slope = def.slope ?? 0.6;
      const length = def.length ?? 160;
      // transparansi dibuat bertingkat agar tetap bergaya pixel art
      ctx.globalAlpha = Math.round(intensity * (def.alpha ?? 0.14) * 20) / 20;
      for (let i = 0; i < (def.count ?? 5); i++) {
        const w = (def.width ?? 10) + Math.floor(hash(91, i, 1) * 8);
        const x0 = i * (def.spacing ?? 46);
        for (let y = 0; y < length; y += 1) rect(ctx, Math.round(x0 + y * slope), y, w, 1, color);
      }
      ctx.globalAlpha = 1;
    }
  };
}

export const assetTypes = {
  'gradient-sky': { create: (def, ctx) => gradientSky(def, ctx) },
  ridge: { create: (def) => ridge(def) },
  'cloud-field': { create: (def) => cloudField(def) },
  birds: { create: (def) => birds(def) },
  particles: { create: (def) => particles(def) },
  'light-rays': { create: (def) => lightRays(def) }
};
