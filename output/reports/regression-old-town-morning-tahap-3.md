# Uji Regresi terhadap Versi Historis

Hasil render sekarang dibandingkan dengan baseline `old-town-morning` versi tahap-3 (main@9d7a144, historis).
Versi baseline diatur di `tests/baselines/registry.json` (panduan: `docs/BASELINES.md`).
Dibuat otomatis oleh `npm run test:regression -- --project old-town-morning --baseline tahap-3` pada 2026-10-27T15:55:05.201Z.

| No | Pemeriksaan | Hasil | Detail |
|----|-------------|-------|--------|
| 1 | old-town-morning: file baseline utuh (SHA-256 terkunci) | LULUS | 2 versi (tahap-3, tahap-4), isi file sama dengan saat direkam |
| 2 | old-town-morning: versi resmi dan riwayat versi tersambung | LULUS | resmi tahap-4; riwayat tahap-3 -> tahap-4 |
| 3 | old-town-morning: perubahan tahap-3 -> tahap-4 sama persis dengan catatan persetujuan | LULUS | 124 frame berubah (85-130, 262-339), 236 identik; catatan 124 frame (85-130, 262-339); semua di rentang terdeklarasi 84-131, 255-345 |
| 4 | old-town-morning: hasil render terbaru dan sukses | LULUS | status complete, selesai 2026-10-27T15:37:44.969Z / konfigurasi, mesin, pustaka aset, frame, dan MP4 cocok dengan manifest |
| 5 | old-town-morning: jumlah frame sama | LULUS | 360 (baseline 360) |
| 6 | old-town-morning: ukuran frame sama | LULUS | 1920x1080 (baseline 1920x1080) |
| 7 | old-town-morning: piksel identik di luar perubahan yang disetujui/dideklarasikan | LULUS | 236 frame identik; 124 frame berbeda sesuai perubahan yang disetujui di tahap-4 (85-130, 262-339) |
| 8 | old-town-morning: perubahan sejak tahap-3 sama persis dengan yang disetujui | LULUS | 124 dari 124 frame yang disetujui berubah; 236 frame lain wajib identik dengan tahap-3 |
| 9 | old-town-morning: format video sama (decoding kompatibel) | LULUS | h264 High level 41, 1920x1080, 30/1, 360 frame, 12 detik, yuv420p |
| 10 | old-town-morning: frame hasil decode (informasi, kompresi H.264) | LULUS | 323 frame hasil decode berbeda (199 di luar perubahan, karena encoder H.264 memakai frame sekitar sebagai acuan); sumber PNG di luar perubahan identik |
| 11 | old-town-morning: file MP4 identik, atau berbeda hanya karena perubahan yang disetujui/dideklarasikan | LULUS | 756f7d874738ddb1... (baseline 761c76b535b5f092...), berbeda karena frame yang disetujui/dideklarasikan berubah |

Status akhir: **TIDAK ADA REGRESI (perbedaan dari versi historis sama persis dengan perubahan yang disetujui)** (11/11)
