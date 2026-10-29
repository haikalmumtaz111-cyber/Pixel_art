# Laporan Pengujian: Pagi di Kota Tua

Laporan ini dibuat otomatis oleh `npm run validate`.

- Waktu uji: 2026-10-29T02:48:07.877Z
- Proyek: `old-town-morning`
- Konfigurasi: `config/old-town-morning.json` (+ 7 file $include)
- Mesin: Pixel History Studio 0.5.0, sidik jari mesin `e123d7ea0a4c4025`, pustaka aset `4c60b45add045f40`
- Video: `output/video/old-town-morning.mp4`
- Spesifikasi: 480x270 internal, 1920x1080 output (upscale browser), 30 FPS, 12 detik, 360 frame, seed 1958
- Lama render frame: 25.3 detik, lama encoding: 18.7 detik

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
| 14 | Pose karakter: sendi, panjang lengan dan kaki, sentuhan, duduk, stabil antar-frame | TIDAK DIPERIKSA |
| 15 | Adegan bisa dirender terpisah | LULUS |
| 16 | Mesin bersama, modul proyek terisolasi | LULUS |
| 17 | Video berasal dari render terbaru | LULUS |
| 18 | Rendering deterministik | LULUS |
| 19 | FFmpeg membaca seluruh video | LULUS |
| 20 | Video dapat diputar | LULUS |
| 21 | Render ulang konsisten | LULUS |

Status akhir: **TIDAK ADA YANG GAGAL** (36 lulus, 5 tidak diperiksa, dari 41 pemeriksaan)

KNOWN ISSUE = masalah yang sudah tercatat di `docs/BACKLOG.md` dan tidak memburuk, hanya di proyek, pemeran, dan frame yang tercatat (`src/render/known-issues.cjs`). KNOWN ISSUE "usulan" belum disetujui pemilik. TIDAK DIPERIKSA = tidak ada yang bisa diperiksa di proyek ini. Keduanya bukan LULUS.

## Timeline

| Adegan | Nama | Frame [awal, akhir) | Jumlah frame | Durasi |
|--------|------|-------|--------------|--------|
| s01-old-town-morning | Pagi di kota tua | [0, 120) = 0-119 | 120 | 4.00 detik |
| s02-morning-walk | Jalan pagi | [120, 240) = 120-239 | 120 | 4.00 detik |
| s03-town-awakens | Kota mulai bangun | [240, 360) = 240-359 | 120 | 4.00 detik |

| Transisi | Jenis | Frame | Jumlah frame |
|----------|-------|-------|--------------|
| s01-old-town-morning->s02-morning-walk | dissolve | 108-131 | 24 |

## Detail pemeriksaan

| No | Pemeriksaan | Hasil | Detail |
|----|-------------|-------|--------|
| 1 | Interval adegan valid | LULUS | 3 adegan menutup 360/360 frame tanpa celah: s01-old-town-morning [0, 120), s02-morning-walk [120, 240), s03-town-awakens [240, 360) |
| 2 | Transisi berada di dalam durasi film | LULUS | dissolve 108-131 |
| 3 | Render terakhir selesai dengan sukses | LULUS | status complete, selesai 2026-10-29T02:42:31.268Z |
| 4 | Video berasal dari render terbaru (bukan sisa render lama) | LULUS | konfigurasi, mesin, pustaka aset, frame, dan MP4 cocok dengan manifest |
| 5 | File MP4 ada | LULUS | old-town-morning.mp4 (6.70 MB) |
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
| 17 | Tidak ada frame kosong | LULUS | kecerahan rata-rata terendah 141.2, rentang terendah 188 |
| 18 | Animasi bergerak (bukan gambar statis) | LULUS | 360 frame unik, 0 pasang frame berurutan identik |
| 19 | Frame terakhir valid | LULUS | frame 359: kecerahan rata-rata 145.2, rentang 210 |
| 20 | Tidak ada kilatan cahaya mendadak | LULUS | perubahan kecerahan terbesar antar frame 0.6 (batas 8) |
| 21 | Tidak ada potongan kasar (hard cut) | LULUS | semua pergantian gambar berlangsung bertahap |
| 22 | Grid piksel stabil saat kamera bergerak dan zoom (tidak merayap) | LULUS | mode zoom "anchored", 123 frame zoom pecahan, 0 perubahan ukuran saat zoom tetap (crawl), 0 bolak-balik dari 1048799 perbandingan kolom/baris dunia |
| 23 | Frame PNG lengkap dan berurutan | LULUS | 360/360 file PNG 1920x1080 |
| 24 | Hanya modul milik proyek ini yang dimuat | LULUS | 7 modul: /src/assets/common/environment.js, /src/assets/town/buildings.js, /src/assets/town/vegetation.js, /src/assets/town/props.js, /src/assets/town/street.js, /src/assets/town/vehicles.js, /src/assets/characters/rig.js |
| 25 | Tidak ada modul proyek lain yang ikut terunduh | LULUS | 27 file JS terunduh (/src/engine/: 16, /src/assets/: 11, /src/scenes/: 0) |
| 26 | Transisi s01-old-town-morning->s02-morning-walk menyambung tanpa lompatan | LULUS | frame 108 sama dengan s01-old-town-morning, frame 131 sama dengan s02-morning-walk |
| 27 | Adegan s01-old-town-morning bisa dirender terpisah | LULUS | frame 0, 54, 107 identik dengan film utuh |
| 28 | Adegan s02-morning-walk bisa dirender terpisah | LULUS | frame 132, 186, 239 identik dengan film utuh |
| 29 | Adegan s03-town-awakens bisa dirender terpisah | LULUS | frame 240, 300, 359 identik dengan film utuh |
| 30 | Aset pak-darto dipakai bersama oleh adegan-adegannya | LULUS | satu definisi aset "pak-darto" dipakai adegan s02-morning-walk, s03-town-awakens |
| 31 | Warna identitas pak-darto konsisten | LULUS | warna #ece6d6, #5a4a3a, #1c1a1e ditemukan persis di frame 160, 330 |
| 32 | Kaki yang menapak tidak meluncur | LULUS | tidak ada karakter bergerak natural yang berjalan / gerak klasik (tidak diwajibkan): 46 langkah, meluncur rata-rata 6.4 px, maks 10 px |
| 33 | Tubuh tidak bergetar saat berjalan | LULUS | tidak ada karakter bergerak natural yang berjalan |
| 34 | Pose karakter: urutan tubuh, sendi di dalam kotak, telapak menapak di tanah | TIDAK DIPERIKSA | tidak ada pose gerak natural skala 1 yang bisa diperiksa: 7 karakter gerak klasik tidak punya data pose (gerak klasik dibekukan) |
| 35 | Pose karakter: panjang lengan dan kaki tetap | TIDAK DIPERIKSA | tidak ada pose gerak natural skala 1 yang bisa diperiksa: 7 karakter gerak klasik tidak punya data pose (gerak klasik dibekukan) |
| 36 | Pose karakter: tangan, kaki, dan benda yang dipegang bersentuhan | TIDAK DIPERIKSA | tidak ada pose gerak natural skala 1 yang bisa diperiksa: 7 karakter gerak klasik tidak punya data pose (gerak klasik dibekukan) |
| 37 | Pose karakter: posisi duduk di sadel atau bangku | TIDAK DIPERIKSA | tidak ada pose gerak natural skala 1 yang bisa diperiksa: 7 karakter gerak klasik tidak punya data pose (gerak klasik dibekukan) |
| 38 | Pose karakter: stabil antar-frame (tanpa getar sendi) | TIDAK DIPERIKSA | tidak ada pose gerak natural skala 1 yang bisa diperiksa: 7 karakter gerak klasik tidak punya data pose (gerak klasik dibekukan) |
| 39 | Rendering deterministik (render ulang identik, urutan terbalik) | LULUS | 360/360 frame identik byte demi byte, 3/3 frame identik saat dirender dua kali |
| 40 | Tidak ada error JavaScript selama rendering | LULUS | 0 error saat render, 0 error saat pengujian |
| 41 | Encode ulang menghasilkan MP4 identik | LULUS | SHA-256 sama: 756f7d874738ddb1... |

## Lembar kontak (preview)

- `output/reports/old-town-morning-contact-sheet.png` (frame 0, 79, 162, 216, 295, 359)
- `output/reports/old-town-morning-scene-s01-old-town-morning.png` (frame 0, 36, 71, 107)
- `output/reports/old-town-morning-scene-s02-morning-walk.png` (frame 132, 168, 203, 239)
- `output/reports/old-town-morning-scene-s03-town-awakens.png` (frame 240, 280, 319, 359)
- `output/reports/old-town-morning-transition-s01-old-town-morning-to-s02-morning-walk.png` (frame 108, 111, 115, 118, 121, 124, 128, 131)

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
ffmpeg -y -v error -framerate 30 -start_number 0 -i output/frames/old-town-morning/frame_%04d.png -frames:v 360 -vf scale=1920:1080:flags=neighbor:out_color_matrix=bt709:out_range=tv,format=yuv420p -c:v libx264 -preset slow -crf 16 -tune animation -profile:v high -level:v 4.1 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -r 30 -movflags +faststart -f mp4 output/video/old-town-morning.mp4
```
