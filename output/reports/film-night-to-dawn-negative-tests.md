# Pengujian Negatif: Kereta Malam Menuju Fajar

Setiap baris adalah hasil yang SENGAJA dibuat salah. Pengujian lulus bila validator menolaknya (TERDETEKSI).
Dibuat otomatis oleh `npm run test:negative` pada 2026-10-27T08:23:39.647Z.

| No | Kesalahan yang disengaja | Hasil | Detail |
|----|--------------------------|-------|--------|
| 1 | Timeline berlubang: adegan 2 mulai 1 frame terlambat | TERDETEKSI | Interval adegan valid: GAGAL, Adegan 2 (s02-inside-train): harus mulai tepat setelah adegan sebelumnya (frame 150), tidak boleh ada celah atau tumpang tindih |
| 2 | Timeline tumpang tindih: adegan 3 mulai di frame 290 | TERDETEKSI | Interval adegan valid: GAGAL, Adegan 3 (s03-journey-to-dawn): harus mulai tepat setelah adegan sebelumnya (frame 300), tidak boleh ada celah atau tumpang tindih |
| 3 | Durasi adegan tidak cocok dengan rentang frame | TERDETEKSI | Interval adegan valid: GAGAL, Adegan 1 (s01-night-train): durationFrames 151 tidak cocok dengan 0..149 |
| 4 | Transisi tidak melewati batas adegan | TERDETEKSI | Interval adegan valid: GAGAL, Transisi dari s01-night-train: rentang 100..140 harus melewati batas adegan di frame 150 |
| 5 | Nama efek salah ketik di timeline | TERDETEKSI | Interval adegan valid: GAGAL, Adegan 2 (s02-inside-train): efek "hujan-deras-salah-ketik" tidak dikenal |
| 6 | Video kurang 1 frame (449 frame) | TERDETEKSI | Jumlah frame: GAGAL, 449 dari 450 frame / Durasi: GAGAL, 14.967 detik (target 15.000) |
| 7 | Resolusi salah (1280x720) | TERDETEKSI | Resolusi output: GAGAL, 1280x720 |
| 8 | FPS salah (25 FPS) | TERDETEKSI | Frame rate: GAGAL, 25/1 (rata-rata 25/1) / Durasi: GAGAL, 18.000 detik (target 15.000) |
| 9 | Format yang sulit diputar perangkat umum (yuv444p) | TERDETEKSI | Video dapat diputar di perangkat umum: GAGAL, profil High 4:4:4 Predictive, level 4.0, yuv444p, piksel 1:1, faststart ya / Format piksel: GAGAL, yuv444p |
| 10 | Frame hitam disisipkan di frame 200 | TERDETEKSI | Tidak ada frame kosong: GAGAL, frame kosong: 200 / Tidak ada kilatan cahaya mendadak: GAGAL, lompatan kecerahan di frame 200 (-31.9), 201 (31.9) |
| 11 | Frame 123 hilang dari folder frame | TERDETEKSI | Frame PNG lengkap dan berurutan: GAGAL, frame hilang: 123 |
| 12 | Pergantian adegan dengan potongan kasar (hard cut) | TERDETEKSI | Tidak ada potongan kasar (hard cut): GAGAL, lonjakan di frame 150 (beda 15.0, di transisi cut) / kontrol transisi portal: lolos |
| 13 | Portal terlalu kecil sehingga gambar melompat di akhir transisi | TERDETEKSI | Portal s01-night-train->s02-inside-train menutup layar sebelum transisi selesai: GAGAL, layar tertutup penuh mulai frame 167 (transisi berakhir di 167) |
| 14 | Kereta dengan desain berbeda dipakai di adegan 3 | TERDETEKSI | Aset kereta konsisten di semua adegan: GAGAL, 3 adegan memakai 2 definisi kereta (train, train-b), 2 bentuk berbeda / Warna identitas kereta sama di tiap adegan luar: GAGAL, frame 445: #5c1c27 #4d5474 |
| 15 | Adegan memakai Math.random() (tidak deterministik) | TERDETEKSI | Rendering deterministik (render ulang identik, urutan terbalik): GAGAL, 30 frame berbeda, contoh: 29, 28, 27, 26, 25, 24 |
| 16 | Error JavaScript di tengah render | TERDETEKSI | render dihentikan: Error JavaScript di dalam adegan (frame 5): Error: kesalahan uji di frame 5 |

Status akhir: **SEMUA KESALAHAN TERDETEKSI** (16/16)
