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
- Jangan mengorbankan kemampuan tahap sebelumnya. `npm run test:regression` harus lulus: setiap proyek identik piksel dan byte dengan versi baseline resminya di `tests/baselines/registry.json` (Project A dan prototipe Tahap 1: `tahap-2`, Project B: `tahap-4`; demo `character-lab` belum punya baseline). `npm run build:prototype` harus tetap lulus.
- Baseline tidak boleh diubah untuk menyembunyikan perubahan. File baseline tidak pernah diubah, ditimpa, atau dihapus. Ada dua lapis pemeriksaan: lint mencocokkan SHA-256 setiap file dengan registry (menangkap perubahan file yang tidak ikut mengubah registry), dan `npm run test:baseline-guard` membandingkan file baseline, versi registry, dan riwayat `resolved` dengan `origin/main` (menangkap file yang diubah bersama hash registry-nya, selama langkah penjaga di `.github/workflows/ci.yml` tidak ikut diubah). Keduanya jalan di CI dan di `npm test`. Perubahan pada `ci.yml`, file baseline lama, atau `registry.json` di PR wajib dijelaskan karena lapis terakhirnya tinjauan diff PR. Perubahan hasil render yang disengaja dicatat di `tests/baselines/pending-changes.json` → `changes.<proyek>` (`against` = versi resmi, rentang frame + alasan, status "menunggu persetujuan pemilik"); frame di luar rentang tetap wajib identik. Setelah pemilik menyetujui dan memerintahkan pembaruan baseline, buat versi baru dengan `npm run baseline` di branch khusus; entri pending pindah ke riwayat `resolved`, tidak dihapus. Langkah lengkap di `docs/BASELINES.md`.
- `main` dilindungi ruleset GitHub "Protect main - Pixel History Studio" (ID 26005617, diaktifkan pemilik 28 Oktober 2026): wajib lewat PR, hanya merge commit, dua check CI wajib lulus ("Lint, unit test, validasi konfigurasi" dan "Uji asap render dan lab zoom") dengan branch PR harus up to date dengan `main`, tidak boleh dihapus atau force push, tanpa bypass. Selaraskan branch PR dengan merge commit dari `main`, jangan rebase atau force push. Branch `tahap-1` sampai `tahap-4` dikunci dari penghapusan dan force push oleh ruleset "Protect historical stages" (ID 26006150, pola `refs/heads/tahap-[1-4]-*`); branch Tahap 5 ke atas belum tercakup. Konfigurasi ini terbaca dari API GitHub, tetapi penolakan push nyata belum pernah diuji (BACKLOG T18).

## Konvensi kode

- Kode browser (`src/engine`, `src/assets`, `src/scenes`) adalah ES module `.js`. Kode Node (`src/render`) adalah CommonJS `.cjs`.
- Animasi harus deterministik: semua posisi dihitung dari nomor frame (`time = frame / fps`). Dilarang `Math.random()`, `Date`, atau state yang dibawa antar frame. Variasi acak memakai `hash()` dari `src/engine/random.js`.
- Gambar dengan helper di `src/engine/pixel.js` (koordinat dibulatkan, mendukung zoom tajam). Warna diambil dari `src/assets/palette.js`.
- Durasi, kamera, cuaca, dan transisi ditulis di konfigurasi proyek JSON, bukan di kode adegan. Durasi dalam detik dan harus menjadi frame bulat. Interval adegan setengah terbuka `[awal, akhir)`.
- Mesin inti (`src/engine`) tidak boleh berisi logika proyek atau jenis aset tertentu (`npm run lint` memeriksanya). Logika khusus ditaruh di aset (`src/assets`) atau adegan kustom (`src/scenes`).
- Jenis aset baru didaftarkan di `src/assets/catalog.json` (modul, skema parameter, status, kunci palet). Daftar transisi, easing, dan kamera ada di `config/engine.json`.
- Proyek baru cukup berupa file `config/<proyek>.json` (boleh `$include`). Lihat `docs/REUSABILITY_GUIDE.md`.
- Adegan kustom mengambil aset lewat `assets.pick(scene.assets, type)`. Adegan tersusun (`"module": "compose"`) memakai stage, cast, dan entitas. Jangan membuat ulang kereta atau karakter di dalam adegan.
- Karakter rig: gerak `"motion": "classic"` (bawaan) adalah gerak Tahap 3 dan tidak boleh diubah, karena Project B bergantung padanya. Perbaikan gerak masuk ke `"motion": "natural"` (`src/assets/characters/gait.js`), warna yang mengikuti palet lewat `"light": "<awalan>"` (`lighting.js`). Lihat `docs/ARCHITECTURE.md` bagian karakter rig.
- Zoom kamera hanya di `rendering.upscale: "browser"`. Mode bawaan `rendering.zoomMode: "anchored"` (grid piksel menempel pada gambar per lapisan, tidak merayap). Adegan kustom yang punya banyak lapisan parallax menggambar setiap lapisan lewat `shot.surface.layer(geseranX, geseranY)` saat `shot.surface.wantsLayers(zoom)`. `nearest` = cara Tahap 3 (untuk kompatibilitas), `steps` = zoom dibulatkan.
- Kontrak entitas, aset, adegan, transisi, dan penyaji frame dijelaskan di `docs/ARCHITECTURE.md`.
- Komentar kode dalam bahasa Indonesia.

## Perintah

Semua perintah proyek memakai `--project <id>` (`old-town-morning`, `night-to-dawn`, `train-night-rain`, `character-lab`). Tanpa proyek, daftar proyek ditampilkan.

- `npm run check`: cek Node.js, Playwright, Chromium, FFmpeg, FFprobe, dan daftar proyek
- `npm run projects`: daftar proyek, adegan, lokasi video, status render
- `npm run build -- --project <id>` / `npm run build:all`: render + validasi. Laporan ada di `output/reports/`
- `npm run render -- --project <id> [--scene <adegan> | --frame <n> | --frames a-b] [--no-encode]`
- `npm run preview -- --project <id> [--scene <adegan>]`: pratinjau di browser
- `npm test`: lint, unit test, penjaga baseline historis, validasi semua proyek, uji negatif, regresi, uji antar-proyek, lab zoom (setelah `build:all`)
- `npm run test:ci`: lint + unit test + uji asap. GitHub Actions menjalankan ini ditambah penjaga baseline historis dan `test:zoom`; job uji asap berjalan di container Playwright resmi
- `npm run test:zoom`: lab zoom, mengukur grid piksel kamera semua mode zoom (laporan `output/reports/zoom-lab.md`)
- `npm run test:regression [-- --project <id> --baseline <versi>]`: regresi terhadap versi baseline resmi, atau versi historis (laporan `output/reports/regression-<proyek>-<versi>.md`)
- `npm run test:baseline-guard [-- --ref <branch | commit>]`: baseline historis di `tests/baselines/` harus sama dengan referensi tepercaya (bawaan `origin/main`)
- `npm run baseline`: daftar versi baseline. Dengan `--project <id> --version tahap-<n> --source main@<commit> --approved-at <tanggal> --evidence "..." [--dry-run]`: rekam versi baru setelah persetujuan pemilik
- `npm run demo:zoom`: buat ulang bahan pembanding zoom di `output/comparisons/`
- `npm run demo:character`: buat ulang bahan pembanding gerak dan cahaya karakter Tahap 5 (`output/comparisons/v15-*`, `v16-*`, laporan `output/reports/character-demo.md`)
- `npm run build:prototype`: render, uji, dan cek regresi prototipe Tahap 1

## Progres

- Tahap 1 (selesai, sudah di-merge): fondasi mesin + prototipe `train-night-rain` (5 detik, 150 frame).
- Tahap 2 (selesai, disetujui pemilik, di-merge ke `main` lewat PR #2): film 15 detik `film-night-to-dawn` (450 frame, 3 adegan, 2 transisi portal).
- Tahap 3 (selesai, disetujui pemilik sebagai milestone, di-merge ke `main` lewat PR #3): mesin reusable multi-proyek (versi 0.3.0), project loader + validasi skema, sistem entitas, karakter rig, aset kota tua, Project B `old-town-morning` (12 detik, 360 frame). Validasi A 36/36, B 33/33, prototipe 29/29; uji negatif A dan B masing-masing 33/33; regresi 14/14 (identik dengan `main@cfed35a`); uji antar-proyek 18/18; unit test 44/44; CI GitHub hijau.
- Tahap 4 (selesai, disetujui pemilik, di-merge ke `main` lewat PR #4): kamera pixel-perfect untuk V14. Mesin 0.4.0: mode zoom `anchored`/`steps`/`nearest` (`src/engine/pixel-grid.js`, `presenter.js`), surface per lapisan, lensa `scene.lens`, dither dissolve selaras grid, lab zoom + pola kalibrasi, pemeriksaan validator grid, perubahan terdeklarasi. Project B berubah di 124 frame zoom/dissolve, disetujui pemilik pada 27 Oktober 2026; Project A dan prototipe identik dengan baseline. Audit final PR #4 dari clean clone lulus semua pemeriksaan wajib. Temuannya (warna baru dari lapisan semi-transparan dan potongan piksel di batas lapisan saat zoom pecahan) dicatat sebagai V24 dan V25, perbaikannya hanya di dokumentasi. Baseline Project B diperbarui ke hasil Tahap 4 lewat pekerjaan baseline di bawah, atas instruksi pemilik.
- Pengelolaan baseline setelah Tahap 4 (bukan tahap baru; disetujui pemilik, di-merge ke `main` lewat PR #5, merge commit `d0f3f34`, 28 Oktober 2026): versi baseline per proyek di `tests/baselines/registry.json` (`src/render/baselines.cjs`, `npm run baseline`, regresi `--baseline <versi>`). Baseline resmi Project B `tahap-4` (`old-town-morning.tahap-4.json`, dari `main@a1fd4a1`, MP4 identik dengan yang di-merge); `tahap-3` tetap sebagai referensi historis. Tepat 124 frame berubah dari `tahap-3` (85-130, 262-339), 236 identik. Entri pending Tahap 4 pindah ke `resolved`. Baseline Tahap 1-3 tidak diubah (SHA-256 sama). Hasil render dan mesin tidak berubah. Audit final menambah penjaga baseline historis (`npm run test:baseline-guard`, pembanding `main`) dan mengoreksi klaim lint di dokumentasi. Branch disinkronkan dengan `main` setelah PR #6 lewat merge commit (tanpa force push). Hasil uji (clean clone): `npm test` 11/11 langkah, lint lulus (8 pemeriksaan registry), unit test 65/65, penjaga 3/3, validasi A 37/37, B 34/34, prototipe 30/30, uji negatif A 35/35 dan B 36/36, regresi 29/29 (B identik piksel dan byte dengan `tahap-4`), regresi B vs `tahap-3` 11/11, uji antar-proyek 18/18, lab zoom 10/10, uji asap 3/3, `build:prototype` lulus. Audit pasca-merge dari clean clone `main@d0f3f34` mengulang semua uji itu dengan hasil sama (penjaga dibanding `main` sebelum merge `9fbd38d`: 3/3, MP4 ketiga proyek identik byte), dan CI push di `main@d0f3f34` hijau.
- CI (PR #6, di-merge ke `main` lewat `9fbd38d`): job uji asap berjalan di image resmi Playwright 1.63.0 (dikunci digest) dan memasang FFmpeg paket resmi Ubuntu 6.1.1-3ubuntu5 dari cache GitHub, tanpa apt untuk Chromium. Tes yang dijalankan tidak berubah. Dibuat setelah job lama dua kali habis waktu di apt (BACKLOG T17).
- Proteksi branch (pengaturan GitHub oleh pemilik, 28 Oktober 2026, bukan kode): ruleset `main` (26005617) dan branch Tahap 1-4 (26006150) aktif. Konfigurasi terverifikasi lewat API GitHub; enforcement belum diuji dengan push nyata. BACKLOG T18 sebagian selesai.
- Bahan peningkatan berikutnya tercatat di `docs/BACKLOG.md` (V1-V25, T1-T18, dengan prioritas dan ringkasan kandidat).
- Tahap 5 (dimulai atas perintah pemilik, 28 Oktober 2026, branch `tahap-5-character-animation`, menunggu persetujuan dan merge): gerak dan pencahayaan karakter, fokus V15 dan V16. Mesin 0.5.0. Rig `motion: "natural"` (siku dan lutut, pose lengan, siklus jalan 8 fase yang telapaknya menempel di tanah, ayunan tangan sinkron) dan `light: "<awalan>"` (warna dari palet pencahayaan, cahaya tepi, arah dari `lightDirection` atau `lightTrack`). Keduanya opsional, jadi Project A, Project B, dan prototipe tidak berubah. Komposer menyediakan `paletteAt` dan `entitiesAt`; validator memeriksa warna identitas per frame dan gerak karakter (`motion-feet`, `motion-bob`). Proyek demo baru `character-lab` (12 detik, 360 frame, belum punya baseline) dan pembanding `npm run demo:character`. Menerapkan fitur ini ke Project B (V26) butuh deklarasi perubahan dan persetujuan terpisah. Hasil uji di branch: `npm test` 13/13 langkah, unit test 86/86, validasi demo 38/38, A 39/39, B 36/36, prototipe 32/32, uji negatif demo 42/42, A 35/35, B 41/41, regresi 29/29 (A, B, prototipe identik piksel dan byte), uji antar-proyek 22/22, lab zoom 10/10, `build:prototype` lulus. Demo: 0 dari 97 langkah natural meluncur, gerak klasik 98 dari 98 (rata-rata 5,4 piksel art).
- Tahap 6: belum dimulai. Jangan memulainya tanpa perintah pemilik.

## Cara melanjutkan di sesi baru

1. Mulai dari `main` (kondisi resmi terbaru). Untuk tahap baru, buat branch `tahap-<n>-<nama>` dari `main` hanya setelah pemilik memberi perintah. Branch tahap lama tidak dihapus tanpa izin.
2. Siapkan lingkungan: `npm run check`. Di Claude Code Cloud, Playwright 1.63.0 dan Chromium sudah terpasang global, FFmpeg juga ada. Di komputer lain: `npm ci` lalu `npx playwright install chromium`.
3. Frame PNG tidak masuk Git. Setelah clone baru, jalankan `npm run build:all` (render + validasi semua proyek, beberapa menit) lalu `npm test` (sekitar 6 menit).
4. Setiap perubahan di `src/` atau `config/` membuat manifest render kedaluwarsa. Render ulang proyek yang terdampak (praktisnya semua: `npm run build:all`) sebelum `npm test`, karena validator menolak MP4 yang tidak berasal dari render terbaru.
5. Baseline resmi setiap proyek ditentukan `tests/baselines/registry.json` (`npm run baseline` menampilkannya). Versi baru hanya dibuat lewat `npm run baseline` setelah pemilik menyetujui perubahan visual pada proyek tersebut. Lihat `docs/BASELINES.md`.
6. MP4 untuk pemilik dikirim lewat chat (SendUserFile) dan ikut di-commit di `output/video/`, supaya bisa diputar di iPhone.
7. Peta dokumen: `README.md` (pemakaian), `docs/ARCHITECTURE.md` (cara kerja mesin dan status saat ini), `docs/REUSABILITY_GUIDE.md` (membuat proyek baru), `docs/BASELINES.md` (versi baseline regresi), `docs/BACKLOG.md` (keterbatasan dan kandidat pekerjaan), `docs/CHANGELOG.md` (riwayat).
