# Arsitektur Pixel History Studio

Dokumen ini menjelaskan cara mesin animasi bekerja sejak Tahap 3 (mesin reusable untuk banyak proyek), termasuk kamera pixel-perfect Tahap 4 dan gerak serta pencahayaan karakter Tahap 5. Panduan praktis membuat proyek baru ada di [`REUSABILITY_GUIDE.md`](REUSABILITY_GUIDE.md).

## Status saat ini

| Hal | Kondisi |
|-----|---------|
| Versi mesin | 0.5.0 (`config/engine.json`): Tahap 5, gerak dan pencahayaan karakter, di-merge lewat PR #9 (`e6926d2`). Tahap 4 (0.4.0) masuk lewat PR #4, Tahap 3 (0.3.0) lewat PR #3 |
| Proyek | `night-to-dawn` (Project A, adegan kustom), `old-town-morning` (Project B, adegan tersusun), `train-night-rain` (prototipe Tahap 1, format satu adegan), `character-lab` (demo Tahap 5, adegan tersusun) |
| Katalog aset | 20 jenis di `src/assets/catalog.json` (4 aset gaya Tahap 2 + 16 aset entitas, termasuk pola kalibrasi `calibration-grid`). Tahap 5 tidak menambah jenis; `rig-character` mendapat pilihan `motion`, pose lengan, dan `light` |
| Jenis kamera | `keys`, `follow-entity`, `follow`, `speed`, ditambah lensa `scene.lens` untuk adegan jenis apa pun |
| Mode zoom (`rendering.zoomMode`) | `anchored` (bawaan), `steps`, `nearest` (cara Tahap 3) |
| Transisi | `cut`, `dissolve`, `portal` |
| Baseline regresi | Versi per proyek di `tests/baselines/registry.json` ([`BASELINES.md`](BASELINES.md)). Resmi: Project A dan prototipe `tahap-2` (`main@cfed35a`), Project B `tahap-4` (`main@a1fd4a1`, perubahan 124 frame Tahap 4 yang disetujui pemilik), demo `character-lab` `tahap-5` (`main@e6926d2`). Historis: Project B `tahap-3` (`main@9d7a144`). File baseline tidak pernah diubah; perubahan yang disengaja dicatat di `tests/baselines/pending-changes.json` dan versi baru dibuat lewat `npm run baseline` setelah pemilik menyetujui |
| Proteksi branch | Ruleset GitHub aktif untuk `main` (26005617: wajib PR, hanya merge commit, dua check CI wajib, tidak boleh dihapus atau force push) dan branch `tahap-1` sampai `tahap-5` (26006150, pola `tahap-[1-4]-*` dan `tahap-5-*`: tidak boleh dihapus atau force push). Konfigurasi terverifikasi lewat API GitHub; penolakan push nyata belum diuji. Detail: [`BASELINES.md`](BASELINES.md), BACKLOG T18 |
| Keterbatasan yang diketahui | [`BACKLOG.md`](BACKLOG.md), termasuk V23 (dua ukuran piksel di zoom pecahan), V24 (warna baru dari lapisan semi-transparan), V25 (batas antar lapisan memotong piksel art), V26-V28 (batas gerak dan cahaya karakter Tahap 5), T13 (deteksi tokoh "pop"), dan T19 (cakupan pemeriksaan gerak) |

## Gambaran besar

```
config/engine.json ─┐                                         ┌─ src/engine (mesin inti, sama untuk semua proyek)
src/assets/catalog.json ─┤                                    │    film.js ── schedule.js (adegan/transisi per frame)
                        ├─► src/render/projects.cjs ──► browser ─┤         ├── registry.js (aset dari katalog)
config/<proyek>.json ───┘   (project loader + validasi)  (Chromium)│         ├── composer.js (adegan tersusun dari data)
  + file $include                                             │         ├── entities.js, tracks.js, camera.js
                                                              │         ├── environment.js, palette.js
                                                              │         ├── transitions.js, presenter.js
                                                              │         └── pixel.js, random.js, math.js
                                                              └─ src/assets/** dan src/scenes/** (pustaka bersama)
   ──► PNG per frame ──► FFmpeg (H.264) ──► MP4 + manifest render
   ──► validate.cjs, negative-tests.cjs, regression.cjs, project-tests.cjs ──► laporan di output/reports/
```

Tiga lapisan dipisah dengan tegas:

| Lapisan | Folder | Isi | Tahu tentang cerita? |
|---------|--------|-----|----------------------|
| Mesin inti | `src/engine/` | timeline, jadwal adegan, kamera, easing, lapisan, entitas, registry aset, transisi, palet, acak deterministik, penyaji frame | Tidak sama sekali |
| Pustaka aset dan adegan | `src/assets/`, `src/scenes/` | gambar prosedural: kereta, ruko, karakter rig, pohon, langit, dan adegan kustom Tahap 2 | Hanya tentang bentuk benda, bukan cerita |
| Proyek | `config/<proyek>.json` (+ folder `config/<proyek>/`) | judul, durasi, palet, daftar aset, set, pemeran, adegan, kamera, transisi | Ya, di sinilah ceritanya |

Kode browser (`src/engine`, `src/assets`, `src/scenes`) adalah ES module `.js`. Kode Node (`src/render`) adalah CommonJS `.cjs`. `npm run lint` memeriksa aturan ini, melarang `Math.random()`/`Date` di kode browser, dan memastikan `src/engine` tidak mengimpor aset atau menyebut nama jenis aset mana pun.

## Konfigurasi berlapis

| Lapisan konfigurasi | File | Isi |
|---------------------|------|-----|
| Mesin global | `config/engine.json` | daftar katalog aset, jenis transisi, easing, jenis kamera, anchor, default rendering dan encoding, batas validasi |
| Katalog aset | `src/assets/catalog.json` | setiap jenis aset: modul JS, kategori, skema parameter, status animasi, kunci palet yang dibutuhkan |
| Proyek | `config/<proyek>.json` | `id`, `name`, `title`, `seed`, resolusi, `aspectRatio`, `fps`, `durationSeconds`, `rendering`, `output`, `encoding`, `palettes`, `assets`, `stages`, `cast`, `environment`, `lighting`, `cameraTracks`, `timeline`, `validation` |
| Adegan | entri `timeline.scenes` (boleh file terpisah lewat `$include`) | `id`, `name`, `module`, `start`, `end` (detik), `stage`, `cast`, `entities`, `camera`, `transitionOut` |

Semua daftar jenis (transisi, easing, kamera, aset) punya satu sumber: `engine.json` dan `catalog.json`. Node dan browser membaca data yang sama, jadi tidak ada lagi daftar yang ditulis dua kali (backlog T4).

`{ "$include": "folder/file.json" }` di mana pun dalam file proyek diganti dengan isi file itu (jalur relatif terhadap file yang memanggil, tidak boleh keluar dari repository). Palet boleh mewarisi palet lain dengan `"extends": "<nama palet>"`.

## Project loader (`src/render/projects.cjs`)

1. Menemukan proyek: setiap file `config/*.json` yang punya `id` (kecuali `engine.json`). `--project <id>` atau jalur file JSON.
2. Membaca file dan menyelesaikan semua `$include`.
3. Memeriksa pengaturan proyek: resolusi 16:9, skala output bilangan bulat, `fps x durationSeconds` menjadi frame bulat, mode upscale, encoding.
4. Memeriksa timeline dan seluruh isi proyek lewat `timeline.cjs` dan `schema.cjs` (lihat di bawah).
5. Menghasilkan konfigurasi lengkap: `totalFrames`, `frameSize`, `timeline` yang sudah dinormalisasi ke frame, daftar file `$include`, jalur output.

Jika proyek tidak diisi atau tidak ditemukan, semua perintah menampilkan daftar proyek yang tersedia.

## Timeline dan aturan waktu

- Durasi ditulis dalam detik lalu diubah menjadi frame bulat. Nilai yang tidak pas (misalnya 0,01 detik pada 30 FPS) ditolak, bukan dibulatkan diam-diam.
- Adegan memakai interval setengah terbuka `[startFrame, endFrame)`: frame awal ikut, frame akhir tidak. Adegan 0-120 berisi frame 0 sampai 119, adegan berikutnya mulai tepat di 120.
- Adegan harus berurutan tanpa celah, tanpa tumpang tindih, dan menutup seluruh durasi film.
- Transisi ditulis sebagai `transitionOut: { type, start, duration, params }` (detik). Hasilnya `startFrame`, `endFrame` (tidak ikut), `lastFrame`, dan `durationFrames`. Rentangnya harus melewati batas adegan dan tidak boleh bertumpuk.
- Keyframe: `[[frame, nilai, easing?], ...]`, frame berurutan naik dan berada di dalam film. Easing ditulis di key tujuan.

`src/engine/schedule.js` menjawab "frame ini milik adegan atau transisi mana" untuk setiap frame. Di transisi, `p = 0` di frame pertama dan `p = 1` di frame terakhir.

## Validasi skema (`src/render/schema.cjs`, `timeline.cjs`)

Sebelum render, loader menolak (dengan pesan berbahasa Indonesia, semua kesalahan sekaligus):

- ID adegan ganda, celah, tumpang tindih, durasi tidak valid atau tidak bulat, adegan terakhir tidak menutup film
- aset, jenis aset, lapisan, stage, pemeran, induk entitas, entitas yang diikuti kamera, atau track kamera yang tidak ada; rantai induk berputar
- parameter aset/entitas yang tidak dikenal, salah tipe, atau di luar batas (dari skema katalog)
- keyframe tidak berurutan, di luar durasi, atau easing tidak dikenal
- status animasi/warna yang tidak dimiliki aset, `paramTracks` untuk parameter yang tidak bisa dianimasikan
- skala entitas bukan bilangan bulat (grid piksel rusak), zoom di luar 1..4, zoom kamera tanpa mode upscale `browser`
- palet yang kurang warna untuk aset yang tampil, jenis transisi tidak dikenal, transisi yang tidak melewati batas adegan, nama efek salah ketik

## Mesin film (`src/engine/film.js`)

`createFilm(config)`:

1. `registry.js` memuat hanya modul aset yang jenisnya dipakai proyek (lewat katalog), lalu membuat setiap aset sekali dan membagikannya ke semua adegan.
2. `environment.js` membuat track lingkungan bebas dari bagian `environment` (misalnya `daylight`, `rain`). Mesin tidak tahu arti nilainya; aset yang membaca yang menentukan.
3. Setiap adegan dibuat dari modulnya: `compose` (adegan tersusun bawaan mesin) atau modul kustom di `src/scenes/`.
4. `render(ctx, frame)` menggambar satu frame dari nol berdasarkan nomor frame saja. Tidak ada keadaan yang dibawa antar frame, jadi frame bisa dirender dalam urutan apa pun.

## Sistem entitas (`src/engine/entities.js`)

Entitas = objek yang ditempatkan dan dianimasikan di adegan (karakter, ruko, pohon, sepeda, awan, lampu). Satu entitas memakai satu aset.

| Field | Arti |
|-------|------|
| `id`, `asset`, `layer` | identitas, aset yang dipakai, lapisan gambar |
| `position`, `motion: { x, y }` | posisi dunia dan gerak keyframe |
| `anchor` | titik tumpu: `bottom-center`, `top-left`, ... |
| `visible`, `state`, `color`, `flip`, `frame` | nilai tetap atau keyframe bertangga (status animasi, status warna, cermin, pilihan sprite atau `{ cycle: { fps, count } }`) |
| `parent` | entitas induk (posisi ikut induk), misalnya pengendara di atas sepeda |
| `params`, `paramTracks` | parameter tampilan tetap dan parameter animasi (menimpa default aset) |
| `scale`, `z` | skala bilangan bulat, urutan dalam lapisan |

`stateAt(frame, time)` menghitung semuanya langsung dari frame global, termasuk rantai induk dan kecepatan (`speedX`). Unit test membuktikan hasilnya sama walau frame dihitung dengan urutan acak.

Kontrak aset entitas:

```js
export const assetTypes = {
  'nama-jenis': {
    create(def, ctx) {                    // def = definisi aset dari proyek, ctx = { film, key, registry, seed, width, height }
      return {
        defaultState: 'idle',
        size(e, fc) { return { w, h }; }, // ukuran lokal (untuk anchor)
        draw(ctx, e, fc) { ... },         // menggambar di koordinat lokal (0,0 = pojok kiri atas)
        identityColors() { return ['#rrggbb', ...]; }   // opsional, untuk uji konsistensi
      };
    }
  }
};
```

`e` berisi keadaan entitas (`state`, `color`, `params`, `worldX`, `time`, `local` = bagian lokal yang terlihat di layar, `layer`). `fc` (frame context) berisi `frame`, `time`, `fps`, `env`, `pal` (palet aktif), `camera`, `width`, `height`, `seed`, `scene`.

## Adegan tersusun (`src/engine/composer.js`)

Adegan dengan `"module": "compose"` dibangun sepenuhnya dari data, tanpa kode:

- `stages[<id>]`: set lingkungan berisi `layers` (`id`, `parallax`, `parallaxY`, `sortByY`) dan `entities` tetap (langit, ruko, lampu)
- `cast`: pemeran proyek yang bisa tampil di banyak adegan; `scene.cast` memilih siapa yang tampil
- `scene.entities`: entitas khusus adegan itu
- `scene.camera`: kamera langsung atau `{ "track": "<id>" }` dari `cameraTracks`
- `lighting`: `{ from, to, track, steps }` = palet berubah bertahap (palette ramp) mengikuti track lingkungan

Lapisan digambar dari jauh ke dekat. Setiap lapisan bergeser `kamera x parallax` (dibulatkan ke piksel). Di dalam lapisan, entitas diurutkan menurut `z`, lalu posisi y bila `sortByY`, lalu urutan definisi.

## Karakter rig (`src/assets/characters/`)

Satu aset `rig-character` untuk semua warga: tubuh disusun dari bagian (kaki, badan, lengan, kepala, rambut, topi, aksesori) lalu diberi pose menurut status (`idle`, `stand`, `walk`, `seated`, `gesture`, `cycle`, `sweep`) dan parameter animasi (`headTurn`, `gesture`). Tahap 5 menambah dua pilihan yang tidak mengubah karakter lama:

| Pilihan | Bawaan | Isi |
|---------|--------|-----|
| `motion` | `classic` = gerak Tahap 3, tidak diubah satu panggilan gambar pun (Project B tetap identik piksel dan byte) | `natural` = gerak Tahap 5 (`gait.js`) |
| `light` | tidak ada = warna tetap seperti ditulis | `"<awalan>"` = warna mengikuti palet pencahayaan (`lighting.js`) |
| `frontArm`, `backArm`, `armSwing` | `auto`, `auto`, 1 | pose lengan dekat/jauh dan besar ayunan (hanya `natural`) |
| `lightDirection`, `lightTrack` | 0 | arah cahaya tepi: angka -1..1 (bisa `paramTracks`) atau nama track `environment` |

Semua pilihan bisa ditulis di aset atau ditimpa per entitas lewat `params`.

### Gerak natural (`gait.js`, fungsi murni)

- **Siklus jalan 8 fase** (kontak, tumpu, lewat, dorong, dua kali). Fase dihitung dari jarak tempuh (`worldX x arah`), sama seperti Tahap 3, jadi kecepatan yang berubah tidak membuat kaki meluncur.
- **Telapak menempel di tanah.** Tabel Tahap 3 menggeser telapak 8 piksel per setengah siklus, padahal tubuh maju `strideLength / 2` (15 piksel untuk Pak Darto), jadi telapak ikut terseret. Versi natural menghitung titik tapak setiap langkah di dunia (`(langkah + offset) x siklus + jangkauan`), lalu posisi lokalnya dibulatkan dari posisi dunia: `dx = arah x (round(arah x tapak) - round(worldX))`. Selama menapak, kolom dunia telapak tidak berubah sama sekali. Kaki yang melayang bergerak dari titik tapak lama ke titik tapak baru dengan `smoothstep` dan lengkung `sin`, jadi di dunia telapak tidak pernah mundur.
- **Jangkauan langkah** = `strideLength / 4`, dibatasi 45% panjang kaki. Bila dibatasi, siklus memendek (langkah lebih rapat).
- **Lutut dan siku** = dua tulang (`twoBone`): lutut menekuk ke depan, siku ke belakang/bawah. Lengan saat berjalan memakai sudut (`armFromAngles`): lengan atas berayun ±30 derajat x `armSwing`, siku menekuk 10 derajat di belakang sampai 44 derajat di depan. Duduk, mengayuh, dan menyapu memakai target tangan (pangkuan/koran, setang, gagang sapu).
- **Sinkron**: ayunan lengan dekat = `-cos(2 pi u)` dari fase yang sama dengan kaki. Saat kaki dekat menapak di depan (fase 0), lengan dekat di belakang; setengah siklus kemudian sebaliknya.
- **Naik-turun tubuh**: pinggul turun paling banyak 1 piksel (60% dari turunnya pinggul secara geometri) di sepertiga langkah sekitar kontak. Bila jendela itu kurang dari 2 frame (karakter sangat cepat, dari `speedX`), pinggul tidak diturunkan, supaya tidak muncul sebagai getar 1 frame.
- **Skala entitas**: komposer meneruskan `scale` ke aset; gait menghitung dalam satuan lokal. Di skala 1 telapak menapak tepat di piksel dunia yang sama; di skala lebih dari 1 sisa pembulatannya paling banyak skala-1 piksel dunia (V27).

### Pencahayaan karakter (`lighting.js`)

Bila `light` diisi, palet adegan wajib punya `<awalan>Light`, `<awalan>Lift`, `<awalan>Rim` (diperiksa validator lewat jenis parameter `paletteKey` dengan akhiran). Karakter digambar dulu dengan warna dasar ke **penyangga piksel** (objek JavaScript biasa yang meniru `fillRect`, `fillStyle`, `pixelView`), lalu setiap piksel diwarnai:

- warna = `screen(warna dasar x Light, Lift)`, dibulatkan per kanal;
- piksel siluet yang tetangganya di sisi cahaya kosong mendapat tambahan `Rim` (cahaya tepi). Sisinya = `sign(lightDirection) x (flip ? -1 : 1)`, atau atas bila |arah| < 1/3;
- hasilnya ditulis ke kanvas sebagai potongan baris berwarna sama lewat `rect()`, jadi view, cermin, skala, dan lapisan zoom tetap sama dengan gambar langsung.

Pewarna disimpan per objek palet (tangga palet memberi objek yang sama untuk anak tangga yang sama), jadi warna hanya bergantung pada palet frame itu: deterministik, dan berubah searah sepanjang tangga palet (unit test memeriksa tidak ada warna yang bolak-balik). Tanpa `light`, karakter digambar langsung tanpa penyangga seperti sebelumnya.

`identityColors(fc)` mengembalikan warna identitas yang sudah diterangi palet frame `fc`, sehingga aturan `validation.consistency` tetap berlaku untuk karakter yang warnanya berubah bersama cahaya.

### Data gerak untuk pengujian (`motionProbe`)

Aset boleh menyediakan `motionProbe(keadaan)` (tanpa menggambar). Rig mengembalikan telapak yang sedang menapak (`foot`, nomor langkah, kolom dunia) dan turunnya pinggul saat berjalan, dengan tanda `strict` untuk gerak natural. Komposer menyediakan `entitiesAt(frame)` dan `paletteAt(frame)`; `runtime.js` mengumpulkannya lewat `inspect.motionProbes(awal, jumlah)` dan `inspect.identityColors(kunci, frame)`. Keduanya generik: mesin tidak menyebut jenis aset mana pun.

## Kamera (`src/engine/camera.js`)

| Jenis | Isi |
|-------|-----|
| `keys` | `x`, `y`, `zoom` berupa keyframe (pan, crane, push-in, pullback) |
| `follow-entity` | mengikuti entitas: `entity`, `screenX` (angka atau keyframe), `smoothing` (rata-rata bergerak N frame), `y`, `zoom` |
| `follow`, `speed` | kamera film kereta Tahap 2 (mengikuti titik kepala target dari adegan kustom) |

Semua jenis adalah fungsi murni dari nomor frame. `smoothing` dihitung dari posisi entitas di frame-frame sebelumnya, bukan dari keadaan yang disimpan.

## Penyaji frame dan zoom tajam (`src/engine/presenter.js`, `src/engine/pixel-grid.js`)

| Mode `rendering.upscale` | Cara kerja | Dipakai |
|--------------------------|-----------|---------|
| `ffmpeg` (bawaan) | browser menyimpan PNG 480x270, FFmpeg memperbesar 4x nearest neighbor | Project A, prototipe |
| `browser` | dunia tetap digambar di 480x270, lalu browser memperbesarnya ke 1920x1080 sesuai zoom kamera dan `rendering.zoomMode` | Project B (kamera zoom) |

### Masalahnya (V14)

Satu piksel art = 4 x zoom piksel layar. Kalau 4 x zoom bukan bilangan bulat (misalnya zoom 1,1 = 4,4 piksel), mustahil semua piksel art berukuran sama tanpa blur: sebagian harus 4 piksel, sebagian 5. Cara Tahap 3 (`drawImage` nearest biasa) menentukan kolom mana yang 5 piksel dari posisinya di **layar**. Setiap kali kamera bergeser 1 piksel art atau zoom berubah, pola 4/5 ikut bergeser di atas gambar, sehingga garis tampak "merayap". Lab zoom mengukur 43,9% kolom berganti ukuran setiap frame saat kamera geser di zoom 1,1.

### Mode zoom

| Mode | Cara kerja | Hasil ukur lab zoom |
|------|-----------|---------------------|
| `nearest` | cara Tahap 3, dipertahankan untuk kompatibilitas | crawl 43,9%, 18.902 piksel bolak-balik ukuran saat zoom |
| `steps` | zoom dibulatkan ke ukuran piksel bulat terdekat (kelipatan 0,25) | grid selalu seragam, tetapi zoom melompat (lompatan skala 0,97 px per piksel art, galat 0,5) |
| `anchored` (bawaan) | ukuran piksel menempel pada gambar setiap lapisan, bukan pada layar | crawl 0%, 0 bolak-balik, gerak kaku, lompatan 0,007 |

Varian `anchored` dengan satu kanvas (`rendering.zoomLayers: false`, hanya untuk diagnosis) masih merayap 42,8%, karena lapisan parallax bergeser dengan kecepatan berbeda. Itulah alasan pemetaan dilakukan per lapisan.

### Cara kerja `anchored`

Untuk setiap sumbu (`pixel-grid.js`, fungsi murni yang diuji langsung di Node):

1. Ukuran sel rata-rata `4 x zoom` dipecah menjadi bagian bulat `c` dan pecahan `f` (zoom 1,1: c = 4, f = 0,4).
2. Setiap kolom **dunia** `j` (kolom kanvas + geseran lapisan) punya peringkat tetap `frac(j x 0,618...)` (urutan golden ratio, tersebar merata). Kolom dengan peringkat < `f` mendapat `c + 1` piksel, sisanya `c`. Untuk sumbu y dipakai pengali lain (0,414...).
3. Posisi di layar dihitung bertumpuk dari pusat layar ke kiri dan ke kanan, jadi kolom bersambung tanpa celah dan pusat zoom tetap.

Akibatnya:

- **Kamera geser**: kolom dunia membawa ukurannya, jadi semua piksel satu lapisan bergeser sama jauh (gerak kaku, tidak merayap).
- **Zoom naik**: kolom tumbuh dari `c` ke `c + 1` satu per satu menurut peringkatnya, masing-masing tepat sekali per level, tanpa bolak-balik. Karena sebarannya merata, skala yang tampak mengikuti zoom yang diminta dengan galat di bawah 0,01 piksel per piksel art.
- **Zoom kelipatan 0,25** (1; 1,25; 1,5; 1,75; 2; ...): `f = 0`, semua piksel berukuran sama persis, dan penyaji memakai satu `drawImage` yang identik dengan cara Tahap 3.
- **Zoom pecahan**: satu frame tetap berisi dua ukuran berdampingan (`c` dan `c + 1`). Ini batas matematis tanpa blur, tetapi polanya stabil.

Penggambaran: setiap lapisan diperbesar dalam dua tahap (kolom lalu baris) dengan potongan berfaktor bulat. Setiap piksel layar diambil dari tepat satu piksel art per lapisan, tanpa interpolasi, jadi tidak ada blur atau anti-aliasing. Pada pola kalibrasi lab zoom yang seluruhnya opak, hasilnya 0 piksel asing. Untuk lapisan semi-transparan, lihat batas di bawah.

### Batas yang diketahui (audit final PR #4)

Dua batas ini ditemukan saat audit final, dengan membandingkan render Project B mode `anchored` dan render Tahap 3 frame demi frame. Keduanya hanya muncul di zoom pecahan mode `anchored` per lapisan. Zoom kelipatan 0,25, mode `nearest`, dan upscale `ffmpeg` tidak terdampak.

**Warna baru dari lapisan semi-transparan (V24).** Di zoom pecahan, setiap lapisan digambar ke kanvas transparan sendiri, lalu diperbesar dan digabung di resolusi layar. Di Tahap 3, semua lapisan digabung lebih dulu di resolusi art. Bentuk semi-transparan (`globalAlpha`, misalnya berkas cahaya pagi dengan alpha 0,16) yang jatuh di bagian kosong kanvas lapisan disimpan sebagai warna semi-transparan 8-bit, lalu baru dicampur dengan lapisan di bawahnya. Pembulatannya berbeda dengan cara Tahap 3. Selain itu, lapisan cahaya punya grid sendiri, sehingga piksel cahaya bisa menimpa piksel lapisan bawah yang berbeda dengan di Tahap 3. Hasil ukur di Project B:

- 23 warna yang tidak pernah muncul di film Tahap 3, totalnya 139.375 piksel atau 0,0187% dari seluruh piksel film (360 frame).
- 21 warna hanya selisih 1 nilai per kanal dari warna Tahap 3 (efek pembulatan, tidak terlihat).
- 2 warna selisih 4-5 nilai, totalnya 11 piksel di frame 274 dan 285, di tempat tepi berkas cahaya memotong piksel karakter.
- Muncul di frame 85-118, 274, 285, dan 330-337.

Ini bukan blur atau anti-aliasing, karena tidak ada piksel yang dicampur dengan tetangganya. Yang berubah hanya pembulatan dan pasangan piksel saat warna semi-transparan bertumpuk. Lab zoom tidak menangkapnya karena pola kalibrasinya opak.

**Batas antar lapisan bisa memotong piksel art (V25).** Setiap lapisan dipetakan dengan grid miliknya sendiri, berdasarkan geseran parallax masing-masing. Lapisan dengan geseran sama (di Project B: `buildings`, `street`, `sidewalk`, `road`, semuanya parallax 1) memakai grid yang sama, jadi batasnya selalu sejajar. Lapisan dengan geseran berbeda punya batas piksel di posisi layar yang berbeda. Akibatnya, tepi objek di lapisan atas bisa jatuh di tengah piksel art lapisan bawah, dan sisa piksel art itu tampil sebagai potongan selebar 1-3 piksel layar. Di Tahap 3, tepi seperti itu selalu jatuh di batas piksel art karena penggabungan terjadi sebelum diperbesar, tetapi seluruh gridnya merayap. Paling terlihat saat lapisan `light` (parallax 0) di atas karakter (parallax 1), misalnya tepi berkas cahaya yang melintasi wajah karakter di frame 284-286. Ini bukan crawl. Di dalam satu lapisan semua piksel tetap bergerak kaku, dan gerak relatif antar lapisan memang gerak parallax-nya.

### Surface: lapisan untuk penyaji

Adegan menerima `shot.surface`. Bila `shot.surface.wantsLayers(zoom)` bernilai `true` (mode `anchored` dan zoom pecahan), adegan menggambar setiap lapisan ke kanvas transparan sendiri lewat `shot.surface.layer(geseranX, geseranY)`. Geseran itu sama dengan geseran parallax lapisan (`round(kamera x faktor)`).

- Adegan tersusun (`compose`) melakukannya otomatis untuk semua lapisan stage.
- Adegan kustom bisa ikut: Project A meneruskan fungsi `layer(faktorX, faktorY)` ke aset `countryside`, yang menggambar langit, gunung, bukit, kabut, pohon, tiang, rel/kereta, semak depan, dan hujan dekat ke lapisan masing-masing. Adegan kustom yang tidak memakai surface tetap jalan dengan satu kanvas (pola menempel layar), dan boleh mengembalikan `anchor: [x, y]`.
- Di zoom bulat atau mode lain, semua digambar ke satu kanvas seperti sebelumnya, jadi hasilnya tidak berubah.

### Lensa (`scene.lens`)

`"lens": { "zoom": [[frame, zoom, easing?], ...] }` di entri timeline memberi zoom tambahan pada adegan jenis apa pun, termasuk adegan kustom yang tidak punya kamera zoom sendiri. Butuh `rendering.upscale: "browser"`.

### Dither transisi selaras grid

Transisi `dissolve` dulu memakai pola dither bersel 4 piksel layar. Di zoom 1,25 (sel 5 piksel), satu piksel art terbelah 4+1. Sekarang pola dither mengikuti grid art adegan tujuan (`presenter.ditherGrid()`), jadi setiap piksel art tampil utuh dari salah satu adegan. Mode `nearest` tetap memakai pola lama.

### Kontrak `pixel.js`

Untuk adegan kustom, `pixel.js` tetap menyediakan *view* `{ s, ox, oy, flip }`: setiap bentuk digambar ulang pada posisi `o + posisi x s`, dibulatkan ke piksel (dipakai transisi portal Tahap 2). Zoom portal Project A memakai jalur ini dan tidak diubah di Tahap 4 (lihat V1 di backlog).

## Transisi (`src/engine/transitions.js`)

| Jenis | Cara kerja |
|-------|------------|
| `cut` | potong langsung di frame batas adegan |
| `dissolve` | larut berdither pola Bayer 4x4 (16 tingkat), mengikuti ukuran sel piksel penyaji agar tetap tajam |
| `portal` | adegan lama di-zoom ke sebuah "lubang" (jendela), adegan baru terlihat di dalamnya sampai memenuhi layar |

Aturan semua transisi: di `p = 0` hasilnya sama persis dengan adegan lama, di `p = 1` sama persis dengan adegan baru. Validator membuktikannya per byte.

## Adegan kustom (kontrak Tahap 2, tetap didukung)

```js
export function createScene({ film, scene, assets, environment }) {
  return {
    supportsPortal: true,          // opsional
    render(ctx, shot) { ... }      // shot = { frame, time, local, progress, portal?, surface?, lens }
  };                               // boleh mengembalikan { zoom, anchor: [x, y] }
}
```

Adegan kustom mengambil aset lewat `assets.pick(scene.assets, type)`. Project A (`night-to-dawn`) memakai tiga adegan kustom ini. `shot.surface` dan `shot.lens` dijelaskan di bagian penyaji frame.

## Pipeline render (`src/render/`)

| File | Tugas |
|------|-------|
| `cli.cjs` | argumen bersama: `--project`, `--scene`, `--frame`, `--frames a-b`, `--no-encode`, `--encode-only` |
| `render.cjs` | satu pipeline untuk semua proyek: film penuh, satu adegan, frame terpilih, rentang frame |
| `pipeline.cjs` | render frame lewat Playwright, encode H.264 (atomik: file `.partial` lalu ganti nama) |
| `manifest.cjs` | "struk" render: status `rendering` / `complete` / `failed` / `frames-only`, sidik jari konfigurasi, mesin, pustaka aset, frame, dan MP4 |
| `validate.cjs`, `checks.cjs`, `browser-checks.cjs` | validasi generik + laporan + lembar kontak |
| `negative-tests.cjs` | pengujian negatif per proyek |
| `regression.cjs`, `fingerprint.cjs` | uji regresi terhadap versi baseline resmi (atau historis dengan `--baseline <versi>`) |
| `baselines.cjs`, `baseline.cjs` | registry versi baseline dan pemeriksaannya; `npm run baseline` untuk melihat dan merekam versi baru |
| `baseline-guard.cjs` | penjaga baseline historis terhadap referensi tepercaya di Git (`npm run test:baseline-guard`) |
| `project-tests.cjs`, `sandbox.cjs` | uji antar-proyek (mesin bersama, isolasi di salinan repository) |
| `smoke.cjs`, `lint.cjs` | pemeriksaan ringan untuk CI |
| `zoom-tests.cjs` | lab zoom: mengukur semua mode zoom dengan pola kalibrasi, plus penerapan pada Project A |
| `zoom-demo.cjs` | bahan pembanding V14 (video dan gambar sebelum/sesudah) di `output/comparisons/` |
| `character-demo.cjs` | bahan pembanding V15/V16 dari proyek `character-lab` (sebelum = gerak klasik tanpa cahaya, sesudah = konfigurasi apa adanya) dan laporan ukur `output/reports/character-demo.md` |
| `build.cjs`, `test-all.cjs` | rangkaian render + validasi, dan seluruh pengujian |

Setiap frame dihitung dari waktu global `time = frame / fps` dan `seed` proyek. Karena tidak ada keadaan antar frame, render bisa dipecah per rentang (`--frames 0-119`, `--frames 120-239`, ...) dan hasilnya identik dengan render penuh. Ini dasar untuk render bersegmen/paralel di masa depan.

### MP4 lama tidak bisa "menolong" render yang gagal

`render.cjs` menulis manifest berstatus `rendering` sebelum mulai, `complete` setelah frame dan MP4 selesai, atau `failed` bila ada error. Validator hanya menerima MP4 bila manifest `complete` dan sidik jarinya masih cocok dengan konfigurasi proyek, mesin inti, pustaka aset, frame PNG, dan file MP4 saat ini. Pengujian negatif membuktikannya dengan sengaja menggagalkan render di salinan repository.

## Pengujian

| Perintah | Isi | Butuh render? |
|----------|-----|---------------|
| `npm run lint` | sintaks JS, JSON, determinisme, kemurnian mesin inti, file baseline cocok dengan registry | tidak |
| `npm run test:baseline-guard` | file baseline lama, versi registry, dan riwayat persetujuan sama dengan `origin/main` | tidak |
| `npm run test:engine` | unit test `tests/engine/*.test.js`: track, easing, PRNG, jadwal setengah terbuka, entitas (urutan bebas), kamera, registry, palet, loader dan skema, gerak dan pencahayaan karakter (`character.test.js`), registry dan penjaga baseline (`baselines.test.js`, folder sementaranya dihapus otomatis walau tes gagal) | tidak |
| `npm run test:smoke` | render beberapa frame per proyek, cocokkan dengan baseline | tidak (render kecil) |
| `npm run validate -- --project <id>` | validasi lengkap satu proyek (video, frame, transisi, adegan terpisah, konsistensi aset, gerak karakter, modul terisolasi, determinisme, manifest) | ya |
| `npm run test:negative -- --project <id>` | kesalahan yang disengaja harus ditolak | ya |
| `npm run test:regression` | setiap proyek identik dengan versi baseline resminya; `--project <id> --baseline <versi>` untuk versi historis | ya |
| `npm run test:projects` | mesin bersama, file konfigurasi terpisah, isolasi dua arah | ya |
| `npm run test:zoom` | lab zoom: 10 skenario (zoom bulat dan pecahan, geser horizontal/vertikal/diagonal, zoom masuk/keluar) x 4 pendekatan, plus Project A dengan lensa zoom | tidak (render kecil) |
| `npm test` | semua di atas | ya |

Teknik penting:

- **Kilatan dan potongan kasar**: statistik kecerahan (`signalstats`) tiap frame. Batasnya di `config/engine.json`.
- **Kesinambungan transisi**: frame pertama dan terakhir transisi dibandingkan per byte dengan render adegan tunggal.
- **Adegan terpisah**: frame di luar transisi dirender sebagai film utuh dan sebagai adegan tunggal, hasilnya harus identik.
- **Konsistensi aset**: aturan `validation.consistency` di proyek. `assetType` = semua adegan memakai satu aset berjenis itu; `asset` = warna identitas aset muncul di frame contoh. Sejak Tahap 5 warna identitas dihitung per frame dari palet adegan, jadi karakter yang diterangi palet pencahayaan ikut diperiksa dengan warnanya yang benar-benar tampil.
- **Gerak karakter** (Tahap 5): dari `motionProbe` setiap frame film. `motion-feet` = setiap telapak gerak natural diam di kolom dunia yang sama selama menapak (tidak meluncur); `motion-bob` = pinggul tidak bolak-balik dalam 1 frame (a, b, a) saat berjalan (tidak bergetar). Gerak klasik dilaporkan sebagai informasi (misalnya rata-rata meluncur per langkah) tetapi tidak diwajibkan, karena dipertahankan apa adanya untuk film lama. Uji negatif merusak kode gerak di salinan repository (telapak ikut terseret, pinggul bolak-balik) dan memastikan keduanya tertangkap.
- **Isolasi modul**: daftar file JS yang benar-benar diunduh browser. Project B tidak memuat satu pun modul kereta.
- **Determinisme**: seluruh frame dirender ulang di browser baru dengan urutan terbalik lalu dibandingkan per byte. MP4 di-encode ulang dan dibandingkan SHA-256-nya.
- **Grid piksel kamera**: setiap frame mencatat mode zoom, nilai zoom, dan geseran lapisannya di manifest render. Validator menghitung ulang ukuran setiap kolom/baris dunia dan menolak crawl (ukuran berubah padahal zoom tetap) serta piksel bolak-balik.
- **Lab zoom**: pola kalibrasi `calibration-grid` gaya `identity` memberi setiap piksel art warna unik (kolom, baris, lapisan), jadi ukuran, posisi, dan warna campuran bisa dibaca langsung dari gambar 1920x1080. Polanya opak, jadi efek lapisan semi-transparan (V24) dan potongan di batas lapisan yang tumpang tindih (V25) belum diukur di lab.
- **Perubahan terdeklarasi**: regresi membandingkan setiap proyek dengan versi baseline resminya. Frame di dalam rentang entri `tests/baselines/pending-changes.json` yang menunjuk versi itu (`against`) boleh berbeda tetapi dilaporkan "menunggu persetujuan"; frame di luar rentang wajib identik.
- **Versi baseline**: `tests/baselines/registry.json` mencatat SHA-256 setiap file baseline dan perubahan antar versi beserta bukti persetujuan. Lint dan regresi menolak file yang tidak cocok dengan hash registry, file yang tidak terdaftar, catatan perubahan yang tidak sama persis dengan isi file, dan entri pending yang menunjuk versi lama. Karena lint hanya melihat folder yang sama, `npm run test:baseline-guard` membandingkan file baseline lama, versi registry, dan riwayat `resolved` dengan `origin/main` (di CI: cabang tujuan PR), sehingga file yang diubah bersama hash registry-nya tetap tertangkap selama langkah penjaga di `ci.yml` tidak ikut diubah. Detail dan batasnya: [`BASELINES.md`](BASELINES.md).
