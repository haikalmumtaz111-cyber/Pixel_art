# Uji Antar-Proyek

Membuktikan semua proyek memakai mesin yang sama dan tidak saling bergantung.
Dibuat otomatis oleh `npm run test:projects` pada 2026-10-27T12:26:12.126Z.

| No | Pemeriksaan | Hasil | Detail |
|----|-------------|-------|--------|
| 1 | Proyek terdaftar | LULUS | 3 proyek: night-to-dawn, old-town-morning, train-night-rain |
| 2 | Konfigurasi night-to-dawn valid | LULUS | 3 adegan, 450 frame, 4 aset |
| 3 | Konfigurasi old-town-morning valid | LULUS | 3 adegan, 360 frame, 25 aset |
| 4 | Konfigurasi train-night-rain valid | LULUS | 1 adegan, 150 frame, 0 aset |
| 5 | Semua proyek memakai satu konfigurasi mesin | LULUS | Pixel History Studio 0.4.0 |
| 6 | File konfigurasi proyek tidak saling berbagi | LULUS | night-to-dawn: 1 file, old-town-morning: 8 file, train-night-rain: 1 file |
| 7 | Semua aset night-to-dawn bisa dibuat | LULUS | 4/4 aset (character, steam-train, countryside, coach-interior) |
| 8 | Referensi aset night-to-dawn utuh | LULUS | s01-night-train (3), s02-inside-train (4), s03-journey-to-dawn (2) |
| 9 | Setiap adegan night-to-dawn bisa dirender terpisah | LULUS | 3 adegan dirender sendiri-sendiri tanpa error |
| 10 | Semua aset old-town-morning bisa dibuat | LULUS | 25/25 aset (gradient-sky, cloud-field, ridge, skyline, tree, shophouse, street-lamp, kiosk, bench, street, bicycle, birds, particles, light-rays, rig-character) |
| 11 | Referensi aset old-town-morning utuh | LULUS | s01-old-town-morning (19), s02-morning-walk (22), s03-town-awakens (25) |
| 12 | Setiap adegan old-town-morning bisa dirender terpisah | LULUS | 3 adegan dirender sendiri-sendiri tanpa error |
| 13 | Semua aset train-night-rain bisa dibuat | LULUS | 0/0 aset (tanpa daftar aset bersama) |
| 14 | Referensi aset train-night-rain utuh | LULUS | train-night-rain (0) |
| 15 | Setiap adegan train-night-rain bisa dirender terpisah | LULUS | 1 adegan dirender sendiri-sendiri tanpa error |
| 16 | Semua proyek memuat file mesin inti yang sama | LULUS | 3 proyek x 16 file src/engine: camera.js, composer.js, entities.js, environment.js, film.js, math.js, palette.js, pixel-grid.js, pixel.js, presenter.js, random.js, registry.js, runtime.js, schedule.js, tracks.js, transitions.js |
| 17 | Merusak konfigurasi old-town-morning tidak memengaruhi night-to-dawn | LULUS | old-town-morning ditolak validator, night-to-dawn frame 0, 225, 449 identik dengan render resmi |
| 18 | Merusak konfigurasi night-to-dawn tidak memengaruhi old-town-morning | LULUS | night-to-dawn ditolak validator, old-town-morning frame 0, 180, 359 identik dengan render resmi |

Status akhir: **SEMUA LULUS** (18/18)
