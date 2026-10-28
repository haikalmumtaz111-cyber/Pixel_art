# Catatan Peningkatan

Daftar keterbatasan yang ditemukan saat meninjau hasil setiap tahap. Semua pengujian otomatis lulus, jadi butir-butir di bawah bukan kesalahan yang memblokir. Daftar ini adalah bahan peningkatan untuk tahap berikutnya. Butir lama tidak dihapus; yang sudah beres diberi status.

Prioritas: **Tinggi** = paling terasa di hasil atau paling berisiko, **Sedang** = layak dikerjakan di tahap berikutnya, **Rendah** = penghalusan.

Kondisi terakhir: Tahap 3 disetujui dan di-merge ke `main` (PR #3). Tahap 4 (kamera pixel-perfect, fokus V14) disetujui pemilik dan di-merge ke `main` (PR #4), termasuk perubahan hasil render Project B. Audit final PR #4 (clean clone) lulus di semua pemeriksaan wajib. Dua temuannya dicatat sebagai V24 dan V25. Setelah Tahap 4, baseline regresi dibuat berversi dan Project B memakai baseline resmi Tahap 4 (PR #5, disetujui dan di-merge ke `main`); audit final PR #5 mencatat T17 dan T18. T17 selesai lewat PR #6 (di-merge ke `main`). Tahap 5 belum dimulai. Butir di bawah adalah kandidat, bukan rencana yang sudah disetujui; pemilik yang memilih isi tahap berikutnya.

## Ringkasan kandidat untuk tahap berikutnya

| Prioritas | Butir terbuka |
|-----------|---------------|
| Tinggi | (kosong: V14 selesai di Tahap 4) |
| Sedang | V1, V3, V5, V10, V13 (Project A); V15, V16, V17 (Project B); T2, T5, T6, T7, T13, T14 |
| Rendah | sisanya: V2, V4, V6-V9, V11, V12, V18-V22, V23, V24, V25, T3, T8-T12, T15, T16, T18 |

## Temuan Tahap 2: film *Kereta Malam Menuju Fajar* (Project A)

Nomor frame merujuk ke `config/film-night-to-dawn.json`. Visual Project A sengaja tidak diubah di Tahap 3, supaya uji regresi membuktikan hasilnya identik dengan `main`.

### Visual

| No | Keterbatasan | Lokasi | Ide perbaikan | Prioritas | Status |
|----|--------------|--------|---------------|-----------|--------|
| V1 | Saat zoom menembus jendela, ketebalan piksel kadang tidak seragam (garis 1 piksel bisa menjadi 2 atau 3 piksel). Siluet penumpang di jendela tetangga terlihat kotak-kotak besar. | Transisi 1 (frame 140-160), transisi 2 (frame 290-305) | Gambar versi close-up gerbong dan interior secara khusus, lalu pakai zoom bertingkat bilangan bulat (2x, 3x, 4x) di antaranya | Sedang | Terbuka |
| V2 | Kecerahan masih naik sekitar +12 saat kamera mendekati gerbong yang terang (puncak frame 151). Lompatan per frame paling besar 5,9, masih di bawah batas 8. | Transisi 1 | Atur "eksposur kamera" lewat track di timeline supaya kecerahan tetap rata | Rendah | Terbuka |
| V3 | Getaran interior menggeser seluruh ruangan 1 piksel sekaligus. Di layar 1080p geseran ini setara 4 piksel dan bisa terasa sedikit tersentak. | Adegan 2 | Getarkan lapisan secara terpisah (lampu, koper, penumpang) dengan jeda berbeda, atau ganti dengan ayunan pelan | Sedang | Terbuka |
| V4 | Pemandangan dari jendela tidak mengikuti geometri 3D sungguhan: kamera luar berada di depan kereta, dan sorot lampu kereta disembunyikan dari pandangan jendela. | Adegan 2 dan awal adegan 3 | Buat set "pemandangan dari jendela" khusus dengan kedalaman sendiri | Rendah | Terbuka |
| V5 | Di awal adegan 3 kamera masih menunduk, sehingga sepertiga bawah layar berisi tanah gelap selama sekitar 1 detik. | Frame 300-340 | Tambah detail tanah (genangan berkilau, rumput basah) atau mulai gerak kamera ke atas lebih awal | Sedang | Terbuka |
| V6 | Sorot lampu kereta sudah muncul samar di kiri layar sebelum keretanya masuk bingkai. | Frame 305-350 | Sembunyikan sorot sampai lokomotif dekat tepi layar, atau tambahkan cahaya yang jatuh di rel | Rendah | Terbuka |
| V7 | Kabut berupa pola dither yang rata, belum berbentuk gumpalan yang bergerak. | Adegan 3 | Kabut berlapis dengan sprite gumpalan dan kecepatan berbeda | Rendah | Terbuka |
| V8 | Hujan dekat di pemandangan jendela cukup lebat, sehingga jendela terlihat ramai. | Adegan 2 | Kurangi hujan dekat khusus untuk pemandangan jendela | Rendah | Terbuka |
| V9 | Cahaya lampu minyak di dinding atas membentuk busur lingkaran bertingkat yang cukup jelas. | Adegan 2 | Pakai bentuk cahaya yang lebih tidak beraturan dan tingkat transparansi yang lebih halus | Rendah | Terbuka |
| V10 | Penumpang kecil di layar (sekitar 75 piksel). Ekspresinya hanya kedip 1 piksel, napas 1 piksel, dan geser kepala, tanpa gerak tangan. | Adegan 2 | Tambah shot close-up, gerak tangan (memegang topi atau koran), dan variasi ekspresi. Rig karakter Tahap 3 sudah punya isyarat tangan dan bisa dipakai | Sedang | Terbuka |
| V11 | Saat fajar, lampu jendela masih cukup terang (tingkat lampu 0,3) dan warnanya masih kuning. | Akhir adegan 3 | Turunkan nilai `lights` di timeline atau tambah pantulan langit pagi di kaca | Rendah | Terbuka |
| V12 | Matahari baru setengah terlihat dan belum ada berkas sinar. | Akhir adegan 3 | Tambah berkas sinar berdither dan cahaya pinggir (rim light) pagi pada kereta. Aset `light-rays` Tahap 3 sudah tersedia | Rendah | Terbuka |
| V13 | Interior gerbong masih sepi: hanya satu penumpang, kursi seberang kosong. | Adegan 2 | Tambah karakter latar memakai sistem karakter yang sama. Rig karakter Tahap 3 bisa dipakai | Sedang | Terbuka |

### Teknis

| No | Keterbatasan | Ide perbaikan | Prioritas | Status |
|----|--------------|---------------|-----------|--------|
| T1 | Transisi `dissolve` sudah tersedia di pustaka tetapi belum dipakai di film dan belum punya pengujian otomatis sendiri. | Tambah film uji pendek yang memakai `dissolve` beserta pemeriksaannya | Sedang | **Selesai di Tahap 3**: dipakai Project B (adegan 1 ke 2), diuji kesinambungan per byte dan jadi kontrol di uji hard cut |
| T2 | Determinisme dijamin di versi Chromium dan FFmpeg yang sama. Di versi lain bisa muncul selisih piksel kecil. | Catat versi alat di laporan (sudah) dan pertimbangkan render di kontainer yang dikunci versinya | Sedang | Sebagian: versi Playwright dikunci di `package.json`, uji asap CI membandingkan frame dengan baseline. Kontainer terkunci belum ada |
| T3 | Belum ada audio dan musik. | Rencanakan sistem audio di tahap yang sesuai | Rendah | Terbuka (di luar cakupan Tahap 3) |
| T4 | Daftar jenis aset, transisi, easing, dan efek ditulis dua kali (di kode browser dan di pemeriksa timeline Node). | Satukan ke satu file data yang dibaca keduanya | Tinggi | **Selesai di Tahap 3**: `config/engine.json` + `src/assets/catalog.json`, plus unit test yang mencocokkan daftar easing |

## Temuan Tahap 3: mesin reusable dan *Pagi di Kota Tua* (Project B)

Nomor frame merujuk ke `config/old-town-morning.json`.

### Visual

| No | Keterbatasan | Lokasi | Ide perbaikan | Prioritas |
|----|--------------|--------|---------------|-----------|
| V14 | Zoom dengan nilai tidak bulat (antara 1 dan 1,25) membuat lebar piksel art bergantian 4 dan 5 piksel layar. Saat zoom bergerak, tepi garis tampak sedikit "merayap". Tidak ada blur, dan di zoom 1 serta 1,25 piksel seragam sempurna. | Push-in adegan 1 (frame 84-119), pullback adegan 3 (frame 255-345) | Zoom bertingkat diskrit (1; 1,25; 1,5; 2) dengan dissolve antar tingkat, atau dunia digambar di resolusi kerja lebih tinggi | Tinggi. **Selesai di Tahap 4 (disetujui, PR #4)**: mode zoom `anchored` (grid terkunci per lapisan). Lab zoom: crawl 43,9% menjadi 0%, piksel bolak-balik 18.902 menjadi 0, tanpa blur. Dither dissolve juga diselaraskan dengan grid. Sisa batas: lihat V23, V24, V25 |
| V15 | Warna karakter ditulis tetap (hex), jadi tidak ikut berubah bersama palet pencahayaan pagi seperti bangunan dan langit. | Seluruh film | Izinkan warna karakter berupa kunci palet, atau ramp warna kulit/baju per palet | Sedang |
| V16 | Ayunan tangan saat berjalan masih kecil (sekitar 5 piksel) dan lengan depan hanya dibedakan garis bayangan, siku belum menekuk. | Pak Darto, Mbok Sumi, anak sekolah | Tambah sendi siku dan pose tangan per fase jalan, lengan dengan warna lebih kontras | Sedang |
| V17 | Dissolve berdither adegan 1 ke 2 masih menampakkan "bayangan" berpola selama 0,8 detik. Sudah dikurangi dengan push-in yang menyamakan framing kedua adegan. | Frame 108-131 | Dissolve per tingkat palet (bukan per piksel), atau ganti dengan potongan bergerak (match cut) | Sedang |
| V18 | Skala karakter dibuat besar supaya terbaca: warga sekitar 44 piksel, ruko dua lantai sekitar 90 piksel. Secara realistis orang seharusnya lebih kecil. | Seluruh film | Variasi skala per lapisan, karakter latar yang lebih kecil di trotoar seberang | Rendah |
| V19 | Pengendara sepeda duduk tegak dengan badan cukup panjang. Kaki sudah mengikuti pedal, tetapi lutut masih sederhana. | Adegan 2-3 | Pose mengayuh khusus dengan badan condong ke depan | Rendah |
| V20 | Lampu jalan padam mendadak dalam satu frame. | Frame 70, 100, 140, 175, 210, 250 | Redup bertahap lewat beberapa status warna, atau berkedip sebelum padam | Rendah |
| V21 | Merpati di trotoar kecil (4x2 piksel) dan sulit terlihat di layar HP. Uap kopi di warung tipis dan baru muncul di 2 detik terakhir. | Adegan 1-3, warung kopi | Perbesar merpati, tambah kepakan saat terbang menjauh dari penyapu; uap lebih tebal | Rendah |
| V22 | Berkas cahaya pagi digambar di atas semua lapisan, termasuk karakter. Belum ada bayangan karakter dan benda di trotoar. | Adegan 3 | Lapisan cahaya di belakang karakter, bayangan berdither di kaki entitas | Rendah |
| V23 | (Tahap 4) Di zoom pecahan, satu frame masih berisi dua ukuran piksel berdampingan (misalnya 4 dan 5 piksel layar). Polanya stabil dan tidak merayap, tetapi tidak seragam penuh. Ini batas matematis bila tanpa blur. | Selama push-in dan pullback | Tahan zoom di kelipatan 0,25 untuk shot panjang; push-in lebih cepat supaya fase campuran lebih singkat | Rendah |
| V24 | (Tahap 4, audit final PR #4) Di zoom pecahan mode `anchored`, lapisan semi-transparan menghasilkan sedikit warna baru. Penyebabnya, lapisan kini digabung di resolusi layar setelah diperbesar, bukan di resolusi art. Di Project B ada 23 warna yang tidak pernah muncul di film Tahap 3, totalnya 139.375 piksel (0,0187% dari seluruh piksel film). Sebanyak 21 warna hanya selisih 1 nilai (pembulatan). 2 warna selisih 4-5 nilai, totalnya 11 piksel di frame 274 dan 285, di tempat tepi berkas cahaya memotong piksel karakter. Bukan blur, karena tidak ada piksel yang dicampur dengan tetangganya. Lab zoom tidak menangkapnya karena pola kalibrasinya opak. | Frame 85-118, 274, 285, 330-337 | Tambah skenario lapisan semi-transparan di lab zoom (hitung warna asing). Gabungkan lapisan semi-transparan ke lapisan di bawahnya di resolusi art bila geserannya sama, atau batasi `globalAlpha` ke tingkat yang hasil campurannya sudah ada di palet | Rendah |
| V25 | (Tahap 4, audit final PR #4) Setiap lapisan punya grid sendiri. Di zoom pecahan, tepi objek di lapisan atas bisa jatuh di tengah piksel art lapisan bawah yang geserannya berbeda, lalu menyisakan potongan selebar 1-3 piksel layar. Lapisan dengan parallax sama tidak terdampak karena gridnya sejajar. Bukan crawl, karena di dalam satu lapisan semua piksel tetap bergerak kaku. Paling terlihat pada lapisan `light` (parallax 0) di atas karakter (parallax 1). | Pullback adegan 3, contoh frame 284-286 (tepi berkas cahaya di wajah karakter) | Taruh lapisan cahaya di parallax yang sama dengan subjek atau di belakang karakter (lihat V22). Ukur potongan di batas lapisan lewat skenario lab dua lapisan yang tumpang tindih | Rendah |

### Teknis

| No | Keterbatasan | Ide perbaikan | Prioritas |
|----|--------------|---------------|-----------|
| T5 | Mode upscale `browser` menyimpan PNG 1920x1080 per frame (sekitar 45 MB untuk 12 detik), lebih berat daripada PNG 480x270. | Simpan PNG internal + data zoom per frame, lalu biarkan FFmpeg memotong dan memperbesar | Sedang |
| T6 | Aset bergaya Tahap 2 (`steam-train`, `countryside`, `coach-interior`, `character`) belum mengikuti kontrak entitas, jadi hanya bisa dipakai lewat adegan kustom. | Pindahkan bertahap ke kontrak entitas sambil menjaga Project A identik (uji regresi sudah siap) | Sedang |
| T7 | Model ruko/pohon/kios di-cache per kombinasi parameter, termasuk parameter animasi (misalnya kerai kios `open`), sehingga cache bertambah selama animasi. Aman untuk durasi sekarang. | Pisahkan parameter animasi dari kunci cache | Sedang |
| T8 | Render bersegmen sudah bisa (`--frames a-b`, hasil identik karena tiap frame berdiri sendiri), tetapi belum ada perintah yang membagi film, merender paralel, lalu menggabungkan otomatis. | Perintah `render --segments N` + penggabung MP4 | Rendah |
| T9 | CI di GitHub hanya menjalankan lint, unit test, validasi konfigurasi, dan uji asap beberapa frame. Render penuh, validasi lengkap, uji negatif, dan regresi dijalankan lokal (`npm run build:all` lalu `npm test`, sekitar 6 menit). | Job CI terjadwal (misalnya mingguan) untuk render penuh | Rendah |
| T10 | Sidik jari pustaka aset di manifest mencakup seluruh `src/assets` dan `src/scenes`. Mengubah aset Project B membuat manifest Project A ikut kedaluwarsa, sehingga A perlu dirender ulang walau hasilnya sama. Disengaja (lebih aman), tetapi menambah waktu. | Sidik jari per modul yang benar-benar dimuat proyek (daftar `fetchedScripts` sudah tersedia) | Rendah |
| T11 | Font piksel baru mengenal A-Z, 0-9, titik, tanda hubung, dan &. Rasio layar yang didukung baru 16:9. | Tambah huruf kecil dan tanda baca; dukung 4:3 dan 9:16 di loader dan presenter | Rendah |
| T12 | Uji negatif dan validasi lengkap butuh render proyek terlebih dahulu. Prototipe Tahap 1 (format satu adegan) tidak ikut uji negatif karena tidak punya timeline. | Konversi prototipe ke format timeline sambil menjaga frame identik | Rendah |
| T14 | (Tahap 4) Adegan interior gerbong Project A (`inside-train`, dengan pemandangan jendela) belum menggambar per lapisan lewat surface. Bila diberi lensa zoom pecahan, lapisannya masih memakai pola yang menempel layar. Adegan `night-train` dan `journey-to-dawn` sudah per lapisan. | Teruskan fungsi `layer` ke interior dan pemandangan jendela | Sedang |
| T15 | (Tahap 4) Mode `anchored` di zoom pecahan menggambar setiap lapisan dengan ratusan potongan `drawImage`. Render Project B naik dari sekitar 22 menjadi 28 detik (360 frame). | Gabungkan lapisan yang geserannya sama, atau perbesar di GPU/WebGL | Rendah |
| T16 | (Tahap 4) Kamera bergeser per piksel art (4-5 piksel layar per langkah). Gerak sub-piksel (smooth scrolling) belum ada; bila ditambah, grid antar lapisan akan bergeser relatif satu sama lain. | Opsi `subpixelCamera` di penyaji, diukur dengan lab zoom | Rendah |
| T13 | Detektor potongan kasar membaca lonjakan beda kecerahan antar frame. Bila dua adegan berbatasan dengan framing yang sama (seperti push-in Project B), lalu dissolve diganti potongan langsung, tokoh yang tiba-tiba muncul ("pop") tidak terdeteksi. Ketahuan lewat uji negatif; ujinya kini memakai potongan dengan framing berbeda. | Deteksi "pop" per entitas: bandingkan visibilitas entitas di frame batas adegan, atau beda piksel per wilayah | Sedang |
| T17 | (Audit final PR #5) Job uji asap CI memasang FFmpeg dan pustaka Chromium lewat apt di setiap run. Pada 27 Oktober 2026 mirror Ubuntu di runner sangat lambat, dan job habis waktu 25 menit dua kali sebelum satu tes pun jalan. | Jalankan job di image resmi Playwright yang dikunci digest (Chromium dan pustakanya sudah ada) dan pasang FFmpeg paket resmi Ubuntu dari cache GitHub. **Selesai**: di-merge ke `main` lewat PR #6 (`9fbd38d`). Run pertama 1 menit 40 detik; run dengan cache memasang FFmpeg tanpa jaringan. Saat cache kosong FFmpeg tetap diunduh sekali dari Ubuntu (7 paket, 2 MB) | Sedang |
| T18 | (Audit final PR #5) Lint hanya mencocokkan file baseline dengan hash di registry di folder yang sama, jadi file yang diubah bersama hash-nya lolos lint. Sudah ditutup oleh `npm run test:baseline-guard` (pembanding `origin/main`, jalan di CI). Sisa celahnya: langkah penjaga ada di `ci.yml`, yang bisa diubah oleh PR yang sama, sehingga lapis terakhirnya tinjauan diff PR. | Pemilik mengaktifkan branch protection untuk `main` di pengaturan GitHub: wajib lewat PR dan wajib check CI lulus. Ini pengaturan repository, bukan kode | Rendah |
