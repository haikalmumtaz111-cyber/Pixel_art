# Pixel History Studio

Studio animasi pixel art berbasis kode. Tujuan jangka panjangnya adalah membuat film animasi sejarah bergaya retro 16-bit yang bisa dipakai berulang kali. Proyek ini dibangun bertahap.

## Status

**Tahap 1 selesai: fondasi dan prototipe animasi.**

Prototipe pertama berjudul *Kereta Malam di Tengah Hujan*: kereta uap melintasi pedesaan pada malam hari ketika hujan turun.

| Hal | Nilai |
|-----|-------|
| Video | [`output/video/train-night-rain.mp4`](output/video/train-night-rain.mp4) |
| Durasi | 5 detik, 30 FPS, 150 frame |
| Resolusi | digambar di 480 x 270, diperbesar 4x menjadi 1920 x 1080 (16:9) |
| Laporan pengujian | [`output/reports/train-night-rain-validation.md`](output/reports/train-night-rain-validation.md) |
| Cuplikan | [`output/reports/train-night-rain-contact-sheet.png`](output/reports/train-night-rain-contact-sheet.png) |

Yang bergerak di dalam video:

1. Kereta melaju dengan kecepatan tetap (90 piksel per detik di resolusi internal).
2. Roda berputar sesuai jarak tempuh, lengkap dengan batang penghubung roda lokomotif.
3. Hujan turun miring dalam dua lapis (jauh dan dekat), ditambah cipratan di tanah, rel, dan atap.
4. Gunung, bukit, pohon, tiang telegraf, dan semak bergeser dengan kecepatan berbeda (parallax).
5. Lampu jendela kereta menyala, kadang meredup sesaat, dan terpantul di tanah basah.
6. Kamera mengikuti kereta. Di 2,2 detik pertama kamera sedikit tertinggal, lalu mengunci posisi kereta.

Bonus kecil: asap cerobong, sorot lampu depan yang menerangi hujan, api tungku di kabin masinis, rumah desa dengan jendela menyala.

## Cara menjalankan

Semua perintah dijalankan dari folder proyek.

```bash
npm run check      # periksa apakah semua alat sudah terpasang
npm run build      # render 150 frame, gabungkan jadi MP4, lalu uji hasilnya
npm run preview    # lihat animasi langsung di browser (Ctrl+C untuk berhenti)
```

`npm run build` sama dengan menjalankan dua perintah ini berurutan:

```bash
npm run render     # menggambar frame PNG lalu membuat MP4
npm run validate   # menguji MP4 dan menulis laporan pengujian
```

Setiap render menimpa frame PNG dan MP4 lama dengan nama yang sama. Tidak ada file lain yang dihapus.

### Memasang di komputer baru

1. Pasang Node.js versi 18 ke atas dari https://nodejs.org
2. Pasang FFmpeg (sudah termasuk FFprobe):
   - Windows: `winget install ffmpeg`
   - macOS: `brew install ffmpeg`
   - Ubuntu/Debian: `sudo apt install ffmpeg`
3. Di folder proyek jalankan `npm install` lalu `npx playwright install chromium`
4. Jalankan `npm run check`. Kalau semua `[OK]`, lanjut `npm run build`

## Struktur folder

```
config/                     pengaturan adegan (resolusi, FPS, durasi, kecepatan, jumlah hujan)
  train-night-rain.json
src/
  engine/                   mesin inti yang bisa dipakai ulang untuk adegan lain
    math.js                 fungsi matematika kecil
    random.js               angka acak deterministik (seed)
    pixel.js                alat gambar pixel art: kotak, garis, lingkaran, dithering
    camera.js               kamera dan parallax
    runtime.js, page.html   halaman browser tempat adegan digambar
  assets/                   aset prosedural (digambar oleh kode, bukan file gambar)
    palette.js              palet warna 16-bit
    sky.js                  langit, bulan, awan
    landscape.js            gunung, bukit, pohon, rumah, tiang, rel, tanah, semak
    train.js                lokomotif, tender, gerbong, roda, lampu
    rain.js                 hujan dan cipratan
    smoke.js                asap cerobong
  scenes/                   adegan: menyusun aset dan urutan gambarnya
    train-night-rain.js
  render/                   program Node.js untuk render dan pengujian
    render.cjs              Playwright menggambar frame, FFmpeg membuat MP4
    validate.cjs            pengujian FFprobe dan FFmpeg, menulis laporan
    check-env.cjs           pemeriksaan alat yang terpasang
    preview.cjs             pratinjau di browser
    browser.cjs, server.cjs, config.cjs   bagian pendukung
output/
  frames/                   frame PNG hasil render (tidak disimpan ke git, bisa dibuat ulang)
  video/                    file MP4
  reports/                  laporan pengujian dan cuplikan
```

## Cara kerjanya

1. `render.cjs` membaca konfigurasi dari `config/`.
2. Chromium dibuka lewat Playwright, lalu memuat adegan dari `src/scenes/`.
3. Untuk setiap nomor frame (0 sampai 149), adegan digambar ulang dari nol di kanvas 480 x 270 lalu disimpan sebagai PNG.
4. FFmpeg memperbesar setiap frame 4x dengan metode *nearest neighbor* agar piksel tetap kotak tajam, lalu menyandikannya menjadi MP4 H.264.
5. `validate.cjs` memeriksa hasilnya dan menulis laporan ke `output/reports/`.

## Aturan penting untuk animasi

- **Deterministik.** Posisi semua benda dihitung hanya dari nomor frame (waktu = frame / FPS). Frame 75 selalu terlihat sama, kapan pun dan dalam urutan apa pun dirender. Pengujian membuktikan ini dengan merender ulang beberapa frame dalam urutan loncat-loncat lalu membandingkan isinya byte demi byte.
- **Tanpa `Math.random()`.** Variasi acak memakai `hash(seed, ...)` dari `src/engine/random.js`. Mengganti `seed` di konfigurasi akan menghasilkan susunan pohon, hujan, dan asap yang berbeda tetapi tetap konsisten.
- **Koordinat bulat.** Semua gambar memakai koordinat piksel bulat supaya tidak ada pinggiran buram.

## Mengubah animasi tanpa menyentuh kode

Buka `config/train-night-rain.json`, ubah nilainya, lalu jalankan `npm run build`. Contoh:

- `sceneParams.train.speed`: kecepatan kereta
- `sceneParams.rain.near.count` dan `sceneParams.rain.far.count`: lebat hujan
- `seed`: susunan acak pemandangan
- `durationSeconds`: durasi video (jumlah frame ikut menyesuaikan)

## Tahap berikutnya

Belum dikerjakan. Akan diputuskan bersama sebelum mulai.
