# Uji Regresi

Hasil render sekarang dibandingkan dengan baseline resmi dari `night-to-dawn` (main@cfed35a) dan `train-night-rain` (main@cfed35a).
Dibuat otomatis oleh `npm run test:regression` pada 2026-10-27T10:53:35.577Z.

| No | Pemeriksaan | Hasil | Detail |
|----|-------------|-------|--------|
| 1 | night-to-dawn: hasil render terbaru dan sukses | LULUS | status complete, selesai 2026-10-27T10:44:50.384Z / konfigurasi, mesin, pustaka aset, frame, dan MP4 cocok dengan manifest |
| 2 | night-to-dawn: jumlah frame sama | LULUS | 450 (baseline 450) |
| 3 | night-to-dawn: ukuran frame sama | LULUS | 480x270 (baseline 480x270) |
| 4 | night-to-dawn: piksel setiap frame identik | LULUS | 450 frame identik piksel demi piksel |
| 5 | night-to-dawn: format video sama (decoding kompatibel) | LULUS | h264 High level 41, 1920x1080, 30/1, 450 frame, 15 detik, yuv420p |
| 6 | night-to-dawn: frame hasil decode identik | LULUS | 450 frame identik |
| 7 | night-to-dawn: file MP4 identik byte demi byte | LULUS | aa188168ec04b5d7... (baseline aa188168ec04b5d7...) |
| 8 | train-night-rain: hasil render terbaru dan sukses | LULUS | status complete, selesai 2026-10-27T10:52:37.536Z / konfigurasi, mesin, pustaka aset, frame, dan MP4 cocok dengan manifest |
| 9 | train-night-rain: jumlah frame sama | LULUS | 150 (baseline 150) |
| 10 | train-night-rain: ukuran frame sama | LULUS | 480x270 (baseline 480x270) |
| 11 | train-night-rain: piksel setiap frame identik | LULUS | 150 frame identik piksel demi piksel |
| 12 | train-night-rain: format video sama (decoding kompatibel) | LULUS | h264 High level 41, 1920x1080, 30/1, 150 frame, 5 detik, yuv420p |
| 13 | train-night-rain: frame hasil decode identik | LULUS | 150 frame identik |
| 14 | train-night-rain: file MP4 identik byte demi byte | LULUS | 28e9a3a3c503dabd... (baseline 28e9a3a3c503dabd...) |

Status akhir: **TIDAK ADA REGRESI** (14/14)
