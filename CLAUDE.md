# Catatan untuk sesi berikutnya

Pemilik proyek adalah sutradara kreatif yang masih awam pemrograman. Semua kode dikerjakan oleh asisten.

## Gaya komunikasi

- Bahasa Indonesia yang santai, akrab, dan mudah dimengerti. Boleh pakai humor, candaan, sapaan akrab, dan ekspresi spontan seperti teman yang mengerjakan proyek bersama.
- Untuk persoalan teknis, utamakan kejelasan dan ketepatan. Istilah coding yang rumit dijelaskan dengan analogi sederhana.
- Jangan minta pemilik menulis atau memperbaiki kode sendiri.

## Aturan kerja

- Proyek dibangun bertahap. Selesaikan tahap yang diminta, laporkan, lalu tunggu keputusan pemilik sebelum lanjut ke tahap berikutnya.
- Kerjakan perubahan di branch tahap (misalnya `tahap-2-multi-scene`), jangan langsung di `main`. Buat pull request, tapi jangan merge tanpa persetujuan pemilik.
- Minta persetujuan sebelum instalasi sistem, perubahan di luar folder proyek, atau menghapus file.
- Jangan mengklaim berhasil sebelum `npm run build` dan `npm run test:negative` lulus, dan hasilnya sudah dilihat secara visual (lembar cuplikan di `output/reports/`).
- Jangan mengorbankan kemampuan tahap sebelumnya. `npm run build:prototype` harus tetap lulus, dan frame prototipe Tahap 1 harus tetap identik.

## Konvensi kode

- Kode browser (`src/engine`, `src/assets`, `src/scenes`) adalah ES module `.js`. Kode Node (`src/render`) adalah CommonJS `.cjs`.
- Animasi harus deterministik: semua posisi dihitung dari nomor frame (`time = frame / fps`). Dilarang `Math.random()`, `Date`, atau state yang dibawa antar frame. Variasi acak memakai `hash()` dari `src/engine/random.js`.
- Gambar dengan helper di `src/engine/pixel.js` (koordinat dibulatkan, mendukung zoom tajam). Warna diambil dari `src/assets/palette.js`.
- Durasi, kamera, cuaca, dan transisi ditulis di timeline JSON, bukan di kode adegan.
- Adegan mengambil aset lewat `assets.pick(scene.assets, type)`. Jangan membuat ulang kereta atau karakter di dalam adegan.
- Kontrak adegan, transisi, dan aset dijelaskan di `docs/ARCHITECTURE.md`.
- Komentar kode dalam bahasa Indonesia.

## Perintah

- `npm run check`: cek Node.js, Playwright, Chromium, FFmpeg, FFprobe
- `npm run build`: render film + validasi. Laporan ada di `output/reports/`
- `npm test`: validasi + pengujian negatif (setelah build)
- `npm run render:scene -- <id>`: render satu adegan tanpa transisi
- `npm run preview`: pratinjau di browser
- `npm run build:prototype`: render dan uji prototipe Tahap 1

## Progres

- Tahap 1 (selesai, sudah di-merge): fondasi mesin + prototipe `train-night-rain` (5 detik, 150 frame).
- Tahap 2 (selesai, disetujui pemilik, di-merge ke `main` lewat PR #2): film 15 detik `film-night-to-dawn` (450 frame, 3 adegan, 2 transisi portal). Validasi 28/28, pengujian negatif 16/16, prototipe 23/23.
- Bahan peningkatan berikutnya tercatat di `docs/BACKLOG.md` (keterbatasan visual V1-V13 dan teknis T1-T4).
- Tahap 3: belum dimulai, menunggu keputusan pemilik.
