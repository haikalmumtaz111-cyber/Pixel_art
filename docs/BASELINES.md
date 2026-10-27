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

Perintah `npm run baseline` menampilkan tabel ini langsung dari registry.

## Aturan

1. **Nama versi** = kondisi `main` setelah tahap itu di-merge: `tahap-2`, `tahap-3`, `tahap-4`, dan seterusnya. Project A dan prototipe direkam dari `main@cfed35a` (akhir Tahap 2), jadi versinya `tahap-2`.
2. **File baseline tidak pernah diubah, ditimpa, atau dihapus.** Versi baru selalu file baru. SHA-256 setiap file dikunci di `registry.json`, jadi perubahan sekecil apa pun membuat `npm run lint` gagal.
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
7. `npm test`, lalu buat PR khusus baseline. Merge hanya dengan persetujuan pemilik.

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
| Setiap file baseline terdaftar dan SHA-256-nya cocok | `npm run lint` (juga di CI), `npm run test:regression` | tidak |
| Versi resmi ada dan semua versi tersambung lewat `previous` | lint, regresi | tidak |
| Perubahan antar versi sama persis dengan catatan registry, di dalam rentang terdeklarasi, dan punya bukti persetujuan | lint, regresi | tidak |
| Entri pending aktif menunjuk versi resmi | lint, regresi | tidak |
| Render terbaru identik dengan versi resmi (atau berbeda hanya di rentang pending) | `npm run test:regression` | ya |
| Frame contoh identik dengan versi resmi | `npm run test:smoke` (CI) | render kecil |
| Isolasi antar-proyek dan lab zoom memakai versi resmi Project A | `npm run test:projects`, `npm run test:zoom` | ya / render kecil |

Kode: `src/render/baselines.cjs` (registry dan pemeriksaannya), `src/render/baseline.cjs` (`npm run baseline`), `src/render/regression.cjs`. Unit test: `tests/engine/baselines.test.js`.

## Riwayat: Project B Tahap 4

- Tahap 4 mengubah 124 dari 360 frame Project B (zoom pecahan dan dissolve, V14). Perubahannya dideklarasikan di rentang 84-131 dan 255-345, disetujui pemilik pada 27 Oktober 2026, dan di-merge lewat PR #4 (`a1fd4a1`).
- Baseline `tahap-4` direkam dari render ulang `main@a1fd4a1`. MP4-nya identik byte demi byte dengan `output/video/old-town-morning.mp4` di commit itu.
- Verifikasi: 124 frame berubah (85-130, 262-339), 236 identik dengan `tahap-3`, 0 di luar rentang. Semua frame yang berubah memakai zoom pecahan atau sedang dissolve. 15 frame di dalam rentang deklarasi tetap identik karena zoom-nya bulat atau sangat dekat kelipatan 0,25 (misalnya 1,24999), sehingga ukuran pikselnya sama dengan cara Tahap 3. Render dengan `zoomMode: "nearest"` menghasilkan ulang Tahap 3 identik untuk 360 frame.
- Entri pending Tahap 4 dipindah ke `resolved`. Baseline `tahap-3` tetap tersimpan dan bisa dipakai dengan `--baseline tahap-3`.
