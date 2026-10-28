# Panduan Reusability

Berlaku untuk mesin versi 0.5.0 (Tahap 5: gerak dan pencahayaan karakter, branch `tahap-5-character-animation`, menunggu persetujuan pemilik). Kontrak teknis lengkapnya ada di [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Bagaimana cara membuat proyek animasi baru menggunakan engine ini?

Singkatnya: **buat satu file JSON di `config/`, tanpa menyentuh mesin.** Mesin (`src/engine/`) tidak tahu cerita apa pun. Ia hanya membaca proyek, mengambil aset dari katalog, lalu menggambar setiap frame. Project B *Pagi di Kota Tua* dibuat dengan cara ini: nol baris kode di mesin, nol baris kode kereta.

Analogi studio film:

| Di studio sungguhan | Di Pixel History Studio |
|---------------------|-------------------------|
| gudang properti dan kostum | katalog aset `src/assets/catalog.json` (ruko, pohon, lampu, sepeda, karakter rig, langit, ...) |
| set panggung | `stages`: lapisan (latar jauh sampai latar depan) dan benda tetap di set |
| daftar pemain | `cast`: karakter dan kendaraan yang bisa tampil di banyak adegan |
| naskah dan jadwal syuting | `timeline.scenes`: adegan, durasinya, siapa tampil, gerak kamera, transisi |
| penata cahaya | `palettes` + `lighting`: warna pagi, siang, malam dan perubahannya |

### Langkah 1: buat file proyek

Buat `config/<nama-proyek>.json`. Proyek langsung terdeteksi oleh `npm run projects` asalkan punya `id`. Contoh lengkap terkecil (4 detik, satu set jalan, satu warga berjalan, kamera mengikuti):

```json
{
  "id": "contoh-pasar",
  "name": "contoh-pasar",
  "title": "Contoh: Ke Pasar",
  "seed": 7,
  "width": 480,
  "height": 270,
  "outputWidth": 1920,
  "outputHeight": 1080,
  "aspectRatio": "16:9",
  "fps": 30,
  "durationSeconds": 4,
  "rendering": { "upscale": "browser" },
  "palettes": {
    "pagi": {
      "sky": ["#7d93cb", "#bcc2d6", "#f6d8b4"],
      "sunCore": "#fff8e6", "sun": "#ffe6ac", "sunGlow": "#ffd49c", "sunGlowFar": "#f2c0a4",
      "sidewalk": "#c8b89a", "sidewalkLight": "#d8caae", "sidewalkDark": "#a8987c",
      "curb": "#9a9a92", "curbLight": "#b4b4ac", "curbDark": "#76766e",
      "road": "#6e6c70", "roadLight": "#86848a", "roadDark": "#4c4a50", "roadShade": "#5a585e",
      "gutter": "#3a3a3e", "grass": "#5a8a4a", "grassLight": "#7aa85a", "grassDark": "#3e6a36",
      "roofTile": "#b0503a", "roofTileLight": "#c86a4e", "roofTileDark": "#8a3a2a",
      "wallCream": "#ece0c4", "wallCreamShade": "#cfc2a4", "trimWhite": "#f6f0e2", "trimShade": "#b8ac94",
      "shutterGreen": "#3e7a5a", "shutterGreenLight": "#5a9a76", "glass": "#4a5a7a", "glassLight": "#8aa0c0",
      "windowLit": "#f2c66a", "windowLitHi": "#ffe6a0", "wood": "#8a5a3a", "woodDark": "#5e3a24", "woodLight": "#a8744c",
      "shopInside": "#3a2a22", "goodsA": "#d8a040", "goodsB": "#c04a3a", "goodsC": "#e8d070",
      "awningWhite": "#f2ece0", "awningRed": "#c0443a", "awningGreen": "#3e8a5a", "awningBlue": "#3e6aa8",
      "shadow": "#2a2228", "pot": "#a85a3a", "potLight": "#c8744e", "leaf": "#4a8a3e", "leafLight": "#6aaa52",
      "signBoard": "#2a3a4a", "signText": "#f2ece0"
    }
  },
  "lighting": { "from": "pagi", "to": "pagi", "track": "terang" },
  "environment": { "terang": [[0, 0]] },
  "assets": {
    "langit": { "type": "gradient-sky", "horizon": 130, "sunX": 80, "sunY": 70 },
    "jalan": { "type": "street" },
    "ruko": { "type": "shophouse", "width": 80, "wall": "wallCream", "shutter": "shutterGreen", "awning": "red", "sign": "PASAR" },
    "bu-ani": { "type": "rig-character", "height": 40, "hat": "kerudung", "accessory": "basket", "shirt": "#c86a8a", "shirtShade": "#a04a6a", "sarong": "#5a4a8a", "hatColor": "#3a8a7a", "hatShade": "#2a6a5a", "seed": 3 }
  },
  "stages": {
    "jalan-pasar": {
      "layers": [
        { "id": "langit", "parallax": 0 },
        { "id": "bangunan" },
        { "id": "jalan" },
        { "id": "trotoar", "sortByY": true }
      ],
      "entities": [
        { "id": "langit-1", "asset": "langit", "layer": "langit" },
        { "id": "ruko-1", "asset": "ruko", "layer": "bangunan", "position": [40, 196], "anchor": "bottom-left" },
        { "id": "ruko-2", "asset": "ruko", "layer": "bangunan", "position": [120, 196], "anchor": "bottom-left", "params": { "sign": "BATIK", "awning": "blue" } },
        { "id": "ruko-3", "asset": "ruko", "layer": "bangunan", "position": [200, 196], "anchor": "bottom-left", "params": { "sign": "ROTI", "roof": "peak" } },
        { "id": "jalan-1", "asset": "jalan", "layer": "jalan" }
      ]
    }
  },
  "cast": {
    "bu-ani": {
      "asset": "bu-ani", "layer": "trotoar", "anchor": "bottom-center", "position": [60, 210],
      "motion": { "x": [[0, 60], [119, 200]] }, "state": "walk"
    }
  },
  "timeline": {
    "scenes": [
      {
        "id": "ke-pasar", "name": "Ke pasar", "module": "compose", "stage": "jalan-pasar", "start": 0, "end": 4,
        "cast": ["bu-ani"],
        "camera": { "type": "follow-entity", "entity": "bu-ani", "screenX": 200, "smoothing": 10 },
        "transitionOut": null
      }
    ]
  }
}
```

Contoh di atas ikut diuji otomatis (`tests/engine/guide.test.js`), jadi selalu valid untuk versi mesin ini.

### Langkah 2: periksa, pratinjau, render

```bash
npm run projects                                   # proyek baru muncul di daftar, lengkap dengan adegannya
npm run preview -- --project contoh-pasar          # tonton langsung di browser
npm run render -- --project contoh-pasar --frame 60   # render satu frame untuk dicek cepat
npm run build -- --project contoh-pasar            # render penuh + validasi
```

Kalau ada yang salah (misalnya nama aset salah ketik, adegan bertumpuk, warna palet kurang), loader menolak sebelum render dengan pesan seperti:

```
Konfigurasi proyek tidak valid:
- Adegan 1 (ke-pasar) entitas "x": aset "rukoo" tidak ditemukan
- Adegan 1 (ke-pasar): palet "pagi" belum punya warna: awningBlue
```

Hasil render ada di `output/video/<name>.mp4` dan laporannya di `output/reports/<name>-validation.md`.

### Langkah 3: kembangkan proyeknya

Proyek besar sebaiknya dipecah seperti Project B (`config/old-town-morning.json` + folder `config/old-town-morning/`):

```json
"palettes": { "$include": "old-town-morning/palettes.json" },
"assets":   { "$include": "old-town-morning/assets.json" },
"timeline": { "scenes": [ { "$include": "old-town-morning/scenes/s01-old-town-morning.json" } ] }
```

Yang bisa diatur tanpa kode:

| Ingin... | Tulis di |
|----------|----------|
| menambah adegan | entri baru di `timeline.scenes` dengan `start`/`end` dalam detik. Adegan harus menyambung tanpa celah |
| transisi antar adegan | `transitionOut: { "type": "dissolve", "start": 3.6, "duration": 0.8 }` (`cut`, `dissolve`, `portal`) |
| karakter berjalan, duduk, menyapu, mengayuh | `state`: `walk`, `seated`, `sweep`, `cycle`, `idle`, `stand`, `gesture`, atau keyframe `[[0, "idle"], [90, "walk"]]` |
| menoleh, melambai | `paramTracks: { "headTurn": [[...]], "gesture": [[...]] }` (-1 menoleh ke belakang, 1 ke kamera) |
| gerak karakter lebih natural (siku, lutut, kaki menempel di tanah) | `"motion": "natural"` di aset karakter atau di `params` entitas (lihat bagian karakter di bawah) |
| warna karakter ikut pagi, siang, sore, malam | `"light": "figure"` di aset karakter + warna `figureLight`, `figureLift`, `figureRim` di setiap palet (lihat bagian karakter di bawah) |
| benda ikut benda lain (pengendara di sepeda) | `"parent": "sepeda"` + `position` relatif |
| toko buka, lampu padam | `state: [[0, "closed"], [96, "open"]]`, `color: [[0, "on"], [70, "off"]]` |
| kamera pan, push-in, pullback | `camera: { "type": "keys", "x": [...], "y": [...], "zoom": [...] }` (zoom butuh `rendering.upscale: "browser"`, lihat bagian zoom di bawah) |
| zoom untuk adegan kustom | `"lens": { "zoom": [[frame, zoom], ...] }` di entri adegan |
| kamera mengikuti tokoh | `camera: { "type": "follow-entity", "entity": "...", "screenX": ..., "smoothing": 15 }` |
| pagi menjadi siang | dua palet + `lighting: { "from": "pagi", "to": "siang", "track": "terang" }` + track `environment.terang` |
| palet turunan | `"siang": { "extends": "pagi", "sky": [...] }` (hanya tulis warna yang berubah) |
| kedalaman | `stages.<id>.layers[].parallax` (0 = diam di langit, 1 = jalan, di atas 1 = latar depan) |

### Zoom kamera yang tetap tajam

Pixel art dibesarkan tanpa blur, jadi satu piksel art selalu berukuran bulat di layar (4 x zoom piksel). Aturan praktisnya:

- **Tahan zoom di kelipatan 0,25** (1; 1,25; 1,5; 1,75; 2; ...) untuk shot yang diam atau lama. Di nilai itu semua piksel berukuran sama persis.
- **Zoom yang bergerak boleh pecahan.** Mode bawaan `rendering.zoomMode: "anchored"` membuat ukuran piksel menempel pada gambar: tidak merayap saat kamera geser, dan setiap piksel tumbuh tepat sekali saat zoom naik. Selama zoom berjalan, satu frame berisi dua ukuran berdampingan (misalnya 4 dan 5 piksel). Itu batas tanpa blur, tetapi polanya stabil.
- Tidak perlu menulis apa pun untuk memakainya. Proyek lama dengan `upscale: "browser"` otomatis memakai `anchored`.
- `"zoomMode": "steps"` membulatkan zoom ke kelipatan 0,25 (grid selalu seragam, tetapi zoom melompat). `"zoomMode": "nearest"` mengembalikan cara Tahap 3 persis (pola merayap), hanya untuk kompatibilitas.
- Adegan kustom yang ingin bebas crawl saat zoom menggambar setiap lapisan parallax lewat `shot.surface.layer(geseranX, geseranY)` (contoh: `src/scenes/night-train.js` dan aset `countryside`).
- **Hati-hati dengan lapisan semi-transparan dan parallax berbeda di zoom pecahan.** Setiap lapisan punya grid sendiri. Cahaya atau bayangan semi-transparan bisa menghasilkan sedikit warna baru (V24). Tepi objek di atas lapisan dengan parallax berbeda bisa menyisakan potongan piksel selebar 1-3 piksel layar (V25). Untuk shot penting, taruh cahaya di parallax yang sama dengan subjeknya, atau tahan zoom di kelipatan 0,25.
- Validator memeriksa otomatis bahwa grid piksel tidak merayap (pemeriksaan "Grid piksel kamera stabil"). `npm run test:zoom` mengukur semua mode dengan pola kalibrasi `calibration-grid`.

### Langkah 4: jaga kualitas

- Tambah aturan konsistensi supaya tokoh utama dijamin tampil sama di semua adegan:
  `"validation": { "consistency": [{ "asset": "bu-ani", "frames": [30, 100] }] }`
- Jalankan `npm run test:negative -- --project <id>` untuk memastikan validator menolak kesalahan di proyek baru.
- Jalankan `npm run test:regression` dan `npm run test:projects` untuk memastikan proyek lama tidak berubah.
- Setelah proyek baru disetujui pemilik, rekam baseline pertamanya dengan `npm run baseline -- --project <id> --version tahap-<n> ...` supaya ikut dijaga uji regresi. Langkahnya di [`BASELINES.md`](BASELINES.md).

## Menambah aset baru (butuh kode, tetapi tidak menyentuh mesin)

1. Tulis modul di `src/assets/<kategori>/<nama>.js` yang mengekspor `assetTypes` (kontrak di [`ARCHITECTURE.md`](ARCHITECTURE.md#sistem-entitas-srcenginentitiesjs)). Gambar dengan helper `src/engine/pixel.js`, warna lewat `pick(fc, 'namaWarna')` dari `src/assets/common/colors.js`, variasi acak lewat `hash()` dari `src/engine/random.js`. Dilarang `Math.random()` dan `Date`.
2. Daftarkan jenisnya di `src/assets/catalog.json`: `module`, `category`, `entity: true`, skema `params` (tipe, batas, enum), `entityParams` untuk parameter yang bisa dianimasikan, `states`, `colorStates`, dan `paletteKeys`.
3. Pakai di proyek mana pun lewat `assets: { "nama": { "type": "<jenis baru>", ... } }`.

Katalog adalah satu-satunya tempat mesin dan validator mengenal jenis aset. Mesin memuat modul hanya bila proyek memakainya, jadi aset baru tidak membebani proyek lain.

## Menambah karakter baru (tanpa kode)

Karakter rig (`rig-character`) adalah satu kerangka yang bisa dipakai berulang. Karakter baru cukup ditulis sebagai aset dengan parameter tampilan:

```json
"pak-guru": {
  "type": "rig-character", "height": 44, "build": "slim", "sleeves": "long", "hat": "peci", "accessory": "bag",
  "skin": "#b98256", "shirt": "#f2f0ea", "shirtShade": "#cfcbc0", "pants": "#3a3a40", "pantsShade": "#2a2a30", "seed": 9
}
```

Pilihan: `build` (`slim`, `regular`, `stout`), `sleeves`, `hairStyle` (`short`, `bun`, `long`), `hat` (`none`, `peci`, `caping`, `kerudung`), `accessory` (`none`, `basket`, `parcel`, `bag`, `broom`, `newspaper`), warna kulit/rambut/baju/celana/sarung/motif, `strideLength`. Gerak yang tersedia: idle (napas, kedip), jalan (siklus 8 fase dari jarak tempuh), menoleh, duduk, berdiri, isyarat tangan, menyapu, dan mengayuh sepeda.

### Gerak natural (Tahap 5)

Karakter lama memakai gerak Tahap 3 (`"motion": "classic"`, bawaan). Gerak itu sengaja tidak diubah supaya film lama tetap identik. Untuk karakter baru, tulis `"motion": "natural"`:

```json
"pak-guru": { "type": "rig-character", "motion": "natural", "frontArm": "auto", "backArm": "auto", "armSwing": 1, ... }
```

| Yang berubah | Klasik (Tahap 3) | Natural (Tahap 5) |
|--------------|------------------|-------------------|
| Siklus jalan | 8 fase dari tabel tetap; telapak ikut bergeser bersama tubuh (rata-rata 5,4 piksel art per langkah di demo) | tetap 8 fase, tetapi telapak yang menapak dihitung dari posisi dunianya: diam di tanah selama satu langkah |
| Lengan | lurus, ayunan kecil (sekitar 5 piksel) | lengan atas dan lengan bawah dengan siku, siku makin menekuk saat terayun ke depan |
| Kaki | lutut sederhana | lutut menekuk ke depan (dua tulang), kaki melayang mengikuti lengkung |
| Ayunan tangan dan langkah | sinkron lewat tabel | dihitung dari fase yang sama: lengan selalu berlawanan dengan kaki di sisinya |
| Naik-turun tubuh | 1 piksel, 4 kali per langkah | paling banyak 1 piksel di sekitar kontak; dimatikan bila terlalu cepat sehingga tidak muncul sebagai getar 1 frame |

Pose lengan (`frontArm` untuk lengan dekat, `backArm` untuk lengan jauh):

| Nilai | Arti |
|-------|------|
| `auto` (bawaan) | dipilih dari aksesori: `basket` dan `newspaper` membuat lengan dekat `carry`, `parcel` membuat lengan jauh `hang`, sisanya `swing` |
| `swing` | bandul saat berjalan, menggantung saat diam |
| `hang` | menggantung, hanya bergoyang sedikit (misalnya menjinjing bungkusan) |
| `carry` | lengan bawah mendatar ke depan (membawa bakul, memegang koran) |
| `behind` | tangan di belakang badan (berjalan santai) |

`armSwing` (0..2) memperbesar atau memperkecil ayunan. Isyarat (`gesture`) di mode natural mengangkat lengan dengan siku menekuk, duduk dan mengayuh memakai siku menuju pangkuan, koran, atau setang, dan menyapu memakai dua tangan di gagang sapu. Langkah dibatasi 45% panjang kaki: bila `strideLength` terlalu panjang untuk karakter pendek, siklusnya memendek (langkah lebih rapat), bukan kakinya yang meluncur.

Pilihan bisa ditimpa per entitas lewat `params`, misalnya satu pemeran tetap klasik: `"params": { "motion": "classic" }`.

### Warna karakter mengikuti cahaya (Tahap 5)

Warna karakter tetap ditulis hex seperti biasa. Tambahkan `"light": "<awalan>"` di aset karakter, lalu tulis tiga warna di setiap palet yang dipakai adegan tempat karakter itu tampil:

```json
"palettes": {
  "pagi":  { "...": "...", "figureLight": "#f6e6dc", "figureLift": "#0a0a18", "figureRim": "#3c2a10" },
  "siang": { "extends": "pagi", "figureLight": "#ffffff", "figureLift": "#000000", "figureRim": "#262420" },
  "sore":  { "extends": "pagi", "figureLight": "#f2c49a", "figureLift": "#1a0c1e", "figureRim": "#5a2c0c" },
  "malam": { "extends": "pagi", "figureLight": "#7482b0", "figureLift": "#0c1026", "figureRim": "#26346a" }
}
```

| Warna | Arti | Netral |
|-------|------|--------|
| `<awalan>Light` | cahaya yang mengenai karakter, dikalikan dengan warna dasar | `#ffffff` |
| `<awalan>Lift` | cahaya sekitar yang mengangkat bagian gelap | `#000000` |
| `<awalan>Rim` | cahaya tepi di sisi yang menghadap sumber cahaya, ditambahkan | `#000000` |

Karena ketiganya warna palet biasa, `lighting: { from, to, track }` mencampurnya bertahap seperti warna bangunan dan langit, jadi karakter berubah di frame yang sama dengan lingkungannya. Pagi ke siang, siang ke sore, sore ke malam cukup ditulis sebagai `lighting` per adegan (contoh: `config/character-lab/`).

Arah cahaya tepi: `"lightDirection"` (-1 dari kiri dunia, 1 dari kanan, sekitar 0 dari atas), atau `"lightTrack": "<track lingkungan>"` supaya seluruh pemeran membaca arah matahari dari satu track `environment`. Karakter yang menghadap kiri (`flip`) tetap disinari dari sisi dunia yang sama. Tanpa `light`, warna karakter tetap persis seperti yang ditulis.

Validator menolak palet yang belum punya ketiga warna itu, `lightDirection` di luar -1..1, `lightTrack` yang tidak ada di `environment`, dan `motion`/pose lengan yang salah ketik. Aturan `validation.consistency` tetap bisa dipakai untuk karakter yang diterangi: warna identitasnya dihitung dari palet frame yang diperiksa.

Contoh lengkap: proyek demo `character-lab` (`config/character-lab.json`), dan perbandingan sebelum/sesudah lewat `npm run demo:character`.

## Yang tidak perlu dan tidak boleh disentuh

- `src/engine/`: mesin inti, sama untuk semua proyek. `npm run lint` menolak bila mesin mengimpor aset atau menyebut jenis aset tertentu.
- File proyek lain. Setiap proyek punya file konfigurasi sendiri; `npm run test:projects` membuktikan merusak satu proyek tidak memengaruhi proyek lain.
