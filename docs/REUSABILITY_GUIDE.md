# Panduan Reusability

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
| benda ikut benda lain (pengendara di sepeda) | `"parent": "sepeda"` + `position` relatif |
| toko buka, lampu padam | `state: [[0, "closed"], [96, "open"]]`, `color: [[0, "on"], [70, "off"]]` |
| kamera pan, push-in, pullback | `camera: { "type": "keys", "x": [...], "y": [...], "zoom": [...] }` (zoom butuh `rendering.upscale: "browser"`) |
| kamera mengikuti tokoh | `camera: { "type": "follow-entity", "entity": "...", "screenX": ..., "smoothing": 15 }` |
| pagi menjadi siang | dua palet + `lighting: { "from": "pagi", "to": "siang", "track": "terang" }` + track `environment.terang` |
| palet turunan | `"siang": { "extends": "pagi", "sky": [...] }` (hanya tulis warna yang berubah) |
| kedalaman | `stages.<id>.layers[].parallax` (0 = diam di langit, 1 = jalan, di atas 1 = latar depan) |

### Langkah 4: jaga kualitas

- Tambah aturan konsistensi supaya tokoh utama dijamin tampil sama di semua adegan:
  `"validation": { "consistency": [{ "asset": "bu-ani", "frames": [30, 100] }] }`
- Jalankan `npm run test:negative -- --project <id>` untuk memastikan validator menolak kesalahan di proyek baru.
- Jalankan `npm run test:regression` dan `npm run test:projects` untuk memastikan proyek lama tidak berubah.

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

Pilihan: `build` (`slim`, `regular`, `stout`), `sleeves`, `hairStyle` (`short`, `bun`, `long`), `hat` (`none`, `peci`, `caping`, `kerudung`), `accessory` (`none`, `basket`, `parcel`, `bag`, `broom`, `newspaper`), warna kulit/rambut/baju/celana/sarung/motif, `strideLength`. Gerak yang tersedia: idle (napas, kedip), jalan (siklus 8 fase yang dihitung dari jarak tempuh, jadi kaki tidak "meluncur"), menoleh, duduk, berdiri, isyarat tangan, menyapu, dan mengayuh sepeda.

## Yang tidak perlu dan tidak boleh disentuh

- `src/engine/`: mesin inti, sama untuk semua proyek. `npm run lint` menolak bila mesin mengimpor aset atau menyebut jenis aset tertentu.
- File proyek lain. Setiap proyek punya file konfigurasi sendiri; `npm run test:projects` membuktikan merusak satu proyek tidak memengaruhi proyek lain.
