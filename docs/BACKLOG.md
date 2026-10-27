# Catatan Peningkatan

Daftar keterbatasan yang ditemukan saat meninjau film Tahap 2 (*Kereta Malam Menuju Fajar*). Semua pengujian otomatis lulus, jadi butir-butir di bawah bukan kesalahan yang memblokir. Daftar ini adalah bahan peningkatan untuk tahap berikutnya. Nomor frame merujuk ke `config/film-night-to-dawn.json`.

## Visual

| No | Keterbatasan | Lokasi | Ide perbaikan |
|----|--------------|--------|---------------|
| V1 | Saat zoom menembus jendela, ketebalan piksel kadang tidak seragam (garis 1 piksel bisa menjadi 2 atau 3 piksel). Siluet penumpang di jendela tetangga terlihat kotak-kotak besar. | Transisi 1 (frame 140-160), transisi 2 (frame 290-305) | Gambar versi close-up gerbong dan interior secara khusus, lalu pakai zoom bertingkat bilangan bulat (2x, 3x, 4x) di antaranya |
| V2 | Kecerahan masih naik sekitar +12 saat kamera mendekati gerbong yang terang (puncak frame 151). Lompatan per frame paling besar 5,9, masih di bawah batas 8. | Transisi 1 | Atur "eksposur kamera" lewat track di timeline supaya kecerahan tetap rata |
| V3 | Getaran interior menggeser seluruh ruangan 1 piksel sekaligus. Di layar 1080p geseran ini setara 4 piksel dan bisa terasa sedikit tersentak. | Adegan 2 | Getarkan lapisan secara terpisah (lampu, koper, penumpang) dengan jeda berbeda, atau ganti dengan ayunan pelan |
| V4 | Pemandangan dari jendela tidak mengikuti geometri 3D sungguhan: kamera luar berada di depan kereta, dan sorot lampu kereta disembunyikan dari pandangan jendela. | Adegan 2 dan awal adegan 3 | Buat set "pemandangan dari jendela" khusus dengan kedalaman sendiri |
| V5 | Di awal adegan 3 kamera masih menunduk, sehingga sepertiga bawah layar berisi tanah gelap selama sekitar 1 detik. | Frame 300-340 | Tambah detail tanah (genangan berkilau, rumput basah) atau mulai gerak kamera ke atas lebih awal |
| V6 | Sorot lampu kereta sudah muncul samar di kiri layar sebelum keretanya masuk bingkai. | Frame 305-350 | Sembunyikan sorot sampai lokomotif dekat tepi layar, atau tambahkan cahaya yang jatuh di rel |
| V7 | Kabut berupa pola dither yang rata, belum berbentuk gumpalan yang bergerak. | Adegan 3 | Kabut berlapis dengan sprite gumpalan dan kecepatan berbeda |
| V8 | Hujan dekat di pemandangan jendela cukup lebat, sehingga jendela terlihat ramai. | Adegan 2 | Kurangi hujan dekat khusus untuk pemandangan jendela |
| V9 | Cahaya lampu minyak di dinding atas membentuk busur lingkaran bertingkat yang cukup jelas. | Adegan 2 | Pakai bentuk cahaya yang lebih tidak beraturan dan tingkat transparansi yang lebih halus |
| V10 | Penumpang kecil di layar (sekitar 75 piksel). Ekspresinya hanya kedip 1 piksel, napas 1 piksel, dan geser kepala, tanpa gerak tangan. | Adegan 2 | Tambah shot close-up, gerak tangan (memegang topi atau koran), dan variasi ekspresi |
| V11 | Saat fajar, lampu jendela masih cukup terang (tingkat lampu 0,3) dan warnanya masih kuning. | Akhir adegan 3 | Turunkan nilai `lights` di timeline atau tambah pantulan langit pagi di kaca |
| V12 | Matahari baru setengah terlihat dan belum ada berkas sinar. | Akhir adegan 3 | Tambah berkas sinar berdither dan cahaya pinggir (rim light) pagi pada kereta |
| V13 | Interior gerbong masih sepi: hanya satu penumpang, kursi seberang kosong. | Adegan 2 | Tambah karakter latar memakai sistem karakter yang sama |

## Teknis

| No | Keterbatasan | Ide perbaikan |
|----|--------------|---------------|
| T1 | Transisi `dissolve` sudah tersedia di pustaka tetapi belum dipakai di film dan belum punya pengujian otomatis sendiri. | Tambah film uji pendek yang memakai `dissolve` beserta pemeriksaannya |
| T2 | Determinisme dijamin di versi Chromium dan FFmpeg yang sama. Di versi lain bisa muncul selisih piksel kecil. | Catat versi alat di laporan (sudah) dan pertimbangkan render di kontainer yang dikunci versinya |
| T3 | Belum ada audio dan musik. | Rencanakan sistem audio di tahap yang sesuai |
| T4 | Daftar jenis aset, transisi, easing, dan efek ditulis dua kali (di kode browser dan di pemeriksa timeline Node). | Satukan ke satu file data yang dibaca keduanya |
