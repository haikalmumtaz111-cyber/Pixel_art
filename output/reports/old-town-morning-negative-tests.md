# Pengujian Negatif: Pagi di Kota Tua

Setiap baris adalah hasil yang SENGAJA dibuat salah. Pengujian lulus bila validator menolaknya (TERDETEKSI).
Dibuat otomatis oleh `npm run test:negative -- --project old-town-morning` pada 2026-10-27T12:25:46.994Z.

| No | Kesalahan yang disengaja | Hasil | Detail |
|----|--------------------------|-------|--------|
| 1 | Celah di timeline: adegan 2 mulai 1 frame terlambat | TERDETEKSI | Adegan 2 (s02-morning-walk): ada celah, adegan seharusnya mulai di frame 120 tetapi mulai di 121 |
| 2 | Tumpang tindih: adegan 2 mulai 1 frame lebih awal | TERDETEKSI | Adegan 2 (s02-morning-walk): tumpang tindih, adegan mulai di frame 119 padahal adegan sebelumnya berakhir di 120 |
| 3 | Durasi adegan tidak valid (akhir = awal) | TERDETEKSI | Adegan 1 (s01-old-town-morning): durasi tidak valid (end harus lebih besar dari start) |
| 4 | Durasi yang tidak menjadi frame bulat (0,01 detik) | TERDETEKSI | Adegan 1 (s01-old-town-morning): end 4.01 detik tidak menjadi frame bulat pada 30 FPS |
| 5 | ID adegan ganda | TERDETEKSI | Adegan 2 (s01-old-town-morning): id adegan ganda |
| 6 | Adegan terakhir tidak menutup akhir film | TERDETEKSI | Adegan terakhir harus berakhir tepat di akhir film (frame 360), bukan 359 |
| 7 | Transisi tidak melewati batas adegan | TERDETEKSI | Transisi dari s01-old-town-morning: rentang frame 0..23 harus melewati batas adegan di frame 120 |
| 8 | Jenis transisi tidak dikenal | TERDETEKSI | Transisi dari s01-old-town-morning: jenis "wipe-hantu" tidak dikenal (pilihan: cut, dissolve, portal) |
| 9 | ID aset tidak dikenal | TERDETEKSI | Adegan 1 (s01-old-town-morning) entitas "hantu": aset "aset-hantu" tidak ditemukan |
| 10 | Track kamera tidak dikenal | TERDETEKSI | Adegan 1 (s01-old-town-morning): track kamera "track-hantu" tidak ditemukan |
| 11 | Keyframe tidak valid (frame mundur) | TERDETEKSI | Lingkungan "uji" key 1: frame harus berurutan naik |
| 12 | Keyframe dengan easing tidak dikenal | TERDETEKSI | Lingkungan "uji" key 1: easing "memantul-hantu" tidak dikenal |
| 13 | Parameter entitas/aset tidak valid | TERDETEKSI | Pemeran "pak-darto" params: parameter "parameterHantu" tidak dikenal |
| 14 | Nilai parameter di luar batas | TERDETEKSI | Pemeran "pak-darto" paramTracks.headTurn key 1: nilai 5 di luar batas -1..1 |
| 15 | Skala entitas bukan bilangan bulat (grid piksel rusak) | TERDETEKSI | Pemeran "pak-darto": scale harus bilangan bulat 1..4 agar grid piksel tetap rapi |
| 16 | Zoom kamera tanpa mode upscale "browser" (piksel jadi tidak tajam) | TERDETEKSI | Track kamera "walk-follow": zoom kamera hanya didukung bila rendering.upscale = "browser" (agar piksel tetap tajam) |
| 17 | Mode zoom salah ketik | TERDETEKSI | Proyek: rendering.zoomMode "zoom-hantu" tidak dikenal (pilihan: anchored, steps, nearest) |
| 18 | Lensa zoom di mode upscale ffmpeg | TERDETEKSI | Track kamera "walk-follow": zoom kamera hanya didukung bila rendering.upscale = "browser" (agar piksel tetap tajam) |
| 19 | Zoom pecahan dengan cara lama (nearest): grid piksel merayap | TERDETEKSI | Grid piksel stabil saat kamera bergerak dan zoom (tidak merayap): GAGAL, mode zoom "nearest", 29 frame zoom pecahan, 0 perubahan ukuran saat zoom tetap (crawl), 2304 bolak-balik dari 15992 perbandingan kolom/baris dunia (pakai rendering.zoomMode "anchored" agar tidak merayap) / kontrol anchored: lolos |
| 20 | Nama efek salah ketik | TERDETEKSI | Adegan 2 (s02-morning-walk): efek "hujan-deras-salah-ketik" tidak dikenal |
| 21 | Proyek yang tidak ada | TERDETEKSI | exit 1: RENDER GAGAL: Proyek "proyek-hantu" tidak ditemukan. Proyek yang tersedia: /   - night-to-dawn        Kereta Malam Menuju Fajar (15 detik, 30 FPS) |
| 22 | Adegan yang tidak ada | TERDETEKSI | exit 1: RENDER GAGAL: Adegan "adegan-hantu" tidak ada di proyek old-town-morning. Pilihan: s01-old-town-morning, s02-morning-walk, s03-town-awakens |
| 23 | Video kurang 1 frame (359 frame) | TERDETEKSI | Jumlah frame: GAGAL, 359 dari 360 frame / Durasi: GAGAL, 11.967 detik (target 12.000) |
| 24 | Resolusi salah (1280x720) | TERDETEKSI | Resolusi output: GAGAL, 1280x720 |
| 25 | FPS salah (25 FPS) | TERDETEKSI | Frame rate: GAGAL, 25/1 (rata-rata 25/1) / Durasi: GAGAL, 14.400 detik (target 12.000) |
| 26 | Format yang sulit diputar perangkat umum (yuv444p) | TERDETEKSI | Video dapat diputar di perangkat umum: GAGAL, profil High 4:4:4 Predictive, level 4.0, yuv444p, piksel 1:1, faststart ya / Format piksel: GAGAL, yuv444p |
| 27 | Frame hitam disisipkan di frame 162 | TERDETEKSI | Tidak ada frame kosong: GAGAL, frame kosong: 162 / Tidak ada kilatan cahaya mendadak: GAGAL, lompatan kecerahan di frame 162 (-127.0), 163 (127.0) |
| 28 | Film berakhir di layar hitam | TERDETEKSI | Frame terakhir valid: GAGAL, frame 359: kecerahan rata-rata 16.0, rentang 3 |
| 29 | Frame 162 hilang dari folder frame | TERDETEKSI | Frame PNG lengkap dan berurutan: GAGAL, frame hilang: 162 |
| 30 | Render gagal, tetapi MP4 lama masih ada | TERDETEKSI | render exit 1, MP4 lama masih ada dan terlihat sah, Render terakhir selesai dengan sukses: GAGAL, status "failed": Error JavaScript di dalam adegan (frame 5): Error: Render sengaja digagalkan (uji negatif) |
| 31 | MP4 diganti tanpa render ulang | TERDETEKSI | Video berasal dari render terbaru (bukan sisa render lama): GAGAL, berubah sejak render terakhir: file MP4 |
| 32 | Konfigurasi diubah setelah render (MP4 kedaluwarsa) | TERDETEKSI | Video berasal dari render terbaru (bukan sisa render lama): GAGAL, berubah sejak render terakhir: konfigurasi proyek |
| 33 | Pergantian adegan dengan potongan kasar (hard cut) | TERDETEKSI | Tidak ada potongan kasar (hard cut): GAGAL, lonjakan di frame 120 (beda 35.7, di transisi cut) / kontrol transisi dissolve: lolos |
| 34 | Aset pak-darto tampil berbeda di adegan terakhir | TERDETEKSI | Warna identitas pak-darto konsisten: GAGAL, frame 330: #ece6d6 #5a4a3a #1c1a1e |
| 35 | Adegan memakai Math.random() (tidak deterministik) | TERDETEKSI | Rendering deterministik (render ulang identik, urutan terbalik): GAGAL, 30 frame berbeda, contoh: 29, 28, 27, 26, 25, 24 |
| 36 | Error JavaScript di tengah render | TERDETEKSI | render dihentikan: Error JavaScript di dalam adegan (frame 5): Error: kesalahan uji di frame 5 |

Status akhir: **SEMUA KESALAHAN TERDETEKSI** (36/36)
