# DATA-3 — potong geometri patahan/megathrust ke Aceh

Agent: data
Gelombang: 3
Status: selesai

## Niat

- Tujuan: Setelah unduh InaRISK, potong sisi geometri patahan dan megathrust ke konstanta `ACEH_BBOX` yang sudah ada. Kueri tetap `esriSpatialRelIntersects`. Bukan filter fitur, bukan poligon administrasi, bukan klaim batas resmi Aceh.
- Berkas:
  - `scripts/lib/overlay-etl.mjs` — helper murni `clipGeometryToBbox` dan `clipFeatureCollectionToBbox`
  - `scripts/overlay-etl.test.mjs` — uji wajib tanpa jaringan
  - `scripts/fetch-inarisk-faults.mjs` — clip sebelum tulis; gagal-nol tanpa menimpa fixture
  - `public/fixtures/overlays/sumatera-fault-aceh.geojson` dan `megathrust-aceh.geojson` — isi ulang hanya jika skrip jaringan berhasil
  - `docs/pengembangan/STATUS.md` — hanya baris DATA-3
- Langkah:
  1. Helper `clipGeometryToBbox(geometry, bbox = ACEH_BBOX)`: potong sisi ke amplop inklusif (`>=` / `<=` sama `inAcehBbox`). Tanpa paket npm baru. Liang–Barsky untuk garis, Sutherland–Hodgman untuk poligon. `null` jika tidak ada sisa atau tipe tidak dikenal. Jangan mengisi koordinat, KRB, atau atribut baru.
  2. `Point` / `MultiPoint`: simpan hanya titik di dalam. `LineString` / `MultiLineString`: clip tiap segmen; sisa `LineString` atau `MultiLineString`; buang panjang nol. `Polygon` / `MultiPolygon`: clip cincin; buang cincin luar/lubang yang hilang; tanpa cincin luar → `null`. `GeometryCollection`: clip anggota, buang kosong.
  3. Helper `clipFeatureCollectionToBbox(collection, bbox = ACEH_BBOX)`: tidak mengubah argumen; salin `properties` / `id`; potong `geometry`; buang fitur `null` atau degenerate; `type` tetap `FeatureCollection`; field lain (mis. `source`) disalin.
  4. Jangan mengubah angka `ACEH_BBOX` `[95.0, 2.0, 98.3, 6.15]` dan jangan mengubah `spatialRel`.
  5. Skrip: tetap `inariskFaultQueryUrl`; tag `layer` / `title` seperti sekarang; panggil clip setelah `fetchJson` dan sebelum `writeFile`. Unduh + clip kedua layer dulu. Jika salah satu `features.length === 0` setelah clip: `process.exit(1)` dan jangan menulis kedua berkas. Tidak ada `FORCE`.
  6. Uji wajib: garis menyeberang (kedua ujung di luar tetap menyisakan segmen); poligon mirip megathrust; fitur di luar hilang; URL tetap intersects + koordinat `ACEH_BBOX`.
  7. Jalankan `node scripts/fetch-inarisk-faults.mjs` untuk isi ulang fixture. Jika jaringan gagal: blocker, jangan menimpa fixture dengan kosong.
- Cara membuktikan:
  - Uji baru di `scripts/overlay-etl.test.mjs` lulus tanpa jaringan.
  - `npm test` hijau (PowerShell, tanpa `&&`).
  - Membaca skrip: clip sebelum tulis; cabang 0 fitur keluar 1 tanpa `writeFile`.
  - Jika skrip jaringan lolos: rentang koordinat kedua fixture berada di dalam amplop inklusif.
- Risiko:
  - Memakai bbox sebagai klaim batas resmi — dilarang; clip hanya potongan amplop kueri; sliver Sumut di tepi timur diterima.
  - Filter centroid / vertex-dalam-saja membuang garis yang menyeberang — dilarang; wajib potong sisi.
  - Menulis layer pertama lalu gagal pada layer kedua menimpa fixture — unduh+clip keduanya sebelum tulis.
  - Jaringan InaRISK gagal atau 0 fitur setelah clip — jangan menimpa fixture lama; tulis blocker.
  - Mengubah `src/` atau DATA-4 / `loggerKind` — di luar tiket.

## Bacaan ulang niat

Niat bisa dijalankan tanpa tebakan. Kontrak AN-5: intersects tetap untuk kueri; clip sisi setelah unduh; helper murni di `overlay-etl.mjs`; tepi inklusif; gagal-nol tanpa menulis kedua berkas; isi ulang fixture hanya lewat skrip. Bukan filter, bukan GADM, bukan ganti angka bbox. Tidak menyentuh `src/`, DATA-4, atau baris STATUS selain DATA-3.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `scripts/lib/overlay-etl.mjs` | `clipGeometryToBbox`, `clipFeatureCollectionToBbox` (Liang–Barsky / Sutherland–Hodgman). `ACEH_BBOX` dan `spatialRel` tidak diubah. |
| `scripts/overlay-etl.test.mjs` | Uji garis menyeberang, poligon megathrust, fitur di luar hilang, URL intersects + koordinat bbox |
| `scripts/fetch-inarisk-faults.mjs` | Clip kedua layer dulu; `exit 1` jika salah satu 0 fitur; baru kemudian `writeFile` |
| `public/fixtures/overlays/sumatera-fault-aceh.geojson` | Isi ulang lewat skrip (22 LineString, terpotong) |
| `public/fixtures/overlays/megathrust-aceh.geojson` | Isi ulang lewat skrip (2 Polygon, terpotong) |
| `docs/pengembangan/STATUS.md` | Baris DATA-3 saja |

## Bukti

Putaran 1.

```
node --import tsx --test scripts/overlay-etl.test.mjs
# tests 16
# pass 16
# fail 0

# uji baru: clips a LineString that crosses the envelope and keeps the inside segment
# uji baru: clips a megathrust-like Polygon and keeps properties
# uji baru: drops features whose geometry lies entirely outside the envelope
# uji URL: spatialRel=esriSpatialRelIntersects + xmin 95 / ymin 2 / xmax 98.3 / ymax 6.15
```

Skrip: kedua layer di-`fetchJson` + tag + `clipFeatureCollectionToBbox` ke `prepared`; jika `features.length === 0` pada salah satu, `process.exit(1)` sebelum loop `writeFile`.

```
node scripts/fetch-inarisk-faults.mjs
{
  "inariskSumateraFault": 22,
  "inariskMegathrust": 2
}
```

Rentang vertex fixture setelah clip (semua `inAcehBbox`, 0 di luar):

```
sumatera-fault-aceh.geojson  22 LineString  lon 95–98.3  lat 2.7666–6.15
megathrust-aceh.geojson       2 Polygon     lon 95–98.3  lat 2–4.4904
ACEH_BBOX                     [95.0, 2.0, 98.3, 6.15]
```

Sebelum clip, fixture lama keluar amplop (megathrust ≈ 91,4–98,7 E / −0,6–12,1 N). Sesudah clip, vertex menempel tepi inklusif; bukan filter-saja.

```
npm test
# tests 278
# pass 278
# fail 0
```

Tidak ada blocker. Tidak mengubah `src/`. Tidak mengerjakan DATA-4.

## Bacaan ulang bukti versus kriteria

- [x] Helper murni `clipGeometryToBbox` + `clipFeatureCollectionToBbox` — potong sisi, tepi inklusif, tanpa paket npm baru
- [x] Uji wajib lulus — garis menyeberang tersisa di dalam; poligon megathrust vertex di dalam + `properties` utuh; fitur di luar hilang; URL tetap intersects + `ACEH_BBOX`
- [x] Skrip clip sebelum tulis; 0 fitur pada salah satu layer → exit 1 tanpa menulis kedua berkas
- [x] Angka `ACEH_BBOX` dan `spatialRel` tidak diubah
- [x] Fixture diisi ulang lewat skrip; bukan kosong; rentang di dalam amplop
- [x] `npm test` hijau — 278/278
- [x] Bukan filter centroid; bukan GADM; bukan klaim batas resmi

## Keputusan

selesai
