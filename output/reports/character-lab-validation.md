# Laporan Pengujian: Lab Karakter: Gerak dan Cahaya

Laporan ini dibuat otomatis oleh `npm run validate`.

- Waktu uji: 2026-10-28T04:31:51.902Z
- Proyek: `character-lab`
- Konfigurasi: `config/character-lab.json` (+ 8 file $include)
- Mesin: Pixel History Studio 0.5.0, sidik jari mesin `9420c042aa03f0b9`, pustaka aset `2a6000361daf6301`
- Video: `output/video/character-lab.mp4`
- Spesifikasi: 480x270 internal, 1920x1080 output (upscale browser), 30 FPS, 12 detik, 360 frame, seed 2026
- Lama render frame: 10.4 detik, lama encoding: 10.4 detik

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
| 14 | Adegan bisa dirender terpisah | LULUS |
| 15 | Mesin bersama, modul proyek terisolasi | LULUS |
| 16 | Video berasal dari render terbaru | LULUS |
| 17 | Rendering deterministik | LULUS |
| 18 | FFmpeg membaca seluruh video | LULUS |
| 19 | Video dapat diputar | LULUS |
| 20 | Render ulang konsisten | LULUS |

Status akhir: **SEMUA LULUS** (38/38 pemeriksaan)

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
| 3 | Render terakhir selesai dengan sukses | LULUS | status complete, selesai 2026-10-28T04:27:55.817Z |
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
| 36 | Rendering deterministik (render ulang identik, urutan terbalik) | LULUS | 360/360 frame identik byte demi byte, 3/3 frame identik saat dirender dua kali |
| 37 | Tidak ada error JavaScript selama rendering | LULUS | 0 error saat render, 0 error saat pengujian |
| 38 | Encode ulang menghasilkan MP4 identik | LULUS | SHA-256 sama: 819e48df0f7a1450... |

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

- Sistem operasi: Linux 6.18.44-fc-v180 (linux/x64)
- Node.js: v22.22.0
- Chromium: 153.0.8010.12
- ffmpeg version 6.1.1-3ubuntu5 Copyright (c) 2000-2023 the FFmpeg developers
- ffprobe version 6.1.1-3ubuntu5 Copyright (c) 2007-2023 the FFmpeg developers

## Perintah encoding

```
ffmpeg -y -v error -framerate 30 -start_number 0 -i output/frames/character-lab/frame_%04d.png -frames:v 360 -vf scale=1920:1080:flags=neighbor:out_color_matrix=bt709:out_range=tv,format=yuv420p -c:v libx264 -preset slow -crf 16 -tune animation -profile:v high -level:v 4.1 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -r 30 -movflags +faststart -f mp4 output/video/character-lab.mp4
```
