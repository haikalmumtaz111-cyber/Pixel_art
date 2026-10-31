# Fixture proyek uji (Tahap 6A-2b)

File di folder ini adalah proyek uji, bukan proyek produksi. Folder ini berada di luar `projectsDir` (`config/`), jadi tidak ikut `npm run projects`, `build:all`, regresi, uji asap proyek resmi, atau registry baseline. Fixture dimuat lewat path, misalnya `npm run validate -- --project tests/fixtures/projects/uji-6a2b.json`.

| File | Isi |
|------|-----|
| `uji-6a2b.json` | fixture utama bersintaks waktu relatif adegan (Tahap 6A-1): 30 FPS, 9 detik = 270 frame, 3 adegan, 2 stage (`pasar` -> `bukit` -> `pasar`), mode `rendering.upscale: "browser"` |
| `uji-6a2b-global.json` | kembaran fixture utama yang ditulis tangan dengan sintaks lama (`start`/`end`, keyframe frame film). Dunia (aset, palet, stage) sama, hanya timeline yang berbeda |
| `uji-6a2b/assets.json`, `palettes.json`, `stages.json` | dunia bersama, mandiri. Palet berisi nilai literal (disalin sekali dari palet `character-lab` yang sudah di-resolve, hanya kunci yang dibutuhkan entitas fixture). Tidak ada `$include` ke `config/`, jadi perubahan proyek produksi tidak mengubah fixture |

Aturan:

- Output fixture ada di bawah `output/frames/<nama fixture>/` yang sudah di-ignore Git. Id dan nama fixture diawali `uji-` dan tidak boleh sama dengan proyek resmi (`tests/engine/fixture-6a2b.test.js`).
- Fixture tidak punya baseline. Pembandingnya selalu kembarannya sendiri (golden) atau varian yang dibuat saat uji.
- Sintaks waktu relatif adegan tetap belum boleh dipakai di proyek produksi atau untuk perekaman baseline resmi (keputusan pemilik D6).
- Key berbasis adegan diberi jarak minimal 3 frame dari tepi rentang tampil, supaya uji mutasi transisi (M2a, XM-D1) tidak membuang key dan tidak mencampur efek samping ke dalam deteksi. Satu pengecualian disengaja: kamera adegan c punya key di frame lokal 89 (frame terakhir film), supaya kamera tetap bergerak sampai akhir dan setiap frame unik.

## Tabel hitungan tangan (kembaran `uji-6a2b-global.json`)

Posisi: adegan a [0, 90), b [90, 180), c [180, 270). Transisi a->b `duration` 0,8 detik = 24 frame, `lead` 0,3 detik = 9 frame, jadi 90 - 9 = 81 sampai 104. Transisi b->c `duration` 0,6 detik = 18 frame, `lead` bawaan 18 / 2 = 9, jadi 171 sampai 188. Rentang tampil: a [0, 105), b [81, 189), c [171, 270).

Rumus: frame film = awal adegan + frame lokal, dengan frame lokal = detik x 30 bila unitnya detik.

| Track | Timing yang berlaku | Ditulis di fixture | Frame film di kembaran |
|-------|---------------------|--------------------|------------------------|
| a kamera x | proyek: detik, adegan | `[[0, 0], [3.1, 93]]` | `[[0, 0], [93, 93]]` |
| a kamera y | proyek | `[[0, 30]]` | `[[0, 30]]` |
| a `sepeda-a` motion.x | proyek | `[[0, 100], [3.1, 348]]` | `[[0, 100], [93, 348]]` |
| a `sepeda-a` motion.y | objek track `frames`/`film` | `[[0, 244]]` | `[[0, 244]]` |
| transisi a->b | detik | `duration` 0.8, `lead` 0.3 | `start` 2.7 (= 81 / 30), `duration` 0.8 |
| b kamera x | adegan: `frames`, basis adegan dari proyek | `[[-6, 303], [95, 404]]` | `[[84, 303], [185, 404]]` |
| b kamera y | adegan | `[[0, 20]]` | `[[90, 20]]` |
| b `lens.zoom` | objek track `seconds` | `[[0, 1], [2, 1.5, "inOutSine"]]` | `[[90, 1], [150, 1.5, "inOutSine"]]` |
| b `lampu-b` color | adegan | `[[0, "off"], [30, "on"]]` | `[[90, "off"], [120, "on"]]` |
| b `sepeda-b` motion.x | objek track `seconds` | `[[0, 350], [3.1, 610]]` | `[[90, 350], [183, 610]]` |
| b `sepeda-b` flip | adegan | `[[0, false], [60, true]]` | `[[90, false], [150, true]]` |
| transisi b->c | detik | `duration` 0.6, `lead` bawaan | `start` 5.7 (= 171 / 30), `duration` 0.6 |
| c kamera x | adegan: `frames`/`scene` | `[[-6, 503], [89, 598]]` | `[[174, 503], [269, 598]]` |
| c kamera y | adegan | `[[0, 30]]` | `[[180, 30]]` |
| c kamera zoom | adegan | `[[0, 1.25], [80, 1]]` | `[[180, 1.25], [260, 1]]` |
| c `kios-c` paramTracks.open | adegan | `[[0, 0], [60, 1]]` | `[[180, 0], [240, 1]]` |
| c `lampu-c` visible | objek track `seconds` | `[[0, true], [2, false]]` | `[[180, true], [240, false]]` |

Tabel yang sama dikunci sebagai asersi di `tests/engine/fixture-6a2b.test.js` (`TABLE`, `SCENES`, `TRANSITIONS`).

**Batas independensi.** Kembaran dan tabel ini ditulis oleh pihak yang sama yang membaca rumus kompiler (`src/render/timing.cjs`), jadi independensi penulisannya belum terbukti secara terpisah. Yang dibuktikan uji: kembaran adalah file statis yang tidak dibuat kompiler saat uji, dan golden gagal bila kompiler dimutasi (M2a, M2b, XM-D1, XM-C1) atau bila kembaran salah 1 frame.
