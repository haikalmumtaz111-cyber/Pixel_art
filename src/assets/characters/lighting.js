// Pencahayaan karakter (Tahap 5, V15): warna karakter mengikuti palet pencahayaan lingkungan.
//
// Karakter tetap ditulis dengan warna dasar (hex) seperti sebelumnya. Bila aset diberi parameter
// "light": "<awalan>", palet aktif frame itu harus punya tiga warna:
//   <awalan>Light  cahaya yang mengenai karakter, dikalikan dengan warna dasar (#ffffff = tanpa perubahan)
//   <awalan>Lift   cahaya sekitar yang mengangkat bagian gelap (screen, #000000 = tanpa perubahan)
//   <awalan>Rim    cahaya tepi di sisi yang menghadap sumber cahaya, ditambahkan (#000000 = tanpa cahaya tepi)
// Karena ketiganya warna biasa di palet, tangga palet (lighting from/to) ikut mencampurnya bertahap, jadi
// karakter berubah di frame yang sama dengan bangunan dan langit. Hasilnya hanya bergantung pada palet frame itu:
// deterministik dan tidak berkedip.
//
// Karakter yang diberi cahaya digambar dulu ke penyangga piksel (sprite buffer) dengan warna dasar,
// lalu setiap piksel diwarnai ulang dan ditulis ke kanvas sebagai potongan baris. Penyangga ini dibuat
// dengan kode biasa (bukan canvas), sehingga juga bisa diuji di Node.
import { rect, hexToRgb, rgbToHex } from '../../engine/pixel.js';

export const LIGHT_SUFFIXES = ['Light', 'Lift', 'Rim'];
const NEUTRAL = { light: '#ffffff', lift: '#000000', rim: '#000000' };
const isHex = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

// Tiga warna cahaya dari palet (kunci yang tidak ada dianggap netral).
export function lightFromPalette(pal, prefix) {
  const get = (suffix, fallback) => (pal && isHex(pal[`${prefix}${suffix}`]) ? pal[`${prefix}${suffix}`] : fallback);
  return { light: get('Light', NEUTRAL.light), lift: get('Lift', NEUTRAL.lift), rim: get('Rim', NEUTRAL.rim) };
}

// Warna dasar -> warna yang diterangi: kali (light), lalu screen (lift). Rim ditambahkan di tepi yang terkena cahaya.
export function gradeRgb(rgb, light, lift) {
  return rgb.map((v, i) => {
    const m = (v * light[i]) / 255;
    return Math.round(255 - ((255 - m) * (255 - lift[i])) / 255);
  });
}

// Pewarna untuk satu set cahaya. Hasil disimpan per warna, jadi setiap warna dihitung sekali per palet.
export function createGrader({ light, lift, rim }) {
  const L = hexToRgb(light);
  const F = hexToRgb(lift);
  const R = hexToRgb(rim);
  const lit = new Map();
  const edge = new Map();
  const color = (hex) => {
    if (!lit.has(hex)) lit.set(hex, rgbToHex(gradeRgb(hexToRgb(hex), L, F)));
    return lit.get(hex);
  };
  return {
    color,
    rim(hex) {
      if (!edge.has(hex)) edge.set(hex, rgbToHex(hexToRgb(color(hex)).map((v, i) => Math.min(255, v + R[i]))));
      return edge.get(hex);
    }
  };
}

// Sisi datangnya cahaya di koordinat lokal karakter. direction: -1 dari kiri dunia, 1 dari kanan dunia,
// sekitar 0 dari atas. Karakter yang dicerminkan (menghadap kiri) membalik sisinya, jadi cahaya tetap
// datang dari arah dunia yang sama ke mana pun karakter menghadap.
export function lightSide(direction, flip) {
  if (Math.abs(direction) < 1 / 3) return 0;
  return Math.sign(direction) * (flip ? -1 : 1);
}

// Penyangga piksel untuk satu karakter: meniru ctx.fillRect/fillStyle/pixelView yang dipakai rect() dan pixel(),
// dengan margin di sekeliling kotak karakter (tangan, sapu, dan sepatu boleh keluar sedikit dari kotak).
export function createSpriteBuffer(width, height, margin = 8) {
  const w = width + margin * 2;
  const h = height + margin * 2;
  const cells = new Array(w * h).fill(null);
  const ctx = {
    pixelView: null,
    fillStyle: '#000000',
    fillRect(x, y, rw, rh) {
      const x0 = Math.max(0, x);
      const y0 = Math.max(0, y);
      const x1 = Math.min(w, x + rw);
      const y1 = Math.min(h, y + rh);
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) cells[yy * w + xx] = this.fillStyle;
    }
  };
  // koordinat lokal karakter (0,0 = pojok kiri atas kotak) -> isi sel
  const at = (x, y) => {
    const xx = x + margin;
    const yy = y + margin;
    return xx < 0 || yy < 0 || xx >= w || yy >= h ? null : cells[yy * w + xx];
  };
  return {
    ctx,
    view: { s: 1, ox: margin, oy: margin },
    clear() {
      cells.fill(null);
    },
    at,
    // Tulis isi penyangga ke target dalam koordinat lokal karakter. paint(x, y, warna) -> warna akhir.
    // Piksel bersebelahan dengan warna akhir sama digabung menjadi satu persegi.
    flush(target, paint) {
      for (let yy = 0; yy < h; yy++) {
        let run = null;
        let start = 0;
        for (let xx = 0; xx <= w; xx++) {
          const c = xx < w ? cells[yy * w + xx] : null;
          const out = c === null ? null : paint(xx - margin, yy - margin, c);
          if (out !== run) {
            if (run !== null) rect(target, start - margin, yy - margin, xx - start, 1, run);
            run = out;
            start = xx;
          }
        }
      }
    }
  };
}

// Warnai ulang isi penyangga dengan cahaya palet lalu tulis ke target.
// side: sisi lokal datangnya cahaya (-1 kiri, 1 kanan, 0 atas). Piksel tepi = tetangga di sisi itu kosong.
export function flushLit(buffer, target, grader, side) {
  const dx = side;
  const dy = side === 0 ? -1 : 0;
  buffer.flush(target, (x, y, c) => (buffer.at(x + dx, y + dy) === null ? grader.rim(c) : grader.color(c)));
}
