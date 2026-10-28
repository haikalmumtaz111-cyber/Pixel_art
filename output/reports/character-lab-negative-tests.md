# Pengujian Negatif: Lab Karakter: Gerak dan Cahaya

Setiap baris adalah hasil yang SENGAJA dibuat salah. Pengujian lulus bila validator menolaknya (TERDETEKSI).
Dibuat otomatis oleh `npm run test:negative -- --project character-lab` pada 2026-10-28T04:34:17.448Z.

| No | Kesalahan yang disengaja | Hasil | Detail |
|----|--------------------------|-------|--------|
| 1 | Celah di timeline: adegan 2 mulai 1 frame terlambat | TERDETEKSI | Adegan 2 (s02-pose): ada celah, adegan seharusnya mulai di frame 120 tetapi mulai di 121 |
| 2 | Tumpang tindih: adegan 2 mulai 1 frame lebih awal | TERDETEKSI | Adegan 2 (s02-pose): tumpang tindih, adegan mulai di frame 119 padahal adegan sebelumnya berakhir di 120 |
| 3 | Durasi adegan tidak valid (akhir = awal) | TERDETEKSI | Adegan 1 (s01-langkah): durasi tidak valid (end harus lebih besar dari start) |
| 4 | Durasi yang tidak menjadi frame bulat (0,01 detik) | TERDETEKSI | Adegan 1 (s01-langkah): end 4.01 detik tidak menjadi frame bulat pada 30 FPS |
| 5 | ID adegan ganda | TERDETEKSI | Adegan 2 (s01-langkah): id adegan ganda |
| 6 | Adegan terakhir tidak menutup akhir film | TERDETEKSI | Adegan terakhir harus berakhir tepat di akhir film (frame 360), bukan 359 |
| 7 | Transisi tidak melewati batas adegan | TERDETEKSI | Transisi dari s01-langkah: rentang frame 0..23 harus melewati batas adegan di frame 120 |
| 8 | Jenis transisi tidak dikenal | TERDETEKSI | Transisi dari s01-langkah: jenis "wipe-hantu" tidak dikenal (pilihan: cut, dissolve, portal) |
| 9 | ID aset tidak dikenal | TERDETEKSI | Adegan 1 (s01-langkah) entitas "hantu": aset "aset-hantu" tidak ditemukan |
| 10 | Track kamera tidak dikenal | TERDETEKSI | Adegan 1 (s01-langkah): track kamera "track-hantu" tidak ditemukan |
| 11 | Keyframe tidak valid (frame mundur) | TERDETEKSI | Lingkungan "uji" key 1: frame harus berurutan naik |
| 12 | Keyframe dengan easing tidak dikenal | TERDETEKSI | Lingkungan "uji" key 1: easing "memantul-hantu" tidak dikenal |
| 13 | Parameter entitas/aset tidak valid | TERDETEKSI | Pemeran "darto-pagi" params: parameter "parameterHantu" tidak dikenal |
| 14 | Nilai parameter di luar batas | TERDETEKSI | Pemeran "darto-pagi" paramTracks.headTurn key 1: nilai 5 di luar batas -1..1 |
| 15 | Mode gerak karakter salah ketik | TERDETEKSI | Aset "pak-darto".motion: nilai "melayang" bukan salah satu dari: classic, natural |
| 16 | Pose lengan karakter tidak dikenal | TERDETEKSI | Aset "pak-darto".frontArm: nilai "terbang" bukan salah satu dari: auto, swing, hang, carry, behind |
| 17 | Palet adegan belum punya warna cahaya karakter | TERDETEKSI | Adegan 1 (s01-langkah): palet "pagi" belum punya warna: cahayaHantuLight, cahayaHantuLift, cahayaHantuRim |
| 18 | Arah cahaya karakter di luar batas | TERDETEKSI | Pemeran "darto-pagi" paramTracks.lightDirection key 1: nilai 3 di luar batas -1..1 |
| 19 | Track arah cahaya karakter tidak ada | TERDETEKSI | Aset "pak-darto".lightTrack: track lingkungan "matahari-hantu" tidak ada di bagian environment |
| 20 | Kaki meluncur saat berjalan (telapak ikut terseret tubuh) | TERDETEKSI | Kaki yang menapak tidak meluncur: GAGAL, meluncur: darto-pagi frame 0-9 (5 px), sumi-pagi frame 0-10 (5 px), darto-pagi frame 10-23 (7 px), sumi-pagi frame 11-23 (5 px), darto-pagi frame 24-37 (7 px) / kontrol kode asli: lolos |
| 21 | Tubuh bergetar saat berjalan (pinggul bolak-balik tiap frame) | TERDETEKSI | Tubuh tidak bergetar saat berjalan: GAGAL, pinggul bolak-balik dalam 1 frame: kakek frame 111, kakek frame 120, kakek frame 131, kakek frame 140, kakek frame 151, kakek frame 160 / kontrol kode asli: lolos |
| 22 | Skala entitas bukan bilangan bulat (grid piksel rusak) | TERDETEKSI | Pemeran "darto-pagi": scale harus bilangan bulat 1..4 agar grid piksel tetap rapi |
| 23 | Zoom kamera tanpa mode upscale "browser" (piksel jadi tidak tajam) | TERDETEKSI | Adegan 1 (s01-langkah) kamera: zoom kamera hanya didukung bila rendering.upscale = "browser" (agar piksel tetap tajam) |
| 24 | Mode zoom salah ketik | TERDETEKSI | Proyek: rendering.zoomMode "zoom-hantu" tidak dikenal (pilihan: anchored, steps, nearest) |
| 25 | Lensa zoom di mode upscale ffmpeg | TERDETEKSI | Adegan 1 (s01-langkah) lens: zoom kamera hanya didukung bila rendering.upscale = "browser" (agar piksel tetap tajam) |
| 26 | Nama efek salah ketik | TERDETEKSI | Adegan 2 (s02-pose): efek "hujan-deras-salah-ketik" tidak dikenal |
| 27 | Proyek yang tidak ada | TERDETEKSI | exit 1: RENDER GAGAL: Proyek "proyek-hantu" tidak ditemukan. Proyek yang tersedia: /   - character-lab        Lab Karakter: Gerak dan Cahaya (12 detik, 30 FPS) |
| 28 | Adegan yang tidak ada | TERDETEKSI | exit 1: RENDER GAGAL: Adegan "adegan-hantu" tidak ada di proyek character-lab. Pilihan: s01-langkah, s02-pose, s03-sore, s04-malam |
| 29 | Video kurang 1 frame (359 frame) | TERDETEKSI | Jumlah frame: GAGAL, 359 dari 360 frame / Durasi: GAGAL, 11.967 detik (target 12.000) |
| 30 | Resolusi salah (1280x720) | TERDETEKSI | Resolusi output: GAGAL, 1280x720 |
| 31 | FPS salah (25 FPS) | TERDETEKSI | Frame rate: GAGAL, 25/1 (rata-rata 25/1) / Durasi: GAGAL, 14.400 detik (target 12.000) |
| 32 | Format yang sulit diputar perangkat umum (yuv444p) | TERDETEKSI | Video dapat diputar di perangkat umum: GAGAL, profil High 4:4:4 Predictive, level 4.0, yuv444p, piksel 1:1, faststart ya / Format piksel: GAGAL, yuv444p |
| 33 | Frame hitam disisipkan di frame 162 | TERDETEKSI | Tidak ada frame kosong: GAGAL, frame kosong: 162 / Tidak ada kilatan cahaya mendadak: GAGAL, lompatan kecerahan di frame 162 (-124.2), 163 (124.3) |
| 34 | Film berakhir di layar hitam | TERDETEKSI | Frame terakhir valid: GAGAL, frame 359: kecerahan rata-rata 16.0, rentang 0 |
| 35 | Frame 162 hilang dari folder frame | TERDETEKSI | Frame PNG lengkap dan berurutan: GAGAL, frame hilang: 162 |
| 36 | Render gagal, tetapi MP4 lama masih ada | TERDETEKSI | render exit 1, MP4 lama masih ada dan terlihat sah, Render terakhir selesai dengan sukses: GAGAL, status "failed": Error JavaScript di dalam adegan (frame 5): Error: Render sengaja digagalkan (uji negatif) |
| 37 | MP4 diganti tanpa render ulang | TERDETEKSI | Video berasal dari render terbaru (bukan sisa render lama): GAGAL, berubah sejak render terakhir: file MP4 |
| 38 | Konfigurasi diubah setelah render (MP4 kedaluwarsa) | TERDETEKSI | Video berasal dari render terbaru (bukan sisa render lama): GAGAL, berubah sejak render terakhir: konfigurasi proyek |
| 39 | Pergantian adegan dengan potongan kasar (hard cut) | TERDETEKSI | Tidak ada potongan kasar (hard cut): GAGAL, lonjakan di frame 120 (beda 42.3, di transisi cut) / kontrol transisi dissolve: lolos |
| 40 | Aset pak-darto tampil berbeda di adegan terakhir | TERDETEKSI | Warna identitas pak-darto konsisten: GAGAL, frame 340: #727ea4 #333348 |
| 41 | Adegan memakai Math.random() (tidak deterministik) | TERDETEKSI | Rendering deterministik (render ulang identik, urutan terbalik): GAGAL, 30 frame berbeda, contoh: 29, 28, 27, 26, 25, 24 |
| 42 | Error JavaScript di tengah render | TERDETEKSI | render dihentikan: Error JavaScript di dalam adegan (frame 5): Error: kesalahan uji di frame 5 |

Status akhir: **SEMUA KESALAHAN TERDETEKSI** (42/42)
