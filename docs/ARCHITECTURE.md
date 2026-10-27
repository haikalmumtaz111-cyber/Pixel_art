# Arsitektur Pixel History Studio

Dokumen ini menjelaskan cara mesin animasi bekerja sejak Tahap 3 (mesin reusable untuk banyak proyek). Panduan praktis membuat proyek baru ada di [`REUSABILITY_GUIDE.md`](REUSABILITY_GUIDE.md).

## Status saat ini

| Hal | Kondisi |
|-----|---------|
| Versi mesin | 0.4.0 (`config/engine.json`). Tahap 3 (0.3.0) ada di `main` lewat PR #3; Tahap 4 (kamera pixel-perfect) ada di branch `tahap-4-pixel-perfect-camera` |
| Proyek | `night-to-dawn` (Project A, adegan kustom), `old-town-morning` (Project B, adegan tersusun), `train-night-rain` (prototipe Tahap 1, format satu adegan) |
| Katalog aset | 20 jenis di `src/assets/catalog.json` (4 aset gaya Tahap 2 + 16 aset entitas, termasuk pola kalibrasi `calibration-grid`) |
| Jenis kamera | `keys`, `follow-entity`, `follow`, `speed`, ditambah lensa `scene.lens` untuk adegan jenis apa pun |
| Mode zoom (`rendering.zoomMode`) | `anchored` (bawaan), `steps`, `nearest` (cara Tahap 3) |
| Transisi | `cut`, `dissolve`, `portal` |
| Baseline regresi | `tests/baselines/`: Project A dan prototipe dari `main@cfed35a`, Project B dari `main@9d7a144` (referensi Tahap 3). Baseline tidak boleh diubah tanpa persetujuan pemilik; perubahan yang disengaja dicatat di `tests/baselines/pending-changes.json` |
| Keterbatasan yang diketahui | [`BACKLOG.md`](BACKLOG.md), termasuk V23 (dua ukuran piksel di zoom pecahan) dan T13 (deteksi tokoh "pop") |

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

Penggambaran: setiap lapisan diperbesar dalam dua tahap (kolom lalu baris) dengan potongan berfaktor bulat, jadi tidak ada piksel yang dicampur dan tidak ada warna baru (diukur: 0 piksel asing).

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
| `regression.cjs`, `fingerprint.cjs` | uji regresi terhadap baseline resmi `tests/baselines/` |
| `project-tests.cjs`, `sandbox.cjs` | uji antar-proyek (mesin bersama, isolasi di salinan repository) |
| `smoke.cjs`, `lint.cjs` | pemeriksaan ringan untuk CI |
| `zoom-tests.cjs` | lab zoom: mengukur semua mode zoom dengan pola kalibrasi, plus penerapan pada Project A |
| `zoom-demo.cjs` | bahan pembanding V14 (video dan gambar sebelum/sesudah) di `output/comparisons/` |
| `build.cjs`, `test-all.cjs` | rangkaian render + validasi, dan seluruh pengujian |

Setiap frame dihitung dari waktu global `time = frame / fps` dan `seed` proyek. Karena tidak ada keadaan antar frame, render bisa dipecah per rentang (`--frames 0-119`, `--frames 120-239`, ...) dan hasilnya identik dengan render penuh. Ini dasar untuk render bersegmen/paralel di masa depan.

### MP4 lama tidak bisa "menolong" render yang gagal

`render.cjs` menulis manifest berstatus `rendering` sebelum mulai, `complete` setelah frame dan MP4 selesai, atau `failed` bila ada error. Validator hanya menerima MP4 bila manifest `complete` dan sidik jarinya masih cocok dengan konfigurasi proyek, mesin inti, pustaka aset, frame PNG, dan file MP4 saat ini. Pengujian negatif membuktikannya dengan sengaja menggagalkan render di salinan repository.

## Pengujian

| Perintah | Isi | Butuh render? |
|----------|-----|---------------|
| `npm run lint` | sintaks JS, JSON, determinisme, kemurnian mesin inti | tidak |
| `npm run test:engine` | unit test `tests/engine/*.test.js`: track, easing, PRNG, jadwal setengah terbuka, entitas (urutan bebas), kamera, registry, palet, loader dan skema | tidak |
| `npm run test:smoke` | render beberapa frame per proyek, cocokkan dengan baseline | tidak (render kecil) |
| `npm run validate -- --project <id>` | validasi lengkap satu proyek (video, frame, transisi, adegan terpisah, konsistensi aset, modul terisolasi, determinisme, manifest) | ya |
| `npm run test:negative -- --project <id>` | kesalahan yang disengaja harus ditolak | ya |
| `npm run test:regression` | Project A dan prototipe identik dengan baseline `main` | ya |
| `npm run test:projects` | mesin bersama, file konfigurasi terpisah, isolasi dua arah | ya |
| `npm run test:zoom` | lab zoom: 10 skenario (zoom bulat dan pecahan, geser horizontal/vertikal/diagonal, zoom masuk/keluar) x 4 pendekatan, plus Project A dengan lensa zoom | tidak (render kecil) |
| `npm test` | semua di atas | ya |

Teknik penting:

- **Kilatan dan potongan kasar**: statistik kecerahan (`signalstats`) tiap frame. Batasnya di `config/engine.json`.
- **Kesinambungan transisi**: frame pertama dan terakhir transisi dibandingkan per byte dengan render adegan tunggal.
- **Adegan terpisah**: frame di luar transisi dirender sebagai film utuh dan sebagai adegan tunggal, hasilnya harus identik.
- **Konsistensi aset**: aturan `validation.consistency` di proyek. `assetType` = semua adegan memakai satu aset berjenis itu; `asset` = warna identitas aset muncul di frame contoh.
- **Isolasi modul**: daftar file JS yang benar-benar diunduh browser. Project B tidak memuat satu pun modul kereta.
- **Determinisme**: seluruh frame dirender ulang di browser baru dengan urutan terbalik lalu dibandingkan per byte. MP4 di-encode ulang dan dibandingkan SHA-256-nya.
- **Grid piksel kamera**: setiap frame mencatat mode zoom, nilai zoom, dan geseran lapisannya di manifest render. Validator menghitung ulang ukuran setiap kolom/baris dunia dan menolak crawl (ukuran berubah padahal zoom tetap) serta piksel bolak-balik.
- **Lab zoom**: pola kalibrasi `calibration-grid` gaya `identity` memberi setiap piksel art warna unik (kolom, baris, lapisan), jadi ukuran, posisi, dan warna campuran bisa dibaca langsung dari gambar 1920x1080.
- **Perubahan terdeklarasi**: regresi membandingkan setiap proyek yang punya baseline. Frame di dalam rentang `tests/baselines/pending-changes.json` boleh berbeda tetapi dilaporkan "menunggu persetujuan"; frame di luar rentang wajib identik.
