# Laporan Pengujian: Kereta Malam Menuju Fajar

Laporan ini dibuat otomatis oleh `npm run validate`.

- Waktu uji: 2026-10-29T02:47:02.821Z
- Proyek: `night-to-dawn`
- Konfigurasi: `config/film-night-to-dawn.json`
- Mesin: Pixel History Studio 0.5.0, sidik jari mesin `e123d7ea0a4c4025`, pustaka aset `4c60b45add045f40`
- Video: `output/video/film-night-to-dawn.mp4`
- Spesifikasi: 480x270 internal, 1920x1080 output (upscale ffmpeg), 30 FPS, 15 detik, 450 frame, seed 1927
- Lama render frame: 12.8 detik, lama encoding: 19.6 detik

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

Status akhir: **TIDAK ADA YANG GAGAL** (39 lulus, 5 tidak diperiksa, dari 44 pemeriksaan)

KNOWN ISSUE = masalah yang sudah tercatat di `docs/BACKLOG.md` dan tidak memburuk, hanya di proyek, pemeran, dan frame yang tercatat (`src/render/known-issues.cjs`). KNOWN ISSUE "usulan" belum disetujui pemilik. TIDAK DIPERIKSA = tidak ada yang bisa diperiksa di proyek ini. Keduanya bukan LULUS.

## Timeline

| Adegan | Nama | Frame [awal, akhir) | Jumlah frame | Durasi |
|--------|------|-------|--------------|--------|
| s01-night-train | Night Train | [0, 150) = 0-149 | 150 | 5.00 detik |
| s02-inside-train | Inside the Train | [150, 300) = 150-299 | 150 | 5.00 detik |
| s03-journey-to-dawn | Journey to Dawn | [300, 450) = 300-449 | 150 | 5.00 detik |

| Transisi | Jenis | Frame | Jumlah frame |
|----------|-------|-------|--------------|
| s01-night-train->s02-inside-train | portal | 132-167 | 36 |
| s02-inside-train->s03-journey-to-dawn | portal | 282-317 | 36 |

## Detail pemeriksaan

| No | Pemeriksaan | Hasil | Detail |
|----|-------------|-------|--------|
| 1 | Interval adegan valid | LULUS | 3 adegan menutup 450/450 frame tanpa celah: s01-night-train [0, 150), s02-inside-train [150, 300), s03-journey-to-dawn [300, 450) |
| 2 | Transisi berada di dalam durasi film | LULUS | portal 132-167, portal 282-317 |
| 3 | Render terakhir selesai dengan sukses | LULUS | status complete, selesai 2026-10-29T02:40:55.213Z |
| 4 | Video berasal dari render terbaru (bukan sisa render lama) | LULUS | konfigurasi, mesin, pustaka aset, frame, dan MP4 cocok dengan manifest |
| 5 | File MP4 ada | LULUS | film-night-to-dawn.mp4 (5.33 MB) |
| 6 | Kontainer MP4 | LULUS | mov,mp4,m4a,3gp,3g2,mj2 |
| 7 | Codec video H.264 | LULUS | h264 (High) |
| 8 | Resolusi output | LULUS | 1920x1080 |
| 9 | Rasio 16:9 | LULUS | 1920:1080 |
| 10 | Frame rate | LULUS | 30/1 (rata-rata 30/1) |
| 11 | Jumlah frame | LULUS | 450 dari 450 frame |
| 12 | Durasi | LULUS | 15.000 detik (target 15.000) |
| 13 | Format piksel | LULUS | yuv420p |
| 14 | Video dapat diputar di perangkat umum | LULUS | profil High, level 4.1, yuv420p, piksel 1:1, faststart ya |
| 15 | FFmpeg membaca seluruh video tanpa error | LULUS | semua frame terbaca bersih |
| 16 | Tidak ada frame yang hilang saat decode | LULUS | 450 frame ter-decode, 450 frame terukur |
| 17 | Tidak ada frame kosong | LULUS | kecerahan rata-rata terendah 40.9, rentang terendah 187 |
| 18 | Animasi bergerak (bukan gambar statis) | LULUS | 450 frame unik, 0 pasang frame berurutan identik |
| 19 | Frame terakhir valid | LULUS | frame 449: kecerahan rata-rata 71.8, rentang 203 |
| 20 | Tidak ada kilatan cahaya mendadak | LULUS | perubahan kecerahan terbesar antar frame 5.9 (batas 8) |
| 21 | Tidak ada potongan kasar (hard cut) | LULUS | semua pergantian gambar berlangsung bertahap |
| 22 | Grid piksel stabil saat kamera bergerak dan zoom (tidak merayap) | LULUS | proyek memakai upscale ffmpeg tanpa zoom kamera |
| 23 | Frame PNG lengkap dan berurutan | LULUS | 450/450 file PNG 480x270 |
| 24 | Hanya modul milik proyek ini yang dimuat | LULUS | 4 modul: /src/assets/registry.js, /src/scenes/night-train.js, /src/scenes/inside-train.js, /src/scenes/journey-to-dawn.js |
| 25 | Tidak ada modul proyek lain yang ikut terunduh | LULUS | 29 file JS terunduh (/src/engine/: 16, /src/assets/: 10, /src/scenes/: 3) |
| 26 | Transisi s01-night-train->s02-inside-train menyambung tanpa lompatan | LULUS | frame 132 sama dengan s01-night-train, frame 167 sama dengan s02-inside-train |
| 27 | Portal s01-night-train->s02-inside-train menutup layar sebelum transisi selesai | LULUS | layar tertutup penuh mulai frame 160 (transisi berakhir di 167) |
| 28 | Transisi s02-inside-train->s03-journey-to-dawn menyambung tanpa lompatan | LULUS | frame 282 sama dengan s02-inside-train, frame 317 sama dengan s03-journey-to-dawn |
| 29 | Portal s02-inside-train->s03-journey-to-dawn menutup layar sebelum transisi selesai | LULUS | layar tertutup penuh mulai frame 307 (transisi berakhir di 317) |
| 30 | Adegan s01-night-train bisa dirender terpisah | LULUS | frame 0, 66, 131 identik dengan film utuh |
| 31 | Adegan s02-inside-train bisa dirender terpisah | LULUS | frame 168, 225, 281 identik dengan film utuh |
| 32 | Adegan s03-journey-to-dawn bisa dirender terpisah | LULUS | frame 318, 384, 449 identik dengan film utuh |
| 33 | Aset steam-train sama di semua adegan | LULUS | 3 adegan memakai 1 definisi (train), 1 bentuk berbeda |
| 34 | Warna identitas steam-train konsisten | LULUS | warna #5c1c27, #c9a14e, #5e181e, #4d5474, #a8833a ditemukan persis di frame 60, 445 |
| 35 | Kaki yang menapak tidak meluncur | LULUS | tidak ada karakter bergerak natural yang berjalan |
| 36 | Tubuh tidak bergetar saat berjalan | LULUS | tidak ada karakter bergerak natural yang berjalan |
| 37 | Pose karakter: urutan tubuh, sendi di dalam kotak, telapak menapak di tanah | TIDAK DIPERIKSA | tidak ada pose gerak natural skala 1 yang bisa diperiksa: tidak ada karakter rig |
| 38 | Pose karakter: panjang lengan dan kaki tetap | TIDAK DIPERIKSA | tidak ada pose gerak natural skala 1 yang bisa diperiksa: tidak ada karakter rig |
| 39 | Pose karakter: tangan, kaki, dan benda yang dipegang bersentuhan | TIDAK DIPERIKSA | tidak ada pose gerak natural skala 1 yang bisa diperiksa: tidak ada karakter rig |
| 40 | Pose karakter: posisi duduk di sadel atau bangku | TIDAK DIPERIKSA | tidak ada pose gerak natural skala 1 yang bisa diperiksa: tidak ada karakter rig |
| 41 | Pose karakter: stabil antar-frame (tanpa getar sendi) | TIDAK DIPERIKSA | tidak ada pose gerak natural skala 1 yang bisa diperiksa: tidak ada karakter rig |
| 42 | Rendering deterministik (render ulang identik, urutan terbalik) | LULUS | 450/450 frame identik byte demi byte, 3/3 frame identik saat dirender dua kali |
| 43 | Tidak ada error JavaScript selama rendering | LULUS | 0 error saat render, 0 error saat pengujian |
| 44 | Encode ulang menghasilkan MP4 identik | LULUS | SHA-256 sama: aa188168ec04b5d7... |

## Lembar kontak (preview)

- `output/reports/film-night-to-dawn-contact-sheet.png` (frame 0, 99, 203, 270, 369, 449)
- `output/reports/film-night-to-dawn-scene-s01-night-train.png` (frame 0, 44, 87, 131)
- `output/reports/film-night-to-dawn-scene-s02-inside-train.png` (frame 168, 206, 243, 281)
- `output/reports/film-night-to-dawn-scene-s03-journey-to-dawn.png` (frame 318, 362, 405, 449)
- `output/reports/film-night-to-dawn-transition-s01-night-train-to-s02-inside-train.png` (frame 132, 137, 142, 147, 152, 157, 162, 167)
- `output/reports/film-night-to-dawn-transition-s02-inside-train-to-s03-journey-to-dawn.png` (frame 282, 287, 292, 297, 302, 307, 312, 317)

## Modul yang dimuat

- `/src/assets/registry.js`
- `/src/scenes/night-train.js`
- `/src/scenes/inside-train.js`
- `/src/scenes/journey-to-dawn.js`

## Lingkungan

- Sistem operasi: Linux 6.18.44-fc-v185 (linux/x64)
- Node.js: v22.22.0
- Chromium: 153.0.8010.12
- ffmpeg version 6.1.1-3ubuntu5 Copyright (c) 2000-2023 the FFmpeg developers
- ffprobe version 6.1.1-3ubuntu5 Copyright (c) 2007-2023 the FFmpeg developers

## Perintah encoding

```
ffmpeg -y -v error -framerate 30 -start_number 0 -i output/frames/film-night-to-dawn/frame_%04d.png -frames:v 450 -vf scale=1920:1080:flags=neighbor:out_color_matrix=bt709:out_range=tv,format=yuv420p -c:v libx264 -preset slow -crf 16 -tune animation -profile:v high -level:v 4.1 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -r 30 -movflags +faststart -f mp4 output/video/film-night-to-dawn.mp4
```
