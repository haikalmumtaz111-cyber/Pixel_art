# Pengujian Negatif: Kereta Malam Menuju Fajar

Setiap baris adalah hasil yang SENGAJA dibuat salah. Pengujian lulus bila validator menolaknya (TERDETEKSI).
Dibuat otomatis oleh `npm run test:negative -- --project night-to-dawn` pada 2026-10-28T04:35:12.009Z.

| No | Kesalahan yang disengaja | Hasil | Detail |
|----|--------------------------|-------|--------|
| 1 | Celah di timeline: adegan 2 mulai 1 frame terlambat | TERDETEKSI | Adegan 2 (s02-inside-train): ada celah, adegan seharusnya mulai di frame 150 tetapi mulai di 151 |
| 2 | Tumpang tindih: adegan 2 mulai 1 frame lebih awal | TERDETEKSI | Adegan 2 (s02-inside-train): tumpang tindih, adegan mulai di frame 149 padahal adegan sebelumnya berakhir di 150 |
| 3 | Durasi adegan tidak valid (akhir = awal) | TERDETEKSI | Adegan 1 (s01-night-train): durasi tidak valid (end harus lebih besar dari start) |
| 4 | Durasi yang tidak menjadi frame bulat (0,01 detik) | TERDETEKSI | Adegan 1 (s01-night-train): end 5.01 detik tidak menjadi frame bulat pada 30 FPS |
| 5 | ID adegan ganda | TERDETEKSI | Adegan 2 (s01-night-train): id adegan ganda |
| 6 | Adegan terakhir tidak menutup akhir film | TERDETEKSI | Adegan terakhir harus berakhir tepat di akhir film (frame 450), bukan 449 |
| 7 | Transisi tidak melewati batas adegan | TERDETEKSI | Transisi dari s01-night-train: rentang frame 0..35 harus melewati batas adegan di frame 150 |
| 8 | Jenis transisi tidak dikenal | TERDETEKSI | Transisi dari s01-night-train: jenis "wipe-hantu" tidak dikenal (pilihan: cut, dissolve, portal) |
| 9 | ID aset tidak dikenal | TERDETEKSI | Adegan 1 (s01-night-train): aset "aset-hantu" tidak ada di bagian assets |
| 10 | Track kamera tidak dikenal | TERDETEKSI | Adegan 1 (s01-night-train): track kamera "track-hantu" tidak ditemukan |
| 11 | Keyframe tidak valid (frame mundur) | TERDETEKSI | Lingkungan "uji" key 1: frame harus berurutan naik |
| 12 | Keyframe dengan easing tidak dikenal | TERDETEKSI | Lingkungan "uji" key 1: easing "memantul-hantu" tidak dikenal |
| 13 | Parameter entitas/aset tidak valid | TERDETEKSI | Aset "traveler": parameter "warnaHantu" tidak dikenal |
| 14 | Nilai parameter di luar batas | TERDETEKSI | Aset "train".railY: nilai -5 lebih kecil dari batas 0 |
| 15 | Zoom kamera tanpa mode upscale "browser" (piksel jadi tidak tajam) | TERDETEKSI | Track kamera "dawn-run": zoom kamera hanya didukung bila rendering.upscale = "browser" (agar piksel tetap tajam) |
| 16 | Mode zoom salah ketik | TERDETEKSI | Proyek: rendering.zoomMode "zoom-hantu" tidak dikenal (pilihan: anchored, steps, nearest) |
| 17 | Lensa zoom di mode upscale ffmpeg | TERDETEKSI | Adegan 1 (s01-night-train) lens: zoom kamera hanya didukung bila rendering.upscale = "browser" (agar piksel tetap tajam) |
| 18 | Nama efek salah ketik | TERDETEKSI | Adegan 2 (s02-inside-train): efek "hujan-deras-salah-ketik" tidak dikenal |
| 19 | Proyek yang tidak ada | TERDETEKSI | exit 1: RENDER GAGAL: Proyek "proyek-hantu" tidak ditemukan. Proyek yang tersedia: /   - character-lab        Lab Karakter: Gerak dan Cahaya (12 detik, 30 FPS) |
| 20 | Adegan yang tidak ada | TERDETEKSI | exit 1: RENDER GAGAL: Adegan "adegan-hantu" tidak ada di proyek night-to-dawn. Pilihan: s01-night-train, s02-inside-train, s03-journey-to-dawn |
| 21 | Video kurang 1 frame (449 frame) | TERDETEKSI | Jumlah frame: GAGAL, 449 dari 450 frame / Durasi: GAGAL, 14.967 detik (target 15.000) |
| 22 | Resolusi salah (1280x720) | TERDETEKSI | Resolusi output: GAGAL, 1280x720 |
| 23 | FPS salah (25 FPS) | TERDETEKSI | Frame rate: GAGAL, 25/1 (rata-rata 25/1) / Durasi: GAGAL, 18.000 detik (target 15.000) |
| 24 | Format yang sulit diputar perangkat umum (yuv444p) | TERDETEKSI | Video dapat diputar di perangkat umum: GAGAL, profil High 4:4:4 Predictive, level 4.0, yuv444p, piksel 1:1, faststart ya / Format piksel: GAGAL, yuv444p |
| 25 | Frame hitam disisipkan di frame 202 | TERDETEKSI | Tidak ada frame kosong: GAGAL, frame kosong: 202 / Tidak ada kilatan cahaya mendadak: GAGAL, lompatan kecerahan di frame 202 (-31.9), 203 (31.9) |
| 26 | Film berakhir di layar hitam | TERDETEKSI | Frame terakhir valid: GAGAL, frame 449: kecerahan rata-rata 16.0, rentang 0 |
| 27 | Frame 202 hilang dari folder frame | TERDETEKSI | Frame PNG lengkap dan berurutan: GAGAL, frame hilang: 202 |
| 28 | Render gagal, tetapi MP4 lama masih ada | TERDETEKSI | render exit 1, MP4 lama masih ada dan terlihat sah, Render terakhir selesai dengan sukses: GAGAL, status "failed": Error JavaScript di dalam adegan (frame 5): Error: Render sengaja digagalkan (uji negatif) |
| 29 | MP4 diganti tanpa render ulang | TERDETEKSI | Video berasal dari render terbaru (bukan sisa render lama): GAGAL, berubah sejak render terakhir: file MP4 |
| 30 | Konfigurasi diubah setelah render (MP4 kedaluwarsa) | TERDETEKSI | Video berasal dari render terbaru (bukan sisa render lama): GAGAL, berubah sejak render terakhir: konfigurasi proyek |
| 31 | Pergantian adegan dengan potongan kasar (hard cut) | TERDETEKSI | Tidak ada potongan kasar (hard cut): GAGAL, lonjakan di frame 150 (beda 15.0, di transisi cut) / kontrol transisi portal: lolos |
| 32 | Portal terlalu kecil sehingga gambar melompat di akhir transisi | TERDETEKSI | Portal s01-night-train->s02-inside-train menutup layar sebelum transisi selesai: GAGAL, layar tertutup penuh mulai frame 167 (transisi berakhir di 167) |
| 33 | Aset steam-train tampil berbeda di adegan terakhir | TERDETEKSI | Warna identitas steam-train konsisten: GAGAL, frame 60: #1f5a3a #7a5a3a / frame 445: #5c1c27 #4d5474 |
| 34 | Adegan memakai Math.random() (tidak deterministik) | TERDETEKSI | Rendering deterministik (render ulang identik, urutan terbalik): GAGAL, 30 frame berbeda, contoh: 29, 28, 27, 26, 25, 24 |
| 35 | Error JavaScript di tengah render | TERDETEKSI | render dihentikan: Error JavaScript di dalam adegan (frame 5): Error: kesalahan uji di frame 5 |

Status akhir: **SEMUA KESALAHAN TERDETEKSI** (35/35)
