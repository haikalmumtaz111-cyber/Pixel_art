# Pixel History Studio

Studio animasi pixel art berbasis kode. Tujuan jangka panjangnya adalah membuat film animasi sejarah bergaya retro 16-bit yang bisa dipakai berulang kali. Proyek ini dibangun bertahap.

## Status

| Tahap | Isi | Status |
|-------|-----|--------|
| 1 | Fondasi mesin + prototipe 5 detik *Kereta Malam di Tengah Hujan* | Selesai |
| 2 | Sistem multi-adegan + film pendek 15 detik *Kereta Malam Menuju Fajar* | Selesai, menunggu persetujuan merge |

## Hasil Tahap 2

| Hal | Nilai |
|-----|-------|
| Video | [`output/video/film-night-to-dawn.mp4`](output/video/film-night-to-dawn.mp4) |
| Durasi | 15 detik, 30 FPS, tepat 450 frame |
| Resolusi | digambar di 480 x 270, diperbesar 4x (nearest neighbor) menjadi 1920 x 1080 |
| Encoding | H.264 High level 4.1, yuv420p, faststart |
| Laporan pengujian | [`output/reports/film-night-to-dawn-validation.md`](output/reports/film-night-to-dawn-validation.md) |
| Pengujian negatif | [`output/reports/film-night-to-dawn-negative-tests.md`](output/reports/film-night-to-dawn-negative-tests.md) |
| Cuplikan film | [`output/reports/film-night-to-dawn-contact-sheet.png`](output/reports/film-night-to-dawn-contact-sheet.png) |

### Alur cerita

| Adegan | Frame | Isi |
|--------|-------|-----|
| 01 Night Train | 0-149 | Kereta uap melaju di pedesaan saat malam hujan. Kamera mengikuti kereta, lalu mendekati jendela seorang penumpang. |
| 02 Inside the Train | 150-299 | Interior gerbong yang hangat. Penumpang bertopi pet bernapas, berkedip, dan melirik ke luar. Hujan mengalir di kaca, pemandangan bergerak, ruangan bergetar halus. |
| 03 Journey to Dawn | 300-449 | Kamera keluar lewat jendela, melambat, dan menengadah. Hujan reda, awan terbuka, langit berubah ungu-merah muda-oranye, matahari muncul di balik gunung, kabut tipis di lembah. Kereta menyalip masuk bingkai menuju cahaya fajar. |

Dua transisi menyambungkan ketiga adegan tanpa potongan kasar:

- **Adegan 1 ke 2 (frame 132-167)**: kamera mendekati jendela penumpang. Jendela-jendela di sekitarnya meredup menjadi warna ruangan, lalu kamera masuk ke dalam gerbong.
- **Adegan 2 ke 3 (frame 282-317)**: penumpang melirik ke jendela, kamera bergeser ke arah jendela, lalu menembus kaca dan keluar ke pemandangan.

Lembar cuplikan tiap adegan dan transisi ada di `output/reports/film-night-to-dawn-scene-*.png` dan `output/reports/film-night-to-dawn-transition-*.png`.

## Cara menjalankan

Semua perintah dijalankan dari folder proyek.

```bash
npm run check            # periksa apakah semua alat sudah terpasang
npm run build            # render 450 frame, buat MP4, lalu uji hasilnya
npm test                 # uji hasil + uji negatif (jalankan setelah build)
npm run preview          # tonton animasi langsung di browser (Ctrl+C untuk berhenti)
```

Perintah lain yang berguna:

```bash
npm run render                              # hanya render frame dan MP4
npm run validate                            # hanya menguji hasil render
npm run test:negative                       # uji negatif: memastikan validator menolak hasil yang salah
npm run render:scene -- s02-inside-train    # render satu adegan saja, tanpa transisi
npm run preview -- film-night-to-dawn s02-inside-train   # pratinjau satu adegan
npm run build:prototype                     # render dan uji ulang prototipe Tahap 1
```

Setiap render menimpa frame PNG dan MP4 lama dengan nama yang sama. Tidak ada file lain yang dihapus. Video per adegan disimpan di `output/scenes/` dan tidak masuk Git.

### Memasang di komputer baru

1. Pasang Node.js versi 18 ke atas dari https://nodejs.org
2. Pasang FFmpeg (sudah termasuk FFprobe):
   - Windows: `winget install ffmpeg`
   - macOS: `brew install ffmpeg`
   - Ubuntu/Debian: `sudo apt install ffmpeg`
3. Di folder proyek jalankan `npm install` lalu `npx playwright install chromium`
4. Jalankan `npm run check`. Kalau semua `[OK]`, lanjut `npm run build`

## Cara kerjanya (versi singkat)

Bayangkan studio film sungguhan:

- **Timeline** (`config/film-night-to-dawn.json`) adalah naskah dan jadwal syuting. Isinya daftar adegan, kapan mulai dan selesai, gerak kamera, cuaca, dan transisi.
- **Aset** (`src/assets/`) adalah properti dan pemain: kereta, pedesaan, interior gerbong, dan penumpang. Satu aset dipakai bersama oleh semua adegan, jadi keretanya selalu sama.
- **Adegan** (`src/scenes/`) adalah sutradara per adegan: menata aset dan kamera sesuai timeline.
- **Mesin** (`src/engine/`) adalah kru teknis: membaca timeline, menggambar setiap frame, dan menjalankan transisi.
- **Render dan validasi** (`src/render/`) adalah ruang editing dan kontrol kualitas: membuat MP4 lalu memeriksanya.

Penjelasan teknis lengkap ada di [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Riwayat perubahan ada di [`docs/CHANGELOG.md`](docs/CHANGELOG.md).

## Struktur folder

```
config/
  film-night-to-dawn.json   timeline film Tahap 2 (adegan, aset, kamera, cuaca, transisi)
  train-night-rain.json     prototipe Tahap 1 (satu adegan)
src/
  engine/                   mesin inti yang bisa dipakai ulang
    film.js                 membaca timeline dan menentukan isi setiap frame
    transitions.js          pustaka transisi: cut, dissolve, portal
    tracks.js               keyframe berbasis frame untuk kamera dan cuaca
    camera.js               kamera, parallax, track kamera "follow" dan "speed"
    pixel.js                alat gambar pixel art, zoom tajam, dithering
    random.js, math.js      angka acak deterministik dan fungsi bantu
    runtime.js, page.html   halaman browser tempat film digambar
  assets/                   aset prosedural (digambar oleh kode)
    registry.js             daftar aset bersama
    palette.js              palet malam, fajar, dan interior
    train.js                kereta uap (satu desain untuk semua adegan)
    countryside.js          set pedesaan: langit, lanskap, hujan, asap, kereta
    interior.js             interior gerbong
    characters/traveler.js  karakter penumpang
    sky.js, landscape.js, rain.js, smoke.js
  scenes/                   adegan
    night-train.js, inside-train.js, journey-to-dawn.js   adegan film Tahap 2
    train-night-rain.js     adegan prototipe Tahap 1
  render/                   program Node.js untuk render dan pengujian
    render.cjs              render film atau satu adegan
    validate.cjs            pengujian otomatis + laporan
    negative-tests.cjs      pengujian negatif
    checks.cjs, browser-checks.cjs, pipeline.cjs, timeline.cjs, config.cjs, browser.cjs, server.cjs
    check-env.cjs, preview.cjs
tests/fixtures/scenes/      adegan uji yang sengaja salah (dipakai pengujian negatif)
docs/                       dokumentasi arsitektur dan riwayat perubahan
output/
  frames/                   frame PNG (tidak masuk Git, bisa dibuat ulang)
  video/                    file MP4
  reports/                  laporan pengujian dan lembar cuplikan
```

## Mengubah film tanpa menyentuh kode

Buka `config/film-night-to-dawn.json`, ubah nilainya, lalu jalankan `npm run build`. Contoh:

- `assets.train.motion.speed`: kecepatan kereta
- `environment.dawn`: kapan langit mulai berubah menjadi fajar, dalam format `[frame, nilai, easing]`
- `environment.rain`: seberapa cepat hujan reda
- `timeline.scenes[...].camera`: gerak kamera tiap adegan
- `timeline.scenes[...].transitionOut`: kapan dan seperti apa transisi ke adegan berikutnya
- `timeline.scenes[1].characters.traveler.lookKeys`: kapan penumpang melirik ke jendela

Pemeriksa timeline akan menolak kesalahan seperti adegan yang bertumpuk, durasi yang tidak cocok, atau nama efek yang salah ketik, lengkap dengan pesan berbahasa Indonesia.

## Keterbatasan yang masih ada

- Belum ada audio atau musik.
- Saat kamera zoom menembus jendela, piksel ikut membesar dengan ukuran yang tidak selalu sama (kadang 2 dan kadang 3 piksel). Efek ini hanya berlangsung sekitar setengah detik dan tidak menimbulkan blur.
- Arah pandang dari jendela di Adegan 2 tidak mengikuti geometri 3D sungguhan. Ini disengaja mengikuti konvensi film 2D side-scroller.
- Baru ada satu karakter dan satu set lokasi (pedesaan + interior gerbong).
- Determinisme dijamin di lingkungan yang sama (versi Chromium dan FFmpeg yang sama). Versi berbeda bisa menghasilkan selisih piksel kecil.
