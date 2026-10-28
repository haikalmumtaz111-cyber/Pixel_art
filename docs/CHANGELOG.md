# Riwayat Perubahan

## Fondasi: folder sementara unit test baseline selalu dibersihkan (PR #10, branch `pr-a-bersihkan-folder-uji`)

Disetujui pemilik dan di-merge ke `main` lewat PR #10 (merge commit `3d59391`, 28 Oktober 2026). Bukan tahap baru. Hanya `tests/engine/baselines.test.js` yang berubah; mesin, aset, konfigurasi, baseline, registry, workflow CI, dan MP4 tidak berubah.

- **Masalah** (ditemukan saat audit setelah Tahap 5): `fixture()` membuat folder `pixel-baselines-*` di folder sementara sistem dan tidak pernah menghapusnya, jadi setiap `npm run test:engine` (juga lewat `npm test` dan `test:ci`) meninggalkan 9 folder.
- **Perbaikan**: setiap folder fixture dicatat dan dihapus oleh `t.after()` milik tes yang membuatnya, yang tetap berjalan walau assertion gagal. `after()` di akhir file menjadi jaring pengaman. Pembersih hanya menghapus folder yang tercatat dibuat fixture dan jalurnya tepat satu tingkat di bawah folder sementara dengan awalan `pixel-baselines-`; tidak ada wildcard.
- **4 tes baru**: folder hilang begitu tesnya selesai; folder tetap dihapus saat assertion gagal (diuji di proses anak supaya rangkaian utama tidak ikut gagal); pembersih menolak folder lain dan jalur dengan `..`; semua folder dari tes sebelumnya sudah hilang. Semua assertion lama dipertahankan. Unit test menjadi 91 (termasuk satu subtes).
- **Bukti** (audit pasca-merge dari clean clone `main@3d59391`): `test:engine` 91/91 tiga kali tanpa folder baru; di folder sementara terisolasi, file uji versi sebelum PR #10 meninggalkan 9 folder sedangkan versi baru 0; `build:all` 4/4, `npm test` 13/13 langkah, regresi 29/29, `build:prototype` lulus, lab zoom 10/10, MP4 keempat proyek identik byte dengan yang ter-commit; CI push di `main@3d59391` hijau.
- **Batas**: proses yang dimatikan paksa (SIGKILL, kehabisan memori, timeout runner) tidak sempat menjalankan hook pembersih; kasus ini belum diuji. Folder yang tertinggal dari run sebelum perbaikan tidak dihapus otomatis.

## Proteksi branch Tahap 5 (pengaturan pemilik, 28 Oktober 2026)

Bukan perubahan kode. Setelah Tahap 5 di-merge, pemilik menambahkan pola `refs/heads/tahap-5-*` ke ruleset "Protect historical stages" (26006150). Terverifikasi lewat API GitHub: ruleset tetap `active`, pola lama `tahap-[1-4]-*` tetap berlaku, `tahap-5-character-animation` kini `protected` dengan aturan tidak boleh dihapus dan tidak boleh force push, bypass kosong, dan ruleset `main` (26005617) tidak berubah. Penolakan push nyata tetap belum diuji (BACKLOG T18).

## Tahap 5: gerak dan pencahayaan karakter (PR #9, branch `tahap-5-character-animation`)

Disetujui pemilik dan di-merge ke `main` lewat PR #9 (merge commit `e6926d2`, 28 Oktober 2026). Fokus: V15 (warna karakter mengikuti palet pencahayaan) dan V16 (gerak karakter lebih natural). Versi mesin 0.5.0. Semua fitur baru opsional per karakter, jadi Project A, Project B, dan prototipe Tahap 1 identik piksel dan byte dengan baseline resminya.

### Baru

- **Gerak natural rig** (`"motion": "natural"`, `src/assets/characters/gait.js`): sendi siku dan lutut (dua tulang), pose lengan `swing`/`hang`/`carry`/`behind` (`frontArm`, `backArm`, `armSwing`), siklus jalan 8 fase yang telapaknya menempel di tanah, ayunan lengan yang dihitung dari fase yang sama dengan kaki (lengan selalu berlawanan dengan kaki di sisinya), pinggul turun paling banyak 1 piksel di sekitar kontak dan dimatikan bila hanya akan muncul 1 frame. Isyarat, duduk (membaca koran), mengayuh (siku menuju setang), dan menyapu (dua tangan di gagang) ikut memakai siku.
- **Pencahayaan karakter** (`"light": "<awalan>"`, `src/assets/characters/lighting.js`): warna dasar dikalikan `<awalan>Light`, diangkat `<awalan>Lift`, dan siluet di sisi cahaya diberi `<awalan>Rim`. Ketiganya warna palet biasa, jadi ikut tangga palet adegan. Arah cahaya tepi dari `lightDirection` (-1..1, bisa `paramTracks`) atau `lightTrack` (nama track `environment`), tetap benar saat karakter dicerminkan. Karakter digambar ke penyangga piksel lalu diwarnai per piksel.
- **Jenis parameter katalog `environmentTrack`**: nama track lingkungan, divalidasi ada di `environment` proyek.
- **Komposer**: `paletteAt(frame)` dan `entitiesAt(frame)` untuk pengujian; aset menerima `scale` entitas saat menggambar. **Runtime**: `inspect.identityColors(kunci, frame)` dan `inspect.motionProbes(awal, jumlah)`. Semuanya generik.
- **Validator**: warna identitas dihitung per frame dari palet adegan (aturan konsistensi tetap berlaku untuk karakter yang diterangi); pemeriksaan baru "Gerak karakter: kaki tidak meluncur, tubuh tidak bergetar" (`motion-feet`, `motion-bob`) dari `motionProbe` aset. Gerak klasik hanya dilaporkan.
- **Uji negatif baru** (berlaku untuk proyek dengan karakter rig): mode gerak salah ketik, pose lengan tidak dikenal, palet tanpa warna cahaya karakter, arah cahaya di luar batas, track arah cahaya tidak ada, serta dua kerusakan kode gerak di salinan repository (telapak terseret, pinggul bolak-balik) yang harus tertangkap.
- **21 unit test** (`tests/engine/character.test.js`): telapak tidak meluncur di berbagai langkah, kecepatan, arah, dan skala; tepat satu telapak menapak; lengan berlawanan dengan kaki; tanpa getar; dua tulang; pose lengan; pencahayaan netral = identitas; warna searah sepanjang tangga palet; penyangga piksel identik dengan gambar langsung; semua status rig natural tergambar di dalam batas; klasik tetap bawaan; konfigurasi salah ditolak.
- **Proyek demo `character-lab`** (*Lab Karakter: Gerak dan Cahaya*, 12 detik, 360 frame, 4 adegan, 2 dissolve), murni konfigurasi: langkah dan ayunan tangan (pagi, zoom 2), pose lengan (siang, zoom 1,5), siang ke sore, sore ke malam dengan lampu dan jendela menyala. Belum punya baseline.
- **`npm run demo:character`** (`src/render/character-demo.cjs`): `output/comparisons/v15-v16-sebelum-sesudah.mp4`, `v16-langkah.png`, `v15-cahaya.png`, dan laporan `output/reports/character-demo.md`.

### Dipertahankan

- `motion: "classic"` (bawaan) adalah kode gerak Tahap 3 yang hanya dipindah ke fungsi `drawClassic` tanpa mengubah satu panggilan gambar pun. Tanpa `light`, karakter digambar langsung seperti sebelumnya.
- Konfigurasi Project A, Project B, dan prototipe tidak diubah. File baseline dan `pending-changes.json` tidak diubah.

### Temuan

- Tabel jalan Tahap 3 membuat telapak meluncur: di demo, 98 dari 98 langkah bergeser rata-rata 5,4 piksel art (terjauh 11). Gerak natural: 0 dari 97 langkah.
- V26 (Project B belum memakai fitur Tahap 5), V27 (batas gerak natural), V28 (batas pencahayaan), T19 (cakupan pemeriksaan gerak) dicatat di BACKLOG.

### Bukti

- Hasil uji (render ulang semua proyek dari kode final): `npm run build:all` 4/4 proyek lulus; `npm test` 13/13 langkah; lint lulus (87 file JavaScript, 28 JSON, 8 pemeriksaan registry); unit test 86/86 (65 lama + 21 baru); penjaga baseline historis 3/3; validasi `character-lab` 38/38, A 39/39, B 36/36, prototipe 32/32 (masing-masing +2 pemeriksaan gerak); uji negatif `character-lab` 42/42, A 35/35, B 41/41 (+5 uji konfigurasi karakter); regresi 29/29; uji antar-proyek 22/22; lab zoom 10/10; uji asap 4/4 proyek; `npm run build:prototype` lulus.
- Project A, Project B, dan prototipe identik piksel demi piksel di setiap frame dan MP4-nya identik byte demi byte dengan baseline resmi (`tahap-2`, `tahap-4`, `tahap-2`).
- Validator Project B (gerak klasik, tidak diwajibkan) mencatat 46 langkah dengan telapak meluncur rata-rata 6,4 piksel art.
- Setelah merge, CI push di `main@e6926d2` hijau.

## Proteksi branch di GitHub (pengaturan pemilik, 28 Oktober 2026)

Bukan perubahan kode, CI, baseline, aset, atau MP4. Pemilik mengaktifkan dua ruleset di pengaturan GitHub; dokumentasi diperbarui agar sesuai hasil audit.

- `Protect main - Pixel History Studio` (ID 26005617), target `main`: wajib PR dengan 0 approval, hanya merge commit, dua check CI wajib ("Lint, unit test, validasi konfigurasi", "Uji asap render dan lab zoom") mode strict, tidak boleh dihapus, tidak boleh force push, tanpa bypass.
- `Protect historical stages` (ID 26006150), pola `refs/heads/tahap-[1-4]-*`: keempat branch Tahap 1-4 tidak boleh dihapus dan tidak boleh force push, tanpa bypass.
- Terverifikasi lewat API GitHub: kedua ruleset `active`, aturan efektif muncul di `main` dan keempat branch historis, nama check wajib cocok dengan check run CI. Belum terverifikasi: penolakan push nyata (0 evaluasi rule saat audit).
- BACKLOG T18 menjadi sebagian selesai. Sisa celah (PR yang mengubah `ci.yml`, push fast-forward ke branch historis, branch Tahap 5 ke atas, uji enforcement) dicatat di T18 dan BASELINES.md. Klaim bahwa penjaga baseline selalu menangkap perubahan diberi batasan di CLAUDE.md, BASELINES.md, dan ARCHITECTURE.

## Pengelolaan baseline setelah Tahap 4 (PR #5, branch `baseline-versioning-b-tahap-4`)

Disetujui pemilik dan di-merge ke `main` lewat PR #5 (merge commit `d0f3f34`, 28 Oktober 2026). Audit pasca-merge dari clean clone `main` lulus semua pemeriksaan. Bukan tahap baru. Hasil render, mesin (0.4.0), aset, konfigurasi, dan MP4 tidak berubah. Panduan: [`BASELINES.md`](BASELINES.md).

### Baru

- **Versi baseline per proyek** di `tests/baselines/registry.json`. Nama versi = kondisi `main` setelah tahap itu di-merge. SHA-256 setiap file baseline dikunci, versi resmi ditunjuk `official`, versi lain tersimpan sebagai referensi historis.
- **Baseline resmi Project B `tahap-4`** (`tests/baselines/old-town-morning.tahap-4.json`), direkam dari render ulang `main@a1fd4a1`. MP4-nya identik byte demi byte dengan MP4 yang di-merge di PR #4. Dibanding `tahap-3`: tepat 124 frame berubah (85-130, 262-339), 236 identik, 0 di luar rentang terdeklarasi.
- `npm run baseline`: menampilkan versi baseline, atau merekam versi baru setelah persetujuan pemilik. Menolak render basi, kode render yang berbeda dari commit sumber, MP4 yang berbeda dari MP4 di commit sumber, frame berubah tanpa deklarasi, dan penimpaan versi atau file yang sudah ada.
- `npm run test:regression -- --project <id> --baseline <versi>`: membandingkan dengan versi historis. Lulus hanya bila frame yang berbeda sama persis dengan perubahan yang disetujui sejak versi itu. Laporannya `output/reports/regression-<proyek>-<versi>.md`.
- Pemeriksaan registry tanpa render di lint (ikut CI) dan regresi: isi file cocok dengan SHA-256 di registry, tidak ada file liar, versi tersambung, catatan perubahan antar versi sama persis dengan isi file dan punya bukti persetujuan, entri pending menunjuk versi resmi.
- **Penjaga baseline historis** (`npm run test:baseline-guard`, juga di CI dan `npm test`): membandingkan file baseline lama, versi registry, dan riwayat `resolved` dengan referensi tepercaya di Git (`origin/main`; di CI cabang tujuan PR atau commit main sebelumnya). Menutup celah yang ditemukan audit final PR #5: file baseline yang diubah bersama hash-nya di registry lolos lint.
- 12 unit test registry dan penjaga (`tests/engine/baselines.test.js`).

### Diubah

- Entri Project B Tahap 4 di `pending-changes.json` dipindah dari `changes` ke riwayat `resolved` dengan status "disetujui pemilik", tanggal, bukti, dan frame yang benar-benar berubah. Entri pending baru wajib menyebut versi yang dituju (`against`).
- Uji regresi, uji asap, uji antar-proyek, dan lab zoom membaca baseline resmi lewat registry. Project B kini dicek ketat terhadap `tahap-4`: 360 frame, frame hasil decode, dan file MP4 identik.
- Audit final PR #5: klaim "perubahan sekecil apa pun membuat lint gagal" di CLAUDE.md dan BASELINES.md dikoreksi. Lint hanya mencocokkan file dengan registry di folder yang sama; penjaga baseline historis menutup sisanya.

### Dipertahankan

- `night-to-dawn.json`, `train-night-rain.json` (versi `tahap-2`, `main@cfed35a`) dan `old-town-morning.json` (versi `tahap-3`, `main@9d7a144`) tidak diubah sedikit pun (SHA-256 sama) dan tetap di tempatnya.

### Bukti

- Render ulang `main@a1fd4a1`: tiga MP4 identik byte demi byte dengan yang di-merge.
- Setiap frame Project B yang berubah memakai zoom pecahan atau sedang dissolve. 15 frame di dalam rentang deklarasi tetap identik karena zoom-nya bulat atau sangat dekat kelipatan 0,25.
- Project B dengan `zoomMode: "nearest"` menghasilkan ulang Tahap 3: 360/360 frame identik piksel demi piksel, dan SHA-256 MP4-nya diawali `761c76b535b5f092`, sama dengan `tahap-3`. Di salinan repository, render itu ditolak regresi terhadap `tahap-4` (124 frame berbeda tanpa deklarasi) dan terhadap `tahap-3` (124 frame tidak sesuai baseline resmi).
- Di salinan repository, lint menolak file baseline yang diubah satu hash, entri pending yang menunjuk versi lama, dan file baseline yang tidak terdaftar.
- Hasil uji (clean clone setelah sinkron dengan `main` pasca PR #6): `npm test` 11/11 langkah, lint lulus (termasuk 8 pemeriksaan registry), unit test 65/65, penjaga baseline historis 3/3, validasi A 37/37, B 34/34, prototipe 30/30, uji negatif A 35/35 dan B 36/36, regresi 29/29, regresi B vs `tahap-3` 11/11, uji antar-proyek 18/18, lab zoom 10/10, uji asap 3/3, `build:prototype` lulus.

## CI: uji asap di image resmi Playwright (PR #6, di-merge ke `main`)

- Job "Uji asap render dan lab zoom" berjalan di `mcr.microsoft.com/playwright:v1.63.0-noble`, dikunci digest. Chromium 1.63.0 dan pustakanya sudah ada di image, jadi tidak ada lagi apt untuk Chromium dan tidak ada unduhan browser.
- FFmpeg tetap paket resmi Ubuntu (6.1.1-3ubuntu5, sama dengan lingkungan lokal), disimpan di cache GitHub. Run berikutnya memasang dari cache tanpa jaringan; saat cache kosong apt memakai percobaan ulang dan batas waktu per unduhan.
- Batas waktu job dan tes yang dijalankan tidak berubah. Latar belakang: job lama dua kali habis waktu 25 menit di apt sebelum tes jalan (BACKLOG T17).

## Tahap 4: kamera pixel-perfect (PR #4, branch `tahap-4-pixel-perfect-camera`)

Disetujui pemilik, termasuk perubahan 124 frame Project B, dan di-merge ke `main`. Fokus: memperbaiki V14, yaitu pixel crawling saat kamera zoom dengan nilai tidak bulat. Versi mesin 0.4.0.

### Baru

- **Mode zoom `anchored`** (bawaan untuk `rendering.upscale: "browser"`): ukuran setiap piksel art ditentukan oleh posisinya di dunia dan lapisannya, bukan oleh posisinya di layar (`src/engine/pixel-grid.js`). Kamera geser = gerak kaku tanpa crawl; zoom naik = setiap piksel tumbuh tepat sekali; zoom kelipatan 0,25 = semua piksel sama besar. Tanpa blur. Pola uji opak tidak menghasilkan warna baru, tetapi lapisan semi-transparan bisa menghasilkan sedikit warna baru (V24, lihat catatan audit di bawah).
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

- Project B dirender ulang dengan `anchored`. 124 dari 360 frame berubah, semuanya di jendela zoom/dissolve yang dideklarasikan (frame 85-130 dan 262-339); 236 frame lain identik dengan Tahap 3. Perubahan ini **disetujui pemilik** pada 27 Oktober 2026. Baseline Project B masih referensi Tahap 3 ditambah entri di `pending-changes.json`, sampai pemilik memberi instruksi untuk memperbarui baseline.
- Penyaji frame (`presenter.js`) ditulis ulang; jalur `ffmpeg` tidak berubah.
- CI menjalankan lab zoom di job uji asap.

### Bukti kemampuan lama tetap utuh

- Project A dan prototipe Tahap 1: piksel setiap frame dan file MP4 identik byte demi byte dengan baseline `main@cfed35a`.
- Project B dengan `rendering.zoomMode: "nearest"`: 360/360 frame identik dengan Tahap 3.
- Project A dirender di mode `browser` zoom 1: identik dengan baseline setelah diperkecil 4x.

### Catatan audit final PR #4

Audit dijalankan ulang dari clean clone di commit `120709c`, dan semua pemeriksaan wajib lulus. Hasilnya: CI, Project A dan prototipe identik byte demi byte, Project B berubah hanya di 124 frame terdeklarasi, MP4 valid, mode `nearest` identik dengan Tahap 3, dan `anchored` tanpa crawl di 10 skenario lab. Ada dua temuan, dan perbaikannya hanya di dokumentasi (kode, aset, MP4, hasil uji, dan baseline tidak diubah):

- Klaim "tanpa warna baru" dikoreksi. Lapisan semi-transparan di zoom pecahan menghasilkan 23 warna baru di Project B (0,0187% piksel film, 21 di antaranya selisih 1 nilai). Dicatat sebagai V24.
- Batas antar lapisan dengan geseran berbeda bisa memotong piksel art menjadi potongan 1-3 piksel layar di zoom pecahan. Dicatat sebagai V25.

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
