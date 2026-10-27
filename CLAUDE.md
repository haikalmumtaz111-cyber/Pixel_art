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
- Jangan mengklaim berhasil sebelum `npm run build:all` dan `npm test` lulus, dan hasilnya sudah dilihat secara visual (lembar cuplikan di `output/reports/`).
- Jangan mengorbankan kemampuan tahap sebelumnya. `npm run test:regression` harus lulus: Project A (`night-to-dawn`) dan prototipe Tahap 1 identik piksel dan byte dengan baseline di `tests/baselines/`. `npm run build:prototype` harus tetap lulus.
- Baseline tidak boleh diubah untuk menyembunyikan perubahan. Perubahan hasil render yang disengaja dicatat di `tests/baselines/pending-changes.json` (rentang frame + alasan, status "menunggu persetujuan pemilik"); frame di luar rentang tetap wajib identik. Hapus entri hanya setelah pemilik menyetujui.

## Konvensi kode

- Kode browser (`src/engine`, `src/assets`, `src/scenes`) adalah ES module `.js`. Kode Node (`src/render`) adalah CommonJS `.cjs`.
- Animasi harus deterministik: semua posisi dihitung dari nomor frame (`time = frame / fps`). Dilarang `Math.random()`, `Date`, atau state yang dibawa antar frame. Variasi acak memakai `hash()` dari `src/engine/random.js`.
- Gambar dengan helper di `src/engine/pixel.js` (koordinat dibulatkan, mendukung zoom tajam). Warna diambil dari `src/assets/palette.js`.
- Durasi, kamera, cuaca, dan transisi ditulis di konfigurasi proyek JSON, bukan di kode adegan. Durasi dalam detik dan harus menjadi frame bulat. Interval adegan setengah terbuka `[awal, akhir)`.
- Mesin inti (`src/engine`) tidak boleh berisi logika proyek atau jenis aset tertentu (`npm run lint` memeriksanya). Logika khusus ditaruh di aset (`src/assets`) atau adegan kustom (`src/scenes`).
- Jenis aset baru didaftarkan di `src/assets/catalog.json` (modul, skema parameter, status, kunci palet). Daftar transisi, easing, dan kamera ada di `config/engine.json`.
- Proyek baru cukup berupa file `config/<proyek>.json` (boleh `$include`). Lihat `docs/REUSABILITY_GUIDE.md`.
- Adegan kustom mengambil aset lewat `assets.pick(scene.assets, type)`. Adegan tersusun (`"module": "compose"`) memakai stage, cast, dan entitas. Jangan membuat ulang kereta atau karakter di dalam adegan.
- Zoom kamera hanya di `rendering.upscale: "browser"`. Mode bawaan `rendering.zoomMode: "anchored"` (grid piksel menempel pada gambar per lapisan, tidak merayap). Adegan kustom yang punya banyak lapisan parallax menggambar setiap lapisan lewat `shot.surface.layer(geseranX, geseranY)` saat `shot.surface.wantsLayers(zoom)`. `nearest` = cara Tahap 3 (untuk kompatibilitas), `steps` = zoom dibulatkan.
- Kontrak entitas, aset, adegan, transisi, dan penyaji frame dijelaskan di `docs/ARCHITECTURE.md`.
- Komentar kode dalam bahasa Indonesia.

## Perintah

Semua perintah proyek memakai `--project <id>` (`old-town-morning`, `night-to-dawn`, `train-night-rain`). Tanpa proyek, daftar proyek ditampilkan.

- `npm run check`: cek Node.js, Playwright, Chromium, FFmpeg, FFprobe, dan daftar proyek
- `npm run projects`: daftar proyek, adegan, lokasi video, status render
- `npm run build -- --project <id>` / `npm run build:all`: render + validasi. Laporan ada di `output/reports/`
- `npm run render -- --project <id> [--scene <adegan> | --frame <n> | --frames a-b] [--no-encode]`
- `npm run preview -- --project <id> [--scene <adegan>]`: pratinjau di browser
- `npm test`: lint, unit test, validasi semua proyek, uji negatif, regresi, uji antar-proyek (setelah `build:all`)
- `npm run test:ci`: lint + unit test + uji asap (yang dijalankan GitHub Actions, bersama `test:zoom`)
- `npm run test:zoom`: lab zoom, mengukur grid piksel kamera semua mode zoom (laporan `output/reports/zoom-lab.md`)
- `npm run demo:zoom`: buat ulang bahan pembanding zoom di `output/comparisons/`
- `npm run build:prototype`: render, uji, dan cek regresi prototipe Tahap 1

## Progres

- Tahap 1 (selesai, sudah di-merge): fondasi mesin + prototipe `train-night-rain` (5 detik, 150 frame).
- Tahap 2 (selesai, disetujui pemilik, di-merge ke `main` lewat PR #2): film 15 detik `film-night-to-dawn` (450 frame, 3 adegan, 2 transisi portal).
- Tahap 3 (selesai, disetujui pemilik sebagai milestone, di-merge ke `main` lewat PR #3): mesin reusable multi-proyek (versi 0.3.0), project loader + validasi skema, sistem entitas, karakter rig, aset kota tua, Project B `old-town-morning` (12 detik, 360 frame). Validasi A 36/36, B 33/33, prototipe 29/29; uji negatif A dan B masing-masing 33/33; regresi 14/14 (identik dengan `main@cfed35a`); uji antar-proyek 18/18; unit test 44/44; CI GitHub hijau.
- Tahap 4 (selesai dikerjakan di branch `tahap-4-pixel-perfect-camera`, PR ke `main` menunggu persetujuan, jangan merge sendiri): kamera pixel-perfect untuk V14. Mesin 0.4.0: mode zoom `anchored`/`steps`/`nearest` (`src/engine/pixel-grid.js`, `presenter.js`), surface per lapisan, lensa `scene.lens`, dither dissolve selaras grid, lab zoom + pola kalibrasi, pemeriksaan validator grid, perubahan terdeklarasi. Project B berubah di 124 frame zoom/dissolve (menunggu persetujuan); Project A dan prototipe identik dengan baseline. Audit final PR #4 dari clean clone lulus semua pemeriksaan wajib. Temuannya (warna baru dari lapisan semi-transparan dan potongan piksel di batas lapisan saat zoom pecahan) dicatat sebagai V24 dan V25, perbaikannya hanya di dokumentasi.
- Bahan peningkatan berikutnya tercatat di `docs/BACKLOG.md` (V1-V23, T1-T16, dengan prioritas dan ringkasan kandidat).
- Tahap 5: belum dimulai, menunggu keputusan pemilik. Jangan memulainya tanpa perintah.

## Cara melanjutkan di sesi baru

1. Mulai dari `main` (kondisi resmi terbaru). Untuk tahap baru, buat branch `tahap-<n>-<nama>` dari `main` hanya setelah pemilik memberi perintah. Branch tahap lama tidak dihapus tanpa izin.
2. Siapkan lingkungan: `npm run check`. Di Claude Code Cloud, Playwright 1.63.0 dan Chromium sudah terpasang global, FFmpeg juga ada. Di komputer lain: `npm ci` lalu `npx playwright install chromium`.
3. Frame PNG tidak masuk Git. Setelah clone baru, jalankan `npm run build:all` (render + validasi semua proyek, beberapa menit) lalu `npm test` (sekitar 6 menit).
4. Setiap perubahan di `src/` atau `config/` membuat manifest render kedaluwarsa. Render ulang proyek yang terdampak (praktisnya semua: `npm run build:all`) sebelum `npm test`, karena validator menolak MP4 yang tidak berasal dari render terbaru.
5. Baseline di `tests/baselines/` adalah patokan Project A dan prototipe. Jangan diperbarui kecuali pemilik menyetujui perubahan visual pada proyek tersebut.
6. MP4 untuk pemilik dikirim lewat chat (SendUserFile) dan ikut di-commit di `output/video/`, supaya bisa diputar di iPhone.
7. Peta dokumen: `README.md` (pemakaian), `docs/ARCHITECTURE.md` (cara kerja mesin dan status saat ini), `docs/REUSABILITY_GUIDE.md` (membuat proyek baru), `docs/BACKLOG.md` (keterbatasan dan kandidat pekerjaan), `docs/CHANGELOG.md` (riwayat).
