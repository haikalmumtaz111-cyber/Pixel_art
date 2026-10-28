# Pembanding Tahap 5: gerak dan cahaya karakter

Dibuat otomatis oleh `npm run demo:character` pada 2026-10-28T04:41:16.741Z, dari proyek demo `character-lab`.
"Sebelum" = proyek yang sama dengan semua karakter rig memakai gerak klasik tanpa cahaya palet (perilaku Tahap 3-4).
"Sesudah" = konfigurasi proyek apa adanya (gerak natural, cahaya palet).

## Gerak (seluruh film, semua karakter yang berjalan)

| Ukuran | Sebelum | Sesudah |
|--------|---------|---------|
| Langkah (telapak menapak) yang diukur | 98 | 97 |
| Langkah yang telapaknya meluncur | 98 | 0 |
| Telapak meluncur rata-rata per langkah | 5.4 px | 0 px |
| Telapak meluncur terjauh | 11 px | 0 px |
| Pinggul bolak-balik dalam 1 frame (getar) | 5 | 0 |

Satuan px = piksel art (1 piksel art = 4 piksel layar di zoom 1, 8 piksel layar di zoom 2).

## Warna identitas Pak Darto (baju, celana, peci) per waktu

| Waktu | Sebelum (warna tetap) | Sesudah (mengikuti palet) |
|-------|-----------------------|---------------------------|
| PAGI (frame 60) | #ece6d6, #5a4a3a, #1c1a1e | #e5d1bf, #5d4a45, #24212f |
| SIANG (frame 170) | #ece6d6, #5a4a3a, #1c1a1e | #ece6d6, #5a4a3a, #1c1a1e |
| SORE (frame 280) | #ece6d6, #5a4a3a, #1c1a1e | #e4b793, #66423d, #311e2d |
| MALAM (frame 350) | #ece6d6, #5a4a3a, #1c1a1e | #727ea4, #333348, #181c38 |

Bahan visual: `output/comparisons/v15-v16-sebelum-sesudah.mp4`, `output/comparisons/v16-langkah.png`, `output/comparisons/v15-cahaya.png`.
