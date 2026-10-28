# Uji Regresi

Hasil render sekarang dibandingkan dengan baseline `night-to-dawn` versi tahap-2 (main@cfed35a, resmi), `old-town-morning` versi tahap-4 (main@a1fd4a1, resmi), `train-night-rain` versi tahap-2 (main@cfed35a, resmi).
Versi baseline diatur di `tests/baselines/registry.json` (panduan: `docs/BASELINES.md`).
Dibuat otomatis oleh `npm run test:regression` pada 2026-10-28T04:38:24.114Z.

| No | Pemeriksaan | Hasil | Detail |
|----|-------------|-------|--------|
| 1 | Semua file baseline terdaftar di registry | LULUS | 4 file baseline terdaftar |
| 2 | night-to-dawn: file baseline cocok dengan SHA-256 di registry | LULUS | 1 versi (tahap-2), isi file sama dengan hash di registry |
| 3 | night-to-dawn: versi resmi dan riwayat versi tersambung | LULUS | resmi tahap-2; riwayat tahap-2 |
| 4 | old-town-morning: file baseline cocok dengan SHA-256 di registry | LULUS | 2 versi (tahap-3, tahap-4), isi file sama dengan hash di registry |
| 5 | old-town-morning: versi resmi dan riwayat versi tersambung | LULUS | resmi tahap-4; riwayat tahap-3 -> tahap-4 |
| 6 | old-town-morning: perubahan tahap-3 -> tahap-4 sama persis dengan catatan persetujuan | LULUS | 124 frame berubah (85-130, 262-339), 236 identik; catatan 124 frame (85-130, 262-339); semua di rentang terdeklarasi 84-131, 255-345 |
| 7 | train-night-rain: file baseline cocok dengan SHA-256 di registry | LULUS | 1 versi (tahap-2), isi file sama dengan hash di registry |
| 8 | train-night-rain: versi resmi dan riwayat versi tersambung | LULUS | resmi tahap-2; riwayat tahap-2 |
| 9 | night-to-dawn: hasil render terbaru dan sukses | LULUS | status complete, selesai 2026-10-28T04:28:55.077Z / konfigurasi, mesin, pustaka aset, frame, dan MP4 cocok dengan manifest |
| 10 | night-to-dawn: jumlah frame sama | LULUS | 450 (baseline 450) |
| 11 | night-to-dawn: ukuran frame sama | LULUS | 480x270 (baseline 480x270) |
| 12 | night-to-dawn: piksel setiap frame identik | LULUS | 450 frame identik piksel demi piksel |
| 13 | night-to-dawn: format video sama (decoding kompatibel) | LULUS | h264 High level 41, 1920x1080, 30/1, 450 frame, 15 detik, yuv420p |
| 14 | night-to-dawn: frame hasil decode identik | LULUS | 450 frame identik |
| 15 | night-to-dawn: file MP4 identik byte demi byte | LULUS | aa188168ec04b5d7... (baseline aa188168ec04b5d7...) |
| 16 | old-town-morning: hasil render terbaru dan sukses | LULUS | status complete, selesai 2026-10-28T04:30:03.558Z / konfigurasi, mesin, pustaka aset, frame, dan MP4 cocok dengan manifest |
| 17 | old-town-morning: jumlah frame sama | LULUS | 360 (baseline 360) |
| 18 | old-town-morning: ukuran frame sama | LULUS | 1920x1080 (baseline 1920x1080) |
| 19 | old-town-morning: piksel setiap frame identik | LULUS | 360 frame identik piksel demi piksel |
| 20 | old-town-morning: format video sama (decoding kompatibel) | LULUS | h264 High level 41, 1920x1080, 30/1, 360 frame, 12 detik, yuv420p |
| 21 | old-town-morning: frame hasil decode identik | LULUS | 360 frame identik |
| 22 | old-town-morning: file MP4 identik byte demi byte | LULUS | 756f7d874738ddb1... (baseline 756f7d874738ddb1...) |
| 23 | train-night-rain: hasil render terbaru dan sukses | LULUS | status complete, selesai 2026-10-28T04:37:51.819Z / konfigurasi, mesin, pustaka aset, frame, dan MP4 cocok dengan manifest |
| 24 | train-night-rain: jumlah frame sama | LULUS | 150 (baseline 150) |
| 25 | train-night-rain: ukuran frame sama | LULUS | 480x270 (baseline 480x270) |
| 26 | train-night-rain: piksel setiap frame identik | LULUS | 150 frame identik piksel demi piksel |
| 27 | train-night-rain: format video sama (decoding kompatibel) | LULUS | h264 High level 41, 1920x1080, 30/1, 150 frame, 5 detik, yuv420p |
| 28 | train-night-rain: frame hasil decode identik | LULUS | 150 frame identik |
| 29 | train-night-rain: file MP4 identik byte demi byte | LULUS | 28e9a3a3c503dabd... (baseline 28e9a3a3c503dabd...) |

Status akhir: **TIDAK ADA REGRESI** (29/29)
