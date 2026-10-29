// Rig karakter pixel art yang bisa dipakai ulang.
// Karakter disusun dari bagian tubuh (kaki, badan, lengan, kepala, rambut, topi, aksesori) yang digambar
// dengan kode, lalu diberi pose menurut status animasi:
//   idle    berdiri + bernapas          walk     siklus jalan 8 frame (langkah mengikuti jarak, kaki tidak meluncur)
//   stand   berdiri diam                seated   duduk (bangku/kursi)
//   gesture lengan depan terangkat      cycle    mengayuh sepeda (pedal mengikuti putaran roda)
//   sweep   menyapu (lengan dan sapu bergerak maju-mundur, cocok dengan aksesori "broom")
// Ditambah kedip, napas, dan tengok kepala (headTurn: -1 menoleh ke belakang, 0 samping, 1 ke kamera).
// Karakter baru cukup dibuat lewat data (warna, topi, rambut, tinggi, aksesori), tanpa menyalin kode ini.
// Karakter digambar menghadap kanan; menghadap kiri memakai "flip" entitas (cermin otomatis).
//
// Tahap 5 menambah dua pilihan yang tidak mengubah karakter lama (bawaannya tetap cara Tahap 3):
//   motion: "natural"  sendi siku dan lutut, pose lengan, siklus jalan 8 fase yang telapaknya menempel di tanah,
//                      ayunan tangan sinkron dengan langkah (gait.js). Bawaan "classic" = gerak Tahap 3 persis.
//   light: "<awalan>"  warna karakter mengikuti palet pencahayaan lingkungan, plus cahaya tepi dari arah
//                      lightDirection atau track lingkungan lightTrack (lighting.js). Tanpa "light", warna tetap
//                      seperti yang ditulis.
// Keduanya boleh ditulis di aset atau ditimpa per entitas lewat params.
import { rect, pixel, withView } from '../../engine/pixel.js';
import { hash } from '../../engine/random.js';
import { mod, lerp } from '../../engine/math.js';
import { walkPose, twoBone, armFromAngles, armAngles, raiseArm } from './gait.js';
import { createGrader, createSpriteBuffer, flushLit, lightFromPalette, lightSide } from './lighting.js';

const BOX_W = 26;
// Konteks kosong untuk poseProbe: menerima perintah gambar tanpa menyimpan apa pun.
const NULL_CTX = { pixelView: null, fillStyle: '', fillRect() {} };

// Tabel siklus jalan 8 frame: kontak, turun, lewat, naik, kontak, turun, lewat, naik.
const WALK = {
  frontFoot: [4, 3, 0, -3, -4, -3, 0, 3],
  backFoot: [-4, -3, 0, 3, 4, 3, 0, -3],
  frontLift: [0, 0, 0, 0, 0, 1, 2, 1],
  backLift: [0, 1, 2, 1, 0, 0, 0, 0],
  bob: [0, 1, 0, -1, 0, 1, 0, -1],
  frontHand: [-5, -3, 0, 3, 5, 3, 0, -3],
  backHand: [4, 2, 0, -2, -4, -2, 0, 2]
};

const DEFAULTS = {
  height: 44, build: 'regular', sleeves: 'long', hairStyle: 'short', hat: 'none', accessory: 'none',
  skin: '#c98b5e', skinShade: '#9c6440', hair: '#1f1611',
  shirt: '#e8e2cf', shirtShade: '#b9b29c', collar: null,
  pants: '#4a3a2c', pantsShade: '#33281f', sarong: null, sarongPattern: null,
  shoes: '#2a1d14', hatColor: '#1b1716', hatShade: '#0f0c0b',
  accessoryColor: '#8a6a3a', accessoryShade: '#5e4524',
  strideLength: 26, seed: 1,
  motion: 'classic', light: null, lightDirection: 0, lightTrack: null, frontArm: 'auto', backArm: 'auto', armSwing: 1
};

// Garis tebal piksel dari (x0, y0) ke (x1, y1): tiap baris satu persegi selebar w.
function limb(ctx, x0, y0, x1, y1, w, color) {
  const rows = Math.max(1, Math.abs(y1 - y0));
  const dir = y1 >= y0 ? 1 : -1;
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    rect(ctx, Math.round(x0 + (x1 - x0) * t), y0 + i * dir, w, 1, color);
  }
}

export function createRigCharacter(def) {
  const c = { ...DEFAULTS, ...def };
  const h = c.height;
  const boxH = h + 8;
  const legLen = Math.round(h * 0.42);
  const torsoLen = Math.round(h * 0.33);
  const torsoW = c.build === 'slim' ? 6 : c.build === 'stout' ? 9 : 7;
  const legW = c.build === 'slim' ? 2 : 3;
  const cx = 12;

  // Kedip: mata tertutup 3 frame, jadwalnya acak tetapi deterministik per karakter.
  function blinking(time) {
    const every = 2.6 + hash(c.seed, 1) * 1.2;
    const k = Math.floor(time / every);
    for (const n of [k - 1, k]) {
      const start = n * every + hash(c.seed, n, 2) * every * 0.5;
      if (time >= start && time < start + 0.1) return true;
    }
    return false;
  }

  function drawHead(ctx, top, turn, blink) {
    const x = cx - 3;
    const view = turn > 0.5 ? 'front' : turn < -0.5 ? 'back' : 'side';
    rect(ctx, x, top, 8, 8, c.skin);
    rect(ctx, x + 1, top + 8, 6, 1, c.skin); // dagu
    if (view === 'side') {
      rect(ctx, x + 8, top + 3, 1, 2, c.skin); // hidung
      rect(ctx, x, top + 2, 1, 6, c.skinShade);
      pixel(ctx, x + 3, top + 4, c.skinShade); // telinga
      if (c.hat !== 'kerudung') rect(ctx, x, top, 4, 4, c.hair);
      pixel(ctx, x + 6, top + 7, c.skinShade); // mulut
      if (blink) rect(ctx, x + 5, top + 4, 2, 1, c.skinShade);
      else pixel(ctx, x + 6, top + 4, '#1a100b');
    } else if (view === 'back') {
      rect(ctx, x - 1, top + 3, 1, 2, c.skin);
      rect(ctx, x + 7, top + 2, 1, 6, c.skinShade);
      if (c.hat !== 'kerudung') rect(ctx, x + 4, top, 4, 4, c.hair);
      if (blink) rect(ctx, x + 1, top + 4, 2, 1, c.skinShade);
      else pixel(ctx, x + 1, top + 4, '#1a100b');
    } else {
      rect(ctx, x, top + 2, 1, 6, c.skinShade);
      rect(ctx, x + 7, top + 2, 1, 6, c.skinShade);
      if (blink) { rect(ctx, x + 2, top + 4, 1, 1, c.skinShade); rect(ctx, x + 5, top + 4, 1, 1, c.skinShade); }
      else { pixel(ctx, x + 2, top + 4, '#1a100b'); pixel(ctx, x + 5, top + 4, '#1a100b'); }
      pixel(ctx, x + 3, top + 7, c.skinShade);
      pixel(ctx, x + 4, top + 7, c.skinShade);
    }
    // rambut
    if (c.hat !== 'kerudung') {
      rect(ctx, x, top - 1, 8, 2, c.hair);
      if (c.hairStyle === 'bun') rect(ctx, view === 'back' ? x + 7 : x - 3, top + 1, 3, 3, c.hair);
      if (c.hairStyle === 'long') rect(ctx, view === 'back' ? x + 6 : x - 1, top, 3, 10, c.hair);
    }
    // topi
    if (c.hat === 'peci') {
      rect(ctx, x, top - 4, 8, 4, c.hatColor);
      rect(ctx, x, top - 1, 8, 1, c.hatShade);
      rect(ctx, x + 1, top - 4, 6, 1, c.hatShade);
    } else if (c.hat === 'caping') {
      // caping: topi kerucut anyaman yang lebar
      for (let r = 0; r < 5; r++) rect(ctx, cx - 1 - r * 2, top - 5 + r, 3 + r * 4, 1, r === 4 ? c.hatShade : c.hatColor);
      pixel(ctx, cx - 4, top - 2, c.hatShade);
      pixel(ctx, cx + 3, top - 3, c.hatShade);
    } else if (c.hat === 'kerudung') {
      rect(ctx, x - 1, top - 2, 10, 3, c.hatColor);
      rect(ctx, view === 'back' ? x + 5 : x - 1, top, 4, 10, c.hatColor);
      rect(ctx, x - 1, top + 8, 10, 3, c.hatColor);
      rect(ctx, x - 1, top + 10, 10, 1, c.hatShade);
    }
  }

  // Bagian bawah: celana (dua kaki) atau kain sarung yang menutup kaki.
  function drawLegs(ctx, hipY, footY, front, back) {
    const hx = cx - Math.floor(legW / 2);
    const foot = (f, color) => {
      const kneeY = Math.round((hipY + footY) / 2);
      const kneeX = hx + Math.round(f.dx / 2) + (f.lift ? 2 : 1);
      limb(ctx, hx, hipY, kneeX, kneeY, legW, color);
      limb(ctx, kneeX, kneeY, hx + f.dx, footY - 1 - f.lift, legW, color);
    };
    if (c.sarong) {
      const left = Math.min(back.dx, front.dx, 0) + hx - 1;
      const right = Math.max(back.dx, front.dx, 0) + hx + legW + 1;
      for (let y = hipY; y < footY - 1; y++) {
        const t = (y - hipY) / (footY - hipY);
        const l = Math.round(hx - 2 + (left - (hx - 2)) * t);
        const r = Math.round(hx + legW + 2 + (right - (hx + legW + 2)) * t);
        rect(ctx, l, y, r - l, 1, c.sarong);
        if (c.sarongPattern) for (let x = l + ((y >> 1) & 1); x < r; x += 3) if ((y & 1) === 0) pixel(ctx, x, y, c.sarongPattern);
      }
    } else {
      foot(back, c.pantsShade);
      foot(front, c.pants);
    }
    for (const [f, shade] of [[back, true], [front, false]]) {
      const x = hx + f.dx;
      rect(ctx, x - 1, footY - 1 - f.lift, 4, 2, shade ? '#1b130d' : c.shoes);
    }
  }

  function drawArm(ctx, sx, sy, hx, hy, front) {
    const sleeve = front ? c.shirt : c.shirtShade;
    const elbowX = Math.round((sx + hx) / 2);
    const elbowY = Math.round((sy + hy) / 2);
    // lengan depan diberi garis bayangan di sisi belakang, supaya ayunannya terbaca di depan badan
    if (front) {
      limb(ctx, sx - 1, sy + 1, elbowX - 1, elbowY, 1, c.shirtShade);
      limb(ctx, elbowX - 1, elbowY, hx - 1, hy, 1, c.sleeves === 'long' ? c.shirtShade : c.skinShade);
    }
    if (c.sleeves === 'long') {
      limb(ctx, sx, sy, elbowX, elbowY, 2, sleeve);
      limb(ctx, elbowX, elbowY, hx, hy, 2, sleeve);
    } else {
      limb(ctx, sx, sy, elbowX, elbowY, 2, sleeve);
      limb(ctx, elbowX, elbowY, hx, hy, 2, front ? c.skin : c.skinShade);
    }
    rect(ctx, hx, hy, 2, 2, front ? c.skin : c.skinShade);
  }

  function drawTorso(ctx, top, bottom) {
    const x = cx - Math.floor(torsoW / 2);
    rect(ctx, x, top, torsoW, bottom - top, c.shirt);
    rect(ctx, x, top, 2, bottom - top, c.shirtShade);
    if (c.collar) rect(ctx, x + 2, top, torsoW - 2, 1, c.collar);
    if (c.accessory === 'bag') {
      for (let i = 0; i < torsoW + 2; i++) pixel(ctx, x + i, top + 1 + i, c.accessoryShade);
    }
  }

  function drawAccessory(ctx, hand, hipY, gesture) {
    if (c.accessory === 'basket') {
      // bakul anyaman dibawa di depan pinggang
      const x = hand.x - 2;
      const y = hipY - 3;
      rect(ctx, x, y, 8, 6, c.accessoryColor);
      for (let i = 0; i < 8; i += 2) pixel(ctx, x + i, y + 1 + ((i >> 1) & 1) * 2, c.accessoryShade);
      rect(ctx, x, y + 5, 8, 1, c.accessoryShade);
      rect(ctx, x + 1, y - 2, 6, 2, '#d8b45a');
    } else if (c.accessory === 'parcel') {
      rect(ctx, cx - 6, hipY - 9, 6, 5, c.accessoryColor);
      rect(ctx, cx - 6, hipY - 7, 6, 1, c.accessoryShade);
    } else if (c.accessory === 'bag') {
      rect(ctx, cx - 6, hipY - 2, 5, 5, c.accessoryColor);
      rect(ctx, cx - 6, hipY + 2, 5, 1, c.accessoryShade);
    } else if (c.accessory === 'broom') {
      // sapu lidi yang digerakkan maju-mundur
      const tipX = hand.x + 2 + Math.round(gesture * 4);
      for (let i = 0; i < 12; i++) pixel(ctx, hand.x + 1 + Math.round(((tipX - hand.x) * i) / 12), hand.y + i, c.accessoryShade);
      rect(ctx, tipX - 2, hand.y + 12, 6, 2, c.accessoryColor);
    } else if (c.accessory === 'newspaper') {
      rect(ctx, hand.x - 1, hand.y - 6, 7, 7, '#d9d2bc');
      rect(ctx, hand.x, hand.y - 4, 5, 1, '#8a8474');
      rect(ctx, hand.x, hand.y - 2, 5, 1, '#8a8474');
    }
  }

  // Pose berdiri (idle/stand/gesture/walk) dengan data kaki dan tangan.
  function drawStanding(ctx, { front, back, bob, frontHand, backHand, breath, turn, blink, gesture }) {
    const footY = boxH;
    const hipY = footY - legLen + bob;
    const shoulderY = hipY - torsoLen - breath;
    const headTop = shoulderY - 9;
    drawArm(ctx, cx - 1, shoulderY + 1, cx + backHand, hipY - 2, false);
    drawLegs(ctx, hipY, footY, front, back);
    drawTorso(ctx, shoulderY, hipY + 1);
    drawHead(ctx, headTop, turn, blink);
    // lengan depan: gesture mengangkat tangan dari samping badan ke atas kepala
    const restX = cx + frontHand;
    const restY = hipY - 2;
    const hand = {
      x: Math.round(restX + (cx + 5 - restX) * gesture),
      y: Math.round(restY + (headTop - 2 - restY) * gesture)
    };
    if (c.accessory === 'basket') hand.y = Math.min(hand.y, hipY - 4);
    drawArm(ctx, cx + 1, shoulderY + 1, hand.x, hand.y, true);
    drawAccessory(ctx, hand, hipY, gesture);
  }

  // Kaki saat duduk: mengikuti pedal (mengayuh) atau paha mendatar dan betis turun (bangku).
  function drawSeatedLegs(ctx, hipY, footY, pedal) {
    const hx = cx - 1;
    if (pedal) {
      // dua kaki mengikuti posisi pedal
      for (const [p, color] of [[pedal.back, c.pantsShade], [pedal.front, c.pants]]) {
        const kneeX = Math.round((hx + p.x) / 2) + 3;
        const kneeY = Math.min(hipY, p.y) - 2;
        limb(ctx, hx, hipY, kneeX, kneeY, legW, color);
        limb(ctx, kneeX, kneeY, p.x, p.y - 1, legW, color);
        rect(ctx, p.x - 1, p.y - 1, 4, 2, c.shoes);
      }
    } else {
      // paha mendatar ke depan, betis turun ke lantai
      const kneeX = hx + legLen - 6;
      rect(ctx, hx, hipY - 1, kneeX - hx + 2, legW, c.sarong || c.pants);
      limb(ctx, kneeX, hipY, kneeX + 1, footY - 2, legW, c.sarong || c.pants);
      rect(ctx, kneeX, footY - 2, 5, 2, c.shoes);
    }
  }

  function drawSeated(ctx, { breath, turn, blink, gesture, pedal }) {
    const footY = boxH;
    const hipY = footY - Math.round(legLen * 0.55);
    const shoulderY = hipY - torsoLen - breath;
    const headTop = shoulderY - 9;
    drawSeatedLegs(ctx, hipY, footY, pedal);
    drawArm(ctx, cx - 1, shoulderY + 1, cx + 3, hipY - 3, false);
    drawTorso(ctx, shoulderY, hipY + 1);
    drawHead(ctx, headTop, turn, blink);
    const hand = pedal ? { x: cx + 8, y: shoulderY + 4 } : { x: cx + 5, y: Math.round(hipY - 3 - gesture * 6) };
    drawArm(ctx, cx + 1, shoulderY + 1, hand.x, hand.y, true);
    drawAccessory(ctx, hand, hipY, gesture);
  }

  // Pedal sepeda: dua titik berseberangan pada lingkaran engkol, mengikuti putaran roda.
  function pedalsOf(e, p) {
    // phaseOffset = jarak titik entitas ini ke titik sepeda, agar pedal kaki sama dengan pedal sepeda
    const angle = ((e.worldX + (p.phaseOffset ?? 0)) * (e.flip ? -1 : 1)) / (p.wheelRadius ?? 8);
    const crank = { x: cx + (p.crankX ?? 3), y: boxH - (p.crankDrop ?? 2) };
    const r = p.crankRadius ?? 3;
    const at = (a) => ({ x: Math.round(crank.x + Math.cos(a) * r), y: Math.round(crank.y + Math.sin(a) * r) });
    return { front: at(angle), back: at(angle + Math.PI) };
  }

  // Gerak Tahap 3 (bawaan, motion "classic"). Isinya sengaja tidak diubah: proyek lama tetap identik piksel.
  function drawClassic(ctx, e, { time, turn, gesture, blink, breath }) {
    if (e.state === 'walk') {
      // langkah dihitung dari jarak tempuh, jadi kaki tidak meluncur saat kecepatan berubah
      const dir = e.flip ? -1 : 1;
      const phase = mod(Math.floor((e.worldX * dir * 8) / c.strideLength), 8);
      drawStanding(ctx, {
        front: { dx: WALK.frontFoot[phase], lift: WALK.frontLift[phase] },
        back: { dx: WALK.backFoot[phase], lift: WALK.backLift[phase] },
        bob: WALK.bob[phase], frontHand: WALK.frontHand[phase], backHand: WALK.backHand[phase],
        breath: 0, turn, blink, gesture
      });
    } else if (e.state === 'seated') {
      drawSeated(ctx, { breath, turn, blink, gesture });
    } else if (e.state === 'sweep') {
      const swing = 0.5 + 0.5 * Math.sin(time * 5);
      drawStanding(ctx, {
        front: { dx: 2, lift: 0 }, back: { dx: -2, lift: 0 }, bob: 0,
        frontHand: 2 + Math.round(swing * 2), backHand: 0, breath: 0, turn, blink, gesture: 0.1 * swing
      });
    } else if (e.state === 'cycle') {
      drawSeated(ctx, { breath: 0, turn, blink, gesture: 0, pedal: pedalsOf(e, e.params) });
    } else {
      const standing = e.state === 'stand';
      drawStanding(ctx, {
        front: { dx: 1, lift: 0 }, back: { dx: -1, lift: 0 }, bob: 0,
        frontHand: 1, backHand: -1, breath: standing ? 0 : breath, turn, blink, gesture: e.state === 'gesture' || gesture > 0 ? gesture : 0
      });
    }
  }

  // ---------- gerak natural (Tahap 5, motion "natural") ----------
  const span = legLen - 1; // kaki lurus: pinggul sampai pergelangan
  const armLen = torsoLen - 3; // bahu sampai tangan, sama dengan lengan Tahap 3
  const upperArm = Math.round(armLen / 2);
  const foreArm = armLen - upperArm;
  const hipX = cx - Math.floor(legW / 2);
  const pt = (q) => ({ x: Math.round(q.x), y: Math.round(q.y) });

  // Perekam pose (T19). Saat menggambar biasa isinya null, jadi mark() tidak melakukan apa-apa dan gambar tidak
  // berubah. poseProbe() mengisinya selama satu kali gambar ke konteks kosong, sehingga data sendi, titik pegang,
  // dan penggerak diambil dari titik yang benar-benar dipakai fungsi gambar natural di bawah.
  let record = null;
  const mark = (kind, data) => {
    if (record) record.push({ kind, ...data });
  };
  // Dua bagian yang harus bersentuhan: a = kotak lokal, b = kotak lokal, { cells } atau { socket, from }
  // (soket aset lain: from "parent" = induk entitas, "below" = benda di bawah titik itu).
  const touch = (name, a, b) => mark('touch', { name, a, b });
  const box2 = (q) => ({ x: q.x, y: q.y, w: 2, h: 2 });

  // Ruas tubuh setebal w dari a ke b (titik bulat). Ruas tegak digambar per baris, ruas mendatar per kolom,
  // jadi ketebalannya tetap w di arah mana pun dan siku yang menekuk tidak bolong.
  function stroke(ctx, a, b, w, color) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (Math.abs(dy) >= Math.abs(dx)) {
      const n = Math.abs(dy);
      for (let i = 0; i <= n; i++) rect(ctx, Math.round(a.x + (n ? (dx * i) / n : 0)), a.y + i * Math.sign(dy), w, 1, color);
    } else {
      const n = Math.abs(dx);
      for (let i = 0; i <= n; i++) rect(ctx, a.x + i * Math.sign(dx), Math.round(a.y + (dy * i) / n), 1, w, color);
    }
  }

  // Lengan dengan siku: spec = { angle, bend } (sudut) atau { target } (tangan menuju titik, siku ke bawah/belakang).
  // drivers = nama penggerak bernilai kontinu yang menggerakkan lengan ini (untuk pemeriksaan kestabilan).
  function naturalArm(ctx, shoulder, spec, front, { hand: drawHand = true, drivers = [] } = {}) {
    let elbow;
    let hand;
    if (spec.target) ({ joint: elbow, end: hand } = twoBone(shoulder, spec.target, upperArm, foreArm, 1));
    else ({ elbow, hand } = armFromAngles(shoulder, upperArm, foreArm, spec.angle, spec.bend));
    const S = pt(shoulder);
    const E = pt(elbow);
    const H = pt(hand);
    mark('arm', {
      front, shoulder: S, elbow: E, hand: H, rawShoulder: { x: shoulder.x, y: shoulder.y }, rawElbow: { x: elbow.x, y: elbow.y },
      rawHand: { x: hand.x, y: hand.y }, upper: upperArm, lower: foreArm, target: spec.target ? { x: spec.target.x, y: spec.target.y } : null, drawHand, drivers
    });
    const sleeve = front ? c.shirt : c.shirtShade;
    const fore = c.sleeves === 'long' ? sleeve : front ? c.skin : c.skinShade;
    if (front) {
      // garis bayangan di sisi belakang/bawah lengan depan, supaya lengan terbaca di depan badan
      const off = (a, b) => (Math.abs(b.y - a.y) >= Math.abs(b.x - a.x) ? { x: -1, y: 0 } : { x: 0, y: 2 });
      const shade = (a, b, color) => {
        const o = off(a, b);
        stroke(ctx, { x: a.x + o.x, y: a.y + o.y }, { x: b.x + o.x, y: b.y + o.y }, 1, color);
      };
      shade(S, E, c.shirtShade);
      shade(E, H, c.sleeves === 'long' ? c.shirtShade : c.skinShade);
    }
    stroke(ctx, S, E, 2, sleeve);
    stroke(ctx, E, H, 2, fore);
    if (drawHand) rect(ctx, H.x, H.y, 2, 2, front ? c.skin : c.skinShade);
    return H;
  }

  // Kaki dengan lutut yang menekuk ke depan (dua tulang sama panjang). Kain sarung memakai bentuk Tahap 3.
  // drivers = penggerak kontinu kaki (misalnya jarak tempuh saat berjalan), untuk pemeriksaan kestabilan.
  function drawNaturalLegs(ctx, hipY, footY, front, back, drivers = []) {
    // telapak: dasar sepatu = footY - lift (sama untuk kain sarung dan celana); planted = menapak (data jalan)
    mark('feet', { footY, sarong: Boolean(c.sarong), feet: [['front', front], ['back', back]].map(([foot, f]) => ({ foot, lift: f.lift, planted: f.planted ?? f.lift === 0 })) });
    if (c.sarong) {
      drawLegs(ctx, hipY, footY, front, back);
      return;
    }
    const hip = { x: hipX, y: hipY };
    for (const [f, color, shoe] of [[back, c.pantsShade, '#1b130d'], [front, c.pants, c.shoes]]) {
      const ankle = { x: hipX + f.dx, y: footY - 1 - f.lift };
      const bone = twoBone(hip, ankle, span / 2, span / 2, -1);
      const knee = pt(bone.joint);
      stroke(ctx, hip, knee, legW, color);
      stroke(ctx, knee, ankle, legW, color);
      rect(ctx, ankle.x - 1, footY - 1 - f.lift, 4, 2, shoe);
      mark('leg', { front: f === front, hip, knee, ankle, rawKnee: { x: bone.joint.x, y: bone.joint.y }, half: span / 2, legLen, drivers });
    }
  }

  // Pose lengan dari parameter: "auto" memilih menurut aksesori.
  function armKind(p, which) {
    const kind = p[which] ?? c[which];
    if (kind && kind !== 'auto') return kind;
    if (which === 'frontArm') return c.accessory === 'basket' || c.accessory === 'newspaper' ? 'carry' : 'swing';
    return c.accessory === 'parcel' ? 'hang' : 'swing';
  }

  function drawBasket(ctx, hand) {
    const x = hand.x - 3;
    const y = hand.y + 2;
    rect(ctx, x, y, 8, 6, c.accessoryColor);
    for (let i = 0; i < 8; i += 2) pixel(ctx, x + i, y + 1 + ((i >> 1) & 1) * 2, c.accessoryShade);
    rect(ctx, x, y + 5, 8, 1, c.accessoryShade);
    rect(ctx, x + 1, y - 2, 6, 2, '#d8b45a');
  }

  // Berdiri dan berjalan. swing = ayunan lengan dekat (-1..1), 0 saat diam.
  function drawNaturalStanding(ctx, p, { front, back, drop, breath, turn, blink, gesture, swing }) {
    const footY = boxH;
    const hipY = footY - legLen + drop;
    const shoulderY = hipY - torsoLen - breath;
    const headTop = shoulderY - 9;
    const amp = 30 * (p.armSwing ?? c.armSwing);
    const frontKind = armKind(p, 'frontArm');
    const backKind = armKind(p, 'backArm');
    mark('body', { pose: 'standing', footY, hipY, shoulderY, headTop });
    const backHand = naturalArm(ctx, { x: cx - 1, y: shoulderY + 1 }, armAngles(backKind, -swing, amp), false, { drivers: ['swing'] });
    // bungkusan dijinjing tangan jauh, di balik badan
    if (c.accessory === 'parcel') {
      rect(ctx, backHand.x - 4, backHand.y + 1, 6, 5, c.accessoryColor);
      rect(ctx, backHand.x - 4, backHand.y + 3, 6, 1, c.accessoryShade);
      touch('parcel-hand', { x: backHand.x - 4, y: backHand.y + 1, w: 6, h: 5 }, box2(backHand));
    }
    drawNaturalLegs(ctx, hipY, footY, front, back, ['stride']);
    drawTorso(ctx, shoulderY, hipY + 1);
    drawHead(ctx, headTop, turn, blink);
    let spec = armAngles(frontKind, swing, amp);
    if (gesture > 0) spec = raiseArm(spec, gesture);
    const shoulder = { x: cx + 1, y: shoulderY + 1 };
    // bakul digambar sebelum lengan, supaya tangan terlihat memegang bibirnya
    const basketHand = c.accessory === 'basket' ? pt(armFromAngles(shoulder, upperArm, foreArm, spec.angle, spec.bend).hand) : null;
    if (basketHand) drawBasket(ctx, basketHand);
    const hand = naturalArm(ctx, shoulder, spec, true, { drivers: ['swing', 'gesture'] });
    // bibir bakul (lihat drawBasket) harus di tangan dekat
    if (basketHand) touch('basket-hand', { x: basketHand.x - 2, y: basketHand.y, w: 6, h: 2 }, box2(hand));
    if (c.accessory === 'bag' || c.accessory === 'broom' || c.accessory === 'newspaper') drawAccessory(ctx, hand, hipY, 0);
  }

  // Duduk dan mengayuh: kaki seperti Tahap 3, lengan bersiku menuju titik tujuan (pangkuan, koran, setang).
  function drawNaturalSeated(ctx, { breath, turn, blink, gesture, pedal }) {
    const footY = boxH;
    const hipY = footY - Math.round(legLen * 0.55);
    const shoulderY = hipY - torsoLen - breath;
    const headTop = shoulderY - 9;
    mark('body', { pose: pedal ? 'cycle' : 'seated', footY, hipY, shoulderY, headTop });
    // baris badan terbawah (drawTorso sampai hipY) duduk di soket "seat": sadel induk saat mengayuh, bangku di bawahnya
    mark('sit', { row: hipY, x: cx - 1, socket: 'seat', from: pedal ? 'parent' : 'below' });
    drawSeatedLegs(ctx, hipY, footY, pedal);
    // sepatu di pedal dekat; kotaknya sama dengan sepatu yang digambar drawSeatedLegs (bentuk Tahap 3)
    if (pedal) touch('shoe-pedal', { x: pedal.front.x - 1, y: pedal.front.y - 1, w: 4, h: 2 }, { socket: 'pedal', from: 'parent' });
    const backTarget = pedal ? { x: cx + 7, y: shoulderY + 4 } : { x: cx + 3, y: hipY - 3 };
    const backHand = naturalArm(ctx, { x: cx - 1, y: shoulderY + 1 }, { target: backTarget }, false);
    drawTorso(ctx, shoulderY, hipY + 1);
    drawHead(ctx, headTop, turn, blink);
    const target = pedal ? { x: cx + 8, y: shoulderY + 4 } : { x: cx + 5, y: Math.round(hipY - 3 - gesture * 6) };
    const hand = naturalArm(ctx, { x: cx + 1, y: shoulderY + 1 }, { target }, true, { drivers: pedal ? [] : ['gesture'] });
    // kedua tangan pengayuh memegang setang
    if (pedal) for (const h of [hand, backHand]) touch('hand-grip', box2(h), { socket: 'grip', from: 'parent' });
    drawAccessory(ctx, hand, hipY, gesture);
  }

  // Menyapu: kedua tangan memegang gagang sapu yang bergerak maju-mundur.
  function drawNaturalSweep(ctx, { time, turn, blink }) {
    const swing = 0.5 + 0.5 * Math.sin(time * 5);
    const footY = boxH;
    const hipY = footY - legLen + 1;
    const shoulderY = hipY - torsoLen;
    const headTop = shoulderY - 9;
    const top = { x: cx + 3 + Math.round(swing * 2), y: shoulderY + 5 };
    const tip = { x: cx + 6 + Math.round(swing * 6), y: footY - 3 };
    const low = pt({ x: lerp(top.x, tip.x, 0.4), y: lerp(top.y, tip.y, 0.4) });
    mark('body', { pose: 'sweep', footY, hipY, shoulderY, headTop });
    mark('driver', { sweep: swing });
    const farArm = naturalArm(ctx, { x: cx - 1, y: shoulderY + 1 }, { target: low }, false, { hand: false, drivers: ['sweep'] });
    drawNaturalLegs(ctx, hipY, footY, { dx: 3, lift: 0 }, { dx: -3, lift: 0 });
    drawTorso(ctx, shoulderY, hipY + 1);
    drawHead(ctx, headTop, turn, blink);
    // sel gagang yang digambar, hanya dikumpulkan saat poseProbe
    const handle = record ? [] : null;
    if (c.accessory === 'broom') {
      const n = Math.max(Math.abs(tip.x - top.x), Math.abs(tip.y - top.y));
      for (let i = 0; i <= n; i++) {
        const q = { x: Math.round(lerp(top.x, tip.x, i / n)), y: Math.round(lerp(top.y, tip.y, i / n)) };
        pixel(ctx, q.x, q.y, c.accessoryShade);
        if (handle) handle.push(q);
      }
      rect(ctx, tip.x - 2, tip.y + 1, 6, 2, c.accessoryColor);
    }
    // tangan jauh terlihat di depan badan, menggenggam gagang di bawah tangan dekat
    rect(ctx, low.x, low.y, 2, 2, c.skinShade);
    const hand = naturalArm(ctx, { x: cx + 1, y: shoulderY + 1 }, { target: top }, true, { drivers: ['sweep'] });
    if (handle) {
      touch('nearHand-handle', box2(hand), { cells: handle });
      touch('farHand-handle', box2(low), { cells: handle });
    }
    // ujung lengan jauh harus sampai di tangan jauh yang digambar di gagang
    touch('farArm-farHand', box2(farArm), box2(low));
  }

  function drawNatural(ctx, e, { time, turn, gesture, blink, breath }) {
    const p = e.params;
    // penggerak frame ini: gesture dan headTurn kontinu, breath bertangga (0/1)
    mark('driver', { gesture, headTurn: turn, breath });
    if (e.state === 'walk') {
      const g = walkPose(e.worldX, e.flip ? -1 : 1, { legLen, strideLength: c.strideLength, speed: e.speedX, scale: e.scale });
      // swing = ayunan lengan, stride = jarak tempuh lokal (naik terus selama berjalan searah)
      mark('driver', { swing: g.swing, stride: (e.worldX * (e.flip ? -1 : 1)) / (e.scale || 1), drop: g.drop, reach: g.cycle.reach });
      drawNaturalStanding(ctx, p, { front: g.front, back: g.back, drop: g.drop, breath: 0, turn, blink, gesture, swing: g.swing });
    } else if (e.state === 'seated') {
      drawNaturalSeated(ctx, { breath, turn, blink, gesture });
    } else if (e.state === 'sweep') {
      drawNaturalSweep(ctx, { time, turn, blink });
    } else if (e.state === 'cycle') {
      drawNaturalSeated(ctx, { breath: 0, turn, blink, gesture: 0, pedal: pedalsOf(e, p) });
    } else {
      const standing = e.state === 'stand';
      drawNaturalStanding(ctx, p, {
        front: { dx: 1, lift: 0 }, back: { dx: -1, lift: 0 }, drop: 0, breath: standing ? 0 : breath, turn, blink,
        gesture: e.state === 'gesture' || gesture > 0 ? gesture : 0, swing: 0
      });
    }
  }

  // ---------- pencahayaan (Tahap 5, light) ----------
  const buffer = createSpriteBuffer(BOX_W, boxH, 12);
  const graders = new WeakMap();
  const NO_PALETTE = {};
  // pewarna per palet aktif dan awalan cahaya; palet dari tangga palet adalah objek yang sama per anak tangga
  function graderFor(pal, prefix) {
    const key = pal || NO_PALETTE;
    if (!graders.has(key)) graders.set(key, new Map());
    const byPrefix = graders.get(key);
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, createGrader(lightFromPalette(pal, prefix)));
    return byPrefix.get(prefix);
  }
  const identity = () => [c.shirt, c.sarong || c.pants, c.hat === 'none' ? c.hair : c.hatColor].filter(Boolean);

  return {
    defaultState: 'idle',
    // fc (opsional) = konteks frame: karakter yang diberi cahaya punya warna identitas sesuai palet frame itu
    identityColors: (fc) => (c.light && fc && fc.pal ? identity().map((hex) => graderFor(fc.pal, c.light).color(hex)) : identity()),
    size: () => ({ w: BOX_W, h: boxH }),

    // Data gerak untuk pemeriksaan otomatis (tanpa menggambar), hanya saat berjalan:
    // telapak yang sedang menapak (x = kolom dunia, step = nomor langkah) dan turunnya pinggul (bob).
    // Gerak klasik ikut dilaporkan supaya selisihnya bisa diukur, tetapi hanya gerak natural di skala 1 yang
    // dijanjikan tidak meluncur (strict).
    motionProbe(e) {
      if (e.state !== 'walk') return null;
      const dir = e.flip ? -1 : 1;
      const x0 = Math.round(e.worldX);
      const s = e.scale || 1;
      if ((e.params.motion ?? c.motion) === 'natural') {
        const g = walkPose(e.worldX, dir, { legLen, strideLength: c.strideLength, speed: e.speedX, scale: s });
        const feet = [['front', g.front], ['back', g.back]].filter(([, f]) => f.planted).map(([foot, f]) => ({ foot, step: f.step, x: x0 + dir * f.dx * s }));
        return { mode: 'natural', strict: s === 1, feet, bob: g.drop };
      }
      const k = Math.floor((e.worldX * dir * 8) / c.strideLength);
      const phase = mod(k, 8);
      const cycle = Math.floor(k / 8);
      const feet = [];
      if (WALK.frontLift[phase] === 0 && phase <= 4) feet.push({ foot: 'front', step: cycle, x: x0 + dir * WALK.frontFoot[phase] * s });
      if (WALK.backLift[phase] === 0) feet.push({ foot: 'back', step: phase >= 4 ? cycle : cycle - 1, x: x0 + dir * WALK.backFoot[phase] * s });
      return { mode: 'classic', strict: false, feet, bob: WALK.bob[phase] };
    },

    // Data pose untuk pemeriksaan otomatis (T19), hanya gerak natural. draw() dijalankan sekali ke konteks kosong
    // tanpa cahaya sambil perekam aktif, jadi datanya berasal dari fungsi gambar yang sama dengan render (lihat mark()).
    // Gerak klasik Tahap 3 dibekukan dan tidak diukur: hasilnya hanya { mode: 'classic' }.
    // items: body (tinggi pinggul, bahu, kepala), arm (bahu, siku, tangan, titik mentah dan panjang tulang), leg,
    // feet (lift dan planted), sit (baris duduk), touch (bagian yang harus bersentuhan), driver (penggerak).
    poseProbe(e) {
      if ((e.params.motion ?? c.motion) !== 'natural') return { mode: 'classic', state: e.state };
      const items = [];
      record = items;
      try {
        this.draw(NULL_CTX, { ...e, params: { ...e.params, light: false } }, null);
      } finally {
        record = null;
      }
      return { mode: 'natural', strict: (e.scale || 1) === 1, state: e.state, box: { w: BOX_W, h: boxH }, items };
    },

    draw(ctx, e, fc) {
      const p = e.params;
      const time = e.time;
      const pose = {
        time,
        turn: p.headTurn ?? 0,
        gesture: Math.max(0, Math.min(1, p.gesture ?? 0)),
        blink: blinking(time),
        // napas pelan: bahu naik 1 piksel setengah waktu
        breath: Math.sin((time / (p.breathSeconds ?? 3.4)) * Math.PI * 2) > 0.2 ? 1 : 0
      };
      const body = (target) => ((p.motion ?? c.motion) === 'natural' ? drawNatural(target, e, pose) : drawClassic(target, e, pose));
      const light = p.light ?? c.light;
      if (!light) {
        body(ctx);
        return;
      }
      // digambar dulu dengan warna dasar ke penyangga, lalu diwarnai cahaya palet frame ini
      buffer.clear();
      withView(buffer.ctx, buffer.view, () => body(buffer.ctx));
      // arah cahaya: params/paramTracks entitas, lalu track lingkungan (lightTrack), lalu nilai tetap aset
      const track = p.lightTrack ?? c.lightTrack;
      const direction = p.lightDirection ?? (track && fc && fc.env ? fc.env[track] ?? 0 : c.lightDirection);
      flushLit(buffer, ctx, graderFor(fc && fc.pal, light), lightSide(direction, e.flip));
    }
  };
}

export const assetTypes = {
  'rig-character': { create: (def) => createRigCharacter(def) }
};
