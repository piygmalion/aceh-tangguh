# DATA-20 — Quintile 5 kelas distribusi desa

Agent: data
Gelombang: peta-tanggapi
Status: selesai

## Niat

- Tujuan: Satu klasifikasi rumah rusak (RR+RS+RB) untuk desa, kecamatan, dan kab: lima kelas quintile pada nilai positif + `belum_diketahui` untuk leftover tanpa kode BPS. Jangan mengarang angka rumah atau kode. Rebuild properti bucket pada fixture yang sudah ada; geometri tidak diubah. Rebuild PMTiles jika tippecanoe tersedia.
- Berkas: `scripts/lib/village-distribution-buckets.mjs`, `scripts/lib/village-distribution-buckets.test.mjs`, `scripts/lib/kecamatan-dissolve.mjs`, `scripts/lib/kecamatan-dissolve.test.mjs`, `scripts/rebucket-village-distribution.mjs`, `scripts/build-village-distribution-geoportal.py`, `scripts/seed-profil-desa.js`, `scripts/dissolve-kecamatan-distribution.mjs`, `public/fixtures/areas/villageDistribution.geojson`, `public/fixtures/areas/kecamatanDistribution.geojson`, `public/fixtures/areas/r3pDistribution.geojson`, `public/fixtures/areas/villageDistribution.legend.json`, `public/fixtures/areas/r3pDistribution.legend.json`, `docs/basemap.md`.
- Langkah: tes bucket RED → modul + dissolve memakai break terkunci → rebucket fixture → `build:tiles` + `check:tiles`.
- Cara membuktikan: `node --import tsx --test scripts/lib/village-distribution-buckets.test.mjs scripts/lib/kecamatan-dissolve.test.mjs` lalu `npm run build:tiles`.
- Risiko: PMTiles lama tetap 3 kelas sampai rebuild; `match` MapLibre harus tetap mengenali `rendah/sedang/tinggi`.

## Bacaan ulang niat

Break dihitung dari total positif fixture (n=172): q1=20, q2=191, q3=731, q4=2849. Nol = sangat_rendah. Sembilan leftover tanpa `kode_desa_kelurahan` = belum_diketahui. Kab dissolve memakai nama kabupaten yang sudah ada di desa — bukan potongan 4 digit kode, karena beberapa baris desa sudah membawa nama kabupaten yang tidak sepadan dengan prefiks kode. Kode BPS tidak diganti. DATA-4 tidak dibuka.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `scripts/lib/village-distribution-buckets.mjs` | Quintile terkunci, unknown, jumlah kab by name |
| `scripts/rebucket-village-distribution.mjs` | Stempel ulang desa/kec/kab |
| fixture + legend + 3 PMTiles | Bucket 6 kelas; `r3p-kab.pmtiles` hidup |

## Bukti

```
# tests 10  pass 10  (village-distribution-buckets + kecamatan-dissolve)
npm run build:tiles
All overlay PMTiles passed (per-tile ≤ 500.0 KB; required archives including r3p-kab present)
village 6508 unknown 9 kecamatan 290 kab 23
Pidie kab value=5552 bucket=sangat_tinggi (name dissolve, kode_kab 1109 tetap)
npm test 511 pass; tsc --noEmit 0
```

## Bacaan ulang bukti versus kriteria

- [x] Enam kunci bucket + break terkunci
- [x] Fixture desa/kec/kab sepadan
- [x] Tidak ada kode BPS baru
- [x] `check:tiles` lulus termasuk r3p-kab

## Keputusan

selesai
