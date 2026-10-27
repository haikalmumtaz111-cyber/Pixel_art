# Uji Regresi

Hasil render sekarang dibandingkan dengan baseline resmi dari `night-to-dawn` (main@cfed35a) dan `old-town-morning` (main@9d7a144) dan `train-night-rain` (main@cfed35a).
Dibuat otomatis oleh `npm run test:regression` pada 2026-10-27T12:29:19.914Z.

| No | Pemeriksaan | Hasil | Detail |
|----|-------------|-------|--------|
| 1 | night-to-dawn: hasil render terbaru dan sukses | LULUS | status complete, selesai 2026-10-27T12:09:44.180Z / konfigurasi, mesin, pustaka aset, frame, dan MP4 cocok dengan manifest |
| 2 | night-to-dawn: jumlah frame sama | LULUS | 450 (baseline 450) |
| 3 | night-to-dawn: ukuran frame sama | LULUS | 480x270 (baseline 480x270) |
| 4 | night-to-dawn: piksel setiap frame identik | LULUS | 450 frame identik piksel demi piksel |
| 5 | night-to-dawn: format video sama (decoding kompatibel) | LULUS | h264 High level 41, 1920x1080, 30/1, 450 frame, 15 detik, yuv420p |
| 6 | night-to-dawn: frame hasil decode identik | LULUS | 450 frame identik |
| 7 | night-to-dawn: file MP4 identik byte demi byte | LULUS | aa188168ec04b5d7... (baseline aa188168ec04b5d7...) |
| 8 | old-town-morning: hasil render terbaru dan sukses | LULUS | status complete, selesai 2026-10-27T12:11:15.647Z / konfigurasi, mesin, pustaka aset, frame, dan MP4 cocok dengan manifest |
| 9 | old-town-morning: jumlah frame sama | LULUS | 360 (baseline 360) |
| 10 | old-town-morning: ukuran frame sama | LULUS | 1920x1080 (baseline 1920x1080) |
| 11 | old-town-morning: piksel identik di luar perubahan terdeklarasi | LULUS | 236 frame identik; 124 frame berubah di rentang terdeklarasi (85-130, 262-339) |
| 12 | old-town-morning: perubahan Tahap 4 (V14) menunggu persetujuan pemilik | LULUS | 124 frame berubah, alasan: Zoom kamera pecahan memakai grid piksel terkunci (zoomMode anchored) agar garis tidak merayap, dan dither transisi dissolve diselaraskan dengan grid art adegan tujuan. Rentang diambil dari konfigurasi: push-in adegan 1 (zoom berubah frame 84-119) + dissolve (108-131), dan pullback adegan 3 (zoom berubah frame 255-345). |
| 13 | old-town-morning: format video sama (decoding kompatibel) | LULUS | h264 High level 41, 1920x1080, 30/1, 360 frame, 12 detik, yuv420p |
| 14 | old-town-morning: frame hasil decode (informasi, kompresi H.264) | LULUS | 323 frame hasil decode berbeda (184 di luar rentang terdeklarasi, karena encoder H.264 memakai frame sekitar sebagai acuan); sumber PNG di luar rentang identik |
| 15 | old-town-morning: file MP4 identik, atau berbeda hanya karena perubahan terdeklarasi | LULUS | 756f7d874738ddb1... (baseline 761c76b535b5f092...), berbeda karena frame terdeklarasi berubah |
| 16 | train-night-rain: hasil render terbaru dan sukses | LULUS | status complete, selesai 2026-10-27T12:28:17.235Z / konfigurasi, mesin, pustaka aset, frame, dan MP4 cocok dengan manifest |
| 17 | train-night-rain: jumlah frame sama | LULUS | 150 (baseline 150) |
| 18 | train-night-rain: ukuran frame sama | LULUS | 480x270 (baseline 480x270) |
| 19 | train-night-rain: piksel setiap frame identik | LULUS | 150 frame identik piksel demi piksel |
| 20 | train-night-rain: format video sama (decoding kompatibel) | LULUS | h264 High level 41, 1920x1080, 30/1, 150 frame, 5 detik, yuv420p |
| 21 | train-night-rain: frame hasil decode identik | LULUS | 150 frame identik |
| 22 | train-night-rain: file MP4 identik byte demi byte | LULUS | 28e9a3a3c503dabd... (baseline 28e9a3a3c503dabd...) |

Status akhir: **TIDAK ADA REGRESI TAK TERDUGA (ada perubahan terdeklarasi yang menunggu persetujuan)** (22/22)

Perubahan terdeklarasi dicatat di `tests/baselines/pending-changes.json` dan belum dianggap diterima. Baseline lama tidak diubah.
