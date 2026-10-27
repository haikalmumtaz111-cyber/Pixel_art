// Aset prosedural pedesaan: gunung, bukit, rumah, pohon, kabut, tiang telegraf, rel, tanah, dan semak.
// Tiap lapisan punya faktor parallax sendiri. Bentuknya dihitung dari posisi dunia,
// jadi pemandangan bisa memanjang tanpa batas dan tetap sama setiap kali dirender.
// Warna diambil dari palet yang sedang aktif (env.pal), sehingga bisa berubah dari malam ke fajar.
import { createLayer, rect, pixel, disc, bayer, blit } from '../engine/pixel.js';
import { layerOffset } from '../engine/camera.js';
import { hash, fbm1D } from '../engine/random.js';
import { mod } from '../engine/math.js';
import { lift } from './sky.js';

const MARGIN = 96; // tanah diperpanjang ke bawah supaya kamera bisa naik-turun tanpa celah

// Geser lapisan secara vertikal (bilangan bulat, jadi tetap tajam).
function withLift(ctx, camera, factor, fn) {
  const dy = lift(camera, factor);
  if (dy === 0) return fn();
  ctx.save();
  ctx.translate(0, -dy);
  try {
    return fn();
  } finally {
    ctx.restore();
  }
}

export function createLandscape({ width, height, seed, railY, ramp }) {
  const ridges = {
    mountains: { factor: 0.12, lift: 0.3, base: 160, amp: 44, freq: 1 / 80, ridged: true, color: 'mountain', rim: 'mountainRim', seed: seed + 101 },
    hillsFar: { factor: 0.3, lift: 0.5, base: 182, amp: 20, freq: 1 / 64, color: 'hillFar', rim: 'hillFarRim', seed: seed + 202 },
    hillsNear: { factor: 0.55, lift: 0.7, base: 197, amp: 13, freq: 1 / 46, color: 'hillNear', rim: 'hillNearRim', seed: seed + 303 }
  };
  const groundTop = railY + 14;

  // Sprite dan petak tekstur dibuat sekali untuk setiap anak tangga palet.
  const variants = new Map();
  const variant = (index) => {
    if (!variants.has(index)) {
      const pal = ramp.at(index);
      variants.set(index, {
        farTrees: [7, 9, 10, 12, 13].map((h, i) => buildPine(h, pal.treeFar, pal.treeFarLight, seed + i)),
        nearTrees: [
          ...[24, 30, 36, 42].map((h, i) => buildPine(h, pal.treeNear, pal.treeNearLight, seed + 40 + i)),
          ...[20, 26, 31].map((h, i) => buildRoundTree(h, pal.treeNear, pal.treeNearLight, seed + 60 + i))
        ],
        gravelTile: buildGravelTile(seed, 64, pal),
        groundTile: buildGroundTile(seed, 128, height - groundTop + MARGIN, pal)
      });
    }
    return variants.get(index);
  };

  function surfaceY(ridge, worldX) {
    let n = fbm1D(ridge.seed, worldX * ridge.freq, 3);
    if (ridge.ridged) n = Math.pow(1 - Math.abs(2 * n - 1), 1.4);
    return Math.round(ridge.base - ridge.amp * n);
  }

  function drawRidge(ctx, ridge, camera, pal) {
    const off = layerOffset(camera, ridge.factor);
    for (let sx = 0; sx < width; sx++) {
      const y = surfaceY(ridge, sx + off);
      const facesLight = surfaceY(ridge, sx + off + 1) > y; // lereng menghadap kanan terkena cahaya
      rect(ctx, sx, y, 1, groundTop + MARGIN - y, pal[ridge.color]);
      rect(ctx, sx, y, 1, facesLight ? 2 : 1, pal[ridge.rim]);
    }
    return off;
  }

  // Panggil fn untuk setiap sel dunia yang terlihat di layar.
  function forEachCell(off, cellSize, margin, fn) {
    const first = Math.floor((off - margin) / cellSize);
    const last = Math.floor((off + width + margin) / cellSize);
    for (let c = first; c <= last; c++) fn(c);
  }

  function drawHouses(ctx, off, time, pal) {
    forEachCell(off, 64, 12, (c) => {
      if (hash(seed, c, 50) > 0.4) return;
      const wx = c * 64 + 10 + Math.floor(hash(seed, c, 51) * 40);
      const gy = surfaceY(ridges.hillsFar, wx) + 2;
      const sx = wx - off;
      rect(ctx, sx, gy - 6, 7, 6, pal.house);
      for (let r = 0; r < 4; r++) rect(ctx, sx - 1 + r, gy - 7 - r, 9 - r * 2, 1, pal.house);
      const dim = hash(seed, c, Math.floor(time * 3) + 500) > 0.92;
      pixel(ctx, sx + 2, gy - 4, dim ? pal.houseWindowDim : pal.houseWindow);
      if (hash(seed, c, 52) > 0.5) pixel(ctx, sx + 4, gy - 4, pal.houseWindow);
    });
  }

  function drawFarTrees(ctx, off, sprites) {
    forEachCell(off, 9, 10, (c) => {
      if (hash(seed, c, 60) > 0.5) return;
      const wx = c * 9 + Math.floor(hash(seed, c, 61) * 5);
      const sprite = sprites[Math.floor(hash(seed, c, 62) * sprites.length)];
      const gy = surfaceY(ridges.hillsNear, wx) + 2;
      ctx.drawImage(sprite.canvas, wx - off - (sprite.width >> 1), gy - sprite.height);
    });
  }

  function drawNearTrees(ctx, camera, sprites) {
    const off = layerOffset(camera, 0.78);
    forEachCell(off, 22, 30, (c) => {
      if (hash(seed, c, 70) > 0.62) return;
      const wx = c * 22 + Math.floor(hash(seed, c, 71) * 12);
      const sprite = sprites[Math.floor(hash(seed, c, 72) * sprites.length)];
      ctx.drawImage(sprite.canvas, wx - off - (sprite.width >> 1), railY - 1 - sprite.height);
    });
  }

  // Kabut tipis berdither yang mengalir pelan. amount 0 = tidak ada kabut.
  function drawFog(ctx, camera, time, amount, band, pal) {
    if (amount <= 0) return;
    const off = layerOffset(camera, band.factor);
    for (let y = band.top; y < band.bottom; y++) {
      const profile = Math.sin((Math.PI * (y - band.top + 0.5)) / (band.bottom - band.top));
      ctx.fillStyle = y < band.top + (band.bottom - band.top) * 0.45 ? pal.fogLight : pal.fog;
      for (let x = 0; x < width; x++) {
        // noise berfrekuensi rendah: kabut berupa gumpalan memanjang yang lembut, bukan bintik acak
        const n = fbm1D(seed + band.salt, (x + off + time * band.drift) / 80, 2);
        if (bayer(x, y) < amount * profile * (0.3 + 0.7 * n)) ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  function drawPoles(ctx, camera, pal) {
    const off = layerOffset(camera, 0.9);
    const spacing = 118;
    const top = railY - 68;
    const first = Math.floor((off - 20) / spacing);
    const last = Math.floor((off + width + 20) / spacing);
    for (let k = first; k <= last; k++) {
      const sx = k * spacing + 30 - off;
      // kabel melengkung ke tiang berikutnya
      for (const arm of [-5, 6]) {
        for (let x = 0; x < spacing; x++) {
          const u = x / spacing;
          pixel(ctx, sx + arm + x, top + 3 + Math.round(7 * 4 * u * (1 - u)), pal.wire);
        }
      }
      rect(ctx, sx, top, 2, railY - 3 - top, pal.pole);
      rect(ctx, sx + 1, top, 1, railY - 3 - top, pal.poleLight);
      rect(ctx, sx - 6, top + 3, 14, 2, pal.pole);
      rect(ctx, sx - 6, top + 3, 14, 1, pal.poleLight);
      pixel(ctx, sx - 5, top + 2, pal.insulator);
      pixel(ctx, sx + 6, top + 2, pal.insulator);
    }
  }

  function drawPuddles(ctx, off, time, pal) {
    forEachCell(off, 100, 40, (c) => {
      if (hash(seed, c, 80) > 0.55) return;
      const cx = c * 100 + 20 + Math.floor(hash(seed, c, 81) * 60) - off;
      const cy = groundTop + 9 + Math.floor(hash(seed, c, 82) * 22);
      const rx = 9 + Math.floor(hash(seed, c, 83) * 11);
      const ry = 2 + Math.floor(hash(seed, c, 84) * 2);
      for (let dy = -ry; dy <= ry; dy++) {
        const half = Math.round(rx * Math.sqrt(1 - (dy / (ry + 0.5)) ** 2));
        rect(ctx, cx - half, cy + dy, half * 2 + 1, 1, dy === -ry ? pal.puddleLight : pal.puddle);
      }
      // riak air karena tetesan hujan
      for (let s = 0; s < 2; s++) {
        const period = 0.6 + hash(seed, c * 2 + s, 85) * 0.4;
        const age = mod(time + hash(seed, c * 2 + s, 86) * period, period);
        if (age > 0.45) continue;
        const r = 1 + age * 14;
        const px = cx + Math.round((hash(seed, c * 2 + s, 87) - 0.5) * rx);
        for (let dx = -Math.floor(r); dx <= Math.floor(r); dx++) {
          const dy = Math.round(r * 0.35 * Math.sqrt(Math.max(0, 1 - (dx / r) ** 2)));
          for (const yy of [cy - dy, cy + dy]) {
            const inside = ((px + dx - cx) / rx) ** 2 + ((yy - cy) / (ry + 0.5)) ** 2 < 1;
            if (inside) pixel(ctx, px + dx, yy, pal.puddleLight);
          }
        }
      }
    });
  }

  return {
    railY,
    withLift,

    // Semua lapisan di belakang kereta.
    // layer (opsional) = (faktorX, faktorY) -> kanvas: dipakai saat zoom pecahan agar setiap lapisan parallax
    // digambar ke kanvas sendiri (lihat presenter.js). Tanpa layer, semua digambar ke ctx seperti sebelumnya.
    drawBackground(ctx, camera, time, env, layer = null) {
      const pal = env.pal;
      const v = variant(env.palIndex);
      const at = (factor, liftFactor) => (layer ? layer(factor, liftFactor) : ctx);
      let c = at(ridges.mountains.factor, ridges.mountains.lift);
      withLift(c, camera, ridges.mountains.lift, () => drawRidge(c, ridges.mountains, camera, pal));
      c = at(ridges.hillsFar.factor, ridges.hillsFar.lift);
      withLift(c, camera, ridges.hillsFar.lift, () => {
        const farOff = drawRidge(c, ridges.hillsFar, camera, pal);
        drawHouses(c, farOff, time, pal);
      });
      c = at(0.42, 0.6);
      withLift(c, camera, 0.6, () => drawFog(c, camera, time, env.fog, { top: 172, bottom: 196, factor: 0.42, drift: 7, salt: 610 }, pal));
      c = at(ridges.hillsNear.factor, ridges.hillsNear.lift);
      withLift(c, camera, ridges.hillsNear.lift, () => {
        const nearOff = drawRidge(c, ridges.hillsNear, camera, pal);
        drawFarTrees(c, nearOff, v.farTrees);
      });
      c = at(0.8, 0.85);
      withLift(c, camera, 0.85, () => {
        drawNearTrees(c, camera, v.nearTrees);
        drawFog(c, camera, time, env.fog * 0.5, { top: 196, bottom: 212, factor: 0.8, drift: 12, salt: 620 }, pal);
      });
      c = at(0.92, 0.92);
      withLift(c, camera, 0.92, () => drawPoles(c, camera, pal));
    },

    // Rel, kerikil, dan tanah. Bergerak sejajar kereta (faktor 1). Mendukung zoom (view).
    drawTrack(ctx, camera, time, env) {
      const pal = env.pal;
      const v = variant(env.palIndex);
      const off = layerOffset(camera, 1);
      for (let x = -mod(off, v.gravelTile.width); x < width; x += v.gravelTile.width) blit(ctx, v.gravelTile.canvas, x, railY + 2);
      for (let x = -mod(off, v.groundTile.width); x < width; x += v.groundTile.width) blit(ctx, v.groundTile.canvas, x, groundTop);
      rect(ctx, 0, railY, width, 1, pal.rail);
      rect(ctx, 0, railY + 1, width, 1, pal.railShadow);
      forEachCell(off, 29, 0, (c) => {
        if (hash(seed, c, 90) > 0.55) pixel(ctx, c * 29 - off, railY, pal.railGlint);
      });
      drawPuddles(ctx, off, time, pal);
    },

    // Semak dan pagar di depan kamera, bergerak paling cepat (faktor 1.35).
    drawForeground(ctx, camera, env) {
      const pal = env.pal;
      const off = layerOffset(camera, 1.35);
      for (let sx = 0; sx < width; sx++) {
        const wx = sx + off;
        const h = 6 + Math.round(10 * fbm1D(seed + 505, wx / 16, 2)) + (hash(seed, wx, 91) > 0.82 ? 2 : 0);
        rect(ctx, sx, height - h, 1, h + MARGIN, pal.bush);
        pixel(ctx, sx, height - h, pal.bushLight);
      }
      forEachCell(off, 72, 10, (c) => {
        const sx = c * 72 - off;
        rect(ctx, sx, height - 34, 3, 34, pal.bush);
        rect(ctx, sx + 2, height - 34, 1, 34, pal.bushLight);
        rect(ctx, sx - 1, height - 35, 5, 1, pal.bushLight);
        for (const wy of [height - 27, height - 17]) {
          for (let x = 3; x < 72; x++) {
            const u = x / 72;
            pixel(ctx, sx + x, wy + Math.round(3 * 4 * u * (1 - u)), pal.bushLight);
          }
        }
      });
    }
  };
}

// Pohon cemara bertingkat. Sisi kanan sedikit terang karena cahaya.
function buildPine(h, color, light, seed) {
  const w = Math.max(5, Math.round(h * 0.62)) | 1;
  const layer = createLayer(w, h);
  const trunk = Math.max(1, Math.round(h * 0.12));
  const canopy = h - trunk;
  const tiers = h > 15 ? 3 : 2;
  const tierH = canopy / tiers;
  const mid = w >> 1;
  rect(layer.ctx, mid - (h > 15 ? 1 : 0), canopy, h > 15 ? 2 : 1, trunk, color);
  for (let y = 0; y < canopy; y++) {
    const tier = Math.min(tiers - 1, Math.floor(y / tierH));
    const local = (y - tier * tierH) / tierH;
    const half = Math.min(mid, Math.round((0.25 + local * 0.75) * (mid * (0.55 + 0.45 * (tier + 1) / tiers))));
    rect(layer.ctx, mid - half, y, half * 2 + 1, 1, color);
    pixel(layer.ctx, mid + half, y, light);
    if (half > 2 && hash(seed, y) > 0.6) pixel(layer.ctx, mid + half - 1, y, light);
  }
  return layer;
}

// Pohon berdaun bulat dengan sorotan berdither.
function buildRoundTree(h, color, light, seed) {
  const r = Math.round(h * 0.33);
  const w = r * 2 + 5;
  const layer = createLayer(w, h);
  const cx = w >> 1;
  rect(layer.ctx, cx - 1, h - Math.round(h * 0.4), 2, Math.round(h * 0.4), color);
  disc(layer.ctx, cx, r + 1, r, color);
  disc(layer.ctx, cx - Math.round(r * 0.6), r + Math.round(r * 0.7), Math.round(r * 0.7), color);
  disc(layer.ctx, cx + Math.round(r * 0.6), r + Math.round(r * 0.6), Math.round(r * 0.75), color);
  const alpha = layer.ctx.getImageData(0, 0, w, h).data;
  for (let y = 0; y < h; y++) {
    for (let x = cx; x < w; x++) {
      const d = Math.hypot(x - cx - r * 0.35, y - r * 0.6);
      const filled = alpha[(y * w + x) * 4 + 3] > 0;
      if (filled && d > r * 0.55 && d < r * 0.95 && bayer(x, y) < 0.35 + hash(seed, x, y) * 0.1) pixel(layer.ctx, x, y, light);
    }
  }
  return layer;
}

// Petak kerikil rel yang bisa diulang tanpa sambungan terlihat, termasuk bantalan rel.
function buildGravelTile(seed, width, pal) {
  const rows = 12;
  const layer = createLayer(width, rows);
  for (let y = 0; y < rows; y++) {
    const band = y < 3 ? 3 : y < 8 ? 2 : 1;
    for (let x = 0; x < width; x++) {
      const n = hash(seed + 7, x, y);
      const shade = n > 0.75 ? band : n < 0.2 ? band - 1 : band - (n < 0.5 ? 1 : 0);
      rect(layer.ctx, x, y, 1, 1, pal.gravel[Math.max(0, Math.min(3, shade))]);
    }
  }
  for (let x = 0; x < width; x += 8) {
    rect(layer.ctx, x + 1, 0, 5, 2, pal.sleeper);
    rect(layer.ctx, x + 1, 0, 5, 1, pal.sleeperLight);
  }
  return layer;
}

// Petak tanah dan rumput di bawah tanggul rel.
function buildGroundTile(seed, width, rows, pal) {
  const layer = createLayer(width, rows);
  for (let y = 0; y < rows; y++) {
    const base = y < 2 ? 3 : y < 10 ? 2 : y < 24 ? 1 : 0;
    for (let x = 0; x < width; x++) {
      const n = hash(seed + 13, x, y);
      const shade = n > 0.86 ? Math.min(3, base + 1) : n < 0.12 ? Math.max(0, base - 1) : base;
      rect(layer.ctx, x, y, 1, 1, pal.ground[shade]);
    }
  }
  for (let x = 0; x < width; x++) {
    const blade = Math.floor(hash(seed + 17, x) * 4);
    if (blade > 1) rect(layer.ctx, x, 0, 1, blade, pal.grass);
  }
  return layer;
}
