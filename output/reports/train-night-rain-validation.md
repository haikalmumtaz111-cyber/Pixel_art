# Laporan Pengujian: Kereta Malam di Tengah Hujan

Laporan ini dibuat otomatis oleh `npm run validate`.

- Waktu uji: 2026-10-27T06:57:17.831Z
- Konfigurasi: `config/train-night-rain.json`
- Video: `output/video/train-night-rain.mp4`
- Spesifikasi: 480x270 internal, 1920x1080 output, 30 FPS, 5 detik, 150 frame
- Lama render frame: 3.1 detik, lama encoding: 10.3 detik

## Hasil

| No | Pemeriksaan | Hasil | Detail |
|----|-------------|-------|--------|
| 1 | File MP4 ada | LULUS | output/video/train-night-rain.mp4 (2.07 MB) |
| 2 | Kontainer MP4 | LULUS | mov,mp4,m4a,3gp,3g2,mj2 |
| 3 | Codec video H.264 | LULUS | h264 (High) |
| 4 | Resolusi output | LULUS | 1920x1080 |
| 5 | Rasio 16:9 | LULUS | 1920:1080 |
| 6 | Frame rate | LULUS | 30/1 (rata-rata 30/1) |
| 7 | Jumlah frame | LULUS | 150 dari 150 frame |
| 8 | Durasi | LULUS | 5.000 detik |
| 9 | Format piksel | LULUS | yuv420p |
| 10 | Decoding FFmpeg tanpa error | LULUS | semua frame terbaca bersih |
| 11 | Frame hasil decode | LULUS | 150 frame ter-decode |
| 12 | Animasi bergerak (bukan gambar statis) | LULUS | 150 frame unik, 0 pasang frame berurutan yang identik |
| 13 | Frame PNG lengkap | LULUS | 150/150 file PNG 480x270 |
| 14 | Deterministik berdasarkan indeks frame | LULUS | 6/6 frame sampel (149, 0, 75, 1, 148, 37) identik saat dirender ulang tanpa urutan |
| 15 | Lembar kontak dibuat | LULUS | output/reports/train-night-rain-contact-sheet.png |

Status akhir: **SEMUA LULUS** (15/15)

## Lingkungan

- Sistem operasi: Linux 6.18.44-fc-v165 (linux/x64)
- Node.js: v22.22.0
- Chromium: 153.0.8010.12
- ffmpeg version 6.1.1-3ubuntu5 Copyright (c) 2000-2023 the FFmpeg developers
- ffprobe version 6.1.1-3ubuntu5 Copyright (c) 2007-2023 the FFmpeg developers

## Perintah encoding

```
ffmpeg -y -v error -framerate 30 -start_number 0 -i output/frames/train-night-rain/frame_%04d.png -frames:v 150 -vf scale=1920:1080:flags=neighbor:out_color_matrix=bt709:out_range=tv,format=yuv420p -c:v libx264 -preset slow -crf 16 -tune animation -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -r 30 -movflags +faststart output/video/train-night-rain.mp4
```
