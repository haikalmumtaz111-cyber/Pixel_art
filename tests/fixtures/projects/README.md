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

## Uji browser fixture (Tahap 6A-2b PR 2)

`npm run test:fixtures` (`src/render/fixture-tests.cjs`) merender fixture dan kembarannya lewat pipeline proyek yang sama (`render.cjs`, `renderFrames`, `openStudio`), lalu memeriksa hasilnya. Tidak ada mesin render kedua. Setiap pemeriksaan memakai asersi yang langsung GAGAL, dan satu GAGAL membuat exit bukan 0. Langkah ini juga jalan di `npm test`. Subset ringannya ikut `npm run test:smoke` (CI job 2, keputusan K9).

| Kelompok | Isi | Cara membandingkan |
|----------|-----|--------------------|
| `golden` (AC14) | 270 frame fixture vs 270 frame kembaran, dirender di proses dan browser terpisah | setiap PNG di-decode FFmpeg ke RGB24, lalu SHA-256 per frame (`framehash`). Diperiksa juga nama `frame_0000` sampai `frame_0269` (tidak hilang, tidak berlebih), ukuran 1920x1080, urutan segmen di catatan render, dan 270 frame unik. Kontrol negatif: kembaran salah 1 frame (lampu-b menyala di 121) wajib gagal tepat di frame 120, dan pembanding wajib menangkap frame ditukar, digandakan, hilang, berlebih, dan salah ukuran |
| `validasi` | `validate.cjs` apa adanya pada fixture | semua pemeriksaan tanpa GAGAL, KNOWN ISSUE, atau TIDAK DIPERIKSA. `motion-feet` dan `motion-bob` LULUS tanpa subjek (BACKLOG T26), jadi tidak dihitung sebagai bukti |
| `isolasi` (AC12) | 228 frame di luar transisi (a 0-80, b 105-170, c 189-269) | film = render adegan itu saja di browser baru, per piksel |
| `transisi` (AC12, M5) | frame 80-105 dan 170-189 | lihat "Membandingkan frame di jendela dissolve" di bawah |
| `determinisme` (AC12) | 270 frame dirender ulang dengan urutan acak ber-seed (mulberry32, seed 20261031, hash urutan `1786fcd7103ccc8e`) di browser baru | identik piksel dengan render berurutan. Urutan terbalik diuji `validate.cjs`. Seed proyek fixture tidak dipakai aset fixture: mengganti `seed` tidak mengubah piksel, jadi satu-satunya unsur acak di uji ini adalah urutan render |
| `ac13` (AC13) | varian adegan a +1 detik dibuat di memori | frame lokal b 15-80 (66) dan c 9-89 (81) plus transisi b->c (18) identik. Daftar frame lokal dikunci literal. Kontrol: geser 1 frame lokal wajib beda di semua pasangan, kamera b berbasis frame film wajib beda di 66/66 (adegan c tetap sama), pengayuh di b wajib beda tepat di lokal 42-44 (kedip berjam film, adegan a tetap sama) |
| `a13` (A13) | `layoutAt` setiap adegan yang digambar di setiap frame, lewat `import('/src/engine/film.js')` di halaman (tanpa API baru di `src/engine`, K4) | setiap id sekali, entitas tampak sama dengan daftar tulisan tangan dari `uji-6a2b/stages.json` dan fixture (312 pasangan frame-adegan, 4.002 entitas). Kontrol: id ganda di `scene.cast` adegan c ditolak validator Node dan terhitung tepat di frame 171-269 |
| `pose` (AC16) | `poseProbes` 270 frame | pengayuh-a punya data pose tepat di frame 0-104 (105 pose), kelima pemeriksaan pose LULUS. Kontrol: tangan pengayuh digeser 6 px di frame 50 wajib membuat `motion-contact` GAGAL. `motion-feet`/`motion-bob` dilaporkan TIDAK DIPERIKSA (cakupan kosong) |
| `m5` (M5) | varian `cut` biasa dan tanpa transisi a->b (pasar ke bukit) | ditolak N24 di validator Node, dan setelah dirender (`strict: false`) terdeteksi di piksel (komposisi melompat di frame 90) dan di luma (`no-flash` dan `no-hard-cut` GAGAL di frame 90). Kontrol: potongan dissolve asli lolos luma |
| `stale` (NT-STALE-2B, M2) | salinan sekali pakai repository (`makeSandbox`), fixture dan kembaran dirender di dalamnya | M2a, M2b, XM-D1, XM-C1 di `timing.cjs` salinan membuat manifest fixture kedaluwarsa tepat karena "hasil kompilasi", kembaran jalur lama tetap segar, dan klasifikasi Kelas A/B dicetak. XM-K1 (komentar) tetap segar. `--encode-only` setelah XM-D1 ditolak TK5 (`compiledHash`), setelah XM-C1 ditolak saat memuat proyek, dan keduanya tidak mengubah MP4 dan manifest lama. Golden piksel M2a dan XM-D1 berbeda hanya di jendela transisi |
| `kebersihan` (AC2b-02) | | status Git sama sebelum dan sesudah, folder yang dibuat runner sudah dihapus |

Pilihan: `--only <kelompok,...>` (render film fixture dan golden tetap jalan karena kelompok lain memakai hash pikselnya), `--keep` (output tidak dihapus, untuk dilihat), `--evidence <folder>` (log per frame TSV dan ringkasan JSON), `--summary <file>`.

**Membandingkan frame di jendela dissolve.** Frame transisi tidak disamakan dengan satu adegan. Untuk setiap frame dari satu frame sebelum sampai satu frame sesudah jendela, adegan asal dan adegan tujuan dirender terpisah (`renderSceneFrame`) pada frame film yang sama, lalu setiap piksel frame film dicocokkan dengan keduanya:

- piksel asing (tidak sama dengan asal maupun tujuan) wajib 0 di setiap frame: ini menangkap kilatan, stage atau entitas yang salah, dan frame kosong atau rusak,
- frame pertama jendela wajib sama persis dengan adegan asal, frame terakhir sama persis dengan adegan tujuan, begitu juga satu frame sebelum dan sesudahnya,
- kemajuan q (bagian piksel yang sudah milik adegan tujuan, dihitung dari piksel yang berbeda antara asal dan tujuan) tidak boleh mundur lebih dari 0,01, tidak boleh melompat lebih dari 0,1 dalam satu frame (potongan kasar), dan tidak boleh lebih dari 0,05 dari p = (frame - awal) / (jumlah frame - 1) dengan easing `linear` fixture.

Pola dither tidak ditiru, jadi uji ini tidak menjadi mesin render kedua. Yang dibaca hanya hasil piksel dan batas komposisi.

Output runner ada di `output/frames/uji-6a2b/` dan `output/frames/uji-6a2b-global/` (di-ignore Git, K8). Folder yang dibuat runner dihapus lagi di akhir, folder yang sudah ada sebelumnya tidak dihapus. Uji `stale` merender di salinan sekali pakai di folder sementara sistem dan menghapusnya.

Batas yang tetap berlaku:

- Golden piksel membandingkan dua render dari kode yang sama, jadi tidak menutup T24 (kode pipeline Node yang tidak ter-hash).
- AC13 hanya membuktikan invariansi untuk unsur berjam adegan. Unsur berjam film (kedip rig, awan, burung, `frame.cycle`) memang berbeda, dan itu milik 6A-3 (G2).
- AC16 hanya mencakup rig natural berstatus `cycle`. Gerak jalan, menyapu, dan duduk tidak diuji di fixture.
- Independensi penulisan kembaran tetap belum terbukti secara terpisah (K14).
