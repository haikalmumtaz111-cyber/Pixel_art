# Uji Regresi terhadap Versi Historis

Hasil render sekarang dibandingkan dengan baseline `character-lab` versi tahap-5 (main@e6926d2, historis).
Versi baseline diatur di `tests/baselines/registry.json` (panduan: `docs/BASELINES.md`).
Dibuat otomatis oleh `npm run test:regression -- --project character-lab --baseline tahap-5` pada 2026-10-30T10:11:18.682Z.

| No | Pemeriksaan | Hasil | Detail |
|----|-------------|-------|--------|
| 1 | character-lab: file baseline cocok dengan SHA-256 di registry | LULUS | 3 versi (tahap-5, tahap-5-v29, tahap-5-v30), isi file sama dengan hash di registry |
| 2 | character-lab: versi resmi dan riwayat versi tersambung | LULUS | resmi tahap-5-v30; riwayat tahap-5 -> tahap-5-v29 -> tahap-5-v30 |
| 3 | character-lab: perubahan tahap-5 -> tahap-5-v29 sama persis dengan catatan persetujuan | LULUS | 74 frame berubah (132-205), 286 identik; catatan 74 frame (132-205); semua di rentang terdeklarasi 132-205 |
| 4 | character-lab: perubahan tahap-5-v29 -> tahap-5-v30 sama persis dengan catatan persetujuan | LULUS | 251 frame berubah (109-359), 109 identik; catatan 251 frame (109-359); semua di rentang terdeklarasi 109-359 |
| 5 | character-lab: hasil render terbaru dan sukses | LULUS | status complete, selesai 2026-10-30T09:58:05.949Z / konfigurasi, mesin, pustaka aset, frame, dan MP4 cocok dengan manifest |
| 6 | character-lab: jumlah frame sama | LULUS | 360 (baseline 360) |
| 7 | character-lab: ukuran frame sama | LULUS | 1920x1080 (baseline 1920x1080) |
| 8 | character-lab: piksel identik di luar perubahan yang disetujui/dideklarasikan | LULUS | 109 frame identik; 251 frame berbeda sesuai perubahan yang disetujui di tahap-5-v29, tahap-5-v30 (109-359) |
| 9 | character-lab: perubahan sejak tahap-5 sama persis dengan yang disetujui | LULUS | 251 dari 251 frame yang disetujui berubah; 109 frame lain wajib identik dengan tahap-5 |
| 10 | character-lab: format video sama (decoding kompatibel) | LULUS | h264 High level 41, 1920x1080, 30/1, 360 frame, 12 detik, yuv420p |
| 11 | character-lab: frame hasil decode (informasi, kompresi H.264) | LULUS | 279 frame hasil decode berbeda (28 di luar perubahan, karena encoder H.264 memakai frame sekitar sebagai acuan); sumber PNG di luar perubahan identik |
| 12 | character-lab: file MP4 identik, atau berbeda hanya karena perubahan yang disetujui/dideklarasikan | LULUS | b27d51e067ba6611... (baseline 819e48df0f7a1450...), berbeda karena frame yang disetujui/dideklarasikan berubah |

Status akhir: **TIDAK ADA REGRESI (perbedaan dari versi historis sama persis dengan perubahan yang disetujui)** (12/12)
