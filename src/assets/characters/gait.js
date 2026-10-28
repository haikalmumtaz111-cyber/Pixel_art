// Gerak natural rig karakter (Tahap 5, V16): siklus jalan, sendi siku dan lutut, pose lengan.
// Semua fungsi di sini murni (tanpa canvas dan tanpa keadaan), jadi bisa diuji langsung di Node.
//
// Siklus jalan tetap 8 fase seperti Tahap 3 (lihat WALK_PHASES), tetapi posisi kaki tidak lagi diambil dari
// tabel tetap. Telapak yang sedang menapak dihitung dari posisi dunianya, jadi diam di tanah selama tubuh
// melangkah (tidak meluncur). Tinggi pinggul mengikuti panjang kaki yang menapak (terendah saat kedua kaki
// terbuka, tertinggi saat kaki berpapasan), dan ayunan lengan selalu berlawanan dengan kaki di sisinya.
//
// Koordinat lokal: x ke depan (arah hadap karakter), y ke bawah. Sudut lengan dalam derajat dari arah
// tegak ke bawah, positif = ke depan.
import { clamp, lerp, smoothstep } from '../../engine/math.js';

const DEG = Math.PI / 180;

// Nama 8 fase siklus jalan (satu siklus = dua langkah). Fase 0 = kaki dekat menapak di depan.
export const WALK_PHASES = ['kontak', 'tumpu', 'lewat', 'dorong', 'kontak', 'tumpu', 'lewat', 'dorong'];

// Ukuran siklus dari panjang kaki dan panjang langkah yang diminta (strideLength = jarak satu siklus penuh).
// Jangkauan telapak dibatasi 45% panjang kaki, supaya langkah tetap masuk akal untuk karakter pendek.
// Bila dibatasi, siklusnya ikut memendek (langkah lebih rapat), bukan kakinya yang meluncur.
export function walkCycle({ legLen, strideLength }) {
  const reach = Math.min(strideLength / 4, Math.max(2, legLen * 0.45));
  return { cycle: reach * 4, reach, lift: Math.max(1, Math.round(legLen * 0.12)) };
}

// Posisi satu kaki pada jarak tempuh d (piksel lokal). offset 0 = kaki dekat, 0,5 = kaki jauh.
// worldX, dir, dan scale dipakai untuk membulatkan dari posisi dunia: di skala 1 telapak yang menapak tetap
// di piksel dunia yang sama; di skala s, satu piksel lokal = s piksel dunia, jadi sisa pembulatannya < s.
function footAt(d, worldX, dir, cyc, offset, scale) {
  const { cycle, reach, lift } = cyc;
  const k = d / cycle - offset;
  const step = Math.floor(k);
  const v = k - step;
  const plant = (step + offset) * cycle + reach; // titik tapak langkah ini (jarak tempuh)
  let foot = plant;
  let h = 0;
  const planted = v < 0.5;
  if (!planted) {
    // terangkat: bergerak dari titik tapak lama ke titik tapak berikutnya dengan lengkung naik-turun
    const w = (v - 0.5) / 0.5;
    foot = plant + cycle * smoothstep(w);
    h = lift * Math.sin(Math.PI * w);
  }
  const world = Math.round(dir * foot * scale);
  return { dx: Math.round((dir * (world - Math.round(worldX))) / scale), lift: Math.round(h), planted, step, world };
}

// Pose kaki saat berjalan. worldX = posisi dunia entitas, dir = 1 menghadap kanan, -1 menghadap kiri,
// dims = { legLen, strideLength, speed?, scale? } (speed = piksel dunia per frame dari speedX entitas,
// scale = skala bilangan bulat entitas; ukuran kaki dan langkah dalam piksel lokal).
// Hasil: kaki dekat (front) dan jauh (back) dengan dx (ke depan) dan lift, fase siklus u (0..1), fase 8 (0..7),
// swing (-1..1): ayunan lengan dekat (positif = ke depan), dan drop: turunnya pinggul (piksel).
export function walkPose(worldX, dir, dims) {
  const cyc = walkCycle(dims);
  const scale = dims.scale || 1;
  const d = (worldX * dir) / scale;
  const front = footAt(d, worldX, dir, cyc, 0, scale);
  const back = footAt(d, worldX, dir, cyc, 0.5, scale);
  const u = ((d / cyc.cycle) % 1 + 1) % 1;
  const drop = hipDrop(u, cyc.reach, dims.legLen - 1, Math.abs(dims.speed || 0) / scale);
  return { front, back, u, phase: Math.floor(u * 8) % 8, swing: -Math.cos(2 * Math.PI * u), drop, cycle: cyc };
}

// Turunnya pinggul (piksel): terendah di sekitar kontak (kedua kaki terbuka), tertinggi saat kaki berpapasan.
// Besarnya dari geometri kaki yang menapak sejauh reach (span = kaki lurus pinggul-pergelangan), hanya 60%
// (sisanya diserap lutut) supaya tidak memantul. Jendela turunnya diambil dari fase (sepertiga tiap langkah),
// bukan dari pembulatan posisi kaki. Bila kecepatan (piksel dunia per frame) diketahui dan jendela itu kurang
// dari 2 frame, pinggul tidak diturunkan: turun 1 frame saja akan terlihat sebagai getar.
const DROP_WINDOW = 1 / 3;
export function hipDrop(u, reach, span, speed = 0, amount = 0.6) {
  const depth = Math.round((span - Math.sqrt(Math.max(0, span * span - reach * reach))) * amount);
  if (speed > 0 && (DROP_WINDOW * 2 * reach) / speed < 2) return 0;
  return Math.cos(4 * Math.PI * u) >= 0.5 ? depth : 0;
}

// Dua tulang (paha-betis atau lengan atas-lengan bawah) dari pangkal ke target.
// side = -1 sendi menekuk ke depan (lutut), side = 1 sendi ke belakang/bawah (siku).
// Bila target terlalu jauh, tulang lurus mengarah ke target.
export function twoBone(origin, target, upper, lower, side) {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const dist = Math.hypot(dx, dy);
  const base = Math.atan2(dy, dx);
  if (dist >= upper + lower || dist < 1e-6) {
    const joint = { x: origin.x + Math.cos(base) * upper, y: origin.y + Math.sin(base) * upper };
    const end = dist < 1e-6 ? joint : { x: origin.x + Math.cos(base) * (upper + lower), y: origin.y + Math.sin(base) * (upper + lower) };
    return { joint, end };
  }
  const cosA = clamp((upper * upper + dist * dist - lower * lower) / (2 * upper * dist), -1, 1);
  const angle = base + side * Math.acos(cosA);
  return { joint: { x: origin.x + Math.cos(angle) * upper, y: origin.y + Math.sin(angle) * upper }, end: { x: target.x, y: target.y } };
}

// Lengan dari sudut: angle = lengan atas, bend = tekukan siku (lengan bawah = angle + bend).
export function armFromAngles(shoulder, upper, lower, angle, bend) {
  const a = angle * DEG;
  const b = (angle + bend) * DEG;
  const elbow = { x: shoulder.x + Math.sin(a) * upper, y: shoulder.y + Math.cos(a) * upper };
  return { elbow, hand: { x: elbow.x + Math.sin(b) * lower, y: elbow.y + Math.cos(b) * lower } };
}

// Sudut dasar setiap pose lengan. swing = ayunan -1..1 (dari walkPose), amp = besar ayunan (derajat).
// swing   : bandul saat berjalan, siku makin menekuk saat lengan di depan
// hang    : menggantung santai, hanya bergoyang sedikit (misalnya memegang bungkusan di samping)
// carry   : lengan bawah mendatar ke depan (membawa bakul, memegang koran)
// behind  : kedua tangan di belakang badan (berjalan santai)
export function armAngles(kind, swing = 0, amp = 30) {
  if (kind === 'swing') {
    const angle = amp * swing;
    return { angle, bend: 10 + 34 * Math.max(0, swing) };
  }
  if (kind === 'hang') return { angle: -8 + amp * 0.15 * swing, bend: 10 };
  if (kind === 'carry') return { angle: 8 + amp * 0.05 * swing, bend: 80 };
  if (kind === 'behind') return { angle: -38 + amp * 0.05 * swing, bend: 30 };
  throw new Error(`Pose lengan tidak dikenal: ${kind}`);
}

// Isyarat tangan: g = 0 pose biasa, g = 1 lengan terangkat melambai di atas kepala, siku tetap menekuk.
export function raiseArm(base, g) {
  const t = clamp(g, 0, 1);
  const angle = lerp(base.angle, 150, t);
  const fore = lerp(base.angle + base.bend, 178, t);
  return { angle, bend: Math.max(0, fore - angle) };
}
