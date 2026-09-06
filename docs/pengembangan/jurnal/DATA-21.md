# DATA-21 — dissolve R3P ke kabupaten + PMTiles LOD

Agent: data
Gelombang: 22
Status: selesai

## Niat

Choropleth `r3pDistribution` hidup lagi dengan LOD kab → kecamatan → desa. Agregat hanya dari `kode_kabupaten`/`kode_kab` 4 digit. Jangan mengarang kode. Jangan DATA-4.

## Bukti

Helper [`src/lib/r3p-kab-aggregate.ts`](../../../src/lib/r3p-kab-aggregate.ts). Skrip `dissolve:r3p-kab` dan `build:r3p-kab-tiles`. Fixture + `public/tiles/r3p-kab.pmtiles`. Migrasi [`20260925_map_layers_enable_r3p.sql`](../../../supabase/migrations/20260925_map_layers_enable_r3p.sql) menyalakan toolbar; NGO/alokasi tetap pensiun.
