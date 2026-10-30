# Uji Regresi

Hasil render sekarang dibandingkan dengan baseline `character-lab` versi tahap-5-v29 (main@63eab4c, resmi), `night-to-dawn` versi tahap-2 (main@cfed35a, resmi), `old-town-morning` versi tahap-4 (main@a1fd4a1, resmi), `train-night-rain` versi tahap-2 (main@cfed35a, resmi).
Versi baseline diatur di `tests/baselines/registry.json` (panduan: `docs/BASELINES.md`).
Dibuat otomatis oleh `npm run test:regression` pada 2026-10-30T09:12:22.807Z.

| No | Pemeriksaan | Hasil | Detail |
|----|-------------|-------|--------|
| 1 | Semua file baseline terdaftar di registry | LULUS | 6 file baseline terdaftar |
| 2 | night-to-dawn: file baseline cocok dengan SHA-256 di registry | LULUS | 1 versi (tahap-2), isi file sama dengan hash di registry |
| 3 | night-to-dawn: versi resmi dan riwayat versi tersambung | LULUS | resmi tahap-2; riwayat tahap-2 |
| 4 | old-town-morning: file baseline cocok dengan SHA-256 di registry | LULUS | 2 versi (tahap-3, tahap-4), isi file sama dengan hash di registry |
| 5 | old-town-morning: versi resmi dan riwayat versi tersambung | LULUS | resmi tahap-4; riwayat tahap-3 -> tahap-4 |
| 6 | old-town-morning: perubahan tahap-3 -> tahap-4 sama persis dengan catatan persetujuan | LULUS | 124 frame berubah (85-130, 262-339), 236 identik; catatan 124 frame (85-130, 262-339); semua di rentang terdeklarasi 84-131, 255-345 |
| 7 | train-night-rain: file baseline cocok dengan SHA-256 di registry | LULUS | 1 versi (tahap-2), isi file sama dengan hash di registry |
| 8 | train-night-rain: versi resmi dan riwayat versi tersambung | LULUS | resmi tahap-2; riwayat tahap-2 |
| 9 | character-lab: file baseline cocok dengan SHA-256 di registry | LULUS | 2 versi (tahap-5, tahap-5-v29), isi file sama dengan hash di registry |
| 10 | character-lab: versi resmi dan riwayat versi tersambung | LULUS | resmi tahap-5-v29; riwayat tahap-5 -> tahap-5-v29 |
| 11 | character-lab: perubahan tahap-5 -> tahap-5-v29 sama persis dengan catatan persetujuan | LULUS | 74 frame berubah (132-205), 286 identik; catatan 74 frame (132-205); semua di rentang terdeklarasi 132-205 |
| 12 | character-lab: perubahan terdeklarasi menunjuk versi resmi | LULUS | entri "Perbaikan V30 (bukan tahap baru)" terhadap tahap-5-v29, status menunggu persetujuan pemilik |
| 13 | character-lab: hasil render terbaru dan sukses | LULUS | status complete, selesai 2026-10-30T09:00:01.932Z / konfigurasi, mesin, pustaka aset, frame, dan MP4 cocok dengan manifest |
| 14 | character-lab: jumlah frame sama | LULUS | 360 (baseline 360) |
| 15 | character-lab: ukuran frame sama | LULUS | 1920x1080 (baseline 1920x1080) |
| 16 | character-lab: piksel identik di luar perubahan yang disetujui/dideklarasikan | LULUS | 109 frame identik; 251 frame berubah di rentang terdeklarasi (109-359) |
| 17 | character-lab: perubahan Perbaikan V30 (bukan tahap baru) (V30) menunggu persetujuan pemilik | LULUS | 251 frame berubah, alasan: Ujung lengan jauh penyapu (gerak natural) kini sampai ke tangan jauh yang menggenggam gagang sapu (Opsi B, geometri B2, dipilih pemilik dari eksperimen V30): gagang dibuat lebih tegak dan dekat badan (atas cx+2+round(fase), bahu+4; ujung cx+5+round(fase x 6), kaki-3), titik genggam tangan jauh = titik terjauh di gagang yang masih di dalam 85% panjang lengan jauh (sweepGrip), sehingga siku jauh menekuk. Sebelumnya lengan jauh berhenti 2-3 sel sebelum tangan jauh. Hanya sprite penyapu yang berubah (render dengan penyapu disembunyikan identik 360/360). Rentang diambil dari render penuh 360 frame dibanding tahap-5-v29: 251 frame berubah, 109-359 (penyapu tampil di layar). Frame 0-108 tetap identik: penyapu tidak tampil di adegan 1, dan frame 108 adalah frame pertama dissolve yang masih sama persis dengan adegan 1. |
| 18 | character-lab: format video sama (decoding kompatibel) | LULUS | h264 High level 41, 1920x1080, 30/1, 360 frame, 12 detik, yuv420p |
| 19 | character-lab: frame hasil decode (informasi, kompresi H.264) | LULUS | 279 frame hasil decode berbeda (28 di luar perubahan, karena encoder H.264 memakai frame sekitar sebagai acuan); sumber PNG di luar perubahan identik |
| 20 | character-lab: file MP4 identik, atau berbeda hanya karena perubahan yang disetujui/dideklarasikan | LULUS | b27d51e067ba6611... (baseline 1545a9f466dc026d...), berbeda karena frame yang disetujui/dideklarasikan berubah |
| 21 | night-to-dawn: hasil render terbaru dan sukses | LULUS | status complete, selesai 2026-10-30T09:01:03.255Z / konfigurasi, mesin, pustaka aset, frame, dan MP4 cocok dengan manifest |
| 22 | night-to-dawn: jumlah frame sama | LULUS | 450 (baseline 450) |
| 23 | night-to-dawn: ukuran frame sama | LULUS | 480x270 (baseline 480x270) |
| 24 | night-to-dawn: piksel setiap frame identik | LULUS | 450 frame identik piksel demi piksel |
| 25 | night-to-dawn: format video sama (decoding kompatibel) | LULUS | h264 High level 41, 1920x1080, 30/1, 450 frame, 15 detik, yuv420p |
| 26 | night-to-dawn: frame hasil decode identik | LULUS | 450 frame identik |
| 27 | night-to-dawn: file MP4 identik byte demi byte | LULUS | aa188168ec04b5d7... (baseline aa188168ec04b5d7...) |
| 28 | old-town-morning: hasil render terbaru dan sukses | LULUS | status complete, selesai 2026-10-30T09:02:17.982Z / konfigurasi, mesin, pustaka aset, frame, dan MP4 cocok dengan manifest |
| 29 | old-town-morning: jumlah frame sama | LULUS | 360 (baseline 360) |
| 30 | old-town-morning: ukuran frame sama | LULUS | 1920x1080 (baseline 1920x1080) |
| 31 | old-town-morning: piksel setiap frame identik | LULUS | 360 frame identik piksel demi piksel |
| 32 | old-town-morning: format video sama (decoding kompatibel) | LULUS | h264 High level 41, 1920x1080, 30/1, 360 frame, 12 detik, yuv420p |
| 33 | old-town-morning: frame hasil decode identik | LULUS | 360 frame identik |
| 34 | old-town-morning: file MP4 identik byte demi byte | LULUS | 756f7d874738ddb1... (baseline 756f7d874738ddb1...) |
| 35 | train-night-rain: hasil render terbaru dan sukses | LULUS | status complete, selesai 2026-10-30T09:11:30.590Z / konfigurasi, mesin, pustaka aset, frame, dan MP4 cocok dengan manifest |
| 36 | train-night-rain: jumlah frame sama | LULUS | 150 (baseline 150) |
| 37 | train-night-rain: ukuran frame sama | LULUS | 480x270 (baseline 480x270) |
| 38 | train-night-rain: piksel setiap frame identik | LULUS | 150 frame identik piksel demi piksel |
| 39 | train-night-rain: format video sama (decoding kompatibel) | LULUS | h264 High level 41, 1920x1080, 30/1, 150 frame, 5 detik, yuv420p |
| 40 | train-night-rain: frame hasil decode identik | LULUS | 150 frame identik |
| 41 | train-night-rain: file MP4 identik byte demi byte | LULUS | 28e9a3a3c503dabd... (baseline 28e9a3a3c503dabd...) |

Status akhir: **TIDAK ADA REGRESI TAK TERDUGA (ada perubahan terdeklarasi yang menunggu persetujuan)** (41/41)

Perubahan terdeklarasi dicatat di `tests/baselines/pending-changes.json` dan belum dianggap diterima. Baseline tidak diubah.
