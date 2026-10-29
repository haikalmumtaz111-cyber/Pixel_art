# Uji Regresi

Hasil render sekarang dibandingkan dengan baseline `character-lab` versi tahap-5 (main@e6926d2, resmi), `night-to-dawn` versi tahap-2 (main@cfed35a, resmi), `old-town-morning` versi tahap-4 (main@a1fd4a1, resmi), `train-night-rain` versi tahap-2 (main@cfed35a, resmi).
Versi baseline diatur di `tests/baselines/registry.json` (panduan: `docs/BASELINES.md`).
Dibuat otomatis oleh `npm run test:regression` pada 2026-10-29T23:42:00.750Z.

| No | Pemeriksaan | Hasil | Detail |
|----|-------------|-------|--------|
| 1 | Semua file baseline terdaftar di registry | LULUS | 5 file baseline terdaftar |
| 2 | night-to-dawn: file baseline cocok dengan SHA-256 di registry | LULUS | 1 versi (tahap-2), isi file sama dengan hash di registry |
| 3 | night-to-dawn: versi resmi dan riwayat versi tersambung | LULUS | resmi tahap-2; riwayat tahap-2 |
| 4 | old-town-morning: file baseline cocok dengan SHA-256 di registry | LULUS | 2 versi (tahap-3, tahap-4), isi file sama dengan hash di registry |
| 5 | old-town-morning: versi resmi dan riwayat versi tersambung | LULUS | resmi tahap-4; riwayat tahap-3 -> tahap-4 |
| 6 | old-town-morning: perubahan tahap-3 -> tahap-4 sama persis dengan catatan persetujuan | LULUS | 124 frame berubah (85-130, 262-339), 236 identik; catatan 124 frame (85-130, 262-339); semua di rentang terdeklarasi 84-131, 255-345 |
| 7 | train-night-rain: file baseline cocok dengan SHA-256 di registry | LULUS | 1 versi (tahap-2), isi file sama dengan hash di registry |
| 8 | train-night-rain: versi resmi dan riwayat versi tersambung | LULUS | resmi tahap-2; riwayat tahap-2 |
| 9 | character-lab: file baseline cocok dengan SHA-256 di registry | LULUS | 1 versi (tahap-5), isi file sama dengan hash di registry |
| 10 | character-lab: versi resmi dan riwayat versi tersambung | LULUS | resmi tahap-5; riwayat tahap-5 |
| 11 | character-lab: perubahan terdeklarasi menunjuk versi resmi | LULUS | entri "Perbaikan V29 (bukan tahap baru)" terhadap tahap-5, status menunggu persetujuan pemilik |
| 12 | character-lab: hasil render terbaru dan sukses | LULUS | status complete, selesai 2026-10-29T23:15:43.293Z / konfigurasi, mesin, pustaka aset, frame, dan MP4 cocok dengan manifest |
| 13 | character-lab: jumlah frame sama | LULUS | 360 (baseline 360) |
| 14 | character-lab: ukuran frame sama | LULUS | 1920x1080 (baseline 1920x1080) |
| 15 | character-lab: piksel identik di luar perubahan yang disetujui/dideklarasikan | LULUS | 286 frame identik; 74 frame berubah di rentang terdeklarasi (132-205) |
| 16 | character-lab: perubahan Perbaikan V29 (bukan tahap baru) (V29) menunggu persetujuan pemilik | LULUS | 74 frame berubah, alasan: Kedua tangan pengayuh (gerak natural) kini memegang batang setang sepeda (Opsi B, disetujui visual pemilik): target tangan diambil dari letak setang (gripOf, bawaan gripX 7 dan gripDrop 13), tangan tepat di atas batang, siku sedikit menekuk. Sebelumnya kedua tangan melayang 6 piksel art di atas setang. Hanya sprite pengayuh yang berubah. Rentang diambil dari render penuh 360 frame dibanding tahap-5: 74 frame berubah, 132-205 (pengayuh tampil di layar). Frame 108-131 dan 206-236 tetap identik karena pengayuh di luar bingkai kamera. |
| 17 | character-lab: format video sama (decoding kompatibel) | LULUS | h264 High level 41, 1920x1080, 30/1, 360 frame, 12 detik, yuv420p |
| 18 | character-lab: frame hasil decode (informasi, kompresi H.264) | LULUS | 138 frame hasil decode berbeda (64 di luar perubahan, karena encoder H.264 memakai frame sekitar sebagai acuan); sumber PNG di luar perubahan identik |
| 19 | character-lab: file MP4 identik, atau berbeda hanya karena perubahan yang disetujui/dideklarasikan | LULUS | 1545a9f466dc026d... (baseline 819e48df0f7a1450...), berbeda karena frame yang disetujui/dideklarasikan berubah |
| 20 | night-to-dawn: hasil render terbaru dan sukses | LULUS | status complete, selesai 2026-10-29T23:16:44.965Z / konfigurasi, mesin, pustaka aset, frame, dan MP4 cocok dengan manifest |
| 21 | night-to-dawn: jumlah frame sama | LULUS | 450 (baseline 450) |
| 22 | night-to-dawn: ukuran frame sama | LULUS | 480x270 (baseline 480x270) |
| 23 | night-to-dawn: piksel setiap frame identik | LULUS | 450 frame identik piksel demi piksel |
| 24 | night-to-dawn: format video sama (decoding kompatibel) | LULUS | h264 High level 41, 1920x1080, 30/1, 450 frame, 15 detik, yuv420p |
| 25 | night-to-dawn: frame hasil decode identik | LULUS | 450 frame identik |
| 26 | night-to-dawn: file MP4 identik byte demi byte | LULUS | aa188168ec04b5d7... (baseline aa188168ec04b5d7...) |
| 27 | old-town-morning: hasil render terbaru dan sukses | LULUS | status complete, selesai 2026-10-29T23:17:54.709Z / konfigurasi, mesin, pustaka aset, frame, dan MP4 cocok dengan manifest |
| 28 | old-town-morning: jumlah frame sama | LULUS | 360 (baseline 360) |
| 29 | old-town-morning: ukuran frame sama | LULUS | 1920x1080 (baseline 1920x1080) |
| 30 | old-town-morning: piksel setiap frame identik | LULUS | 360 frame identik piksel demi piksel |
| 31 | old-town-morning: format video sama (decoding kompatibel) | LULUS | h264 High level 41, 1920x1080, 30/1, 360 frame, 12 detik, yuv420p |
| 32 | old-town-morning: frame hasil decode identik | LULUS | 360 frame identik |
| 33 | old-town-morning: file MP4 identik byte demi byte | LULUS | 756f7d874738ddb1... (baseline 756f7d874738ddb1...) |
| 34 | train-night-rain: hasil render terbaru dan sukses | LULUS | status complete, selesai 2026-10-29T23:28:22.147Z / konfigurasi, mesin, pustaka aset, frame, dan MP4 cocok dengan manifest |
| 35 | train-night-rain: jumlah frame sama | LULUS | 150 (baseline 150) |
| 36 | train-night-rain: ukuran frame sama | LULUS | 480x270 (baseline 480x270) |
| 37 | train-night-rain: piksel setiap frame identik | LULUS | 150 frame identik piksel demi piksel |
| 38 | train-night-rain: format video sama (decoding kompatibel) | LULUS | h264 High level 41, 1920x1080, 30/1, 150 frame, 5 detik, yuv420p |
| 39 | train-night-rain: frame hasil decode identik | LULUS | 150 frame identik |
| 40 | train-night-rain: file MP4 identik byte demi byte | LULUS | 28e9a3a3c503dabd... (baseline 28e9a3a3c503dabd...) |

Status akhir: **TIDAK ADA REGRESI TAK TERDUGA (ada perubahan terdeklarasi yang menunggu persetujuan)** (40/40)

Perubahan terdeklarasi dicatat di `tests/baselines/pending-changes.json` dan belum dianggap diterima. Baseline tidak diubah.
