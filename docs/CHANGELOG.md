# Riwayat Perubahan

## Baseline resmi `character-lab` versi `tahap-5-v30` (branch `baseline-character-lab-tahap-5-v30`)

Bukan tahap baru dan bukan Tahap 6. Setelah meninjau hasil visual V30, laporan PR #23, dan audit pasca-merge, pemilik menyetujui hasil visual final V30 Opsi B (B2) dan 251 frame perubahan `character-lab` (109-359), memilih nama versi `tahap-5-v30`, dan memberi ACC terbatas untuk merekam baseline secara lokal dan menyiapkan koreksi dokumentasi pasca-merge PR #23 (30 Oktober 2026). Dikerjakan di branch `baseline-character-lab-tahap-5-v30` dari `main@4cee5fb`. Commit, push, dan PR menunggu izin pemilik berikutnya. Versi ini baru resmi di `main` setelah PR baseline-nya di-merge, dan sebelum itu `main` memakai `tahap-5-v29` dengan entri pending V30. Hasil render, mesin, aset, konfigurasi, workflow CI, known issues, dan MP4 tidak berubah. Panduan: [`BASELINES.md`](BASELINES.md).

- **Baru**: `tests/baselines/character-lab.tahap-5-v30.json` (360 frame, mesin 0.5.0, `previous` = `tahap-5-v29`, SHA-256 `53a913cc8a39b208...`), direkam lewat `npm run baseline` dari render ulang dengan kode render `main@4cee5fb` (merge PR #23). MP4-nya identik byte demi byte dengan `output/video/character-lab.mp4` di `4cee5fb`. `registry.json`: versi resmi `character-lab` pindah ke `tahap-5-v30`, dengan sumber, SHA-256 file, perubahan 251 frame (109-359), dan teks persetujuan pemilik.
- **Riwayat**: entri V30 di `pending-changes.json` pindah dari `changes` ke `resolved` lewat `npm run baseline` (disetujui pemilik 2026-10-30, `changedFrames` 109-359, `changedCount` 251, tiga bukti persetujuan). `changes` kini kosong.
- **Dipertahankan**: keenam file baseline lama (Project A, prototipe, Project B `tahap-3` dan `tahap-4`, `character-lab` `tahap-5` dan `tahap-5-v29`) tidak berubah (SHA-256 sama), dan riwayat `resolved` Tahap 4 dan V29 utuh. `tahap-5` dan `tahap-5-v29` tetap bisa dipakai dengan `--baseline`.
- **Bukti**: `--dry-run` lulus sebelum perekaman. Tepat 251 frame berbeda dari `tahap-5-v29` (109-359), 109 identik, 0 di luar rentang. PNG render branch identik byte 360/360 dengan render clean clone audit `main@4cee5fb`, dan `pixelMd5` file baru identik 360/360 dengan hash yang dihitung terpisah tanpa kode proyek. Hasil uji: lint lulus (31 JSON, 12 pemeriksaan registry), unit test 105/105, penjaga 3/3 (vs `origin/main` `4cee5fb`, `eeb4608`, `a03f98d`, `63eab4c`, dan `09d68e9`), `build:all` 4/4, `npm test` 13/13 langkah tanpa kegagalan (validasi `character-lab` 43 lulus + 2 KNOWN ISSUE dari 45, uji negatif 61/61, 35/35, 41/41, regresi 40/40, uji antar-proyek 22/22, lab zoom 10/10), regresi `character-lab` vs `tahap-5-v29` 12/12 dan vs `tahap-5` 12/12 (T1 selesai tanpa mengubah alat uji), regresi B vs `tahap-3` 11/11, uji asap 4/4 (`character-lab` identik dengan `tahap-5-v30` tanpa frame yang dikecualikan), `build:prototype` lulus, `git diff --check` bersih.
- **T1 selesai**: regresi `character-lab` vs `tahap-5`, yang GAGAL di `main@4cee5fb` selama V30 pending, kini lulus 12/12 karena perubahan V30 sudah tercatat sebagai perubahan yang disetujui di rantai versi `tahap-5` -> `tahap-5-v29` -> `tahap-5-v30`. Alat uji tidak diubah.
- **Koreksi dokumentasi pasca-merge PR #23** (D1-D13): status V30 yang masih tertulis "belum di-merge" atau hanya menyebut branch di `CLAUDE.md`, `README.md`, `ARCHITECTURE.md`, `BACKLOG.md`, `BASELINES.md`, dan catatan ini diperbarui dengan PR #23, merge commit `4cee5fb`, dan status baseline `tahap-5-v30`. Fakta lama tetap ditulis dengan konteks waktunya.
- **Artefak yang di-commit**: `output/reports/regression.md`/`.json` (40/40, empat proyek identik piksel dan byte dengan baseline resminya, `character-lab` dengan `tahap-5-v30`), `regression-character-lab-tahap-5.md`/`.json` (12/12), dan laporan historis baru `regression-character-lab-tahap-5-v29.md`/`.json` (12/12). Laporan lain yang ikut tertulis ulang saat pengujian tidak di-commit karena isinya hanya cap waktu dan sidik jari pustaka aset (T10).
- **Masih terbuka**: V31 dan V32 tetap KNOWN ISSUE. V29 di Project B tetap menunggu V26 (Project B dibekukan). Tahap 6 belum dimulai. Peringatan CI DEP0040/DEP0169 (T21) masih ada.

## Perbaikan V30: ujung lengan jauh penyapu sampai ke tangan jauh (PR #23, branch `perbaikan-v30-lengan-penyapu`)

Bukan tahap baru dan bukan Tahap 6. Setelah eksperimen read-only V30 dan Spike G di salinan sekali pakai, pemilik memilih V30 Opsi B (geometri B2) lewat review visual (30 Oktober 2026) dan memberi ACC terbatas untuk implementasi, pengujian, commit, push, dan satu PR. PR itu di-merge ke `main` oleh pemilik lewat PR #23 (merge commit `4cee5fb`, 30 Oktober 2026 16.23 WIB, atau 09.23 UTC). PR #23 **tidak merekam baseline baru**: perubahan visual `character-lab` dideklarasikan di `pending-changes.json` dan saat merge masih menunggu persetujuan pemilik (kemudian disetujui dan direkam sebagai `tahap-5-v30`, lihat entri di atas). V31 dan V32 tidak disentuh dan tetap KNOWN ISSUE.

- **Perubahan gerak natural** (`src/assets/characters/rig.js`, hanya `drawNaturalSweep` dan fungsi baru `sweepGrip`): gagang sapu lebih tegak dan dekat badan (ujung atas `(cx+2+round(fase), bahu+4)`, ujung bawah `(cx+5+round(fase x 6), kaki-3)`, sebelumnya `(cx+3+round(fase x 2), bahu+5)` dan `(cx+6+round(fase x 6), kaki-3)`). Titik genggam tangan jauh = titik terjauh di gagang yang masih di dalam 85% panjang lengan jauh, dicari bertahap 1/400 panjang gagang (sebelumnya titik 40% gagang yang 2,9-4,8 px di luar jangkauan). Ujung lengan jauh kini tepat di tangan jauh dan siku jauh menekuk (108-127 derajat di tinggi 41, sebelumnya lurus 180 derajat). Gerak klasik, fungsi bersama (`drawLegs`, `drawHead`, `drawTorso`, `drawAccessory`, `limb`, `pedalsOf`, `blinking`), gerak berjalan, dan pemanggilan lengan dekat tidak berubah.
- **Sama dengan visual yang dipilih**: MP4 `character-lab` hasil implementasi identik byte dengan render Opsi B (B2) di eksperimen (`b27d51e0...`). Geometri B1, B3, B4, B5 yang gagal di eksperimen tidak dipakai.
- **KNOWN ISSUE**: sebelum entri dihapus, validator melaporkan KNOWN ISSUE V30 GAGAL "TIDAK LAGI TERJADI" (252 sentuhan di 252 frame, terburuk 0 px), dan itu satu-satunya GAGAL. Entri V30 lalu dikeluarkan dari `src/render/known-issues.cjs` atas izin pemilik; `motion-contact` LULUS tanpa pengecualian (`sweep:farArm-farHand 252`). Toleransi tidak diubah, tidak ada pengecualian baru, entri V31 dan V32 tidak berubah.
- **Uji**: unit test baru penyapu natural (tinggi 30-56 x ramping, sedang, gemuk x cermin, tanpa daftar KNOWN ISSUE: kontak, panjang tulang, urutan sendi, dan kestabilan LULUS; ujung lengan jauh tepat di tangan jauh di dalam 85% jangkauan; siku jauh menekuk). Kontrol: tes yang sama gagal di kode `main` (lengan jauh 3-4 px dari tangan). Tes mekanisme KNOWN ISSUE sentuhan kini memakai entri uji lokal (`UJI-SENTUH`, bentuknya sama dengan entri V30 lama), karena daftar resmi tidak lagi punya KNOWN ISSUE sentuhan; ditambah kasus "lengan jauh penyapu 3 px dari tangan di frame dan pemeran aslinya = GAGAL, tanpa baris KNOWN ISSUE V30". Uji negatif "V30 memburuk" diganti dua kerusakan baru yang wajib GAGAL di `motion-contact`: ujung lengan jauh penyapu lepas 2 px dari tangan jauh, dan tangan jauh lepas 3 px dari gagang. Uji negatif "KNOWN ISSUE sentuhan di pemeran lain" kini dilewati di `character-lab` karena proyek ini tidak punya KNOWN ISSUE sentuhan lagi.
- **Perubahan render terdeklarasi**: `pending-changes.json` → `changes.character-lab` terhadap `tahap-5-v29`, frame 109-359 (251 frame, terukur dari render penuh 360 frame dengan hash piksel per frame), status menunggu persetujuan pemilik. Frame 0-108 identik (penyapu tidak tampil di adegan 1, frame 108 adalah frame pertama dissolve yang sama persis dengan adegan 1). Render dengan penyapu disembunyikan identik 360/360 dengan render `main`. `registry.json` dan semua file baseline tidak diubah.
- **Artefak yang di-commit**: hanya yang isinya berubah karena V30, yaitu `output/video/character-lab.mp4`, lembar kontak, lembar adegan, dan lembar transisi `character-lab` yang memuat penyapu, `character-lab-render.json`, laporan validasi dan uji negatif `character-lab`, serta `regression.md`/`.json`. Laporan proyek lain yang ikut tertulis ulang saat pengujian tidak di-commit karena isinya hanya cap waktu dan sidik jari pustaka aset (BACKLOG T10).
- **Hasil uji di branch**: lint lulus (90 file JavaScript, 30 JSON, 12 pemeriksaan registry), unit test 105/105 (104 lama + 1 baru), penjaga baseline 3/3 (vs `origin/main` `eeb4608`), `build:all` 4/4 tanpa GAGAL (validasi `character-lab` 43 lulus + 2 KNOWN ISSUE dari 45, sebelumnya 3 KNOWN ISSUE dari 46; A, B, prototipe masing-masing 5 tidak diperiksa dengan jumlah pemeriksaan sama seperti sebelumnya), `npm test` 13/13 langkah tanpa kegagalan (uji negatif `character-lab` 61/61, A 35/35, B 41/41, regresi 41/41, uji antar-proyek 22/22, lab zoom 10/10), regresi B vs `tahap-3` 11/11, `test:ci` lulus (uji asap 4/4), `build:prototype` lulus, `git diff --check` bersih. Project A, Project B, dan prototipe identik piksel dan byte dengan baseline resminya (MP4 `aa188168...`, `756f7d87...`, `28e9a3a3...`). V31 19/19 dan V32 10/10 kejadian, batas 1 px, tidak memburuk. Determinisme: validator (urutan terbalik) 360/360, dan di salinan eksperimen urutan terbalik serta acak masing-masing 360/360 identik dengan render berurutan.
- **Audit pasca-merge** (read-only, clean clone `main@4cee5fb`): parent merge `eeb4608` dan `fc84acd`, tree merge identik dengan head PR, CI push (run 41033037559) hijau di kedua job, `build:all` 4/4, `npm test` 13/13 langkah tanpa kegagalan, regresi resmi 41/41, regresi B vs `tahap-3` 11/11, penjaga 3/3 (vs `eeb4608`, `a03f98d`, dan `63eab4c`), `test:ci` dan `build:prototype` lulus. MP4 render ulang identik byte dengan render B2 eksperimen, tepat 251 frame berubah (109-359), piksel yang berubah hanya di sekitar penyapu, dan V31 19/19 serta V32 10/10 tidak memburuk. Tidak ada FAIL di kode, render, baseline, atau CI. Temuannya dua: status PR #23 belum diperbarui di 13 tempat dokumentasi (D1-D13, dikoreksi di branch baseline V30), dan regresi `character-lab` vs `tahap-5` GAGAL selama V30 pending karena entri pending hanya berlaku terhadap `tahap-5-v29` (177 frame V30 di luar rentang V29 belum disetujui). Itu sesuai aturan perbandingan historis dan bukan regresi render (T1).

## Baseline resmi `character-lab` versi `tahap-5-v29` (PR #21, branch `baseline-character-lab-tahap-5-v29`)

Bukan tahap baru dan bukan Tahap 6. Pemilik menyetujui hasil visual V29 Opsi B dan perubahan 74 frame `character-lab`, memilih nama versi `tahap-5-v29`, dan mengizinkan perekamannya (30 Oktober 2026), lalu memberi ACC commit, push, dan PR. Dikerjakan di branch `baseline-character-lab-tahap-5-v29` dari `main@3628a29` dan diajukan lewat PR, lalu di-merge ke `main` oleh pemilik lewat PR #21 (merge commit `a03f98d`, 30 Oktober 2026 13.15 WIB, atau 06.15 UTC). Sejak itu baseline resmi `character-lab` di `main` adalah `tahap-5-v29`, `tahap-5` tetap tersimpan sebagai versi historis, dan `pending-changes.json` tidak punya perubahan aktif. Hasil render, mesin, aset, konfigurasi, workflow CI, known issues, dan MP4 tidak berubah. Panduan: [`BASELINES.md`](BASELINES.md).

- **Baru**: `tests/baselines/character-lab.tahap-5-v29.json` (360 frame, mesin 0.5.0, `previous` = `tahap-5`), direkam lewat `npm run baseline` dari render ulang dengan kode render `main@63eab4c` (merge PR #19). MP4-nya identik byte demi byte dengan `output/video/character-lab.mp4` di `63eab4c`. `registry.json`: versi resmi `character-lab` pindah ke `tahap-5-v29`, dengan sumber, SHA-256 file, perubahan 74 frame (132-205), dan teks persetujuan pemilik.
- **Riwayat**: entri V29 di `pending-changes.json` pindah dari `changes` ke `resolved` (disetujui pemilik 2026-10-30, `changedFrames` 132-205, `changedCount` 74, tiga bukti persetujuan). `changes` kini kosong.
- **Dipertahankan**: kelima file baseline lama (Project A, prototipe, Project B `tahap-3` dan `tahap-4`, `character-lab` `tahap-5`) tidak berubah (SHA-256 sama), dan `tahap-5` tetap bisa dipakai dengan `--baseline tahap-5`. Riwayat `resolved` Tahap 4 utuh.
- **Bukti**: `--dry-run` lulus sebelum perekaman. Tepat 74 frame berbeda dari `tahap-5` (132-205), 286 identik, 0 di luar rentang; file baseline baru identik 360/360 dengan render terpisah dari clean clone `main@3628a29`. Lint lulus (30 JSON, 11 pemeriksaan registry), unit test 104/104, penjaga baseline 3/3 (vs `origin/main`, `63eab4c`, dan `cd33a8d`), `build:all` 4/4, `npm test` 13/13 langkah tanpa kegagalan, regresi 39/39 (empat proyek identik piksel dan byte dengan baseline resminya, tanpa perubahan terdeklarasi yang menunggu), regresi `character-lab` vs `tahap-5` 11/11 (74 frame yang disetujui berubah, 286 identik), regresi B vs `tahap-3` 11/11, uji asap 4/4 (`character-lab` identik dengan `tahap-5-v29` tanpa frame yang dikecualikan), `build:prototype` lulus.
- **Artefak yang di-commit**: `output/reports/regression.md`/`.json` (39/39, `character-lab` vs `tahap-5-v29`) dan laporan regresi historis baru `regression-character-lab-tahap-5.md`/`.json` (11/11) sebagai bukti. Laporan lain yang ikut tertulis ulang saat pengujian tidak di-commit karena isinya hanya cap waktu dan metadata.
- **Audit pasca-merge** (read-only, clean clone `main@a03f98d`): parent merge commit `3628a29` dan `3aa756e`, tree merge identik dengan head PR (`3aa756e`), kode tidak berubah sejak `63eab4c`. CI push `main@a03f98d` (run 41013058863) hijau di kedua job (penjaga 3/3 terhadap `3628a29`, uji asap 4/4 dengan `character-lab` identik dengan `tahap-5-v29`, lab zoom 10/10). Lint lulus, unit test 104/104, penjaga 3/3 (vs `3628a29`, `63eab4c`, dan `09d68e9`), `build:all` 4/4, `npm test` 13/13 langkah tanpa kegagalan (uji negatif 61/61, 35/35, 41/41, regresi 39/39, uji antar-proyek 22/22, lab zoom 10/10), regresi `character-lab` vs `tahap-5` 11/11, regresi B vs `tahap-3` 11/11, `test:ci` dan `build:prototype` lulus. Kelima file baseline lama identik byte, riwayat `resolved` Tahap 4 utuh, entri V29 pindah ke `resolved` tanpa perubahan isi, MP4 keempat proyek dan lembar cuplikan identik byte dengan yang ter-commit, dan verifikasi terpisah tanpa kode proyek (hash RGB setiap PNG dan SHA-256 MP4) cocok dengan baseline resmi; tidak ada FAIL. Temuannya hanya di dokumentasi: status PR #21 masih tertulis belum di-merge di 11 tempat, dikoreksi lewat koreksi dokumentasi susulan tanpa perubahan kode (branch `docs-status-merge-pr21`).
- **Masih terbuka**: V29 di Project B (gerak klasik) tetap belum diperbaiki dan menunggu V26. V30-V32 tetap KNOWN ISSUE. Peringatan CI DEP0040/DEP0169 (T21) masih ada.

## Perbaikan V29: tangan pengayuh di setang (PR #19, branch `perbaikan-v29-tangan-pengayuh`)

Bukan tahap baru dan bukan Tahap 6. Pemilik menerima analisis read-only V29-V32, lalu memilih Opsi B lewat review visual render asli (Opsi A ditolak karena kedua lengan terlalu lurus). Dikerjakan di branch `perbaikan-v29-tangan-pengayuh` dari `main@cd33a8d` dan diajukan lewat PR atas ACC bersyarat pemilik untuk commit, push, dan PR, lalu di-merge ke `main` lewat PR #19 (merge commit `63eab4c`, 30 Oktober 2026 07.01 WIB, atau 00.01 UTC). V29 kini diperbaiki di `character-lab`; Project B masih memakai gerak klasik dan menunggu keputusan V26. Saat PR #19 di-merge, baseline resmi `character-lab` tetap `tahap-5`: perubahan 74 frame masih pending dan belum disetujui sebagai baseline baru (kemudian disetujui dan direkam sebagai `tahap-5-v29` lewat PR #21, `a03f98d`).

- **Perubahan gerak natural** (`src/assets/characters/rig.js`): saat mengayuh, target kedua tangan diambil dari letak batang setang di koordinat lokal pengayuh (`gripOf`, params `gripX`/`gripDrop` dengan bawaan 7 dan 13, terdaftar di `catalog.json` di samping `crankX`/`crankDrop`). Tangan jauh `(setang.x - 1, setang.y - 2)`, tangan dekat `(setang.x + 1, setang.y - 2)`, setara `(cx+6, boxH-15)` dan `(cx+8, boxH-15)`. Kedua target di dalam jangkauan lengan (10,63 dari 11 px), jadi siku tetap menekuk sekitar 30 derajat. Gerak klasik (`drawSeated`, `pedalsOf`) tidak berubah.
- **KNOWN ISSUE**: entri V29 dikeluarkan dari `src/render/known-issues.cjs` setelah perbaikan terbukti lulus tanpa pengecualian apa pun (258 dari 258 sentuhan `hand-grip` berjarak sel 1, toleransi 1 tidak diubah). V30-V32 tetap.
- **Uji**: unit test baru (pemasangan asli `character-lab`, kedua tangan di soket grip tanpa daftar KNOWN ISSUE, tangan tepat di target, siku menekuk dan tidak lebih rendah dari tangan, `gripDrop` menggeser tangan). Tes mekanisme KNOWN ISSUE sentuhan kini memakai V30, ditambah kasus "tangan pengayuh 6 px = GAGAL". Uji negatif V29 diganti dua kerusakan baru: tangan dekat dan tangan jauh masing-masing naik 2 piksel dari setang wajib GAGAL di `motion-contact`.
- **Perubahan render terdeklarasi**: `pending-changes.json` → `changes.character-lab` terhadap `tahap-5`, frame 132-205 (74 frame, dari render penuh 360 frame), status menunggu persetujuan pemilik. Baseline `tahap-5` dan `registry.json` tidak diubah.
- **Artefak yang di-commit**: hanya yang isinya berubah karena V29, yaitu `output/video/character-lab.mp4`, lembar kontak dan lembar adegan `s02-pose` `character-lab`, `character-lab-render.json`, laporan validasi dan uji negatif `character-lab`, serta `regression.md`/`.json` (4 proyek, kini memuat perubahan terdeklarasi V29). Laporan proyek lain yang ikut tertulis ulang saat `build:all` dan `npm test` (`*-render.json` dan `*-validation.*` Project A, Project B, prototipe, uji negatif Project A dan B, `project-tests.*`, `zoom-lab.*`, `regression-old-town-morning-tahap-3.*`) tidak di-commit: isinya hanya cap waktu, sidik jari pustaka aset (`libraryHash`/`inputsHash`, berubah karena `src/assets` berubah, lihat BACKLOG T10), dan salinan isi `pending-changes.json`. Hasil pemeriksaannya sama. Clean clone tetap menjalankan `npm run build:all` lebih dulu, sehingga manifest itu dibuat ulang.
- **Hasil uji di branch**: render penuh `character-lab` 74 frame berubah (132-205), 286 identik dengan `tahap-5`; dengan pengayuh disembunyikan, render sebelum dan sesudah identik 360/360 (hanya sprite pengayuh yang berubah). Lint lulus (11 pemeriksaan registry), unit test 104/104, penjaga baseline 3/3, `build:all` 4/4, `npm test` 13/13 langkah tanpa kegagalan (validasi `character-lab` 43 lulus + 3 KNOWN ISSUE dari 46; A, B, prototipe masing-masing 5 tidak diperiksa), uji negatif `character-lab` 61/61, A 35/35, B 41/41, regresi 40/40 (A 450, B 360, prototipe 150 frame identik piksel, MP4 identik byte), regresi B vs `tahap-3` 11/11, uji antar-proyek 22/22, lab zoom 10/10, `test:ci` (uji asap 4/4) dan `build:prototype` lulus.
- **Audit pasca-merge** (read-only, clean clone `main@63eab4c`): tree merge identik dengan head PR (`ef93d9f`), CI push hijau di kedua job, lint lulus, unit test 104/104, penjaga 3/3 (vs `origin/main` dan vs `cd33a8d`), `build:all` 4/4, `npm test` 13/13 langkah tanpa kegagalan (uji negatif 61/61, 35/35, 41/41, regresi 40/40, uji antar-proyek 22/22, lab zoom 10/10), regresi B vs `tahap-3` 11/11, `test:ci` dan `build:prototype` lulus, MP4 keempat proyek dan lembar cuplikan identik byte dengan yang ter-commit; 258/258 sentuhan tangan-setang dalam toleransi 1 piksel tanpa pengecualian KNOWN ISSUE, 74 frame berubah tepat 132-205, 286 identik dengan `tahap-5`, dan dengan pengayuh disembunyikan render sebelum dan sesudah identik 360/360 (hanya sprite pengayuh yang berubah); tidak ada FAIL.

## CI ke runtime Node.js 24, T20 (PR #17, branch `t20-actions-node24`)

Disetujui pemilik dan di-merge ke `main` lewat PR #17 (merge commit `b03f344`, 29 Oktober 2026 23.29 +07:00, atau 16.29 UTC). Bukan tahap baru. Hanya `.github/workflows/ci.yml` yang berubah (+5/-5). Kode, uji, konfigurasi, baseline, registry, `pending-changes.json`, output render, dan dokumentasi tidak berubah.

- **Perubahan**: `actions/checkout`, `actions/setup-node`, dan `actions/cache` naik dari `@v4` ke `@v5` di kelima baris `uses:`. Menurut catatan rilis resmi, ketiganya berjalan di Node.js 24 (runner 2.327.1 ke atas). v5 dipilih, bukan versi terbaru, karena v6/v7 membawa perubahan lain (ESM, penyimpanan kredensial checkout, caching otomatis setup-node).
- **Dipertahankan**: `node-version: 22`, `cache: npm`, nama kedua check wajib, pemicu, `needs`, timeout, image Playwright beserta digest, env dan key cache FFmpeg, skrip pasang FFmpeg, langkah penjaga baseline (checkout v5 tetap `persist-credentials: true` dan `fetch-depth: 1`), dan semua langkah uji. YAML lama dan baru identik setelah versi action dinormalkan.
- **Bukti CI**: run PR 40909154992 dan run push `main@b03f344` (40912132900), kedua check success. Log memuat ketiga action v5 beserta SHA-nya dan tidak lagi memuat "Node.js 20 is deprecated". Penjaga baseline jalan dengan ref yang benar (`main` di PR, `97fbc2e` saat push) dan menghasilkan 3/3. Uji asap 4/4 identik baseline resmi, lab zoom 10/10. Cache npm dan FFmpeg hit, dan Node proyek tetap 22.23.4.
- **Audit pasca-merge** (read-only, clean clone `main@b03f344`): tree merge identik dengan head PR (`c775b49`). Lint lulus, unit test 103/103, penjaga 3/3 (vs `origin/main` dan vs `97fbc2e`), `build:all` 4/4, `npm test` 13/13 langkah tanpa kegagalan (4 KNOWN ISSUE di `character-lab` dan TIDAK DIPERIKSA di proyek lain tetap bukan LULUS), `test:ci` lulus, regresi B vs `tahap-3` 11/11, `build:prototype` lulus. MP4 keempat proyek dan 19 lembar cuplikan identik byte dengan yang ter-commit. Tidak ada FAIL.
- **Masih terbuka**: CI belum bebas peringatan. `setup-node@v5` masih mencetak `DeprecationWarning` DEP0040 (`punycode`) di langkah utama dan pasca-job, serta DEP0169 (`url.parse()`) di langkah utama, pada kedua job; pasca-job `cache@v5` tidak lagi mencetak `punycode`. Belum diverifikasi: jalur unduh ulang FFmpeg dengan `cache@v5` (cache selalu hit), dan penolakan push nyata oleh ruleset (T18).

## Proteksi pola branch Tahap 6 (pengaturan pemilik, 29 Oktober 2026)

Bukan perubahan kode dan bukan awal Tahap 6: belum ada branch maupun pekerjaan Tahap 6. Pemilik menambahkan pola `refs/heads/tahap-6-*` ke ruleset "Protect historical stages" (26006150) lewat pengaturan GitHub (`updated_at` 29 Oktober 2026 12.22 +07:00). Verifikasi read-only lewat API GitHub, dibandingkan dengan snapshot sebelum perubahan:

- Satu-satunya perubahan di 26006150 adalah tambahan `refs/heads/tahap-6-*` (dan `updated_at`). Enforcement tetap `active`, exclude kosong, aturan tetap tidak boleh dihapus dan tidak boleh force push, `bypass_actors` kosong (dibaca tanpa login admin).
- Aturan efektif kelima branch Tahap 1-5 identik dengan sebelum perubahan. Nama uji `tahap-6-cek-pola` (branch tidak dibuat) kini kena kedua aturan; `tahap6-cek` dan `tahap-7-cek` tidak.
- Ruleset `main` (26005617) identik byte dengan sebelum perubahan, termasuk `updated_at`. Saat verifikasi, ke-16 branch di `origin` dan `main@9971143` tidak berubah.
- Hasil: 9 PASS, 0 FAIL, 1 NOT VERIFIED (penolakan push nyata, sengaja tidak diuji). BACKLOG T18 butir 4 kini terpenuhi sampai Tahap 6; butir 1-3 tetap terbuka.
- Dokumentasinya disinkronkan lewat PR #16 (branch `pr-e-sinkronisasi-dokumentasi-t18`, merge commit `97fbc2e`, 29 Oktober 2026 17.36 +07:00). Hanya enam dokumen (+30/-14); audit pasca-merge PR #16 dari clean clone tidak menemukan FAIL.

## Koreksi dokumentasi status PR D (PR #15, branch `claude/pixel-history-docs-audit-qp98fv`)

Hanya dokumentasi. Memperbaiki dua temuan audit pasca-merge PR #14: status PR D yang masih tertulis "belum di-merge" atau "menunggu review" di tujuh tempat, dan cakupan BACKLOG `V1-V28` di CLAUDE.md. Disetujui pemilik dan di-merge ke `main` lewat PR #15 (merge commit `9971143`, 29 Oktober 2026 11.36 +07:00, atau 04.36 UTC). Lima file berubah (+10/-9): CLAUDE.md, README, ARCHITECTURE, BACKLOG, CHANGELOG. Kode, uji, konfigurasi, baseline, workflow CI, dan hasil render tidak berubah.

- **Audit pasca-merge** (read-only, clean clone `main@9971143`): parent merge commit `0f2b33d` dan `00ebf1a`, tree identik dengan head PR, diff identik dengan yang disetujui pemilik. CI push di `9971143` hijau di kedua job (run 40818685546). Lint lulus, unit test 103/103, penjaga baseline 3/3 (vs `origin/main` dan vs `0f2b33d`), `build:all` 4/4, `npm test` 13/13 langkah tanpa kegagalan, `test:ci` lulus (uji asap 4/4), `build:prototype` lulus, regresi B vs `tahap-3` 11/11, MP4 keempat proyek dan lembar cuplikan identik byte dengan yang ter-commit. Tidak ada FAIL. Belum diverifikasi saat itu: isi ruleset (kemudian dibaca lewat API, lihat entri di atas), penolakan push nyata (T18), dan proses uji yang dimatikan paksa. Log CI-nya memuat peringatan deprecation Node.js 20, dicatat sebagai BACKLOG T20.

## Pemeriksaan pose karakter, T19 (PR D, PR #14, branch `pr-d-validasi-gerak-t19`)

Disetujui pemilik untuk diimplementasikan (opsi A) dan dibuka sebagai PR #14 ke `main`, lalu di-merge lewat merge commit `0f2b33d` (29 Oktober 2026 10.06 +07:00, atau 03.06 UTC). Bukan tahap baru. Versi mesin tetap 0.5.0. Hasil render keempat proyek, konfigurasi, baseline, `pending-changes.json`, workflow CI, dan MP4 tidak berubah.

- **Perekam pose**: fungsi gambar gerak natural di `rig.js` mencatat bahu, siku, tangan, pinggul, lutut, pergelangan, telapak, tempat duduk, dan sentuhan lewat `mark()`, lengkap dengan penggerak tiap sendi (`swing`, `gesture`, `sweep`, `stride`). Perekam hanya aktif di dalam `poseProbe(e)`, yang menggambar ke konteks kosong tanpa cahaya, jadi gambar asli tidak tersentuh. Fungsi klasik tidak diberi perekam.
- **Soket benda**: `sockets(e)` di sepeda (`grip`, `seat`, `pedal`) dan bangku (`seat`), dalam koordinat kotak gambar. `draw()` keduanya tidak berubah.
- **Fungsi inspeksi**: `composer.layoutAt(frame)` dan `placementOf` (letak kotak gambar di dunia, rumus yang sama dengan `render()`, yang tidak diubah), serta `runtime.inspect.poseProbes(awal, jumlah)`.
- **Pemeriksaan baru** (`src/render/pose-checks.cjs`, fungsi murni Node): `motion-joints` (urutan tubuh, sendi di dalam kotak, telapak menapak tepat di tanah), `motion-limbs` (panjang lengan dan kaki tetap, hanya selisih pembulatan), `motion-contact` (tangan, kaki, dan benda yang dipegang bersentuhan), `motion-seat` (duduk tepat di sadel atau bangku), `motion-stable` (tidak ada sendi yang bolak-balik 1 frame). Pola a, b, a di `motion-stable` hanya sah bila salah satu penggerak sendi itu sendiri berbalik mulus di frame b; sisanya pelanggaran berjenis "pembulatan" atau "getar".
- **Empat status laporan** (`checks.cjs`): LULUS, GAGAL, KNOWN ISSUE, TIDAK DIPERIKSA. Validasi gagal hanya bila ada GAGAL. Dua status terakhir tidak dihitung LULUS, dan ringkasan `build:all` serta `npm test` menulisnya sebagai "tanpa kegagalan (n KNOWN ISSUE, m tidak diperiksa)".
- **KNOWN ISSUE** (`src/render/known-issues.cjs`, baris `known:<id>` di laporan): setiap entri hanya berlaku untuk kejadian yang benar-benar tercatat, yaitu proyek `character-lab`, pemerannya, dan frame-nya. V29: `pengayuh`, sentuhan `hand-grip`, frame 108-236, terburuk 6 px. V30: `penyapu`, `farArm-farHand`, frame 108-359, terburuk 3 px. V31: 19 kejadian persis (pemeran, sendi, sumbu, frame) di `darto-pagi`, `sumi-pagi`, `darto-sore`, `sumi-sore`, 1 px. V32: 10 kejadian persis di `anak-sekolah`, 1 px. Masalah serupa di pemeran, frame, sendi, atau proyek lain memakai toleransi normal dan GAGAL. V29 dan V30 disetujui pemilik. V31 dan V32 semula diusulkan, lalu disetujui pemilik pada 29 Oktober 2026 sebagai KNOWN ISSUE sementara dengan batasan yang sudah diverifikasi; tanpa keduanya `motion-stable` di `character-lab` GAGAL dengan 29 pelanggaran. Persetujuan ini tidak berarti masalah visualnya sudah diperbaiki. Entri berstatus `approval: "usulan"` ditandai "usulan, belum disetujui pemilik" di laporan; saat ini tidak ada. KNOWN ISSUE yang memburuk (lebih jauh dari batas terukur) atau tidak lagi terjadi sama-sama GAGAL, supaya daftarnya ikut diperbarui. Jumlah kejadian tidak bisa melebihi catatan karena setiap kejadian dicocokkan satu per satu.
- **Gerak klasik**: kode dibekukan. Kelima pemeriksaan pose berstatus TIDAK DIPERIKSA untuk proyek tanpa karakter natural (Project A, Project B, prototipe), dengan alasan tertulis.
- **Uji negatif**: 19 kerusakan pose di salinan repository, masing-masing dengan kontrol kode asli yang wajib berstatus sesuai harapan: telapak melayang, siku bergeser, tulang kaki salah, sepatu lepas dari pedal, tangan lepas dari gagang sapu, bakul tidak di tangan, badan duduk melayang, bahu bergetar, lengan jauh bergetar di puncak isyarat (pengecualian titik balik tidak berlaku untuk sendi dengan penggerak lain), V29 memburuk, V29 tidak lagi terjadi, V30 memburuk, V31 memburuk (kedip yang tercatat menjadi 2 px), V32 memburuk (getar yang tercatat menjadi 2 px), kedip pembulatan baru di luar daftar V31, getar lutut baru di luar daftar V32, masalah V29 dan V30 di pemeran lain (nama pemeran diganti), masalah V31 dan V32 di pemeran lain, dan salinan proyek dengan id lain. Tiga yang terakhir menghasilkan GAGAL dengan jumlah pelanggaran yang sama persis dengan kejadian KNOWN ISSUE di kode asli (510 sentuhan, 29 kejadian gerak), tanpa satu pun baris KNOWN ISSUE di proyek baru. Proyek tanpa karakter natural atau tanpa KNOWN ISSUE melewatinya dengan alasan.
- **12 unit test** (`tests/engine/pose.test.js`): `poseProbe` tidak mengubah gambar, gerak klasik tidak diukur, data pose cocok dengan piksel tangan dan sepatu, invarian tulang di banyak ukuran karakter, soket cocok dengan piksel sepeda dan bangku, `layoutAt` sama dengan `render()`, spesifisitas pengecualian `motion-stable`, status KNOWN ISSUE (dalam batas, memburuk, tidak lagi terjadi, usulan), KNOWN ISSUE tidak berlaku untuk pemeran, frame, sentuhan, status, sendi, jenis, atau proyek lain, TIDAK DIPERIKSA bila tidak ada pose natural (KNOWN ISSUE proyek ikut TIDAK DIPERIKSA), dan daftar KNOWN ISSUE yang sempit dengan batas, jumlah kejadian, dan status persetujuan yang dikunci tes.

### Temuan

- V29 (Sedang): kedua tangan pengayuh melayang 6 piksel art di atas setang di `character-lab` (frame 108-236, 129 frame, 258 sentuhan). Project B sama, tetapi tidak diperiksa otomatis karena gerak klasik.
- V30 (Rendah): ujung lengan jauh penyapu berhenti 3 piksel sel dari tangan jauh (252 sentuhan).
- V31 (Rendah, KNOWN ISSUE sementara): lutut dan siku berkedip 1 piksel selama 1 frame karena pembulatan (19 kejadian dari 4 karakter).
- V32 (Rendah, KNOWN ISSUE sementara): lutut anak sekolah bergetar di ujung ayunan kaki (10 kejadian di frame 147, 162, 180, 290, 308, 350).

### Bukti

- Render tidak berubah: render `main@18d7a32` di clone terpisah dan render branch dibandingkan per file, 1.320 PNG dengan 0 berbeda. Keempat MP4 identik byte (`819e48df...`, `aa188168...`, `756f7d87...`, `28e9a3a3...`). Di Node, 9.360 gambar karakter, sepeda, dan bangku identik sel demi sel dengan kode `main`, termasuk 3.615 gambar yang diulang setelah `poseProbe`. Badan 24 fungsi dan blok klasik serta jalur render dibandingkan teksnya dengan `main` dan hasilnya sama.
- Hasil uji: `npm test` 13/13 langkah tanpa kegagalan (9 LULUS, 4 validasi tanpa kegagalan dengan KNOWN ISSUE atau tidak diperiksa); lint lulus (90 file JavaScript, 29 JSON, 10 pemeriksaan registry), unit test 103/103 (91 lama + 12 baru), penjaga baseline 3/3, `build:all` 4/4, validasi `character-lab` tanpa kegagalan (43 lulus, 4 KNOWN ISSUE, dari 47), A (39 lulus, 5 tidak diperiksa, dari 44), B (36 lulus, 5 tidak diperiksa, dari 41), prototipe (32 lulus, 5 tidak diperiksa, dari 37), uji negatif `character-lab` 61/61, A 35/35, B 41/41, regresi 38/38 (empat proyek identik piksel dan byte), regresi B vs `tahap-3` 11/11, uji antar-proyek 22/22, lab zoom 10/10, `test:ci` lulus (uji asap 4/4), `build:prototype` lulus. Folder sementara uji tidak bertambah. `demo:character` yang dijalankan di salinan menghasilkan MP4 dan dua PNG pembanding yang identik byte dengan yang ter-commit, dengan angka yang sama: gerak klasik 98/98 langkah meluncur (rata-rata 5,4 px), gerak natural 0/97.
- **Audit pasca-merge** (read-only, clean clone `main@0f2b33d`): parent merge commit adalah `18d7a32` dan `7d77769`, dan tree-nya identik dengan head PR. CI push di `0f2b33d` hijau di kedua job ("Lint, unit test, validasi konfigurasi" dan "Uji asap render dan lab zoom"). `build:all` 4/4, `npm test` 13/13 langkah tanpa kegagalan (lint lulus, unit test 103/103, penjaga baseline 3/3, validasi sama dengan hasil di branch, uji negatif 61/61, 35/35, 41/41, regresi 38/38, uji antar-proyek 22/22, lab zoom 10/10), regresi B vs `tahap-3` 11/11, `test:ci` lulus, `build:prototype` lulus, dan demo tetap mencatat langkah meluncur gerak klasik 98/98 dan gerak natural 0/97. Render ulang dibanding render `main@18d7a32`: 1.320 PNG, 0 berbeda. MP4 keempat proyek identik byte dengan yang ter-commit, juga setelah seluruh rangkaian uji. Tujuh file di `tests/baselines/` sama dengan `18d7a32`, penjaga 3/3 vs `origin/main` dan vs `18d7a32`. Kode klasik dan jalur render tidak berubah. KNOWN ISSUE V29-V32 berstatus disetujui dengan batas 6, 3, 1, dan 1 px dan jumlah 258, 252, 19, dan 10 seperti tercatat; pemeran yang diganti nama dan salinan proyek tetap GAGAL (510 dan 29 pelanggaran). Laporan ter-commit hanya berbeda cap waktu dan durasi dari hasil clean clone. Dua temuan ada di dokumentasi: status PR D masih tertulis "belum di-merge" atau "menunggu review" di tujuh tempat (CLAUDE.md, README, ARCHITECTURE, BACKLOG, CHANGELOG), dan CLAUDE.md masih menyebut BACKLOG `V1-V28` padahal isinya sudah V1-V32. Keduanya diperbaiki lewat koreksi dokumentasi susulan, tanpa perubahan kode, uji, konfigurasi, baseline, atau render. Belum diverifikasi di audit ini: isi ruleset `main` (26005617) dan branch historis (26006150), karena tidak dibaca ulang lewat API; penolakan push nyata oleh ruleset (T18); dan proses uji yang dimatikan paksa.

### Batas

- Belum dicakup: gerak klasik, panjang kaki duduk dan mengayuh serta kaki bersarung (bentuk Tahap 3, V19 dan V27), dan entitas berskala lebih dari 1.
- Pemeriksaan bergantung pada data yang dicatat kode gambar itu sendiri. Kecocokannya dengan piksel dibuktikan unit test untuk tangan, sepatu, dan soket, tidak untuk setiap sendi.

## Baseline resmi `character-lab` versi `tahap-5` (PR C, PR #12, branch `baseline-character-lab-tahap-5`)

Disetujui dan diperintahkan pemilik pada 28 Oktober 2026, lalu di-merge ke `main` lewat PR #12 (merge commit `09d68e9`, 29 Oktober 2026 05.54 +07:00, atau 28 Oktober 22.54 UTC). Bukan tahap baru. Hasil render, mesin, aset, konfigurasi, workflow CI, dan MP4 tidak berubah. Panduan: [`BASELINES.md`](BASELINES.md).

- **Baru**: `tests/baselines/character-lab.tahap-5.json` (360 frame, mesin 0.5.0), direkam lewat `npm run baseline` dari render ulang dengan kode `main@e6926d2` (merge PR #9), dan blok `character-lab` di `registry.json` dengan versi resmi `tahap-5` serta teks persetujuan pemilik. MP4-nya identik byte demi byte dengan `output/video/character-lab.mp4` di `e6926d2`.
- **Perlindungan regresi**: lewat mekanisme yang sudah ada, tanpa mengubah kode uji. `npm run test:regression` dan uji asap CI membaca semua proyek di registry, jadi `character-lab` kini ikut dicocokkan piksel demi piksel.
- **Dipertahankan**: baseline Project A, Project B (`tahap-3`, `tahap-4`), prototipe, dan `pending-changes.json` tidak berubah (SHA-256 sama). Proyek baru tanpa versi sebelumnya tidak butuh entri pending.
- **Bukti**: render dari clone `e6926d2` dan dari `main@7e52ae1` identik di 360/360 frame (piksel dan byte PNG), frame hasil decode, dan MP4 (`819e48df...`). `--dry-run` lulus sebelum perekaman. Di salinan repository, palet pagi `character-lab` yang digeser satu nilai (`figureLight` `#f6e6dc` ke `#f6e6dd`) ditolak uji asap (frame 0 dan 120) dan regresi (131 frame berbeda tanpa deklarasi, MP4 berbeda), sedangkan tiga proyek lain tetap lulus. Hasil uji: lint lulus (29 JSON, 10 pemeriksaan registry), unit test 91/91, penjaga baseline 3/3 (vs `main` dan vs `e6926d2`, file baru terdeteksi sebagai tambahan), `build:all` 4/4, `npm test` 13/13 langkah, regresi 38/38 (empat proyek identik piksel dan byte), regresi B vs `tahap-3` 11/11, uji asap 4/4, `build:prototype` lulus, lab zoom 10/10.
- **Audit pasca-merge** (read-only, clean clone `main@09d68e9`): isi merge sama dengan head PR (tree identik) dan kode render tidak berubah sejak `e6926d2`. CI push di `09d68e9` hijau di kedua job, termasuk uji asap 4/4 (`character-lab` identik dengan `tahap-5`) dan lab zoom 10/10. Lint lulus, penjaga baseline 3/3 vs `7e52ae1` dan vs `e6926d2`, SHA-256 kelima file baseline cocok dengan registry, dan setiap file baseline hanya punya satu commit di riwayat Git, yaitu commit pembuatnya. `build:all` 4/4 (validasi `character-lab` 38/38, A 39/39, B 36/36, prototipe 32/32), `npm test` 13/13 langkah (unit test 91/91, uji negatif 42/42, 35/35, 41/41, regresi 38/38, antar-proyek 22/22, lab zoom 10/10), regresi B vs `tahap-3` 11/11, `test:ci` lulus, `build:prototype` lulus. MP4 keempat proyek dan lembar cuplikan hasil render ulang identik byte dengan yang ter-commit. Kontrol negatif di salinan sekali pakai: file baseline yang diubah bersama hash registry-nya lolos lint tetapi ditolak penjaga, sedangkan file yang diubah tanpa memperbarui registry ditolak lint. Ruleset `main` (26005617) dan branch historis (26006150) tetap aktif dan tidak berubah. Belum diuji: penolakan push nyata oleh ruleset (T18).

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
