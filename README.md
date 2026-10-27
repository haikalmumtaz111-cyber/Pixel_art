# Pixel History Studio

Studio animasi pixel art berbasis kode. Tujuan jangka panjangnya adalah membuat film animasi sejarah bergaya retro 16-bit dengan mesin yang bisa dipakai berulang kali untuk banyak cerita. Proyek ini dibangun bertahap.

## Status

| Tahap | Isi | Status |
|-------|-----|--------|
| 1 | Fondasi mesin + prototipe 5 detik *Kereta Malam di Tengah Hujan* | Selesai |
| 2 | Sistem multi-adegan + film 15 detik *Kereta Malam Menuju Fajar* | Selesai, di-merge ke `main` (PR #2) |
| 3 | Mesin reusable untuk banyak proyek + film 12 detik *Pagi di Kota Tua* | Selesai, disetujui, di-merge ke `main` (PR #3) |
| 4 | Kamera pixel-perfect: zoom tanpa piksel merayap (V14) | Selesai, disetujui, di-merge ke `main` (PR #4) |

Versi mesin: **0.4.0** (`config/engine.json`), kondisi resmi di `main` sejak Tahap 4 di-merge.

## Proyek yang tersedia

Semua proyek memakai mesin yang sama (`src/engine/`). Yang membedakan hanya file konfigurasinya di `config/`.

| ID proyek | Judul | Durasi | Video | Laporan uji |
|-----------|-------|--------|-------|-------------|
| `old-town-morning` | *Pagi di Kota Tua* (Project B, Tahap 3) | 12 detik, 360 frame | [`output/video/old-town-morning.mp4`](output/video/old-town-morning.mp4) | [`output/reports/old-town-morning-validation.md`](output/reports/old-town-morning-validation.md) |
| `night-to-dawn` | *Kereta Malam Menuju Fajar* (Project A, Tahap 2) | 15 detik, 450 frame | [`output/video/film-night-to-dawn.mp4`](output/video/film-night-to-dawn.mp4) | [`output/reports/film-night-to-dawn-validation.md`](output/reports/film-night-to-dawn-validation.md) |
| `train-night-rain` | *Kereta Malam di Tengah Hujan* (prototipe Tahap 1) | 5 detik, 150 frame | [`output/video/train-night-rain.mp4`](output/video/train-night-rain.mp4) | [`output/reports/train-night-rain-validation.md`](output/reports/train-night-rain-validation.md) |

Semua video: 1920 x 1080, 30 FPS, H.264 High level 4.1, yuv420p, faststart, tanpa audio. Dunia digambar di 480 x 270 lalu diperbesar nearest neighbor, jadi pikselnya tetap tajam.

## Hasil Tahap 4: kamera pixel-perfect

Masalah V14: saat kamera zoom dengan nilai tidak bulat, ukuran piksel art campur 4 dan 5 piksel layar dan polanya ikut layar, sehingga garis tampak merayap. Sekarang ukuran piksel **menempel pada gambar setiap lapisan** (mode zoom `anchored`): tidak merayap saat kamera geser, setiap piksel tumbuh tepat sekali saat zoom, tetap tanpa blur.

| Ukuran (lab zoom) | Cara lama (Tahap 3) | Tahap 4 |
|-------------------|---------------------|---------|
| Kolom berganti ukuran tiap frame saat geser di zoom pecahan | 43,9% | 0% |
| Piksel bolak-balik ukuran selama zoom | 18.902 | 0 |
| Piksel blur/warna campuran (pola uji opak) | 0 | 0 |
| Lompatan skala (pop) | 0,005 | 0,007 |

Catatan audit final: di film sungguhan yang punya lapisan semi-transparan, zoom pecahan masih menghasilkan sedikit warna baru. Di Project B ada 23 warna (0,0187% piksel), hampir semuanya hanya selisih 1 nilai (V24). Selain itu, batas antar lapisan dengan parallax berbeda bisa menyisakan potongan piksel selebar 1-3 piksel layar (V25). Keduanya bukan blur atau crawl. Rinciannya ada di [`docs/BACKLOG.md`](docs/BACKLOG.md) dan [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

Bahan pembanding di `output/comparisons/`:

| File | Isi |
|------|-----|
| [`v14-old-town-detail.mp4`](output/comparisons/v14-old-town-detail.mp4) | Project B, potongan diperbesar 2x: kiri sebelum (Tahap 3), kanan sesudah (Tahap 4) |
| [`v14-old-town-full.mp4`](output/comparisons/v14-old-town-full.mp4) | Project B layar penuh: bagian zoom versi Tahap 3, lalu versi Tahap 4 |
| [`v14-lab-modes.mp4`](output/comparisons/v14-lab-modes.mp4) | Pola uji dengan empat pendekatan zoom berdampingan |
| [`v14-crawl-map.png`](output/comparisons/v14-crawl-map.png) | Peta ukuran piksel per frame: garis miring = merayap, garis tegak = stabil |
| [`v14-old-town-sheet.png`](output/comparisons/v14-old-town-sheet.png) | Empat frame berurutan saat pullback, sebelum dan sesudah |
| [`v14-dissolve-dither.png`](output/comparisons/v14-dissolve-dither.png) | Dither transisi dissolve diperbesar 4x: sebelum terbelah, sesudah selaras grid |

Laporan pengukuran: [`output/reports/zoom-lab.md`](output/reports/zoom-lab.md). Penjelasan teknis: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) bagian penyaji frame.

Perubahan hasil render Project B (124 frame di jendela zoom/dissolve) dicatat di `tests/baselines/pending-changes.json` dan sudah **disetujui pemilik** (27 Oktober 2026). Baseline Project B masih memakai referensi Tahap 3 ditambah entri perubahan terdeklarasi itu, sampai pemilik memberi instruksi untuk memperbarui baseline. Project A dan prototipe Tahap 1 tidak berubah sama sekali.

## Hasil Tahap 3: *Pagi di Kota Tua*

Potongan suasana pagi di sebuah kota tua fiktif di Indonesia. Tidak ada satu baris pun kode kereta yang dipakai; seluruh film disusun dari data di `config/old-town-morning.json` dan folder `config/old-town-morning/`.

| Adegan | Frame | Isi |
|--------|-------|-----|
| 01 Old Town Morning | 0-119 | Pan pelan menyusuri deretan ruko bergaya Indies. Matahari terbit di balik atap, awan bergerak, lampu jalan padam satu per satu, toko mulai membuka pintu, Pak Tua membaca koran di bangku, tukang sapu bercaping menyapu trotoar, merpati mematuk. Di akhir, kamera mendorong pelan ke depan. |
| 02 The Morning Walk | 120-239 | Larut (dissolve) ke Pak Darto berpeci yang berjalan membawa bungkusan. Kamera mengikuti dengan halus. Siklus jalan 8 fase dengan ayunan kaki dan tangan, kepala menoleh saat sepeda ontel menyalip di jalan (lapisan berbeda). Pohon dan tanaman bergoyang. |
| 03 The Town Awakens | 240-359 | Jalan makin ramai: Bu Sari membuka kerai warung kopi sambil melambai, Pak Darto menoleh dan membalas, Mbok Sumi membawa bakul, anak sekolah berangkat, uap kopi mengepul, burung terbang, berkas sinar pagi menyinari bangunan. Kamera mundur pelan (pullback) ke komposisi lebar. Film berakhir di frame utuh, bukan layar hitam. |

Cuplikan: [`output/reports/old-town-morning-contact-sheet.png`](output/reports/old-town-morning-contact-sheet.png), per adegan `output/reports/old-town-morning-scene-*.png`, dan transisi `output/reports/old-town-morning-transition-*.png`.

Bukti Project A dan prototipe Tahap 1 tidak berubah: [`output/reports/regression.md`](output/reports/regression.md) (piksel setiap frame dan file MP4 identik byte demi byte dengan `main`). Bukti semua proyek memakai mesin yang sama dan tidak saling bergantung: [`output/reports/project-tests.md`](output/reports/project-tests.md).

## Cara memakai

Semua perintah dijalankan dari folder proyek. Pilih proyek dengan `--project <id>`. Kalau proyek tidak diisi atau salah ketik, daftar proyek yang tersedia akan muncul.

```bash
npm run check                                   # periksa alat (Node, Playwright, Chromium, FFmpeg) dan daftar proyek
npm run projects                                # daftar proyek, adegan, transisi, lokasi video, status render
npm run preview -- --project old-town-morning   # tonton langsung di browser (Ctrl+C untuk berhenti)
npm run build -- --project old-town-morning     # render penuh + MP4 + validasi
npm run build:all                               # build semua proyek
```

Render dengan pipeline yang sama untuk semua proyek:

```bash
npm run render -- --project old-town-morning                            # film penuh -> output/video/<nama>.mp4
npm run render -- --project old-town-morning --scene s02-morning-walk   # satu adegan tanpa transisi -> output/scenes/
npm run render -- --project old-town-morning --frame 180                # satu frame -> output/stills/
npm run render -- --project old-town-morning --frames 100-140           # rentang frame -> output/stills/
npm run render -- --project night-to-dawn --no-encode                   # hanya PNG, tanpa MP4
npm run preview -- --project night-to-dawn --scene s02-inside-train     # pratinjau satu adegan
```

Pengujian:

```bash
npm run validate -- --project old-town-morning        # validasi lengkap satu proyek + laporan + lembar kontak
npm run test:negative -- --project old-town-morning   # kesalahan yang sengaja dibuat harus ditolak
npm run test:regression                               # Project A dan prototipe identik dengan baseline main
npm run test:projects                                 # semua proyek memakai mesin yang sama dan saling terisolasi
npm run test:zoom                                     # lab zoom: ukur grid piksel kamera di semua mode zoom
npm run demo:zoom                                     # buat ulang video/gambar pembanding zoom di output/comparisons/
npm run test:engine                                   # unit test mesin (tanpa browser)
npm run lint                                          # cek sintaks, JSON, determinisme, kemurnian mesin
npm test                                              # semua pengujian di atas (setelah build:all)
npm run build:prototype                               # render dan uji ulang prototipe Tahap 1
```

Hasil render:

| Apa | Lokasi |
|-----|--------|
| MP4 film | `output/video/<nama>.mp4` |
| Laporan validasi, uji negatif, regresi, antar-proyek | `output/reports/*.md` (dan `.json`) |
| Lembar kontak (cuplikan) | `output/reports/<nama>-contact-sheet.png`, `-scene-*.png`, `-transition-*.png` |
| Manifest render (status, sidik jari) | `output/reports/<nama>-render.json` |
| Frame PNG, frame lepas, video per adegan | `output/frames/`, `output/stills/`, `output/scenes/` (tidak masuk Git, bisa dibuat ulang) |

Setiap render menimpa frame dan MP4 lama dengan nama yang sama. MP4 ditulis ke file sementara dulu, jadi kalau encoding gagal, MP4 lama tidak rusak. Validator juga menolak MP4 lama bila render terakhir gagal.

## Memakai dari Claude Code (termasuk di iPhone)

Proyek ini dirancang untuk dikerjakan lewat percakapan dengan Claude Code, termasuk Claude Code di cloud yang dibuka dari aplikasi Claude di iPhone.

1. Buka sesi Claude Code untuk repository ini (di cloud, container sudah berisi Node, Chromium, dan FFmpeg).
2. Minta dengan bahasa biasa, misalnya: "render ulang proyek Pagi di Kota Tua", "tampilkan cuplikan adegan 2", atau "buat proyek baru: pagi di pasar, 8 detik".
3. Claude menjalankan perintah di atas di container, lalu mengirim MP4 dan lembar kontak langsung ke percakapan. Di iPhone, ketuk kartu file untuk memutar atau menyimpan video.
4. Hasil yang sudah di-commit juga bisa diunduh dari GitHub: buka file `output/video/<nama>.mp4` di branch terkait, lalu pilih *Download raw file*.

Container cloud bersifat sementara. Hasil yang ingin disimpan harus di-commit dan di-push ke GitHub.

## Membuat proyek baru

Cukup tulis satu file JSON di `config/` tanpa menyentuh mesin. Panduan lengkap beserta contoh siap pakai: [`docs/REUSABILITY_GUIDE.md`](docs/REUSABILITY_GUIDE.md).

## Memasang di komputer baru

1. Pasang Node.js versi 20 ke atas dari https://nodejs.org
2. Pasang FFmpeg (sudah termasuk FFprobe):
   - Windows: `winget install ffmpeg`
   - macOS: `brew install ffmpeg`
   - Ubuntu/Debian: `sudo apt install ffmpeg`
3. Di folder proyek jalankan `npm ci` lalu `npx playwright install chromium`
4. Jalankan `npm run check`. Kalau semua `[OK]`, lanjut `npm run build:all`

## Cara kerjanya (versi singkat)

Bayangkan studio film sungguhan:

- **Mesin** (`src/engine/`) adalah kru teknis yang sama untuk semua film: membaca jadwal, mengatur kamera, menata lapisan, menggambar setiap frame, menjalankan transisi. Kru ini tidak tahu cerita apa pun.
- **Gudang properti** (`src/assets/` + `src/assets/catalog.json`) berisi aset yang digambar oleh kode: kereta, ruko, pohon, lampu jalan, warung, sepeda, karakter rig, langit, awan, burung.
- **Proyek** (`config/<proyek>.json`) adalah naskah, daftar pemain, set panggung, dan jadwal syuting satu film.
- **Ruang editing dan kontrol kualitas** (`src/render/`) merender MP4 lalu memeriksanya dengan puluhan pemeriksaan otomatis.

Penjelasan teknis: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Riwayat perubahan: [`docs/CHANGELOG.md`](docs/CHANGELOG.md). Catatan peningkatan: [`docs/BACKLOG.md`](docs/BACKLOG.md).

## Struktur folder

```
config/
  engine.json                   konfigurasi global mesin (jenis transisi, easing, kamera, encoding, batas validasi)
  old-town-morning.json         Project B, dipecah ke folder old-town-morning/ (palet, aset, set, pemeran, adegan)
  film-night-to-dawn.json       Project A (film kereta Tahap 2)
  train-night-rain.json         prototipe Tahap 1
src/
  engine/                       mesin inti, sama untuk semua proyek
    film.js, schedule.js        isi setiap frame: adegan atau transisi (interval [awal, akhir))
    registry.js                 registry aset generik dari katalog
    composer.js, entities.js    adegan tersusun dari data, sistem entitas
    tracks.js, camera.js        keyframe, easing, kamera (keys, follow-entity, follow, speed)
    environment.js, palette.js  track lingkungan bebas, ramp palet pencahayaan
    presenter.js, pixel-grid.js   penyaji frame dan pemetaan grid piksel zoom (anchored/steps/nearest)
    transitions.js              transisi cut/dissolve/portal
    pixel.js, random.js, math.js  alat gambar pixel art, acak deterministik, fungsi bantu
    runtime.js, page.html       halaman browser tempat film digambar
  assets/
    catalog.json                daftar semua jenis aset: modul, parameter, status, warna palet
    common/                     langit, bukit, awan, burung, partikel, berkas cahaya, font piksel
    town/                       ruko, siluet kota, jalan, lampu, warung, bangku, pohon, sepeda
    characters/rig.js           karakter rig reusable (jalan, duduk, menoleh, isyarat, menyapu, mengayuh)
    registry.js, train.js, countryside.js, interior.js, ...   aset film kereta Tahap 1-2
  scenes/                       adegan kustom film kereta (Tahap 1-2)
  render/                       program Node.js: loader proyek, render, validasi, pengujian
tests/
  engine/                       unit test mesin (node --test)
  baselines/                    baseline resmi dari main untuk uji regresi + perubahan terdeklarasi (pending-changes.json)
  fixtures/                     adegan dan aset uji yang sengaja salah atau palsu, penganalisis lab zoom
.github/workflows/ci.yml        pemeriksaan otomatis di GitHub (lint, unit test, uji asap, lab zoom)
docs/                           arsitektur, panduan reusability, riwayat, catatan peningkatan
output/                         video, laporan, cuplikan, bahan pembanding (comparisons/); frame PNG tidak masuk Git
```

## Keterbatasan yang masih ada

- Belum ada audio atau musik (di luar cakupan sampai sekarang).
- Saat kamera zoom dengan nilai tidak bulat (misalnya 1,1), satu frame berisi dua ukuran piksel berdampingan (4 dan 5 piksel layar). Sejak Tahap 4 polanya menempel pada gambar sehingga tidak merayap; keseragaman penuh hanya di zoom kelipatan 0,25 (V23).
- Warna karakter belum ikut berubah bersama palet pencahayaan pagi.
- Determinisme dijamin di lingkungan yang sama (versi Chromium dan FFmpeg yang sama).
- CI di GitHub hanya menjalankan pemeriksaan ringan. Render penuh dan pengujian lengkap dijalankan lokal atau di sesi Claude Code.

Daftar lengkap beserta prioritas dan ide perbaikannya ada di [`docs/BACKLOG.md`](docs/BACKLOG.md).
