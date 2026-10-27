# Laporan Pengujian: Kereta Malam di Tengah Hujan

Laporan ini dibuat otomatis oleh `npm run validate`.

- Waktu uji: 2026-10-27T10:06:49.786Z
- Proyek: `train-night-rain`
- Konfigurasi: `config/train-night-rain.json`
- Mesin: Pixel History Studio 0.3.0, sidik jari mesin `bc272267a41d3bc9`, pustaka aset `4378116df3a09f47`
- Video: `output/video/train-night-rain.mp4`
- Spesifikasi: 480x270 internal, 1920x1080 output (upscale ffmpeg), 30 FPS, 5 detik, 150 frame, seed 1927
- Lama render frame: 4.3 detik, lama encoding: 9.9 detik

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
| 11 | Aset konsisten antar adegan | TIDAK DIUJI |
| 12 | Adegan bisa dirender terpisah | LULUS |
| 13 | Mesin bersama, modul proyek terisolasi | LULUS |
| 14 | Video berasal dari render terbaru | LULUS |
| 15 | Rendering deterministik | LULUS |
| 16 | FFmpeg membaca seluruh video | LULUS |
| 17 | Video dapat diputar | LULUS |
| 18 | Render ulang konsisten | LULUS |

Status akhir: **SEMUA LULUS** (29/29 pemeriksaan)

## Timeline

| Adegan | Nama | Frame [awal, akhir) | Jumlah frame | Durasi |
|--------|------|-------|--------------|--------|
| train-night-rain | Kereta Malam di Tengah Hujan | [0, 150) = 0-149 | 150 | 5.00 detik |

| Transisi | Jenis | Frame | Jumlah frame |
|----------|-------|-------|--------------|
| - | - | - | - |

## Detail pemeriksaan

| No | Pemeriksaan | Hasil | Detail |
|----|-------------|-------|--------|
| 1 | Interval adegan valid | LULUS | 1 adegan menutup 150/150 frame tanpa celah: train-night-rain [0, 150) |
| 2 | Transisi berada di dalam durasi film | LULUS | tidak ada transisi |
| 3 | Render terakhir selesai dengan sukses | LULUS | status complete, selesai 2026-10-27T10:03:09.233Z |
| 4 | Video berasal dari render terbaru (bukan sisa render lama) | LULUS | konfigurasi, mesin, pustaka aset, frame, dan MP4 cocok dengan manifest |
| 5 | File MP4 ada | LULUS | train-night-rain.mp4 (2.19 MB) |
| 6 | Kontainer MP4 | LULUS | mov,mp4,m4a,3gp,3g2,mj2 |
| 7 | Codec video H.264 | LULUS | h264 (High) |
| 8 | Resolusi output | LULUS | 1920x1080 |
| 9 | Rasio 16:9 | LULUS | 1920:1080 |
| 10 | Frame rate | LULUS | 30/1 (rata-rata 30/1) |
| 11 | Jumlah frame | LULUS | 150 dari 150 frame |
| 12 | Durasi | LULUS | 5.000 detik (target 5.000) |
| 13 | Format piksel | LULUS | yuv420p |
| 14 | Video dapat diputar di perangkat umum | LULUS | profil High, level 4.1, yuv420p, piksel 1:1, faststart ya |
| 15 | FFmpeg membaca seluruh video tanpa error | LULUS | semua frame terbaca bersih |
| 16 | Tidak ada frame yang hilang saat decode | LULUS | 150 frame ter-decode, 150 frame terukur |
| 17 | Tidak ada frame kosong | LULUS | kecerahan rata-rata terendah 46.3, rentang terendah 207 |
| 18 | Animasi bergerak (bukan gambar statis) | LULUS | 150 frame unik, 0 pasang frame berurutan identik |
| 19 | Frame terakhir valid | LULUS | frame 149: kecerahan rata-rata 46.3, rentang 209 |
| 20 | Tidak ada kilatan cahaya mendadak | LULUS | perubahan kecerahan terbesar antar frame 0.2 (batas 8) |
| 21 | Tidak ada potongan kasar (hard cut) | LULUS | semua pergantian gambar berlangsung bertahap |
| 22 | Frame PNG lengkap dan berurutan | LULUS | 150/150 file PNG 480x270 |
| 23 | Hanya modul milik proyek ini yang dimuat | LULUS | 1 modul: /src/scenes/train-night-rain.js |
| 24 | Tidak ada modul proyek lain yang ikut terunduh | LULUS | 23 file JS terunduh (/src/engine/: 15, /src/assets/: 7, /src/scenes/: 1) |
| 25 | Transisi menyambung tanpa lompatan | LULUS | tidak ada transisi |
| 26 | Adegan train-night-rain bisa dirender terpisah | LULUS | frame 0, 75, 149 identik dengan film utuh |
| 27 | Rendering deterministik (render ulang identik, urutan terbalik) | LULUS | 150/150 frame identik byte demi byte, 3/3 frame identik saat dirender dua kali |
| 28 | Tidak ada error JavaScript selama rendering | LULUS | 0 error saat render, 0 error saat pengujian |
| 29 | Encode ulang menghasilkan MP4 identik | LULUS | SHA-256 sama: 28e9a3a3c503dabd... |

## Lembar kontak (preview)

- `output/reports/train-night-rain-contact-sheet.png` (frame 0, 33, 68, 90, 123, 149)

## Modul yang dimuat

- `/src/scenes/train-night-rain.js`

## Lingkungan

- Sistem operasi: Linux 6.18.44-fc-v165 (linux/x64)
- Node.js: v22.22.0
- Chromium: 153.0.8010.12
- ffmpeg version 6.1.1-3ubuntu5 Copyright (c) 2000-2023 the FFmpeg developers
- ffprobe version 6.1.1-3ubuntu5 Copyright (c) 2007-2023 the FFmpeg developers

## Perintah encoding

```
ffmpeg -y -v error -framerate 30 -start_number 0 -i output/frames/train-night-rain/frame_%04d.png -frames:v 150 -vf scale=1920:1080:flags=neighbor:out_color_matrix=bt709:out_range=tv,format=yuv420p -c:v libx264 -preset slow -crf 16 -tune animation -profile:v high -level:v 4.1 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -r 30 -movflags +faststart -f mp4 output/video/train-night-rain.mp4
```
