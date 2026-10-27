# Laporan Pengujian: Kereta Malam Menuju Fajar

Laporan ini dibuat otomatis oleh `npm run validate`.

- Waktu uji: 2026-10-27T08:22:51.762Z
- Konfigurasi: `config/film-night-to-dawn.json`
- Video: `output/video/film-night-to-dawn.mp4`
- Spesifikasi: 480x270 internal, 1920x1080 output, 30 FPS, 15 detik, 450 frame
- Lama render frame: 10.9 detik, lama encoding: 18.2 detik

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
| 8 | Tidak ada error JavaScript | LULUS |
| 9 | Transisi tanpa artefak | LULUS |
| 10 | Aset kereta konsisten | LULUS |
| 11 | Rendering deterministik | LULUS |
| 12 | FFmpeg membaca seluruh video | LULUS |
| 13 | Video dapat diputar | LULUS |
| 14 | Render ulang konsisten | LULUS |

Status akhir: **SEMUA LULUS** (28/28 pemeriksaan)

## Timeline

| Adegan | Nama | Frame | Jumlah frame | Durasi |
|--------|------|-------|--------------|--------|
| s01-night-train | Night Train | 0-149 | 150 | 5.00 detik |
| s02-inside-train | Inside the Train | 150-299 | 150 | 5.00 detik |
| s03-journey-to-dawn | Journey to Dawn | 300-449 | 150 | 5.00 detik |

| Transisi | Jenis | Frame | Jumlah frame |
|----------|-------|-------|--------------|
| s01-night-train->s02-inside-train | portal | 132-167 | 36 |
| s02-inside-train->s03-journey-to-dawn | portal | 282-317 | 36 |

## Detail pemeriksaan

| No | Pemeriksaan | Hasil | Detail |
|----|-------------|-------|--------|
| 1 | Interval adegan valid | LULUS | 3 adegan menutup 450/450 frame tanpa celah: s01-night-train 0-149, s02-inside-train 150-299, s03-journey-to-dawn 300-449 |
| 2 | Transisi berada di dalam durasi film | LULUS | portal 132-167, portal 282-317 |
| 3 | File MP4 ada | LULUS | film-night-to-dawn.mp4 (5.33 MB) |
| 4 | Kontainer MP4 | LULUS | mov,mp4,m4a,3gp,3g2,mj2 |
| 5 | Codec video H.264 | LULUS | h264 (High) |
| 6 | Resolusi output | LULUS | 1920x1080 |
| 7 | Rasio 16:9 | LULUS | 1920:1080 |
| 8 | Frame rate | LULUS | 30/1 (rata-rata 30/1) |
| 9 | Jumlah frame | LULUS | 450 dari 450 frame |
| 10 | Durasi | LULUS | 15.000 detik (target 15.000) |
| 11 | Format piksel | LULUS | yuv420p |
| 12 | Video dapat diputar di perangkat umum | LULUS | profil High, level 4.1, yuv420p, piksel 1:1, faststart ya |
| 13 | FFmpeg membaca seluruh video tanpa error | LULUS | semua frame terbaca bersih |
| 14 | Tidak ada frame yang hilang saat decode | LULUS | 450 frame ter-decode, 450 frame terukur |
| 15 | Tidak ada frame kosong | LULUS | kecerahan rata-rata terendah 40.9, rentang terendah 187 |
| 16 | Animasi bergerak (bukan gambar statis) | LULUS | 450 frame unik, 0 pasang frame berurutan identik |
| 17 | Tidak ada kilatan cahaya mendadak | LULUS | perubahan kecerahan terbesar antar frame 5.9 (batas 8) |
| 18 | Tidak ada potongan kasar (hard cut) | LULUS | semua pergantian gambar berlangsung bertahap |
| 19 | Frame PNG lengkap dan berurutan | LULUS | 450/450 file PNG 480x270 |
| 20 | Transisi s01-night-train->s02-inside-train menyambung tanpa lompatan | LULUS | frame 132 sama dengan s01-night-train, frame 167 sama dengan s02-inside-train |
| 21 | Portal s01-night-train->s02-inside-train menutup layar sebelum transisi selesai | LULUS | layar tertutup penuh mulai frame 160 (transisi berakhir di 167) |
| 22 | Transisi s02-inside-train->s03-journey-to-dawn menyambung tanpa lompatan | LULUS | frame 282 sama dengan s02-inside-train, frame 317 sama dengan s03-journey-to-dawn |
| 23 | Portal s02-inside-train->s03-journey-to-dawn menutup layar sebelum transisi selesai | LULUS | layar tertutup penuh mulai frame 307 (transisi berakhir di 317) |
| 24 | Aset kereta konsisten di semua adegan | LULUS | 3 adegan memakai 1 definisi kereta (train), 1 bentuk berbeda |
| 25 | Warna identitas kereta sama di tiap adegan luar | LULUS | warna #5c1c27, #c9a14e, #5e181e, #4d5474, #a8833a ditemukan persis di frame 60, 445 |
| 26 | Rendering deterministik (render ulang identik, urutan terbalik) | LULUS | 450/450 frame identik byte demi byte, 3/3 frame identik saat dirender dua kali |
| 27 | Tidak ada error JavaScript selama rendering | LULUS | 0 error saat render, 0 error saat pengujian |
| 28 | Encode ulang menghasilkan MP4 identik | LULUS | SHA-256 sama: aa188168ec04b5d7... |

## Lembar kontak (preview)

- `output/reports/film-night-to-dawn-contact-sheet.png` (frame 0, 99, 203, 270, 369, 449)
- `output/reports/film-night-to-dawn-scene-s01-night-train.png` (frame 0, 50, 99, 149)
- `output/reports/film-night-to-dawn-scene-s02-inside-train.png` (frame 150, 200, 249, 299)
- `output/reports/film-night-to-dawn-scene-s03-journey-to-dawn.png` (frame 300, 350, 399, 449)
- `output/reports/film-night-to-dawn-transition-s01-night-train-to-s02-inside-train.png` (frame 132, 137, 142, 147, 152, 157, 162, 167)
- `output/reports/film-night-to-dawn-transition-s02-inside-train-to-s03-journey-to-dawn.png` (frame 282, 287, 292, 297, 302, 307, 312, 317)

## Lingkungan

- Sistem operasi: Linux 6.18.44-fc-v165 (linux/x64)
- Node.js: v22.22.0
- Chromium: 153.0.8010.12
- ffmpeg version 6.1.1-3ubuntu5 Copyright (c) 2000-2023 the FFmpeg developers
- ffprobe version 6.1.1-3ubuntu5 Copyright (c) 2007-2023 the FFmpeg developers

## Perintah encoding

```
ffmpeg -y -v error -framerate 30 -start_number 0 -i output/frames/film-night-to-dawn/frame_%04d.png -frames:v 450 -vf scale=1920:1080:flags=neighbor:out_color_matrix=bt709:out_range=tv,format=yuv420p -c:v libx264 -preset slow -crf 16 -tune animation -profile:v high -level:v 4.1 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -r 30 -movflags +faststart output/video/film-night-to-dawn.mp4
```
