# Pixel History Studio

Studio animasi pixel art berbasis kode. Tujuan jangka panjangnya adalah membuat film animasi sejarah bergaya retro 16-bit dengan mesin yang bisa dipakai berulang kali untuk banyak cerita. Proyek ini dibangun bertahap.

## Status

| Tahap | Isi | Status |
|-------|-----|--------|
| 1 | Fondasi mesin + prototipe 5 detik *Kereta Malam di Tengah Hujan* | Selesai |
| 2 | Sistem multi-adegan + film 15 detik *Kereta Malam Menuju Fajar* | Selesai, di-merge ke `main` (PR #2) |
| 3 | Mesin reusable untuk banyak proyek + film 12 detik *Pagi di Kota Tua* | Selesai, disetujui, di-merge ke `main` (PR #3) |
| 4 | Kamera pixel-perfect: zoom tanpa piksel merayap (V14) | Selesai, disetujui, di-merge ke `main` (PR #4) |
| 5 | Gerak dan pencahayaan karakter (V15, V16) + demo *Lab Karakter* | Selesai, disetujui, di-merge ke `main` (PR #9) |

Versi mesin: **0.5.0** (`config/engine.json`, Tahap 5).

Pengelolaan baseline setelah Tahap 4: baseline regresi kini punya versi per proyek, dan Project B memakai baseline resmi Tahap 4 (`tahap-4`). Disetujui pemilik dan di-merge ke `main` lewat PR #5 (`d0f3f34`). Penjelasan: [`docs/BASELINES.md`](docs/BASELINES.md). Setelah Tahap 5, unit test baseline tidak lagi meninggalkan folder sementara (PR #10, `3d59391`), dan demo `character-lab` mendapat baseline resmi `tahap-5` dari `main@e6926d2` atas perintah pemilik (PR #12, `09d68e9`). Setelah perbaikan V29, pemilik menyetujui 74 frame V29 dan memerintahkan baseline baru `tahap-5-v29` dari `main@63eab4c`; versi ini direkam di branch `baseline-character-lab-tahap-5-v29` dan diajukan lewat PR, belum di-merge, sedangkan `tahap-5` tetap tersimpan sebagai versi historis. PR D (T19, pemeriksaan pose karakter) dikerjakan atas persetujuan pemilik dan di-merge ke `main` (PR #14, `0f2b33d`); hasil render semua proyek tidak berubah.

## Proyek yang tersedia

Semua proyek memakai mesin yang sama (`src/engine/`). Yang membedakan hanya file konfigurasinya di `config/`.

| ID proyek | Judul | Durasi | Video | Laporan uji |
|-----------|-------|--------|-------|-------------|
| `old-town-morning` | *Pagi di Kota Tua* (Project B, Tahap 3) | 12 detik, 360 frame | [`output/video/old-town-morning.mp4`](output/video/old-town-morning.mp4) | [`output/reports/old-town-morning-validation.md`](output/reports/old-town-morning-validation.md) |
| `night-to-dawn` | *Kereta Malam Menuju Fajar* (Project A, Tahap 2) | 15 detik, 450 frame | [`output/video/film-night-to-dawn.mp4`](output/video/film-night-to-dawn.mp4) | [`output/reports/film-night-to-dawn-validation.md`](output/reports/film-night-to-dawn-validation.md) |
| `train-night-rain` | *Kereta Malam di Tengah Hujan* (prototipe Tahap 1) | 5 detik, 150 frame | [`output/video/train-night-rain.mp4`](output/video/train-night-rain.mp4) | [`output/reports/train-night-rain-validation.md`](output/reports/train-night-rain-validation.md) |
| `character-lab` | *Lab Karakter: Gerak dan Cahaya* (demo Tahap 5) | 12 detik, 360 frame | [`output/video/character-lab.mp4`](output/video/character-lab.mp4) | [`output/reports/character-lab-validation.md`](output/reports/character-lab-validation.md) |

Semua video: 1920 x 1080, 30 FPS, H.264 High level 4.1, yuv420p, faststart, tanpa audio. Dunia digambar di 480 x 270 lalu diperbesar nearest neighbor, jadi pikselnya tetap tajam.

## Hasil Tahap 5: gerak dan pencahayaan karakter

Dua kekurangan karakter rig dari Tahap 3 diperbaiki, keduanya **opsional per karakter**, sehingga ketiga film lama tetap identik piksel dan byte dengan baseline resminya:

- **Gerak natural (V16)**, `"motion": "natural"`: siku dan lutut menekuk, pose lengan (`swing`, `hang`, `carry`, `behind`), ayunan tangan yang selalu berlawanan dengan kaki di sisinya, dan siklus jalan 8 fase yang telapaknya menempel di tanah. Duduk, menoleh, isyarat, menyapu (dua tangan di gagang), dan mengayuh (siku menuju setang) tetap ada.
- **Pencahayaan karakter (V15)**, `"light": "<awalan>"`: warna karakter mengikuti palet pencahayaan pagi, siang, sore, dan malam, berubah di frame yang sama dengan bangunan dan langit, ditambah cahaya tepi dari arah matahari yang tetap benar walau karakter menghadap kiri.

| Ukuran (demo `character-lab`, seluruh film) | Gerak klasik (Tahap 3-4) | Gerak natural (Tahap 5) |
|---------------------------------------------|--------------------------|-------------------------|
| Langkah yang telapaknya meluncur | 98 dari 98 | 0 dari 97 |
| Telapak meluncur rata-rata per langkah | 5,4 piksel art | 0 |
| Pinggul bolak-balik dalam 1 frame (getar) | - | 0 |

Proyek demo *Lab Karakter* (12 detik) disusun hanya dari konfigurasi (`config/character-lab.json`) dan aset yang sudah ada: 01 langkah dan ayunan tangan (pagi, zoom 2), 02 pose lengan: melambai, membaca koran, menyapu, tangan di belakang, mengayuh (siang, zoom 1,5), 03 siang ke sore, 04 sore ke malam dengan lampu dan jendela menyala.

Bahan pembanding (`npm run demo:character`), "sebelum" = proyek yang sama dengan gerak klasik dan warna tetap:

| File | Isi |
|------|-----|
| [`output/comparisons/v15-v16-sebelum-sesudah.mp4`](output/comparisons/v15-v16-sebelum-sesudah.mp4) | atas layar penuh, bawah potongan 1:1 yang mengikuti tokoh; kiri sebelum, kanan sesudah |
| [`output/comparisons/v16-langkah.png`](output/comparisons/v16-langkah.png) | 8 frame berurutan Pak Darto berjalan, sebelum dan sesudah |
| [`output/comparisons/v15-cahaya.png`](output/comparisons/v15-cahaya.png) | tokoh yang sama di pagi, siang, sore, malam, sebelum dan sesudah |
| [`output/reports/character-demo.md`](output/reports/character-demo.md) | angka ukur gerak dan warna identitas per waktu |

Project B belum memakai fitur ini (BACKLOG V26). Menerapkannya akan mengubah hampir semua frame Project B, jadi butuh deklarasi perubahan dan persetujuan terpisah. Cara memakai: [`docs/REUSABILITY_GUIDE.md`](docs/REUSABILITY_GUIDE.md) bagian karakter.

## Pemeriksaan pose karakter (PR D, T19, PR #14)

Validator kini juga memeriksa pose karakter gerak natural di setiap frame, dari data yang dicatat fungsi gambar itu sendiri (tanpa mengubah gambar):

| Pemeriksaan | Isi |
|-------------|-----|
| `motion-joints` | urutan kepala-bahu-pinggul-kaki benar, sendi di dalam kotak gambar, telapak menapak tepat di tanah |
| `motion-limbs` | panjang lengan dan kaki tetap (hanya selisih pembulatan piksel) |
| `motion-contact` | tangan di gagang sapu, sepatu di pedal, bakul dan bungkusan di tangan, tangan pengayuh di setang |
| `motion-seat` | duduk tepat di sadel atau bangku |
| `motion-stable` | tidak ada sendi yang bergetar 1 frame (kecuali titik balik penggerak sendi itu sendiri, misalnya puncak lambaian) |

Laporan validasi kini punya empat status: **LULUS**, **GAGAL**, **KNOWN ISSUE** (masalah yang sudah tercatat di BACKLOG dan tidak memburuk, hanya di proyek, pemeran, dan frame yang tercatat; masalah serupa di tempat lain tetap GAGAL), dan **TIDAK DIPERIKSA** (tidak ada yang bisa diperiksa, misalnya gerak klasik yang dibekukan). Dua status terakhir tidak dihitung LULUS. Contoh: `character-lab` "TIDAK ADA YANG GAGAL (43 lulus, 3 KNOWN ISSUE, dari 46 pemeriksaan)" (sebelum perbaikan V29: 43 lulus, 4 KNOWN ISSUE, dari 47).

Pemeriksaan ini menemukan empat masalah kecil di gerak yang sudah ada, dicatat sebagai V29-V32 di [`docs/BACKLOG.md`](docs/BACKLOG.md): tangan pengayuh 6 piksel di atas setang (juga di Project B), ujung lengan jauh penyapu tidak sampai ke tangannya, kedip pembulatan lutut dan siku 1 piksel, dan getar lutut anak sekolah di ujung ayunan kaki. Memperbaikinya mengubah render, jadi dikerjakan terpisah setelah disetujui. Perbaikan V29 (Opsi B, kedua tangan di atas batang setang) sudah di-merge lewat PR #19 (30 Oktober 2026) dan berlaku di `character-lab`; Project B masih memakai gerak klasik dan menunggu keputusan V26. Perubahan 74 frame `character-lab` (132-205) disetujui pemilik dan direkam sebagai baseline resmi `tahap-5-v29` di PR baseline V29 (belum di-merge; sampai itu terjadi, `main` masih memakai `tahap-5` dengan entri pending). V30-V32 tetap KNOWN ISSUE.

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

Perubahan hasil render Project B (124 frame di jendela zoom/dissolve) **disetujui pemilik** (27 Oktober 2026) dan kini menjadi baseline resmi Project B versi `tahap-4` (`tests/baselines/old-town-morning.tahap-4.json`). Referensi Tahap 3 tetap tersimpan sebagai versi historis `tahap-3`, dan entri perubahan terdeklarasinya dipindah ke riwayat `resolved` di `tests/baselines/pending-changes.json`. Project A dan prototipe Tahap 1 tidak berubah sama sekali.

## Hasil Tahap 3: *Pagi di Kota Tua*

Potongan suasana pagi di sebuah kota tua fiktif di Indonesia. Tidak ada satu baris pun kode kereta yang dipakai; seluruh film disusun dari data di `config/old-town-morning.json` dan folder `config/old-town-morning/`.

| Adegan | Frame | Isi |
|--------|-------|-----|
| 01 Old Town Morning | 0-119 | Pan pelan menyusuri deretan ruko bergaya Indies. Matahari terbit di balik atap, awan bergerak, lampu jalan padam satu per satu, toko mulai membuka pintu, Pak Tua membaca koran di bangku, tukang sapu bercaping menyapu trotoar, merpati mematuk. Di akhir, kamera mendorong pelan ke depan. |
| 02 The Morning Walk | 120-239 | Larut (dissolve) ke Pak Darto berpeci yang berjalan membawa bungkusan. Kamera mengikuti dengan halus. Siklus jalan 8 fase dengan ayunan kaki dan tangan, kepala menoleh saat sepeda ontel menyalip di jalan (lapisan berbeda). Pohon dan tanaman bergoyang. |
| 03 The Town Awakens | 240-359 | Jalan makin ramai: Bu Sari membuka kerai warung kopi sambil melambai, Pak Darto menoleh dan membalas, Mbok Sumi membawa bakul, anak sekolah berangkat, uap kopi mengepul, burung terbang, berkas sinar pagi menyinari bangunan. Kamera mundur pelan (pullback) ke komposisi lebar. Film berakhir di frame utuh, bukan layar hitam. |

Cuplikan: [`output/reports/old-town-morning-contact-sheet.png`](output/reports/old-town-morning-contact-sheet.png), per adegan `output/reports/old-town-morning-scene-*.png`, dan transisi `output/reports/old-town-morning-transition-*.png`.

Bukti keempat proyek identik dengan baseline resminya (Project A dan prototipe Tahap 1 dengan `main@cfed35a`, Project B dengan `main@a1fd4a1`, demo `character-lab` dengan `main@63eab4c`, versi `tahap-5-v29`): [`output/reports/regression.md`](output/reports/regression.md) (piksel setiap frame dan file MP4 identik byte demi byte). `character-lab` dibanding versi historis `tahap-5` (tepat 74 frame V29 berubah, 132-205): [`output/reports/regression-character-lab-tahap-5.md`](output/reports/regression-character-lab-tahap-5.md). Project B dibanding referensi Tahap 3: [`output/reports/regression-old-town-morning-tahap-3.md`](output/reports/regression-old-town-morning-tahap-3.md). Bukti semua proyek memakai mesin yang sama dan tidak saling bergantung: [`output/reports/project-tests.md`](output/reports/project-tests.md).

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
npm run test:regression                               # semua proyek identik dengan baseline resmi (tests/baselines/registry.json)
npm run test:regression -- --project old-town-morning --baseline tahap-3   # bandingkan dengan versi baseline historis
npm run baseline                                      # daftar versi baseline per proyek (versi baru: docs/BASELINES.md)
npm run test:baseline-guard                           # baseline historis harus sama dengan origin/main
npm run test:projects                                 # semua proyek memakai mesin yang sama dan saling terisolasi
npm run test:zoom                                     # lab zoom: ukur grid piksel kamera di semua mode zoom
npm run demo:zoom                                     # buat ulang video/gambar pembanding zoom di output/comparisons/
npm run demo:character                                # buat ulang pembanding gerak dan cahaya karakter (Tahap 5)
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
  character-lab.json            demo Tahap 5 (gerak dan cahaya karakter), dipecah ke folder character-lab/
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
    characters/gait.js          gerak natural Tahap 5: siklus jalan, lutut dan siku, pose lengan (fungsi murni)
    characters/lighting.js      pencahayaan karakter Tahap 5: warna dari palet, cahaya tepi, penyangga piksel
    registry.js, train.js, countryside.js, interior.js, ...   aset film kereta Tahap 1-2
  scenes/                       adegan kustom film kereta (Tahap 1-2)
  render/                       program Node.js: loader proyek, render, validasi, pengujian
tests/
  engine/                       unit test mesin (node --test)
  baselines/                    baseline regresi per versi (registry.json) + perubahan terdeklarasi dan riwayatnya (pending-changes.json)
  fixtures/                     adegan dan aset uji yang sengaja salah atau palsu, penganalisis lab zoom
.github/workflows/ci.yml        pemeriksaan otomatis di GitHub (lint, penjaga baseline, unit test, uji asap dan lab zoom di container Playwright)
docs/                           arsitektur, panduan reusability, versi baseline, riwayat, catatan peningkatan
output/                         video, laporan, cuplikan, bahan pembanding (comparisons/); frame PNG tidak masuk Git
```

## Keterbatasan yang masih ada

- Belum ada audio atau musik (di luar cakupan sampai sekarang).
- Saat kamera zoom dengan nilai tidak bulat (misalnya 1,1), satu frame berisi dua ukuran piksel berdampingan (4 dan 5 piksel layar). Sejak Tahap 4 polanya menempel pada gambar sehingga tidak merayap; keseragaman penuh hanya di zoom kelipatan 0,25 (V23).
- Fitur gerak natural dan pencahayaan karakter Tahap 5 baru dipakai demo `character-lab`. Project B masih memakai gerak klasik dan warna tetap sampai pemilik memutuskan (V26). Batas lainnya: V27 (gerak) dan V28 (cahaya: belum ada bayangan dan cahaya lampu lokal).
- Determinisme dijamin di lingkungan yang sama (versi Chromium dan FFmpeg yang sama).
- CI di GitHub hanya menjalankan pemeriksaan ringan. Render penuh dan pengujian lengkap dijalankan lokal atau di sesi Claude Code.
- Pemeriksaan pose (PR D) menemukan V29-V32 (tangan pengayuh di atas setang, lengan jauh penyapu, kedip dan getar lutut). Dilaporkan sebagai KNOWN ISSUE sampai diperbaiki (V29 sudah diperbaiki di `character-lab` lewat PR #19; Project B menunggu V26). Gerak klasik (Project B) tidak diperiksa pose-nya.
- `main` dan branch Tahap 1-5 dilindungi ruleset GitHub, dan pola `tahap-6-*` sudah disiapkan untuk branch Tahap 6 yang belum dibuat (lihat [`docs/BASELINES.md`](docs/BASELINES.md)). Konfigurasinya aktif, tetapi penolakan push nyata belum diuji, dan PR yang mengubah workflow CI tetap perlu ditinjau manual (BACKLOG T18).

Daftar lengkap beserta prioritas dan ide perbaikannya ada di [`docs/BACKLOG.md`](docs/BACKLOG.md).
