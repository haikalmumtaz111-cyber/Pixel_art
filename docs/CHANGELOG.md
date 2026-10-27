# Riwayat Perubahan

## Tahap 4: kamera pixel-perfect (branch `tahap-4-pixel-perfect-camera`, menunggu persetujuan)

Fokus: memperbaiki V14, yaitu pixel crawling saat kamera zoom dengan nilai tidak bulat. Versi mesin 0.4.0.

### Baru

- **Mode zoom `anchored`** (bawaan untuk `rendering.upscale: "browser"`): ukuran setiap piksel art ditentukan oleh posisinya di dunia dan lapisannya, bukan oleh posisinya di layar (`src/engine/pixel-grid.js`). Kamera geser = gerak kaku tanpa crawl; zoom naik = setiap piksel tumbuh tepat sekali; zoom kelipatan 0,25 = semua piksel sama besar. Tanpa blur, tanpa warna baru.
- Mode pembanding `steps` (zoom dibulatkan) dan `nearest` (cara Tahap 3, identik 100% untuk kompatibilitas). Pilihan `rendering.zoomMode` divalidasi.
- **Surface per lapisan**: adegan menggambar setiap lapisan parallax ke kanvas sendiri saat zoom pecahan. Otomatis untuk adegan tersusun; adegan kustom Project A (`night-train`, `journey-to-dawn`) ikut lewat fungsi `layer` di aset `countryside`/`landscape`.
- **Lensa `scene.lens`**: zoom tambahan untuk adegan jenis apa pun, termasuk adegan kustom.
- **Dither transisi selaras grid**: pola dissolve mengikuti grid art adegan tujuan, jadi piksel art tidak terbelah (sebelumnya sel dither 4 piksel di atas piksel art 5 piksel).
- **Lab zoom** (`npm run test:zoom`): pola kalibrasi `calibration-grid` dengan identitas warna per piksel art, 10 skenario (zoom bulat dan pecahan, geser horizontal/vertikal/diagonal, zoom masuk/keluar) x 4 pendekatan, plus penerapan pada Project A. Laporan `output/reports/zoom-lab.md`.
- **Pemeriksaan validator "Grid piksel kamera stabil"**: menghitung crawl dan piksel bolak-balik dari catatan grid per frame di manifest render.
- **Perubahan terdeklarasi**: `tests/baselines/pending-changes.json` + regresi yang membedakan perubahan terdeklarasi (menunggu persetujuan) dari regresi tak terduga. Referensi Tahap 3 Project B ditambahkan (`tests/baselines/old-town-morning.json` dari `main@9d7a144`). Baseline lama tidak diubah.
- **Bahan pembanding** (`npm run demo:zoom`): `output/comparisons/` berisi video detail Project B sebelum/sesudah, video layar penuh, video lab empat pendekatan, peta crawl, lembar cuplikan, dan perbandingan dither dissolve.
- Uji negatif baru: mode zoom salah ketik, lensa di mode ffmpeg, dan zoom pecahan cara lama (crawl harus terdeteksi).
- 9 unit test pemetaan grid (`tests/engine/pixel-grid.test.js`).

### Diubah

- Project B dirender ulang dengan `anchored`. 124 dari 360 frame berubah, semuanya di jendela zoom/dissolve yang dideklarasikan (frame 85-130 dan 262-339); 236 frame lain identik dengan Tahap 3. Perubahan ini **belum dianggap diterima** sampai pemilik menyetujui.
- Penyaji frame (`presenter.js`) ditulis ulang; jalur `ffmpeg` tidak berubah.
- CI menjalankan lab zoom di job uji asap.

### Bukti kemampuan lama tetap utuh

- Project A dan prototipe Tahap 1: piksel setiap frame dan file MP4 identik byte demi byte dengan baseline `main@cfed35a`.
- Project B dengan `rendering.zoomMode: "nearest"`: 360/360 frame identik dengan Tahap 3.
- Project A dirender di mode `browser` zoom 1: identik dengan baseline setelah diperkecil 4x.

## Tahap 3: mesin reusable untuk banyak proyek (PR #3, branch `tahap-3-reusable-engine`)

Disetujui pemilik sebagai milestone pengembangan dan di-merge ke `main`. Versi mesin 0.3.0.

### Baru

- **Mesin inti generik** (`src/engine/`): registry aset dari katalog (`registry.js`), jadwal adegan setengah terbuka (`schedule.js`), track lingkungan bebas (`environment.js`), sistem entitas (`entities.js`), adegan tersusun dari data (`composer.js`), penyaji frame dengan zoom tajam (`presenter.js`), ramp palet (`palette.js`), track bertangga untuk status diskrit (`tracks.js`), dan kamera `keys` serta `follow-entity` (`camera.js`). Mesin tidak berisi logika kereta maupun kota tua.
- **Konfigurasi berlapis**: `config/engine.json` (global mesin) dan `src/assets/catalog.json` (19 jenis aset beserta skema parameternya) menjadi satu-satunya sumber daftar jenis transisi, easing, kamera, dan aset.
- **Project loader** (`src/render/projects.cjs`): proyek ditemukan otomatis dari `config/*.json`, mendukung `$include` dan palet turunan (`extends`). Durasi ditulis dalam detik dan harus menjadi frame bulat.
- **Validasi skema** (`schema.cjs`, `timeline.cjs`): ID ganda, celah, tumpang tindih, durasi tidak valid, aset/lapisan/induk/kamera yang tidak ada, keyframe salah, parameter salah tipe atau di luar batas, skala tidak bulat, zoom tanpa mode tajam, palet kurang warna.
- **Satu CLI untuk semua proyek**: `--project`, `--scene`, `--frame`, `--frames a-b`, `--no-encode`, `--encode-only`. Perintah baru `npm run projects`, `npm run build -- --project <id>`, `npm run build:all`.
- **Manifest render** (`manifest.cjs`): status `rendering`/`complete`/`failed` dan sidik jari konfigurasi, mesin, pustaka aset, frame, serta MP4. MP4 lama tidak bisa diterima bila render terakhir gagal atau sesuatu berubah sejak render.
- **Aset baru yang bisa dipakai proyek mana pun**: langit gradasi + matahari, punggung bukit/gunung berapi, awan, burung (terbang dan merpati), partikel uap, berkas cahaya, ruko Indies (1-2 lantai, 3 jenis atap, papan nama, kerai, status buka/tutup, lampu dalam), siluet kota, jalan batu dengan trotoar, lampu jalan, warung kopi dengan kerai bambu, bangku, pohon rindang dan kelapa yang bergoyang, sepeda ontel dengan roda dan pedal berputar, dan font piksel.
- **Karakter rig reusable** (`src/assets/characters/rig.js`): idle (napas, kedip), siklus jalan 8 fase yang dihitung dari jarak tempuh, menoleh, duduk, berdiri, isyarat tangan, menyapu, mengayuh. Karakter baru cukup ditulis sebagai data (tinggi, postur, topi, aksesori, warna).
- **Project B *Pagi di Kota Tua*** (`old-town-morning`): 12 detik, 360 frame, 3 adegan, 7 tokoh, transisi dissolve, kamera pan + push-in, follow, dan pullback. MP4 di `output/video/old-town-morning.mp4`.
- **Validator generik**: aturan konsistensi aset dari data proyek, adegan bisa dirender terpisah, isolasi modul (daftar file JS yang benar-benar diunduh browser), frame terakhir valid, dan pemeriksaan manifest.
- **Uji negatif per proyek** (33 kasus untuk Project A dan B), termasuk render yang sengaja digagalkan di salinan repository sementara MP4 lama masih ada.
- **Uji regresi** (`npm run test:regression`) terhadap baseline resmi dari `main@cfed35a` di `tests/baselines/`.
- **Uji antar-proyek** (`npm run test:projects`): mesin bersama, file konfigurasi terpisah, dan isolasi dua arah di salinan repository.
- **Unit test mesin** (`tests/engine/`, `node --test`), lint (`npm run lint`), uji asap (`npm run test:smoke`), dan GitHub Actions (`.github/workflows/ci.yml`).
- Dokumentasi: `docs/REUSABILITY_GUIDE.md` (contoh proyeknya ikut diuji otomatis), `docs/ARCHITECTURE.md` ditulis ulang, `docs/BACKLOG.md` ditambah temuan Tahap 3 dengan prioritas.

### Diubah

- Konfigurasi Project A memakai format timeline baru (`start`/`end` dalam detik, `transitionOut.start`/`duration`) dan punya `id`. Hasil render tetap identik.
- Logika khusus kereta yang dulu ada di mesin dipindah ke asetnya (warna identitas kereta, default hujan pedesaan).
- `package.json` memakai `"type": "module"` sehingga mesin bisa diuji langsung dengan Node. Node minimal versi 20.
- Laporan validasi mencatat proyek, file `$include`, versi dan sidik jari mesin, serta modul yang dimuat.

### Bukti kemampuan Tahap 1 dan 2 tetap utuh

- Baseline resmi diambil dari `main@cfed35a` sebelum pengembangan: hash piksel setiap frame PNG, metadata video, SHA-256 MP4, dan hash setiap frame hasil decode.
- Setelah seluruh perubahan Tahap 3, Project A (450 frame) dan prototipe Tahap 1 (150 frame) identik piksel demi piksel, dan file MP4-nya identik byte demi byte (SHA-256 `aa188168...` dan `28e9a3a3...`).

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
