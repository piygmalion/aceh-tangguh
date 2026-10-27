# BM-fallback — peta dasar PMTiles Aceh

Agent: frontend (gaya peta, pemilih, uji) bersama data (skrip bangun arsip)
Gelombang: tiket pemilik, di luar gelombang bernomor
Status: draf

## Niat

- Tujuan: Mengganti fallback ubin raster `tile.openstreetmap.org` pada basemap gaya positron di `/peta` dengan vektor PMTiles milik sendiri (tanpa kunci pihak ketiga). Carto tidak dipakai sebagai cadangan: ketentuan publik CARTO tidak mengizinkan pemakaian tanpa kunci. Jika URL PMTiles kosong atau ubin gagal, kanvas tetap warna tema dan ada pemberitahuan singkat; overlay tetap hidup. Tidak ada ubin OSM publik.
- Berkas:
  - `scripts/basemap/build-aceh-pmtiles.sh`, `scripts/basemap/README.md`
  - `src/lib/basemap.ts`, `src/lib/basemap-presets.ts`, `src/lib/tiles-url.ts`, `src/lib/village-distribution-lod.ts`
  - `src/components/map/MapViewport.tsx`, `src/app/globals.css`
  - `messages/id.json`, `messages/en.json`, `src/lib/data-sources.ts`
  - `scripts/verify-basemap.mjs`, `docs/basemap.md`, `README.md`, `package.json`
  - uji `src/lib/basemap-fallback.test.ts` dan uji yang mengunci perilaku Carto/OSM lama
  - `public/fonts/` (glif Noto Sans yang di-host sendiri)
  - jurnal ini dan `docs/pengembangan/STATUS.md`
- Langkah:
  1. Uji dulu: tidak ada URL `*.tile.openstreetmap.org`; urutan cadangan adalah PMTiles bila `NEXT_PUBLIC_BASEMAP_PMTILES_URL` terpasang, selain itu kanvas kosong (bukan Carto, bukan OSM).
  2. Skrip Planetiler profil OpenMapTiles: unduh Geofabrik Indonesia (Sumatra bukan subregion Geofabrik), gunting `ACEH_BBOX`, tulis `public/tiles/aceh-osm.pmtiles` (gitignored).
  3. Gaya terang dan gelap memakai token Peudeung yang sudah ada. Air gelap tetap `#4D807B` (teal campur 15% kertas). Glif di `/fonts`, tanpa sprite.
  4. Protokol `pmtiles://` yang sudah ada di `MapViewport` tetap dipakai. Atribusi dibaca dari field `attribution` sumber.
  5. Overlay status (WASPADA/SIAGA/AWAS) di atas seluruh lapisan basemap; halo label tetap.
  6. Latar kanvas = warna tema, bukan putih dan bukan `#d4dce4`.
- Cara membuktikan: `npm test` pada uji basemap, `tsc`, `lint`, `build`, `npm run check:tiles`. Ukuran `.pmtiles` dicatat hanya jika bangun arsip selesai.
- Risiko: Jangan commit biner `.pmtiles`. Jangan menulis rahasia. Jangan menebak kode Tatonas, zona KRB, atau angka korban. Esri dan Sentinel tetap opsi citra, bukan pengganti OSM. Bbox gunting adalah `ACEH_BBOX` yang sudah dipakai aplikasi, bukan klaim batas administratif resmi.

## Bacaan ulang niat

Niat bisa dijalankan tanpa menebak data resmi. Profil OpenMapTiles dipilih karena gaya dan `check:tiles` sudah memakai source-layer itu; profil Protomaps akan memaksa skema layer baru. Carto dijatuhkan karena pasal 3.b dan pasal 8 ketentuan basemap mensyaratkan kunci, dan FAQ mengatakan ubin raster tanpa kunci tidak dilayani sejak 25 September 2026. Cadangan tanpa kunci tidak diizinkan dengan jelas, jadi tidak ada fallback Carto maupun OSM. Glif tidak boleh dari OpenFreeMap. Berkas di luar wilayah agent satu tiket ini disebut di niat karena tiket menyentuh skrip, gaya, dan status.

## Perubahan

|

## Bukti

```
```

## Bacaan ulang bukti versus kriteria

- [ ] Skrip bangun + README, biner tidak di-commit, URL env, Range
- [ ] Protokol pmtiles://
- [ ] Gaya terang dan gelap, token air, tanpa oranye/lime/biru-hitam
- [ ] Tidak ada sumber tile.openstreetmap.org; atribusi dari field sumber
- [ ] URL kosong atau ubin gagal = kanvas tema + pemberitahuan; overlay tetap
- [ ] Overlay status di atas basemap; halo label tetap; tanpa kilatan putih
- [ ] Uji, tsc, lint, build, check:tiles
- [ ] Temuan ketentuan Carto tercatat beserta tautan

## Keputusan

lanjut
