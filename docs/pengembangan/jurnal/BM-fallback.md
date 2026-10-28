# BM-fallback — peta dasar PMTiles Aceh

Agent: frontend (gaya peta, pemilih, uji) bersama data (skrip bangun arsip)
Gelombang: tiket pemilik, di luar gelombang bernomor
Status: selesai

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

| Berkas | Isi |
| --- | --- |
| `scripts/basemap/build-aceh-pmtiles.sh`, `scripts/basemap/README.md` | Planetiler 0.9.0, profil OpenMapTiles. Unduh Geofabrik Indonesia, gunting `ACEH_BBOX`, keluaran `public/tiles/aceh-osm.pmtiles` (gitignored). |
| `src/lib/basemap.ts`, `src/lib/basemap-presets.ts`, `src/lib/tiles-url.ts` | Satu-satunya basemap vektor adalah PMTiles milik sendiri. URL kosong atau `rasterFallback` → gaya kosong warna tema. Tidak ada Carto, tidak ada ubin OSM publik, tidak ada OpenFreeMap. |
| `src/components/map/MapViewport.tsx`, `src/app/globals.css` | Latar stage dan gaya = `basemapCanvasColor`. Pemberitahuan `data-basemap-notice` tidak memblokir klik. Kesalahan sumber `openmaptiles` saja yang mengosongkan basemap. Overlay status memakai `statusOverlayBeforeId`. |
| `public/fonts/` | Glif Noto Sans Regular di-host sendiri (`/fonts/{fontstack}/{range}.pbf`). Tanpa sprite. |
| `src/lib/basemap-fallback.test.ts` | Kontrak: tidak ada `tile.openstreetmap.org` / `cartocdn`; URL terpasang → PMTiles; selain itu kanvas tema. |
| `messages/id.json`, `messages/en.json`, `docs/basemap.md`, `README.md`, `.env.example` | Salinan dan runbook mengikuti keputusan tanpa kunci. |
| `scripts/verify-basemap.mjs` | Probe tidak mengambil OSM atau Carto. Range PMTiles hanya jika URL http(s) terpasang. |

## Temuan ketentuan CARTO

Dibaca 27 Oktober 2026.

- [CARTO Basemaps Terms and Conditions](https://carto.com/legal/basemap-terms/), last updated 29 September 2026. Pasal 3.b: Free Basemap Services hanya untuk Customer yang meminta dan memakai kunci API terbitan CARTO. Pasal 3.d: permintaan tanpa kunci yang sah boleh diberi watermark, dan Customer tidak boleh menyingkirkannya. Pasal 8: "Customer must always use the Basemap Services with Customer's own unique API keys."
- [FAQ CARTO Basemaps](https://docs.carto.com/faqs/carto-basemaps). Sejak 25 September 2026 ubin raster tidak dilayani tanpa kunci (ubin bertuliskan "API KEY REQUIRED"). Tingkat gratis tetap mensyaratkan kunci (non-komersial sampai 5 juta permintaan per bulan, komersial 1 juta). FAQ juga menulis bahwa gaya vektor hari ini masih bisa dimuat tanpa kunci, dan bahwa kewajiban kunci mungkin diperluas ke vektor.

Pemakaian tanpa kunci tidak diizinkan dengan jelas untuk situs informasi bencana publik ini. Kunci gratis tetap sebuah kunci, sedangkan pemilik memilih biaya kunci nol. Carto dijatuhkan seluruhnya. PMTiles adalah satu-satunya basemap vektor. Jika URL kosong atau ubin gagal, kanvas tetap warna tema dan ada pemberitahuan singkat. Overlay tetap hidup. Tidak ada ubin OSM publik.

## Bukti

```
npm test
# tests 1019
# pass 1019
# fail 0

npm run typecheck   # tsc --noEmit, exit 0
npm run lint        # exit 0; peringatan <img> yang sudah ada (CmsCoverField, MapFeatureCard, MapLayerIcon, MapMarkerPin)
npm run build       # next build, exit 0, 84 halaman statis
npm run check:tiles
# aceh-osm.pmtiles skip (not built; npm run build:basemap — local/manual, not CI)
# overlay irbi / kecamatan / village lulus anggaran

src/lib/basemap-fallback.test.ts: 4 lulus
(URL kosong → sources {} dan latar #F4F5F0; URL terpasang → pmtiles://…; rasterFallback gelap → kanvas #1A1A17)

Chrome headless, next start -p 3456, /id/peta, env basemap kosong.
Kanvas terang sampel piksel (244, 245, 240) = #F4F5F0.
/id/peta?basemap=dark sampel piksel (26, 26, 23) = #1A1A17.
Netlog 138 URL: tidak ada openstreetmap.org, cartocdn, atau openfreemap.
Pemberitahuan "Peta dasar belum tersedia. Lapisan lain tetap bisa dipakai." terlihat; legenda status dan panel lapisan tetap ada.

Ukuran aceh-osm.pmtiles, bangun lokal `scripts/basemap/build-aceh-pmtiles.sh`
pada commit 0d9bebd (Planetiler 0.9.0, bbox 95.0,2.0,98.3,6.15, z0–14):
43,44 MB (45.552.256 byte), 38.463 ubin, ubin terbesar 150,4 KB, 0 ubin di atas 500 KB.
vector_layers: park (z4–14), landuse (z6–14), landcover, water, waterway,
transportation, transportation_name, place, boundary, building, water_name.
Biner tidak di-commit.
```

## Bacaan ulang bukti versus kriteria

- [x] Skrip bangun + README, biner tidak di-commit, URL env, Range
- [x] Protokol pmtiles://
- [x] Gaya terang dan gelap, token air, tanpa oranye/lime/biru-hitam
- [x] Tidak ada sumber tile.openstreetmap.org; atribusi dari field sumber
- [x] URL kosong atau ubin gagal = kanvas tema + pemberitahuan; overlay tetap
- [x] Overlay status di atas basemap; halo label tetap; tanpa kilatan putih
- [x] Uji, tsc, lint, build, check:tiles
- [x] Temuan ketentuan Carto tercatat beserta tautan

## Keputusan

selesai
