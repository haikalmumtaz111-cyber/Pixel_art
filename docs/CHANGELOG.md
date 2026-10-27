# Riwayat Perubahan

## Tahap 2: sistem multi-adegan (PR #2, branch `tahap-2-multi-scene`)

### Baru

- Film pendek 15 detik *Kereta Malam Menuju Fajar*. Tepat 450 frame, berisi tiga adegan: Night Train, Inside the Train, dan Journey to Dawn.
- Timeline berbasis JSON (`config/film-night-to-dawn.json`) berisi adegan, aset, kamera, cuaca, dan transisi.
- Mesin film (`src/engine/film.js`) yang menentukan isi setiap frame dari timeline.
- Pustaka transisi reusable: `cut`, `dissolve` (dither Bayer), dan `portal` (kamera menembus jendela).
- Track keyframe berbasis frame untuk kamera dan cuaca (`src/engine/tracks.js`), plus track kamera `follow` dan `speed` serta gerak vertikal kamera.
- Zoom yang tetap tajam: bentuk digambar ulang di resolusi asli, bukan diperbesar seperti foto.
- Registry aset bersama. Satu kereta, satu set pedesaan, satu interior, dan satu karakter dipakai semua adegan.
- Aset baru: interior gerbong (`interior.js`), karakter penumpang bertopi pet (`characters/traveler.js`), dan set pedesaan (`countryside.js`).
- Palet fajar dan *palette ramp* 32 langkah, matahari terbit, awan yang terbuka, kabut lembah, hujan yang mereda, dan lampu jendela yang meredup.
- Render satu adegan tanpa transisi: `npm run render:scene -- <id>`. Pratinjau satu adegan lewat `npm run preview -- <film> <id>`.
- Validator diperluas menjadi 28 pemeriksaan untuk 14 kebutuhan, termasuk deteksi kilatan, hard cut, kesinambungan transisi, konsistensi kereta, determinisme penuh, kompatibilitas pemutar, dan encode ulang.
- Pengujian negatif otomatis (`npm run test:negative`, 16 kasus) beserta adegan uji yang sengaja salah di `tests/fixtures/scenes/`.
- Lembar cuplikan per adegan dan per transisi di `output/reports/`.
- Dokumentasi arsitektur (`docs/ARCHITECTURE.md`) dan catatan peningkatan (`docs/BACKLOG.md`).

### Diubah

- Aset Tahap 1 kini menerima palet aktif, intensitas hujan, dan zoom. Tanpa parameter tambahan, hasilnya tetap sama persis dengan Tahap 1.
- `npm run build` sekarang merender film Tahap 2. Prototipe Tahap 1 tetap bisa dibuat dengan `npm run build:prototype`.
- Encoding memakai H.264 profil High level 4.1. Sebelumnya x264 memilih level 5.0 yang tidak didukung sebagian perangkat lama. Perubahan ini juga diterapkan pada prototipe Tahap 1, sehingga file MP4-nya ter-encode ulang. Frame PNG prototipe tetap identik 100% dengan Tahap 1.
- Toleransi pemeriksaan durasi diperketat menjadi setengah frame. Sebelumnya video yang kurang 1 frame masih lolos, dan ini ketahuan lewat pengujian negatif.

### Bukti kemampuan Tahap 1 tetap utuh

- Setelah mesin dirombak, prototipe Tahap 1 menghasilkan MP4 yang identik byte demi byte (SHA-256 `8cf2d9d8...`). Pengecekan ini dilakukan sebelum perubahan level encoding.
- Setelah perubahan level, ke-150 frame PNG prototipe tetap identik dengan Tahap 1 dan validasinya lulus 23/23.

## Tahap 1: fondasi dan prototipe animasi

- Prototipe 5 detik *Kereta Malam di Tengah Hujan*: 150 frame, 480x270 diperbesar menjadi 1920x1080, 30 FPS.
- Render memakai Playwright + Chromium, encoding memakai FFmpeg, validasi memakai FFprobe.
- Animasi deterministik berbasis nomor frame dan seed.
