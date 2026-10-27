# Lab Zoom: Perbandingan Pendekatan Grid Piksel

Dibuat otomatis oleh `npm run test:zoom` pada 2026-10-27T12:28:04.117Z. Setiap mode dirender dengan pola kalibrasi
"identity" (setiap piksel art punya warna unik), lalu ukuran dan posisi piksel art dibaca dari gambar 1920x1080.
Dua lapisan dipakai (latar jauh parallax 0,5 dan pita dekat parallax 1) supaya pengaruh parallax ikut teruji.

## Ringkasan per mode

| Ukuran | nearest (cara Tahap 3) | steps (zoom dibulatkan) | anchored, satu kanvas (pola menempel layar) | anchored per lapisan (bawaan Tahap 4) |
|---|---|---|---|---|
| Piksel asing (blur/AA) | 0 | 0 | 0 | 0 |
| Frame seragam di zoom kelipatan 0,25 | 76/76 | 336/336 | 76/76 | 76/76 |
| Frame dengan lebih dari 2 ukuran | 0 | 0 | 0 | 0 |
| Crawl saat geser di zoom pecahan | 46822 (43.86%) | 0 (0%) | 45642 (42.75%) | 0 (0%) |
| Crawl saat geser di zoom bulat | 0 | 0 | 0 | 0 |
| Selisih geseran dalam satu lapisan (px) | 1 | 0 | 2 | 0 |
| Piksel bolak-balik saat zoom | 18902 | 0 | 11721 | 0 |
| Galat skala terbesar (px per piksel art) | 0.003 | 0.5 | 0.007 | 0.007 |
| Lompatan skala terbesar antar frame | 0.005 | 0.971 | 0.007 | 0.007 |

## Per skenario

| Skenario | Frame | nearest (cara Tahap 3) | steps (zoom dibulatkan) | anchored, satu kanvas (pola menempel layar) | anchored per lapisan (bawaan Tahap 4) |
|---|---|---|---|---|---|
| Tangga zoom 1 sampai 4 (kamera diam) | 15 | crawl 0, kaku 0, bolak-balik 224, lompatan 0.003 | crawl 0, kaku 0, bolak-balik 0, lompatan 0.6 | crawl 0, kaku 0, bolak-balik 0, lompatan 0.007 | crawl 0, kaku 0, bolak-balik 0, lompatan 0.002 |
| Geser horizontal, zoom 1,1 | 30 | crawl 14960, kaku 1, bolak-balik 0, lompatan 0 | crawl 0, kaku 0, bolak-balik 0, lompatan 0 | crawl 15288, kaku 2, bolak-balik 0, lompatan 0 | crawl 0, kaku 0, bolak-balik 0, lompatan 0.002 |
| Geser vertikal, zoom 1,1 | 30 | crawl 4182, kaku 1, bolak-balik 0, lompatan 0 | crawl 0, kaku 0, bolak-balik 0, lompatan 0 | crawl 4140, kaku 1, bolak-balik 0, lompatan 0 | crawl 0, kaku 0, bolak-balik 0, lompatan 0 |
| Geser diagonal, zoom 1,1 | 30 | crawl 19608, kaku 1, bolak-balik 0, lompatan 0 | crawl 0, kaku 0, bolak-balik 0, lompatan 0 | crawl 19550, kaku 2, bolak-balik 0, lompatan 0 | crawl 0, kaku 0, bolak-balik 0, lompatan 0.002 |
| Geser diagonal, zoom 2,37 | 30 | crawl 8072, kaku 1, bolak-balik 0, lompatan 0 | crawl 0, kaku 0, bolak-balik 0, lompatan 0 | crawl 6664, kaku 2, bolak-balik 0, lompatan 0 | crawl 0, kaku 0, bolak-balik 0, lompatan 0.005 |
| Geser horizontal, zoom 1,25 (bulat) | 30 | crawl 0, kaku 0, bolak-balik 0, lompatan 0 | crawl 0, kaku 0, bolak-balik 0, lompatan 0 | crawl 0, kaku 0, bolak-balik 0, lompatan 0 | crawl 0, kaku 0, bolak-balik 0, lompatan 0 |
| Geser diagonal, zoom 1,75 (bulat) | 30 | crawl 0, kaku 0, bolak-balik 0, lompatan 0 | crawl 0, kaku 0, bolak-balik 0, lompatan 0 | crawl 0, kaku 0, bolak-balik 0, lompatan 0 | crawl 0, kaku 0, bolak-balik 0, lompatan 0 |
| Zoom masuk 1 ke 1,25 (kamera diam) | 36 | crawl 0, kaku 0, bolak-balik 5965, lompatan 0.003 | crawl 0, kaku 0, bolak-balik 0, lompatan 0.971 | crawl 0, kaku 0, bolak-balik 0, lompatan 0.005 | crawl 0, kaku 0, bolak-balik 0, lompatan 0.004 |
| Zoom keluar 1,5 ke 1 sambil geser horizontal | 45 | crawl 0, kaku 0, bolak-balik 6099, lompatan 0.004 | crawl 0, kaku 0, bolak-balik 0, lompatan 0.955 | crawl 0, kaku 0, bolak-balik 5959, lompatan 0.005 | crawl 0, kaku 0, bolak-balik 0, lompatan 0.005 |
| Zoom masuk 1 ke 2 sambil geser diagonal | 60 | crawl 0, kaku 0, bolak-balik 6614, lompatan 0.005 | crawl 0, kaku 0, bolak-balik 0, lompatan 0.932 | crawl 0, kaku 0, bolak-balik 5762, lompatan 0.005 | crawl 0, kaku 0, bolak-balik 0, lompatan 0.007 |

## Syarat mode bawaan (anchored)

| No | Pemeriksaan | Hasil | Detail |
|----|-------------|-------|--------|
| 1 | Tanpa blur/anti-aliasing (semua mode, semua frame) | LULUS | nearest: 0 piksel asing, steps: 0 piksel asing, anchored-screen: 0 piksel asing, anchored: 0 piksel asing |
| 2 | Zoom kelipatan 0,25: semua piksel berukuran sama | LULUS | anchored 76/76 frame seragam |
| 3 | Zoom pecahan: paling banyak dua ukuran berdampingan | LULUS | 0 frame melanggar |
| 4 | Tidak merayap saat kamera geser di zoom pecahan (horizontal, vertikal, diagonal) | LULUS | anchored 0 perubahan ukuran (0%), pembanding nearest 46822 (43.86%) |
| 5 | Gerak kaku: semua piksel satu lapisan bergeser sama jauh | LULUS | selisih geseran terbesar anchored 0 px, nearest 1 px |
| 6 | Saat zoom berubah tidak ada piksel yang bolak-balik ukuran | LULUS | anchored 0, nearest 18902 |
| 7 | Skala halus: tidak ada lompatan zoom (pop) | LULUS | anchored lompatan 0.007 px/piksel art, galat 0.007; steps lompatan 0.971, galat 0.5 |
| 8 | Pemetaan terpisah per sumbu konsisten (tiap kolom sama lebar di semua baris) | LULUS | 0 konflik |
| 9 | Project A di mode browser zoom 1 identik dengan baseline resmi | LULUS | frame 0, 15, 29: anchored 3/3, nearest 3/3 identik setelah diperkecil 4x |
| 10 | Project A dengan lensa zoom pecahan tidak merayap (adegan kustom berlapis) | LULUS | anchored: mode zoom "anchored", 89 frame zoom pecahan, 0 perubahan ukuran saat zoom tetap (crawl), 0 bolak-balik dari 649831 perbandingan kolom/baris dunia | pembanding nearest: mode zoom "nearest", 89 frame zoom pecahan, 0 perubahan ukuran saat zoom tetap (crawl), 6584 bolak-balik dari 80354 perbandingan kolom/baris dunia (pakai rendering.zoomMode "anchored" agar tidak merayap) |

Status akhir: **SEMUA LULUS** (10/10)
