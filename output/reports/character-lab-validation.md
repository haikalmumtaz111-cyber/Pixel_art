# Laporan Pengujian: Lab Karakter: Gerak dan Cahaya

Laporan ini dibuat otomatis oleh `npm run validate`.

- Waktu uji: 2026-10-29T02:46:11.644Z
- Proyek: `character-lab`
- Konfigurasi: `config/character-lab.json` (+ 8 file $include)
- Mesin: Pixel History Studio 0.5.0, sidik jari mesin `e123d7ea0a4c4025`, pustaka aset `4c60b45add045f40`
- Video: `output/video/character-lab.mp4`
- Spesifikasi: 480x270 internal, 1920x1080 output (upscale browser), 30 FPS, 12 detik, 360 frame, seed 2026
- Lama render frame: 22.4 detik, lama encoding: 14.7 detik

## Ringkasan kebutuhan

| No | Kebutuhan | Hasil |
|----|-----------|-------|
| 1 | Jumlah frame tepat | LULUS |
| 2 | Durasi video tepat | LULUS |
| 3 | Resolusi sesuai target | LULUS |
| 4 | FPS sesuai target | LULUS |
| 5 | Interval waktu adegan valid | LULUS |
| 6 | Tidak ada frame yang hilang | LULUS |
| 7 | Tidak ada frame kosong | LULUS |
| 8 | Frame terakhir valid | LULUS |
| 9 | Tidak ada error JavaScript | LULUS |
| 10 | Transisi tanpa artefak | LULUS |
| 11 | Grid piksel kamera stabil (tanpa crawl) | LULUS |
| 12 | Aset konsisten antar adegan | LULUS |
| 13 | Gerak karakter: kaki tidak meluncur, tubuh tidak bergetar | LULUS |
| 14 | Pose karakter: sendi, panjang lengan dan kaki, sentuhan, duduk, stabil antar-frame | KNOWN ISSUE |
| 15 | Adegan bisa dirender terpisah | LULUS |
| 16 | Mesin bersama, modul proyek terisolasi | LULUS |
| 17 | Video berasal dari render terbaru | LULUS |
| 18 | Rendering deterministik | LULUS |
| 19 | FFmpeg membaca seluruh video | LULUS |
| 20 | Video dapat diputar | LULUS |
| 21 | Render ulang konsisten | LULUS |

Status akhir: **TIDAK ADA YANG GAGAL** (43 lulus, 4 KNOWN ISSUE, dari 47 pemeriksaan)

KNOWN ISSUE = masalah yang sudah tercatat di `docs/BACKLOG.md` dan tidak memburuk, hanya di proyek, pemeran, dan frame yang tercatat (`src/render/known-issues.cjs`). KNOWN ISSUE "usulan" belum disetujui pemilik. TIDAK DIPERIKSA = tidak ada yang bisa diperiksa di proyek ini. Keduanya bukan LULUS.

## Timeline

| Adegan | Nama | Frame [awal, akhir) | Jumlah frame | Durasi |
|--------|------|-------|--------------|--------|
| s01-langkah | Langkah dan ayunan tangan (pagi) | [0, 120) = 0-119 | 120 | 4.00 detik |
| s02-pose | Pose lengan: melambai, membaca, tangan di belakang, mengayuh (siang) | [120, 225) = 120-224 | 105 | 3.50 detik |
| s03-sore | Siang ke sore | [225, 288) = 225-287 | 63 | 2.10 detik |
| s04-malam | Sore ke malam | [288, 360) = 288-359 | 72 | 2.40 detik |

| Transisi | Jenis | Frame | Jumlah frame |
|----------|-------|-------|--------------|
| s01-langkah->s02-pose | dissolve | 108-131 | 24 |
| s02-pose->s03-sore | dissolve | 213-236 | 24 |

## Detail pemeriksaan

| No | Pemeriksaan | Hasil | Detail |
|----|-------------|-------|--------|
| 1 | Interval adegan valid | LULUS | 4 adegan menutup 360/360 frame tanpa celah: s01-langkah [0, 120), s02-pose [120, 225), s03-sore [225, 288), s04-malam [288, 360) |
| 2 | Transisi berada di dalam durasi film | LULUS | dissolve 108-131, dissolve 213-236 |
| 3 | Render terakhir selesai dengan sukses | LULUS | status complete, selesai 2026-10-29T02:39:23.348Z |
| 4 | Video berasal dari render terbaru (bukan sisa render lama) | LULUS | konfigurasi, mesin, pustaka aset, frame, dan MP4 cocok dengan manifest |
| 5 | File MP4 ada | LULUS | character-lab.mp4 (4.13 MB) |
| 6 | Kontainer MP4 | LULUS | mov,mp4,m4a,3gp,3g2,mj2 |
| 7 | Codec video H.264 | LULUS | h264 (High) |
| 8 | Resolusi output | LULUS | 1920x1080 |
| 9 | Rasio 16:9 | LULUS | 1920:1080 |
| 10 | Frame rate | LULUS | 30/1 (rata-rata 30/1) |
| 11 | Jumlah frame | LULUS | 360 dari 360 frame |
| 12 | Durasi | LULUS | 12.000 detik (target 12.000) |
| 13 | Format piksel | LULUS | yuv420p |
| 14 | Video dapat diputar di perangkat umum | LULUS | profil High, level 4.1, yuv420p, piksel 1:1, faststart ya |
| 15 | FFmpeg membaca seluruh video tanpa error | LULUS | semua frame terbaca bersih |
| 16 | Tidak ada frame yang hilang saat decode | LULUS | 360 frame ter-decode, 360 frame terukur |
| 17 | Tidak ada frame kosong | LULUS | kecerahan rata-rata terendah 62.8, rentang terendah 169 |
| 18 | Animasi bergerak (bukan gambar statis) | LULUS | 360 frame unik, 0 pasang frame berurutan identik |
| 19 | Frame terakhir valid | LULUS | frame 359: kecerahan rata-rata 62.9, rentang 199 |
| 20 | Tidak ada kilatan cahaya mendadak | LULUS | perubahan kecerahan terbesar antar frame 2.9 (batas 8) |
| 21 | Tidak ada potongan kasar (hard cut) | LULUS | semua pergantian gambar berlangsung bertahap |
| 22 | Grid piksel stabil saat kamera bergerak dan zoom (tidak merayap) | LULUS | mode zoom "anchored", 0 frame zoom pecahan, 0 perubahan ukuran saat zoom tetap (crawl), 0 bolak-balik dari 173108 perbandingan kolom/baris dunia |
| 23 | Frame PNG lengkap dan berurutan | LULUS | 360/360 file PNG 1920x1080 |
| 24 | Hanya modul milik proyek ini yang dimuat | LULUS | 7 modul: /src/assets/common/environment.js, /src/assets/town/buildings.js, /src/assets/town/vegetation.js, /src/assets/town/props.js, /src/assets/town/street.js, /src/assets/town/vehicles.js, /src/assets/characters/rig.js |
| 25 | Tidak ada modul proyek lain yang ikut terunduh | LULUS | 27 file JS terunduh (/src/engine/: 16, /src/assets/: 11, /src/scenes/: 0) |
| 26 | Transisi s01-langkah->s02-pose menyambung tanpa lompatan | LULUS | frame 108 sama dengan s01-langkah, frame 131 sama dengan s02-pose |
| 27 | Transisi s02-pose->s03-sore menyambung tanpa lompatan | LULUS | frame 213 sama dengan s02-pose, frame 236 sama dengan s03-sore |
| 28 | Adegan s01-langkah bisa dirender terpisah | LULUS | frame 0, 54, 107 identik dengan film utuh |
| 29 | Adegan s02-pose bisa dirender terpisah | LULUS | frame 132, 172, 212 identik dengan film utuh |
| 30 | Adegan s03-sore bisa dirender terpisah | LULUS | frame 237, 262, 287 identik dengan film utuh |
| 31 | Adegan s04-malam bisa dirender terpisah | LULUS | frame 288, 324, 359 identik dengan film utuh |
| 32 | Aset pak-darto dipakai bersama oleh adegan-adegannya | LULUS | satu definisi aset "pak-darto" dipakai adegan s01-langkah, s03-sore, s04-malam |
| 33 | Warna identitas pak-darto konsisten | LULUS | warna mengikuti palet frame, ditemukan persis di frame 60 (#e5d1bf, #5d4a45, #24212f), frame 250 (#e8d4bb, #5e473a, #231b23), frame 340 (#727ea4, #333348, #181c38) |
| 34 | Kaki yang menapak tidak meluncur | LULUS | 97 langkah gerak natural dari 6 karakter, setiap telapak diam di tanah selama menapak |
| 35 | Tubuh tidak bergetar saat berjalan | LULUS | 1050 frame jalan natural diperiksa, pinggul tidak pernah bolak-balik dalam 1 frame |
| 36 | Pose karakter: urutan tubuh, sendi di dalam kotak, telapak menapak di tanah | LULUS | 1947 pose dari 10 karakter natural: urutan tubuh benar, 16380 titik sendi di dalam kotak gambar, 2070 telapak menapak tepat di garis tanah |
| 37 | Pose karakter: panjang lengan dan kaki tetap | LULUS | 3894 lengan dan 1566 kaki: panjang tulang tepat sama dengan desain, ruas tergambar paling jauh 0.901 px dari tulangnya (batas 1.514), regangan betis terbesar 1.038 px (di dalam batas jangkauan langkah) / kaki duduk dan mengayuh bentuk Tahap 3 tidak diukur di 381 pose (keterbatasan, V19); kaki bersarung bentuk Tahap 3 tidak diukur di 783 pose (keterbatasan, V27) |
| 38 | Pose karakter: tangan, kaki, dan benda yang dipegang bersentuhan | LULUS | semua bersentuhan (jarak sel paling banyak 1): walk:parcel-hand 279, walk:basket-hand 279, sweep:nearHand-handle 252, sweep:farHand-handle 252, cycle:shoe-pedal 129 / di luar KNOWN ISSUE yang dilaporkan terpisah: V29, V30 |
| 39 | KNOWN ISSUE V29: Tangan pengayuh tidak memegang setang, melayang di atasnya | KNOWN ISSUE | 258 sentuhan di 129 frame, terburuk 6 px, tidak lebih buruk dari batas tercatat 6 px (pemeran pengayuh, status cycle, sentuhan hand-grip, frame 108-236; lihat docs/BACKLOG.md V29) |
| 40 | KNOWN ISSUE V30: Ujung lengan jauh penyapu tidak sampai ke tangan jauh yang menggenggam gagang | KNOWN ISSUE | 252 sentuhan di 252 frame, terburuk 3 px, tidak lebih buruk dari batas tercatat 3 px (pemeran penyapu, status sweep, sentuhan farArm-farHand, frame 108-359; lihat docs/BACKLOG.md V30) |
| 41 | Pose karakter: posisi duduk di sadel atau bangku | LULUS | 381 pose duduk: badan bawah tepat di tempat duduk (sadel induk atau bangku di bawahnya) |
| 42 | Pose karakter: stabil antar-frame (tanpa getar sendi) | LULUS | 20389 titik sendi x 3 frame diperiksa, tanpa getar 1 frame di luar KNOWN ISSUE (29 kejadian dilaporkan terpisah: V31, V32); 20522 langkah frame: sendi yang penggeraknya diam bergerak paling banyak 1 px; 48 dikecualikan karena penggerak sendi itu sendiri berbalik arah dengan mulus di frame itu: bu-sari frame 182 lengan dekat siku y (titik balik gesture), bu-sari frame 182 lengan dekat tangan x (titik balik gesture), bu-sari frame 182 lengan dekat tangan y (titik balik gesture), bu-sari frame 188 lengan dekat siku x (titik balik gesture), bu-sari frame 188 lengan dekat siku y (titik balik gesture), bu-sari frame 188 lengan dekat tangan x (titik balik gesture), ... (48) / lompatan terbesar saat penggerak bergerak (informasi): walk 4 px, gesture 4 px, sweep 1 px |
| 43 | KNOWN ISSUE V31: Lutut dan siku berkedip 1 piksel selama 1 frame saat berjalan (pembulatan) | KNOWN ISSUE | 19 dari 19 kejadian tercatat (pembulatan) di 4 pemeran, terbesar 1 px, tidak lebih buruk dari batas tercatat 1 px (status walk, pemeran darto-pagi, sumi-pagi, darto-sore, sumi-sore); contoh darto-pagi frame 3 kaki jauh lutut y, darto-pagi frame 17 kaki dekat lutut y, darto-pagi frame 31 kaki jauh lutut y, ... (19); lihat docs/BACKLOG.md V31 |
| 44 | KNOWN ISSUE V32: Lutut bergetar di ujung ayunan kaki saat kaki hampir lurus (karakter kecil yang berjalan cepat) | KNOWN ISSUE | 10 dari 10 kejadian tercatat (getar) di 1 pemeran, terbesar 1 px, tidak lebih buruk dari batas tercatat 1 px (status walk, pemeran anak-sekolah); contoh anak-sekolah frame 147 kaki dekat lutut x, anak-sekolah frame 147 kaki dekat lutut y, anak-sekolah frame 162 kaki dekat lutut x, ... (10); lihat docs/BACKLOG.md V32 |
| 45 | Rendering deterministik (render ulang identik, urutan terbalik) | LULUS | 360/360 frame identik byte demi byte, 3/3 frame identik saat dirender dua kali |
| 46 | Tidak ada error JavaScript selama rendering | LULUS | 0 error saat render, 0 error saat pengujian |
| 47 | Encode ulang menghasilkan MP4 identik | LULUS | SHA-256 sama: 819e48df0f7a1450... |

## Lembar kontak (preview)

- `output/reports/character-lab-contact-sheet.png` (frame 0, 79, 162, 216, 295, 359)
- `output/reports/character-lab-scene-s01-langkah.png` (frame 0, 36, 71, 107)
- `output/reports/character-lab-scene-s02-pose.png` (frame 132, 159, 185, 212)
- `output/reports/character-lab-scene-s03-sore.png` (frame 237, 254, 270, 287)
- `output/reports/character-lab-scene-s04-malam.png` (frame 288, 312, 335, 359)
- `output/reports/character-lab-transition-s01-langkah-to-s02-pose.png` (frame 108, 111, 115, 118, 121, 124, 128, 131)
- `output/reports/character-lab-transition-s02-pose-to-s03-sore.png` (frame 213, 216, 220, 223, 226, 229, 233, 236)

## Modul yang dimuat

- `/src/assets/common/environment.js`
- `/src/assets/town/buildings.js`
- `/src/assets/town/vegetation.js`
- `/src/assets/town/props.js`
- `/src/assets/town/street.js`
- `/src/assets/town/vehicles.js`
- `/src/assets/characters/rig.js`

## Lingkungan

- Sistem operasi: Linux 6.18.44-fc-v185 (linux/x64)
- Node.js: v22.22.0
- Chromium: 153.0.8010.12
- ffmpeg version 6.1.1-3ubuntu5 Copyright (c) 2000-2023 the FFmpeg developers
- ffprobe version 6.1.1-3ubuntu5 Copyright (c) 2007-2023 the FFmpeg developers

## Perintah encoding

```
ffmpeg -y -v error -framerate 30 -start_number 0 -i output/frames/character-lab/frame_%04d.png -frames:v 360 -vf scale=1920:1080:flags=neighbor:out_color_matrix=bt709:out_range=tv,format=yuv420p -c:v libx264 -preset slow -crf 16 -tune animation -profile:v high -level:v 4.1 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -r 30 -movflags +faststart -f mp4 output/video/character-lab.mp4
```
