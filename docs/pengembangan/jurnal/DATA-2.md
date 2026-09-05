# DATA-2 — checksum dan ambang jumlah fitur ETL

Agent: data
Gelombang: 1
Status: selesai

## Niat

- Tujuan: Scrape Ruang Kita tidak boleh menulis fixture kosong atau anjlok tanpa gagal. Manifest mencatat `featureCount` dan checksum isi per layer. Proses keluar selain 0 jika suatu layer punya 0 fitur, atau jumlah turun lebih dari 40% dibanding manifest sebelumnya, kecuali `FORCE_OVERLAY_ETL=1` (hanya untuk anjlok, bukan untuk nol).
- Berkas:
  - `scripts/lib/overlay-etl.mjs` — helper murni: checksum, baca hitungan lama, nilai lolos/gagal
  - `scripts/scrape-ruangkita-static.mjs` — baca manifest lama, nilai sebelum tulis, tulis `layers.*.featureCount` + checksum
  - `scripts/overlay-etl.test.mjs` — uji gagal-nol dan gagal-anjlok
  - `public/fixtures/overlays/manifest.json` — tambah `featureCount` + checksum dari fixture yang sudah ada (baseline)
- Langkah:
  1. Helper `overlayLayerChecksum(features)` = SHA-256 hex dari `JSON.stringify(features)` (modul `node:crypto`, tanpa dependensi npm).
  2. Helper `overlayLayerStats(collection)` → `{ featureCount, checksum }`.
  3. Helper `previousOverlayCounts(manifest)` membaca `layers[key].featureCount`, fallback `counts[key]` agar manifest lama tetap terbanding.
  4. Helper `assessOverlayFeatureCounts(current, previous, { force })`:
     - setiap layer dengan `featureCount === 0` (atau bukan angka positif) → gagal, termasuk jika `force`
     - jika ada hitungan sebelumnya > 0 dan `(prev - curr) / prev > 0.4` → gagal kecuali `force === true`
     - kenaikan atau penurunan ≤ 40% lolos
  5. Scrape: fetch + filter seperti sekarang; nilai ketiga layer (`maritimePorts`, `maritimeWaters`, `seismicSensors`) **sebelum** `writeFile`; jika gagal, `process.exit(1)` tanpa menulis GeoJSON/manifest baru.
  6. Manifest baru tetap punya `counts` (kompatibel) plus `layers: { [key]: { featureCount, checksum } }`.
  7. Isi ulang `manifest.json` fixture dengan `featureCount` dan checksum dari GeoJSON yang ada, tanpa memanggil jaringan.
- Cara membuktikan:
  - Uji baru di `scripts/overlay-etl.test.mjs` lulus: gagal-nol, gagal-anjlok (>40%), lolos tepat 40%, `FORCE` menembus anjlok tetapi tidak menembus nol, checksum stabil.
  - `npm test` hijau.
  - Membaca scrape: cabang tulis hanya setelah `assess` `ok`; hitungan 0 tidak menulis fixture.
- Risiko:
  - Gagal pada setiap beda checksum akan memaksa `FORCE` di setiap pembaruan sah — checksum dicatat, bukan gerbang gagal. Gerbang tetap 0 dan anjlok >40%.
  - Menulis dulu lalu gagal akan meninggalkan GeoJSON kosong — nilai dilakukan sebelum tulis.
  - Menjalankan scrape sungguhan mengubah fixture dari jaringan — tidak dijalankan di tiket ini; uji memakai helper murni.
  - Ambang 40% artinya turun **lebih dari** 40% gagal; 40% pas lolos.

## Bacaan ulang niat

Niat bisa dijalankan tanpa tebakan: tiga helper + satu cabang di scrape + uji + isi manifest. Brief menyebut “checksum tidak cocok” di kalimat niat, tetapi langkah brief hanya merekam checksum dan gagal pada 0 / anjlok >40%. Dipilih rekam-checksum + gerbang hitungan, karena beda isi (koordinat/properti) tanpa anjlok jumlah adalah pembaruan sah. `FORCE_OVERLAY_ETL=1` tidak menembus hitungan 0 — sesuai kriteria “tidak menulis fixture kosong tanpa gagal”. Tidak memetakan Tatonas. Tidak menambah paket npm.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `scripts/lib/overlay-etl.mjs` | `overlayLayerChecksum`, `overlayLayerStats`, `previousOverlayCounts`, `assessOverlayFeatureCounts` |
| `scripts/scrape-ruangkita-static.mjs` | Baca manifest lama; nilai sebelum tulis; `layers` di manifest |
| `scripts/overlay-etl.test.mjs` | Uji checksum, gagal-nol, gagal-anjlok, FORCE |
| `public/fixtures/overlays/manifest.json` | `layers.*.featureCount` + checksum SHA-256 dari fixture ada |

## Bukti

Putaran 1.

```
node --import tsx --test scripts/overlay-etl.test.mjs
# tests 13
# pass 13
# fail 0

# uji baru: checksums layer features stably
# uji baru: reads previous featureCount from layers, then legacy counts
# uji baru: fails when a layer has zero features  (0, first-run 0, FORCE+0)
# uji baru: fails when a layer drops by more than 40% unless forced
#   10→5 gagal; 10→6 (tepat 40%) lolos; FORCE menembus 10→5; tanpa baseline lolos

# scrape: assess (baris 136–144) lalu writeFc (146+). process.exit(1) sebelum tulis.
```

Checksum fixture (dari GeoJSON yang sudah ada, tanpa jaringan):

```
maritimePorts    15  b2ee4a1c58c371649eda23fa267a024132e099b65ee6ac888880b865802da115
maritimeWaters   10  6ba5818d5d1b3f05010834035218aa74ddfb9b607e35ca74789ed702ad19e9c3
seismicSensors   23  5f3ed6014c04d6917d51c9fc557f99aeba9a86054954331d7edd34f28ebdb808
```

```
npm test
# tests 210
# pass 210
# fail 0
```

## Bacaan ulang bukti versus kriteria

- [x] Uji baru lulus — 13/13, termasuk gagal-nol dan gagal-anjlok
- [x] `npm test` tetap hijau — dijalankan setelah penutupan kedua tiket
- [x] Scrape tidak menulis fixture kosong tanpa gagal — `assessOverlayFeatureCounts` sebelum `writeFc`; hitungan 0 selalu `ok: false` termasuk `force`

## Keputusan

selesai
