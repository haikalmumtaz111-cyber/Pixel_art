// Masalah visual yang sudah diketahui dan dicatat di docs/BACKLOG.md, tetapi belum diperbaiki karena perbaikannya
// mengubah hasil render (butuh deklarasi perubahan dan persetujuan pemilik).
// Pemeriksaan pose (pose-checks.cjs) melaporkannya sebagai KNOWN ISSUE, bukan LULUS, selama tidak memburuk.
//
// Setiap entri hanya berlaku untuk kejadian yang benar-benar tercatat: proyek (`project`), pemeran (id entitas di
// konfigurasi), status karakter (`state`), dan frame. Masalah serupa di pemeran lain, frame lain, sendi lain, atau
// proyek lain tidak cocok, jadi tetap dinilai dengan toleransi normal (GAGAL bila melanggar).
//
// `approval`: "disetujui" = disetujui pemilik sebagai KNOWN ISSUE; "usulan" = diusulkan, menunggu persetujuan
// pemilik (laporan menandainya "usulan"). Entri tidak boleh ditambah, dilonggarkan, atau dihapus tanpa persetujuan.
//
// check "motion-contact": cocok bila pemeran `entity`, status `state`, nama sentuhan `touch` (dari rig.js), dan frame
//   di dalam `frames` (rentang inklusif) sama. `worst` = jarak sel terbesar yang terukur (piksel art).
// check "motion-stable": cocok bila status `state`, jenis pelanggaran `kind` ("pembulatan" = posisi mentah bergerak
//   kurang dari 0,5 piksel, "getar" = posisi mentah sendiri bolak-balik), dan kejadiannya ada di `occurrences`:
//   pemeran -> "<nama sendi> <sumbu>" -> daftar frame (frame tengah pola a, b, a). `worst` = lompatan tergambar
//   terbesar. Jumlah kejadian tidak bisa melebihi daftar ini karena setiap kejadian dicocokkan satu per satu.
//
// Hasilnya GAGAL bila lebih buruk dari `worst` (MEMBURUK), atau bila tidak ada lagi kejadian yang cocok
// (TIDAK LAGI TERJADI, supaya daftar ini dan BACKLOG diperbarui).
//
// V29 (tangan pengayuh melayang 6 px di atas setang) dikeluarkan dari daftar ini bersama perbaikannya (Opsi B, lihat
// docs/BACKLOG.md V29): kedua tangan pengayuh wajib di dalam toleransi soket grip seperti sentuhan lain.
module.exports = [
  {
    id: 'V30', approval: 'disetujui', check: 'motion-contact', project: 'character-lab',
    entity: 'penyapu', state: 'sweep', touch: 'farArm-farHand', frames: [[108, 359]], worst: 3,
    title: 'Ujung lengan jauh penyapu tidak sampai ke tangan jauh yang menggenggam gagang'
  },
  {
    id: 'V31', approval: 'disetujui', check: 'motion-stable', project: 'character-lab', state: 'walk', kind: 'pembulatan', worst: 1,
    occurrences: {
      'darto-pagi': { 'kaki jauh lutut y': [3, 31, 59, 87, 115], 'kaki dekat lutut y': [17, 45, 73, 101, 129] },
      'sumi-pagi': { 'lengan jauh siku y': [74] },
      'darto-sore': { 'kaki dekat lutut y': [261, 289, 317, 345], 'kaki jauh lutut y': [275, 303, 331] },
      'sumi-sore': { 'lengan jauh siku y': [285] }
    },
    title: 'Lutut dan siku berkedip 1 piksel selama 1 frame saat berjalan (pembulatan)'
  },
  {
    id: 'V32', approval: 'disetujui', check: 'motion-stable', project: 'character-lab', state: 'walk', kind: 'getar', worst: 1,
    occurrences: {
      'anak-sekolah': {
        'kaki dekat lutut x': [147, 162, 180], 'kaki dekat lutut y': [147, 162],
        'kaki jauh lutut x': [290, 308, 350], 'kaki jauh lutut y': [290, 350]
      }
    },
    title: 'Lutut bergetar di ujung ayunan kaki saat kaki hampir lurus (karakter kecil yang berjalan cepat)'
  }
];
