# Versi Baseline Regresi

Baseline adalah sidik jari resmi hasil render sebuah proyek: hash piksel setiap frame PNG, metadata video, hash setiap frame hasil decode, dan SHA-256 file MP4. Uji regresi membandingkan render terbaru dengan baseline ini. Sejak pengelolaan baseline Project B Tahap 4, setiap proyek bisa punya beberapa **versi** baseline. Satu versi menjadi patokan resmi, versi lain disimpan sebagai referensi historis.

## Isi folder `tests/baselines/`

| File | Isi |
|------|-----|
| `registry.json` | daftar versi baseline setiap proyek, versi resmi (`official`), SHA-256 setiap file, sumber, versi mesin, perubahan dari versi sebelumnya, dan bukti persetujuan pemilik |
| `<proyek>.json` | baseline lama (dibuat sebelum ada versi). Tetap di tempatnya, isinya tidak diubah |
| `<proyek>.<versi>.json` | baseline versi baru, dibuat oleh `npm run baseline` |
| `pending-changes.json` | `changes`: perubahan hasil render yang menunggu persetujuan pemilik, terikat ke satu versi baseline lewat `against`. `resolved`: riwayat perubahan yang sudah disetujui dan dijadikan versi baru |

Kondisi saat ini:

| Proyek | Versi | File | Sumber | Mesin | Status |
|--------|-------|------|--------|-------|--------|
| `night-to-dawn` (Project A) | `tahap-2` | `night-to-dawn.json` | `main@cfed35a` | 0.2.0 | resmi |
| `train-night-rain` (prototipe) | `tahap-2` | `train-night-rain.json` | `main@cfed35a` | 0.2.0 | resmi. Piksel PNG sama dengan hasil Tahap 1; MP4 di-encode ulang di Tahap 2 |
| `old-town-morning` (Project B) | `tahap-3` | `old-town-morning.json` | `main@9d7a144` | 0.3.0 | historis |
| `old-town-morning` (Project B) | `tahap-4` | `old-town-morning.tahap-4.json` | `main@a1fd4a1` | 0.4.0 | resmi, 124 frame berubah dari `tahap-3` (85-130, 262-339) |
| `character-lab` (demo Tahap 5) | `tahap-5` | `character-lab.tahap-5.json` | `main@e6926d2` | 0.5.0 | resmi, baseline pertama |

Perintah `npm run baseline` menampilkan tabel ini langsung dari registry.

Proyek demo Tahap 5 `character-lab` mendapat baseline pertamanya, versi `tahap-5`, setelah pemilik menyetujui dan memerintahkannya (lihat riwayat di bawah). Sejak itu uji regresi dan uji asap CI juga mencocokkannya dengan baseline. Tahap 5 tidak mengubah hasil render ketiga proyek lama, jadi tidak ada entri baru di `pending-changes.json`.

## Aturan

1. **Nama versi** = kondisi `main` setelah tahap itu di-merge: `tahap-2`, `tahap-3`, `tahap-4`, dan seterusnya. Project A dan prototipe direkam dari `main@cfed35a` (akhir Tahap 2), jadi versinya `tahap-2`.
2. **File baseline tidak pernah diubah, ditimpa, atau dihapus.** Versi baru selalu file baru. Pemeriksaannya dua lapis:
   - `npm run lint` mencocokkan SHA-256 setiap file dengan `registry.json`. Ini menangkap file yang diubah, dihapus, atau ditambah tanpa ikut memperbarui registry. Lint **tidak** menangkap file yang diubah bersama hash-nya di registry, karena keduanya ada di folder yang sama. Untuk Project B, perubahan seperti itu masih tertangkap lewat rantai versi `tahap-3` -> `tahap-4`; untuk proyek yang baru punya satu versi tidak ada pembandingnya.
   - `npm run test:baseline-guard` menangkap celah itu dengan membandingkan isi folder dengan referensi tepercaya di Git (bawaan `origin/main`): setiap file baseline di referensi harus tetap ada dan identik byte demi byte, setiap versi di registry referensi harus tetap ada dengan isi terkunci yang sama (`file`, `sha256`, `source`, `engineVersion`, `frames`, `previous`, `changes`, `approval`), dan setiap riwayat `resolved` harus tetap ada tanpa diubah. Versi baru dan perpindahan versi resmi tetap diperbolehkan. Penjaga hanya bekerja selama langkahnya di CI tetap ada; lihat batas di bagian pemeriksaan otomatis.
3. **Versi baru hanya dibuat setelah pemilik menyetujui** perubahan hasil render, dan hanya lewat `npm run baseline` (bukan menyunting JSON dengan tangan).
4. **Perubahan yang menunggu persetujuan** dicatat di `pending-changes.json` → `changes.<proyek>` dengan `against` = versi resmi saat itu. Entri yang menunjuk versi lain ditolak lint.
5. **Riwayat tidak dihapus.** Setelah disetujui, entri pending dipindah ke `resolved` lengkap dengan tanggal, bukti, dan daftar frame yang benar-benar berubah.

## Siklus di setiap milestone

**Di branch tahap (sebelum disetujui)**

1. Bila hasil render proyek lama sengaja berubah, tambahkan entri di `pending-changes.json`:
   ```json
   "changes": {
     "old-town-morning": {
       "stage": "Tahap 5",
       "backlog": "V..",
       "status": "menunggu persetujuan pemilik",
       "against": "tahap-4",
       "reason": "alasan dan asal rentang frame",
       "frames": [[100, 140]]
     }
   }
   ```
2. `npm run build:all` lalu `npm test`. Regresi melaporkan perubahan itu sebagai "menunggu persetujuan". Frame di luar rentang tetap wajib identik dengan versi resmi.
3. Laporkan ke pemilik, buat PR, tunggu persetujuan dan merge.

**Setelah pemilik menyetujui dan memerintahkan pembaruan baseline**

4. Mulai dari `main` yang sudah di-merge di branch khusus baseline. Jalankan `npm run build:all` (render ulang dari kode yang di-merge).
5. Coba dulu tanpa menulis apa pun:
   ```bash
   npm run baseline -- --project old-town-morning --version tahap-5 --source main@<commit merge> \
     --approved-at <YYYY-MM-DD> --evidence "PR #.. di-merge pemilik ..." --evidence "instruksi pemilik ..." --dry-run
   ```
6. Bila ringkasannya cocok dengan deklarasi, jalankan lagi tanpa `--dry-run`. Alat ini:
   - menolak bila render tidak terbaru, bila kode render (`src/engine`, `src/assets`, `src/scenes`, `config`) berbeda dari commit `--source`, atau bila MP4 hasil render berbeda dari MP4 di commit itu;
   - menolak bila ada frame berbeda dari versi resmi tanpa entri pending, atau di luar rentang entri itu;
   - menolak menimpa versi atau file yang sudah ada;
   - menulis `<proyek>.<versi>.json`, mendaftarkannya di registry (SHA-256, sumber, perubahan, bukti persetujuan), memindahkan versi resmi, dan memindahkan entri pending ke `resolved`.
7. `npm test` (termasuk `npm run test:baseline-guard`, yang harus melaporkan file lama identik dan versi baru sebagai tambahan), lalu buat PR khusus baseline. Merge hanya dengan persetujuan pemilik.

**Proyek baru**: setelah proyeknya disetujui, rekam baseline pertamanya dengan perintah yang sama. Tanpa versi sebelumnya, tidak perlu entri pending.

## Membandingkan dengan versi historis

```bash
npm run test:regression                                                     # semua proyek vs versi resmi
npm run test:regression -- --project old-town-morning --baseline tahap-3    # Project B vs referensi Tahap 3
```

Perbandingan dengan versi historis lulus hanya bila frame yang berbeda **sama persis** dengan frame yang disetujui berubah sejak versi itu (dihitung dari file baseline resmi). Frame lain wajib identik, dan frame yang disetujui berubah tetapi masih sama dengan versi lama juga ditolak. Laporannya ditulis ke `output/reports/regression-<proyek>-<versi>.md`, terpisah dari laporan resmi `regression.md`.

## Pemeriksaan otomatis

| Pemeriksaan | Di mana | Butuh render? |
|-------------|---------|---------------|
| Setiap file baseline terdaftar dan SHA-256-nya cocok dengan registry | `npm run lint` (juga di CI), `npm run test:regression` | tidak |
| File baseline lama, versi registry, dan riwayat `resolved` sama dengan referensi tepercaya (`origin/main`; di CI: cabang tujuan PR atau commit main sebelumnya) | `npm run test:baseline-guard` (juga di CI dan `npm test`) | tidak |
| Versi resmi ada dan semua versi tersambung lewat `previous` | lint, regresi | tidak |
| Perubahan antar versi sama persis dengan catatan registry, di dalam rentang terdeklarasi, dan punya bukti persetujuan | lint, regresi | tidak |
| Entri pending aktif menunjuk versi resmi | lint, regresi | tidak |
| Render terbaru identik dengan versi resmi (atau berbeda hanya di rentang pending) | `npm run test:regression` | ya |
| Frame contoh identik dengan versi resmi | `npm run test:smoke` (CI) | render kecil |
| Isolasi antar-proyek dan lab zoom memakai versi resmi Project A | `npm run test:projects`, `npm run test:zoom` | ya / render kecil |

Kode: `src/render/baselines.cjs` (registry, pemeriksaannya, dan aturan penjaga), `src/render/baseline.cjs` (`npm run baseline`), `src/render/baseline-guard.cjs` (`npm run test:baseline-guard`), `src/render/regression.cjs`. Unit test: `tests/engine/baselines.test.js`.

**Batas yang diketahui.** Penjaga di CI dijalankan oleh `.github/workflows/ci.yml`, dan file itu bisa diubah oleh PR yang sama. PR yang menghapus atau melemahkan langkah penjaga tetap menghasilkan check "Lint, unit test, validasi konfigurasi" yang lulus. Jadi lapis terakhirnya tetap tinjauan diff PR: perubahan pada file baseline lama, `registry.json`, atau `ci.yml` harus terlihat jelas dan dijelaskan.

**Proteksi branch di GitHub (pengaturan pemilik, 28 Oktober 2026; pola Tahap 6 ditambahkan 29 Oktober 2026).** Konfigurasi yang terbaca dari API GitHub:

| Ruleset | ID | Target | Aturan |
|---------|----|--------|--------|
| Protect main - Pixel History Studio | 26005617 | `main` (`~DEFAULT_BRANCH`) | wajib PR (0 approval), hanya merge commit, dua check CI wajib ("Lint, unit test, validasi konfigurasi", "Uji asap render dan lab zoom") dengan mode strict (branch PR harus up to date), tidak boleh dihapus, tidak boleh force push, tanpa bypass |
| Protect historical stages | 26006150 | `refs/heads/tahap-[1-4]-*` dan `refs/heads/tahap-5-*` (lima branch Tahap 1-5), serta `refs/heads/tahap-6-*` (untuk Tahap 6, belum ada branch-nya) | tidak boleh dihapus, tidak boleh force push, tanpa bypass |

- **Terbukti:** kedua ruleset berstatus `active`; API aturan efektif menampilkan aturan itu untuk `main` dan kelima branch historis (dan tidak untuk branch lain); nama dan aplikasi check wajib cocok dengan check run CI di `main`. Pola `tahap-5-*` ditambahkan pemilik setelah Tahap 5 di-merge dan diverifikasi ulang lewat API pada hari yang sama: `tahap-5-character-animation` kini `protected`, aturan `main` tidak berubah. Pola `tahap-6-*` ditambahkan pemilik pada 29 Oktober 2026 sebelum Tahap 6 dimulai dan diverifikasi read-only lewat API: ruleset tetap `active`, bypass kosong, aturan kelima branch Tahap 1-5 identik dengan sebelumnya, nama uji `tahap-6-cek-pola` (branch tidak dibuat) kena larangan hapus dan force push sedangkan `tahap6-cek` dan `tahap-7-cek` tidak, dan ruleset `main` identik byte dengan sebelumnya.
- **Belum terbukti:** penolakan push nyata. Sampai verifikasi terakhir belum pernah ada push yang ditolak, jadi enforcement-nya belum pernah teramati menolak.
- **Tidak dicakup ruleset:** PR yang mengubah `ci.yml` (lihat batas di atas), push fast-forward ke branch historis (branch itu tidak dibekukan, hanya tidak bisa dihapus atau ditulis ulang), branch Tahap 7 ke atas, dan nama branch tahap di luar bentuk `tahap-<n>-<nama>` (misalnya `tahap6-...`).

Usulan lanjutan dan statusnya: T18 di [`BACKLOG.md`](BACKLOG.md).

## Riwayat: Project B Tahap 4

- Tahap 4 mengubah 124 dari 360 frame Project B (zoom pecahan dan dissolve, V14). Perubahannya dideklarasikan di rentang 84-131 dan 255-345, disetujui pemilik pada 27 Oktober 2026, dan di-merge lewat PR #4 (`a1fd4a1`).
- Baseline `tahap-4` direkam dari render ulang `main@a1fd4a1`. MP4-nya identik byte demi byte dengan `output/video/old-town-morning.mp4` di commit itu.
- Verifikasi: 124 frame berubah (85-130, 262-339), 236 identik dengan `tahap-3`, 0 di luar rentang. Semua frame yang berubah memakai zoom pecahan atau sedang dissolve. 15 frame di dalam rentang deklarasi tetap identik karena zoom-nya bulat atau sangat dekat kelipatan 0,25 (misalnya 1,24999), sehingga ukuran pikselnya sama dengan cara Tahap 3. Render dengan `zoomMode: "nearest"` menghasilkan ulang Tahap 3 identik untuk 360 frame.
- Entri pending Tahap 4 dipindah ke `resolved`. Baseline `tahap-3` tetap tersimpan dan bisa dipakai dengan `--baseline tahap-3`.

## Riwayat: `character-lab` Tahap 5

- Pemilik menyetujui dan memerintahkan perekaman baseline resmi `character-lab` versi `tahap-5` pada 28 Oktober 2026, setelah Tahap 5 di-merge lewat PR #9 (`e6926d2`) dan audit pasca-merge PR #11 lulus. Teks persetujuannya tersimpan di `approval` registry.
- Baseline direkam lewat `npm run baseline` dari render ulang dengan kode render `main@e6926d2`. Kode render di `main` saat perekaman identik dengan commit itu. MP4-nya identik byte demi byte dengan `output/video/character-lab.mp4` di `e6926d2`.
- Verifikasi sebelum merekam: render dari clone `e6926d2` dan render dari branch kerja identik di 360 dari 360 frame (piksel dan byte PNG), frame hasil decode, dan MP4. `--dry-run` lulus lebih dulu.
- Proyek ini belum punya versi sebelumnya, jadi tidak ada entri pending. Perubahan visual `character-lab` berikutnya (misalnya perbaikan V27 atau V28) wajib dideklarasikan di `pending-changes.json` terhadap `tahap-5` dan disetujui terpisah.
- Perubahan aktif (perbaikan V29, di-merge ke `main` lewat PR #19, merge commit `63eab4c`, 30 Oktober 2026 07.01 WIB): `changes.character-lab` terhadap `tahap-5`, frame 132-205 (74 frame, tangan pengayuh di setang), status menunggu persetujuan pemilik. Baseline `tahap-5` tetap versi resmi; perubahan 74 frame ini belum disetujui sebagai baseline baru, dan versi baru hanya dibuat setelah pemilik menyetujui dan memerintahkannya.
