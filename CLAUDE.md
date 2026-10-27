# Catatan untuk sesi berikutnya

Pemilik proyek adalah pemula yang tidak menulis kode. Komunikasi dalam bahasa Indonesia sederhana. Semua kode dikerjakan oleh asisten.

## Aturan kerja

- Proyek dibangun bertahap. Selesaikan tahap yang diminta, laporkan, lalu tunggu keputusan pemilik sebelum lanjut.
- Minta persetujuan sebelum instalasi sistem, perubahan di luar folder proyek, atau menghapus file.
- Jangan mengklaim berhasil sebelum `npm run build` lulus semua pemeriksaan.

## Konvensi kode

- Kode browser (`src/engine`, `src/assets`, `src/scenes`) adalah ES module `.js`. Kode Node (`src/render`) adalah CommonJS `.cjs`.
- Animasi harus deterministik: semua posisi dihitung dari `time = frame / fps`. Dilarang `Math.random()`, `Date`, atau state yang dibawa antar frame. Variasi acak pakai `hash()` dari `src/engine/random.js`.
- Gambar dengan helper di `src/engine/pixel.js` (koordinat dibulatkan). Warna diambil dari `src/assets/palette.js`.
- Adegan baru: buat `src/scenes/<nama>.js` yang mengekspor `createScene(config)` dengan method `render(ctx, { frame, time, totalFrames })`, lalu `config/<nama>.json` dengan `sceneModule` yang sesuai.
- Komentar kode dalam bahasa Indonesia.

## Perintah

- `npm run check`: cek Node.js, Playwright, Chromium, FFmpeg, FFprobe
- `npm run build`: render + validasi. Laporan ada di `output/reports/`
- `npm run preview`: pratinjau di browser

## Progres

- Tahap 1 (selesai): fondasi mesin + prototipe `train-night-rain` (5 detik, 150 frame, 1920x1080, 30 FPS). Validasi 15/15 lulus.
- Pemeriksaan final Milestone 01: clone bersih + `npm ci` + `npm run build` lulus 15/15, MP4 hasilnya identik byte demi byte dengan yang di Git. Playwright dikunci di 1.63.0 lewat `package-lock.json`.
- Tahap 2: belum dimulai, menunggu keputusan pemilik.
