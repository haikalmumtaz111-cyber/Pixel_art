# Laporan Pengujian: Kereta Malam di Tengah Hujan

Laporan ini dibuat otomatis oleh `npm run validate`.

- Waktu uji: 2026-10-27T08:17:56.598Z
- Konfigurasi: `config/train-night-rain.json`
- Video: `output/video/train-night-rain.mp4`
- Spesifikasi: 480x270 internal, 1920x1080 output, 30 FPS, 5 detik, 150 frame
- Lama render frame: 3.8 detik, lama encoding: 8.7 detik

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
| 10 | Aset kereta konsisten | TIDAK DIUJI |
| 11 | Rendering deterministik | LULUS |
| 12 | FFmpeg membaca seluruh video | LULUS |
| 13 | Video dapat diputar | LULUS |
| 14 | Render ulang konsisten | LULUS |

Status akhir: **SEMUA LULUS** (23/23 pemeriksaan)

## Timeline

| Adegan | Nama | Frame | Jumlah frame | Durasi |
|--------|------|-------|--------------|--------|
| train-night-rain | Kereta Malam di Tengah Hujan | 0-149 | 150 | 5.00 detik |

| Transisi | Jenis | Frame | Jumlah frame |
|----------|-------|-------|--------------|
| - | - | - | - |

## Detail pemeriksaan

| No | Pemeriksaan | Hasil | Detail |
|----|-------------|-------|--------|
| 1 | Interval adegan valid | LULUS | 1 adegan menutup 150/150 frame tanpa celah: train-night-rain 0-149 |
| 2 | Transisi berada di dalam durasi film | LULUS | tidak ada transisi |
| 3 | File MP4 ada | LULUS | train-night-rain.mp4 (2.19 MB) |
| 4 | Kontainer MP4 | LULUS | mov,mp4,m4a,3gp,3g2,mj2 |
| 5 | Codec video H.264 | LULUS | h264 (High) |
| 6 | Resolusi output | LULUS | 1920x1080 |
| 7 | Rasio 16:9 | LULUS | 1920:1080 |
| 8 | Frame rate | LULUS | 30/1 (rata-rata 30/1) |
| 9 | Jumlah frame | LULUS | 150 dari 150 frame |
| 10 | Durasi | LULUS | 5.000 detik (target 5.000) |
| 11 | Format piksel | LULUS | yuv420p |
| 12 | Video dapat diputar di perangkat umum | LULUS | profil High, level 4.1, yuv420p, piksel 1:1, faststart ya |
| 13 | FFmpeg membaca seluruh video tanpa error | LULUS | semua frame terbaca bersih |
| 14 | Tidak ada frame yang hilang saat decode | LULUS | 150 frame ter-decode, 150 frame terukur |
| 15 | Tidak ada frame kosong | LULUS | kecerahan rata-rata terendah 46.3, rentang terendah 207 |
| 16 | Animasi bergerak (bukan gambar statis) | LULUS | 150 frame unik, 0 pasang frame berurutan identik |
| 17 | Tidak ada kilatan cahaya mendadak | LULUS | perubahan kecerahan terbesar antar frame 0.2 (batas 8) |
| 18 | Tidak ada potongan kasar (hard cut) | LULUS | semua pergantian gambar berlangsung bertahap |
| 19 | Frame PNG lengkap dan berurutan | LULUS | 150/150 file PNG 480x270 |
| 20 | Transisi menyambung tanpa lompatan | LULUS | tidak ada transisi |
| 21 | Rendering deterministik (render ulang identik, urutan terbalik) | LULUS | 150/150 frame identik byte demi byte, 3/3 frame identik saat dirender dua kali |
| 22 | Tidak ada error JavaScript selama rendering | LULUS | 0 error saat render, 0 error saat pengujian |
| 23 | Encode ulang menghasilkan MP4 identik | LULUS | SHA-256 sama: 28e9a3a3c503dabd... |

## Lembar kontak (preview)

- `output/reports/train-night-rain-contact-sheet.png` (frame 0, 33, 68, 90, 123, 149)

## Lingkungan

- Sistem operasi: Linux 6.18.44-fc-v165 (linux/x64)
- Node.js: v22.22.0
- Chromium: 153.0.8010.12
- ffmpeg version 6.1.1-3ubuntu5 Copyright (c) 2000-2023 the FFmpeg developers
- ffprobe version 6.1.1-3ubuntu5 Copyright (c) 2007-2023 the FFmpeg developers

## Perintah encoding

```
ffmpeg -y -v error -framerate 30 -start_number 0 -i output/frames/train-night-rain/frame_%04d.png -frames:v 150 -vf scale=1920:1080:flags=neighbor:out_color_matrix=bt709:out_range=tv,format=yuv420p -c:v libx264 -preset slow -crf 16 -tune animation -profile:v high -level:v 4.1 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -r 30 -movflags +faststart output/video/train-night-rain.mp4
```
