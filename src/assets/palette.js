// Palet warna terbatas ala konsol 16-bit.
// NIGHT adalah palet Tahap 1 (malam hujan). DAWN berisi warna tujuan saat fajar.
// Perubahan malam ke fajar dibagi menjadi beberapa anak tangga (ramp), mirip "palette fade"
// di game 16-bit: tiap frame tetap memakai sekumpulan kecil warna, bukan gradasi halus.

export const NIGHT = {
  // langit dari atas ke cakrawala
  sky: ['#080b1e', '#0c1128', '#111836', '#172044', '#1e2952', '#26335f', '#2f3d6c', '#39487a'],
  moon: '#e8e4c8', moonShade: '#bdbaa0', moonHalo: '#2e3c72', moonHaloLight: '#3a4a84',

  cloudHigh: '#161d3f', cloudHighRim: '#242e5a',
  cloudLow: '#1f2851', cloudLowLight: '#2b3664', cloudLowRim: '#3f4c86', cloudLowShadow: '#18203f',

  mountain: '#1e2858', mountainRim: '#2f3d74',
  hillFar: '#151d44', hillFarRim: '#24315f',
  hillNear: '#0f1736', hillNearRim: '#1c2a50',

  treeFar: '#0b132e', treeFarLight: '#18264c',
  treeNear: '#070c1f', treeNearLight: '#122040',

  house: '#0b1226', houseWindow: '#f4b552', houseWindowDim: '#9a6630',
  pole: '#0a0f22', poleLight: '#1f2848', wire: '#1c2547', insulator: '#56638e',

  gravel: ['#171b2b', '#202538', '#2a3046', '#363d56'],
  rail: '#8e97b4', railShadow: '#3a4058', railGlint: '#d2daf2',
  sleeper: '#1b1517', sleeperLight: '#2e2326',
  ground: ['#070c18', '#0a1120', '#0e172a', '#132037'],
  grass: '#16263a',
  puddle: '#1d2a54', puddleLight: '#3a4a84',
  bush: '#04070f', bushLight: '#18233f',

  // kereta
  locoDark: '#101018', loco: '#1d1f2d', locoLight: '#2f3349', locoShine: '#4d5474',
  brass: '#a8833a', brassLight: '#e3c068',
  bufferRed: '#7c1f24',
  wheelRed: '#5e181e', wheelRedLight: '#8c2b2e', wheelCounter: '#3c0f13',
  wheelRim: '#1b1b25', wheelFace: '#2a2c3a', wheelSpoke: '#5a5f76', hub: '#a6abc0', rod: '#aab1c8',
  coachDark: '#3b1119', coach: '#5c1c27', coachLight: '#7d2a34', coachShine: '#a04047',
  coachStripe: '#c9a14e',
  roof: '#1a1b26', roofLight: '#2e3042', roofShine: '#4c526b',
  chassis: '#0b0b11',
  windowFrame: '#26110c',
  windowLit: '#ffc45c', windowLitHi: '#ffe7a2', windowLitLow: '#e9993a',
  windowDim: '#d08b38', windowDimHi: '#e8b46a',
  passenger: '#603617', crew: '#3a1a0c',
  fire: '#ff7b2b', fireHi: '#ffd264', fireAlt: '#ff9c3c',
  headlight: '#fff7d4',

  smoke: ['#232843', '#2f3558', '#3c4369', '#4b537d'],

  rainFar: '#34407a', rainFarLit: '#8c8a76',
  rainNear: '#7b8ac2', rainNearHi: '#a9b7e8', rainLit: '#f4e8ba',
  splash: '#a3b3e2',

  // dipakai mulai Tahap 2 (kabut dan matahari hanya muncul saat fajar)
  fog: '#2c3866', fogLight: '#3c4a80',
  sunCore: '#fff6d8', sun: '#ffd47e', sunGlow: '#f6a65e', sunGlowFar: '#e07a62',

  vignette: [3, 4, 11]
};

// Tahap 1 mengimpor PALETTE, jadi namanya tetap tersedia.
export const PALETTE = NIGHT;

// Warna tujuan saat fajar penuh. Kunci yang tidak ada di sini tetap memakai warna malam
// (misalnya warna kereta, supaya identitas kereta tidak berubah).
export const DAWN = {
  sky: ['#2a2862', '#3c2f6e', '#553677', '#76407d', '#9b4c7d', '#c35e74', '#e37f62', '#f5a95f'],
  moonHalo: '#5a4a86', moonHaloLight: '#6c5a94',

  cloudHigh: '#4b3569', cloudHighRim: '#cf7a7c',
  cloudLow: '#6b4478', cloudLowLight: '#a35b7d', cloudLowRim: '#f2a472', cloudLowShadow: '#4c3367',

  mountain: '#5b4079', mountainRim: '#e48c6c',
  hillFar: '#403163', hillFarRim: '#b26c6c',
  hillNear: '#2b2549', hillNearRim: '#7c4e60',

  treeFar: '#221d3d', treeFarLight: '#5c405c',
  treeNear: '#171429', treeNearLight: '#402d46',

  house: '#2b2141', houseWindow: '#d8975a', houseWindowDim: '#8a5e42',
  pole: '#1b1731', poleLight: '#4c3652', wire: '#3c2d4a', insulator: '#b48c7c',

  gravel: ['#2b2535', '#3b3143', '#4d3f53', '#635165'],
  rail: '#caa9a2', railShadow: '#5b4757', railGlint: '#ffe2c4',
  sleeper: '#2b1f1f', sleeperLight: '#463131',
  ground: ['#161021', '#1e1729', '#271e33', '#31263f'],
  grass: '#3b3145',
  puddle: '#8b5b7b', puddleLight: '#f2a382',
  bush: '#0f0b17', bushLight: '#3b2b41',

  smoke: ['#5b4b6b', '#7b6181', '#9b7991', '#c29ba2'],

  rainFar: '#7b6b93', rainFarLit: '#9b8aa0',
  rainNear: '#b9a9c9', rainNearHi: '#eadaea', rainLit: '#f4e0c8',
  splash: '#d9c1d1',

  fog: '#8e6d96', fogLight: '#b68ea6',

  vignette: [24, 12, 34]
};

// Warna interior gerbong. Kayu dan kain sengaja diambil dari keluarga warna gerbong luar.
export const INTERIOR = {
  ceiling: '#1e0f09', ceilingRib: '#341b0f', ceilingLight: '#4a2a16',
  wall: '#4f2817', wallLight: '#6a3820', wallDark: '#33180d', wallShine: '#86502c',
  wainscot: '#3a1c10', wainscotLight: '#552c18',
  floor: '#24140c', floorLight: '#3a2214', floorDark: '#160b06',
  velvet: NIGHT.coach, velvetLight: NIGHT.coachLight, velvetDark: NIGHT.coachDark, velvetShine: NIGHT.coachShine,
  frame: NIGHT.windowFrame, frameLight: '#4a2414',
  brass: NIGHT.brass, brassLight: NIGHT.brassLight,
  flame: '#fff0b0', flameCore: '#ffd060',
  luggage: '#6c4126', luggageLight: '#8c5a36', luggageStrap: '#2e1a0e',
  glassEdge: '#0d0b18',
  droplet: '#aebde8', dropletHi: '#eef2ff', dropletTrail: '#5d6ca6',
  shadow: '#0c0605'
};

// Tangga palet sekarang bagian dari mesin inti (generik), diekspor ulang di sini untuk kode lama.
export { createPaletteRamp } from '../engine/palette.js';
