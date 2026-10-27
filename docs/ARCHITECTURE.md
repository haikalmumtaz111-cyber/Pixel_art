# Arsitektur Pixel History Studio

Dokumen ini menjelaskan cara mesin animasi bekerja sejak Tahap 2 (sistem multi-adegan).

## Gambaran besar

```
config/<film>.json  ──►  src/render/config.cjs + timeline.cjs  ──►  browser (Playwright + Chromium)
   (timeline JSON)        memeriksa dan merapikan timeline           src/engine/runtime.js
                                                                      └─ film.js
                                                                          ├─ adegan (src/scenes/*)
                                                                          ├─ transisi (transitions.js)
                                                                          └─ aset bersama (src/assets/registry.js)
                                                                    ──►  PNG 480x270 per frame
                                                                    ──►  FFmpeg: perbesar 4x nearest neighbor ──► MP4 H.264
                                                                    ──►  validate.cjs + negative-tests.cjs ──► laporan
```

Kode browser (`src/engine`, `src/assets`, `src/scenes`) ditulis sebagai ES module `.js`. Kode Node (`src/render`) ditulis sebagai CommonJS `.cjs`, supaya Playwright bisa dimuat dari instalasi lokal maupun global.

## Timeline berbasis data

File timeline berisi:

| Bagian | Isi |
|--------|-----|
| pengaturan film | `name`, `title`, `seed`, resolusi, `fps`, `durationSeconds`, `output`, `encoding` |
| `assets` | definisi aset bersama, dengan `type` dan parameternya |
| `environment` | track keyframe cuaca dan cahaya untuk seluruh film: `dawn`, `rain`, `clouds`, `fog`, `lights`, `sun` |
| `cameraTracks` | track kamera yang dipakai bersama beberapa adegan |
| `timeline.scenes` | daftar adegan berurutan |
| `validation` | pengaturan pengujian, misalnya frame tempat kereta terlihat |

Setiap adegan wajib punya `id`, `name`, `module`, `startFrame`, `endFrame`, `durationFrames`, `assets`, `characters`, `camera`, `environment`, dan `transitionOut` (atau `null` untuk adegan terakhir).

Format keyframe: `[[frame, nilai, easing?], ...]`. Easing ditulis di key tujuan, artinya cara bergerak dari key sebelumnya ke key itu. Easing yang tersedia: `linear`, `inQuad`, `outQuad`, `inCubic`, `outCubic`, `inOutCubic`, `inOutSine`, `smoothstep`.

`src/render/timeline.cjs` memeriksa aturan berikut sebelum render:

- adegan pertama mulai di frame 0, adegan terakhir berakhir di frame terakhir
- setiap adegan mulai tepat setelah adegan sebelumnya (tanpa celah, tanpa tumpang tindih)
- `durationFrames` cocok dengan `startFrame..endFrame`
- modul adegan, aset, track kamera, dan nama efek benar-benar ada
- transisi menuju adegan berikutnya, rentangnya melewati batas adegan, dan tidak bertumpuk
- keyframe berurutan naik dan berada di dalam durasi film

Konfigurasi lama tanpa `timeline` (Tahap 1) otomatis diubah menjadi timeline satu adegan.

## Mesin film (`src/engine/film.js`)

Untuk setiap nomor frame, `segmentAt(frame)` menentukan apakah frame itu milik satu adegan atau sebuah transisi. Lalu:

- frame adegan: adegan dirender dengan `shot = { frame, time, local, progress }`
- frame transisi: transisi menerima `p` (0 di frame awal, 1 di frame akhir) dan dua fungsi gambar, `drawFrom` dan `drawTo`

Setiap frame digambar dari nol. Tidak ada keadaan yang dibawa dari frame sebelumnya, jadi frame bisa dirender dalam urutan apa pun.

## Kontrak adegan

```js
export function createScene({ film, scene, assets, environment }) {
  return {
    supportsPortal: true,          // opsional, bila adegan bisa dipakai sebagai "from" transisi portal
    render(ctx, shot) { ... }      // shot.portal ada saat transisi portal berlangsung
  };
}
```

- `film`: konfigurasi film lengkap
- `scene`: entri adegan dari timeline (kamera, karakter, efek)
- `assets.pick(scene.assets, type)`: mengambil aset bersama dari daftar referensi aset adegan
- `environment.at(frame)`: nilai cuaca dan cahaya pada frame tersebut

## Sistem transisi (`src/engine/transitions.js`)

| Jenis | Cara kerja |
|-------|------------|
| `cut` | potong langsung di frame batas adegan |
| `dissolve` | larut berdither: piksel adegan baru muncul bertahap mengikuti pola Bayer 4x4 (16 tingkat), tetap tajam |
| `portal` | adegan lama di-zoom ke sebuah "lubang" (jendela). Adegan baru terlihat di dalam lubang sampai memenuhi layar |

Aturan yang dijaga semua transisi: di `p = 0` hasilnya sama persis dengan adegan lama, di `p = 1` sama persis dengan adegan baru. Pengujian otomatis membuktikannya per byte.

Transisi portal memberi adegan lama `shot.portal = { zoom, progress, drawInside(ctx, rect) }`. Adegan lama menggambar dirinya dengan zoom lalu memanggil `drawInside` di posisi lubangnya. Dengan begitu adegan bisa mengatur urutan lapisan sendiri, misalnya tetesan air di kaca tetap di depan pemandangan. Parameter portal: `zoom` (zoom akhir), `easing`, dan `mix` (rentang `p` saat isi lubang larut dari gambar lama ke adegan baru).

## Zoom yang tetap tajam

Zoom tidak memperbesar gambar seperti foto. `pixel.js` punya *view* `{ s, ox, oy }`: setiap kotak, garis, dan lingkaran digambar ulang pada posisi `o + posisi * s` di resolusi asli 480x270, lalu dibulatkan ke piksel. Hasilnya tidak blur dan tanpa anti-aliasing. Detail kecil seperti tetesan air di kaca sengaja tetap 1 piksel walau posisinya ikut zoom.

## Aset bersama (`src/assets/registry.js`)

| Jenis | Fungsi pembuat | Isi |
|-------|----------------|-----|
| `steam-train` | `train.js` | satu desain kereta: warna, cerobong, roda, gerbong, jendela, lampu |
| `countryside` | `countryside.js` | dunia luar: langit, lanskap, hujan, asap, dan kereta |
| `coach-interior` | `interior.js` | interior gerbong. Warna kain, bingkai, dan kuningan diambil dari desain kereta |
| `character` | `characters/traveler.js` | karakter penumpang: siluet untuk tampak luar dan pose duduk untuk interior |

Aset dibuat sekali lalu dibagikan ke semua adegan. Kereta di Adegan 1 dan Adegan 3 adalah objek yang sama.

## Palet dan lingkungan

`palette.js` berisi palet `NIGHT` (malam, sama persis dengan Tahap 1), `DAWN` (warna tujuan saat fajar), dan `INTERIOR`. Perubahan malam ke fajar dibagi menjadi 32 anak tangga (*palette ramp*). Setiap frame tetap memakai sekumpulan kecil warna, mirip efek *palette fade* di konsol 16-bit. Warna identitas kereta tidak ikut berubah.

Intensitas hujan diperiksa pada saat sebuah tetes mulai jatuh dari atas layar, sehingga saat hujan mereda tidak ada tetes yang hilang di tengah udara.

## Kamera

- `follow`: `keys` menentukan posisi layar ujung depan lokomotif, artinya kamera ikut kereta
- `speed`: `speedKeys` menentukan kecepatan kamera dibanding kereta (1 = sama cepat, 0 = diam). Posisinya dihitung sekali dengan menjumlahkan gerak per frame
- `liftKeys`: posisi vertikal kamera. Setiap lapisan bergeser sesuai faktor kedalamannya (parallax vertikal)

Adegan 2 memakai `panKeys` untuk geser kamera di dalam gerbong, dan `windowView.track` untuk pemandangan di luar jendela. Track `dawn-run` dipakai bersama oleh pemandangan jendela Adegan 2 dan kamera Adegan 3, sehingga transisi menembus kaca menyambung dengan sempurna.

## Pengujian

`npm run validate` menjalankan 28 pemeriksaan. Pemeriksaan itu dikelompokkan menjadi 14 kebutuhan: jumlah frame, durasi, resolusi, FPS, interval adegan, frame hilang, frame kosong, error JavaScript, transisi tanpa artefak, konsistensi kereta, determinisme, decoding FFmpeg, kemampuan diputar, dan konsistensi render ulang.

Beberapa teknik yang dipakai:

- **Kilatan dan potongan kasar**: statistik kecerahan tiap frame dari filter `signalstats` FFmpeg. Lompatan kecerahan rata-rata di atas 8 dianggap kilatan. Lonjakan beda frame yang berdiri sendiri (lebih dari 3 kali tetangganya) dianggap potongan kasar.
- **Kesinambungan transisi**: frame awal dan akhir transisi dibandingkan per byte dengan render adegan tunggal, dan portal harus sudah menutup layar sebelum frame terakhir transisi.
- **Determinisme**: seluruh frame dirender ulang di browser baru dengan urutan terbalik lalu dibandingkan per byte. MP4 juga di-encode ulang dan dibandingkan SHA-256-nya.
- **Konsistensi kereta**: gambar acuan kereta dari setiap aset kereta yang dipakai adegan harus identik, dan warna identitas kereta harus muncul persis di frame adegan luar.

`npm run test:negative` sengaja membuat 16 kesalahan, misalnya celah timeline, video kurang 1 frame, FPS salah, frame hitam, hard cut, portal terlalu kecil, kereta berbeda, `Math.random()`, dan error JavaScript. Semua kesalahan itu harus ditolak validator.

## Menambah sesuatu

- **Adegan baru**: buat `src/scenes/<nama>.js` dengan kontrak di atas, lalu tambahkan entri di `timeline.scenes`.
- **Transisi baru**: tambahkan objek ke `TRANSITIONS` di `transitions.js` yang mematuhi aturan `p = 0` dan `p = 1`, lalu daftarkan namanya di `TRANSITION_TYPES` (`timeline.cjs`).
- **Aset baru**: tambahkan fungsi pembuat di `FACTORIES` (`registry.js`) dan namanya di `ASSET_TYPES` (`timeline.cjs`).
- **Karakter baru**: buat definisi seperti `TRAVELER` dan daftarkan di `CHARACTERS` (`registry.js`).
