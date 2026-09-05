# DATA-15 — satu modul ruang Aceh

Agent: data
Gelombang: ECC-S2
Status: selesai

## Niat

- Tujuan: `ACEH_BBOX` = clip peta/overlay; `ACEH_BOUNDS` laporan lebih lebar. Skrip ETL mengimpor, bukan menyalin literal. Angka tidak diganti.
- Berkas: `src/lib/aceh-scope.ts`, `scripts/lib/aceh-scope.mjs`, impor di `basemap.ts`, `laporan/definitions.ts`, `overlay-etl.mjs`, `refresh-peringatan.mjs`, `refresh-sentinel-status.mjs`, `build-weather-inovasi-snapshot.mjs`.

## Bacaan ulang niat

Pengecualian wilayah tertulis di modul. Bbox bukan batas administratif. Siap kode.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `aceh-scope.ts` / `.mjs` | `ACEH_BBOX` + `ACEH_BOUNDS_LAPORAN` |
| ETL / refresh / inovasi | impor, bukan `const ACEH_BBOX` salinan |

## Bukti

Nilai tetap `[95.0, 2.0, 98.3, 6.15]` dan laporan `1.5–6.5` / `95.0–98.5`. Uji overlay-etl bbox tidak pecah.

## Bacaan ulang bukti versus kriteria

- [x] Dua amplop terpisah
- [x] Skrip mengimpor
- [x] Angka tidak diganti

## Keputusan

selesai
