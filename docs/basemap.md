# Basemap — arsitektur, Sentinel, dan performa

Rencana operasional untuk peta Aceh Tangguh. Bukan glosarium vendor: ini pilihan yang sengaja dibuat agar peta **mutakhir, ringan, dan cepat** di perangkat operator lapangan.

## Yang sudah ada di kode

- **Renderer:** MapLibre GL JS (WebGL) + react-map-gl — jalur yang dipakai tim peta FOSS 2024–2026, bukan Leaflet DOM raster.
- **Overlay wilayah:** PMTiles (tippecanoe) untuk choropleth kab/desa/IRBI, fallback GeoJSON. Geometri tetap di disk (`public/fixtures` + `public/tiles`), bukan PostGIS.
- **Titik:** sebelumnya HTML `<Marker>` per fitur. Fasilitas pendidikan saja >3.000 titik — itu memaksa layout DOM, bukan GPU.
- **Basemap default:** raster Carto Positron / Dark + OSM.org streets. Mudah, CORS terbuka, sudah terbukti di sandbox.

## Target (yang dikerjakan sekarang)

| Lapisan | Teknologi | Alasan |
|---|---|---|
| Peta dasar OSM | **Carto raster (Positron / Dark)** + OSM streets | Default yang andal. Tidak bergantung pada CDN vektor yang sudah gagal di sandbox (peta kosong). |
| Preset merek (opsional) | Style JSON milik sendiri (Light / Dark / Abu-abu minimal) di atas **Aceh OSM extract** jika `NEXT_PUBLIC_ACEH_OSM_PMTILES` atau `public/tiles/aceh-osm.pmtiles` ada, lalu OpenFreeMap planet, lalu Carto | Bukan default. Pilih di Pengaturan → Peta dasar. Warna token: kertas `#F4F5F0`, tinta `#1A1A17`, hutan `#1F4C15`, teal `#2F6B66`, sage `#8A9A5B`. Jika sumber vektor gagal → **Carto**. Jangan self-host planet PMTiles. |
| Vektor OSM (opsional) | OpenFreeMap Positron / Dark / Liberty | GPU, tajam di retina. Aktifkan dengan `?vector=1` atau kotak di pengaturan peta. Jika style fetch gagal → **Carto**. |
| Satelit HD | Esri World Imagery | Resolusi tinggi untuk identifikasi bangunan/jalan. Bukan citra “hari ini”. |
| Satelit Copernicus | **Sentinel-2 Cloudless 2024 (EOX WMTS)** | 10 m, mosaik tahunan bebas awan, CORS terbuka, tanpa kunci. Ini jalur Sentinel yang *bisa* masuk basemap tanpa tile server sendiri. Deep-link: `?basemap=sentinel`. |
| Marker | **GeoJSON cluster native MapLibre** | Satu source, cluster di GPU. Klik cluster → zoom. Tidak merender ribuan node HTML. |
| Ganti basemap | `setStyle` tanpa remount peta | Overlay PMTiles + cluster tetap hidup; kamera tidak di-reset. |

Tidak dipakai (sengaja): Cesium/globe 3D, terrain DEM, Mapbox token, self-host planet PMTiles, TiTiler di runtime aplikasi. Semua itu menambah berat atau ops.

## Apakah peta bisa di-update berkala dengan Sentinel?

**Ya — dengan tiga tingkat, jangan dicampur.**

### 1. Basemap operasional (sekarang) — mosaik tahunan

EOX *Sentinel-2 cloudless* adalah komposit tahunan (edisi 2024). Cocok sebagai **latar peta**, bukan deteksi banjir kemarin. Aceh berawan hampir sepanjang tahun; mosaik tahunan adalah satu-satunya produk Sentinel yang *selalu* bisa dibaca manusia di zoom kab/kecamatan.

Pembaruan: EOX merilis edisi baru sekitar setahun sekali. Ganti URL `s2cloudless-YYYY_3857` di `src/lib/basemap.ts` (satu baris).

### 2. Denyut arsip (sekarang) — STAC 5 harian

Sentinel-2 melewati Aceh ~5 hari. Adegan L2A terbaru di-query dari **Element84 Earth Search STAC** (`/api/sentinel/status`, skrip `scripts/refresh-sentinel-status.mjs`). Ini **bukan** basemap: hanya metadata (waktu, tutupan awan, id granule) agar operator tahu arsip hidup.

Hampir semua granule Aceh punya tutupan awan tinggi. Jangan menayangkan RGB L2A mentah sebagai basemap — yang terlihat adalah putih.

### 3. Mosaik Aceh sendiri (berikutnya, jika dibutuhkan)

Kalau ingin “peta Sentinel kuartalan khusus Aceh”:

1. STAC CDSE `sentinel-2-l2a` + filter `eo:cloud_cover` + AOI `ACEH_BBOX`.
2. Least-cloudy composite (stackstac / odc-stac / sentinelhub-py) → COG RGB 10 m, dipotong Aceh.
3. `gdal2tiles` atau `rio-pmtiles` → `public/tiles/sentinel-aceh-YYYYQn.pmtiles` (raster PMTiles).
4. Cron kuartalan (GitHub Actions / VM). Ukuran target: puluhan MB, bukan ratusan.

Jalur ahli yang sama dipakai Planetary Computer / CDSE Global Mosaics. **Jangan** streaming COG langsung ke browser tanpa tile cache.

### Yang tidak disarankan

- Mengganti Carto/Esri dengan *hanya* Sentinel: 10 m terlalu kasar untuk jalan desa, dan tidak ada label.
- Menjadikan OpenFreeMap default: CDN vektor sudah gagal sekali di sandbox ini.
- Tile proxy L2A real-time di Next.js: timeout, biaya, dan awan tropis.
- Sentinel-1 SAR sebagai basemap: bagus untuk *flood overlay* pasca kejadian (fase terpisah), buruk sebagai peta dasar.

## Aturan performa yang dipegang

1. Satu raster basemap (Carto/Esri/Sentinel) atau vektor opsional; overlay vektor PMTiles; titik di *satu* GeoJSON source ber-cluster.
2. Jangan `key={basemap}` (itu merusak cache GL dan memuat ulang semua overlay).
3. Cluster radius ~48 px, `clusterMaxZoom` 12 — di atas itu titik individual.
4. HTML pin hanya untuk popup, bukan untuk 3.000 sekolah.
5. Attribution selalu terlihat (OSM/Carto, EOX/Copernicus, Esri).

## Overlay PMTiles (bukan basemap)

`public/tiles/*.pmtiles` adalah **overlay vektor** (R3P kab, kecamatan, village, IRBI) yang dibangun tippecanoe dari `public/fixtures/areas/*.geojson`. Geometri tetap di disk — **bukan PostGIS**. **Carto raster tetap basemap default.** Jangan ganti default ke OpenFreeMap atau self-host planet PMTiles. Keputusan yang tetap ditolak: Cesium/globe, terrain DEM, Mapbox token, TiTiler di runtime. GitHub Pages auto-deploy tetap mati; workflow overlay tidak menghidupkannya.

`MapViewport` membaca `source-layer` yang sama dengan `tippecanoe --layer`:

| Arsip | Source-layer | Sumber |
|---|---|---|
| `r3p-kab.pmtiles` | `r3p` | `r3pDistribution.geojson` |
| `kecamatan-r3p.pmtiles` | `kecamatan` | `kecamatanDistribution.geojson` (dissolve by `kode_kecamatan`) |
| `village-r3p.pmtiles` | `village` | `villageDistribution.geojson` |
| `irbi-2025.pmtiles` | `irbi` | `irbi2025.geojson` |

`villageDistribution` uses three archives as zoom LOD (tiles only, no remount, no retile): **z<9** paints `r3p-kab` only; **z 9–10** paints `kecamatan-r3p` only (no village mesh); **z≥11** paints `village-r3p` (desa fill + outlines). After a kab/kec selection, kecamatan and village features filter on existing `kode_kecamatan` (6-digit) / `kode_kab` / `kode_kabupaten` / `kode_desa_kelurahan` — never kecamatan name. Leftovers without `kode_kecamatan` stay **out** of the kecamatan dissolve (no invented codes) and remain on village tiles only. Overlay fill/outline/highlight use `beforeId=marker-clusters` when that layer exists, else `basemap-label-place`; Carto raster omits `beforeId` when neither is mounted.

**Jangan hapus `public/tiles/r3p-kab.pmtiles`.** LOD z<9 masih memakainya (`village-distribution-lod.ts`). Menghapusnya mematahkan choropleth kab di overview. **Pensiun r3p-kab adalah follow-up** setelah ada pengganti LOD0 (dissolve kab by `kode_kabupaten`) atau GO eksplisit untuk meregangkan kecamatan ke zoom rendah.

Overlay URLs default ke `/tiles/...`. Set `NEXT_PUBLIC_TILES_BASE_URL` (prefix publik S3/R2, tanpa trailing slash) jika arsip di-host di object storage — filename tetap sama (`r3p-kab.pmtiles`, …). Choropleth tetap di disk kecuali URL itu diisi.

Rebuild kecamatan polygons with `node scripts/dissolve-kecamatan-distribution.mjs` (group key = `kode_kecamatan` only; bucket = sum `rumah_rr+rumah_rs+rumah_rb` then the same desa terciles t1=106 / t2=1184). Do not seed `area_feature_meta` from this dissolve.

Village tiles carry `properties.kode_desa_kelurahan` (10-digit BPS) **only where the source GeoJSON already has it**. Slug-only leftover polygons stay without a BPS id — the rebuild does not invent codes or remap leftover names. `MapViewport` joins village clicks on that property, not on MVT feature ids. `kode_kecamatan` is kept when present. Do not use tippecanoe `--use-attribute-for-id=` on BPS kode strings (not valid MVT ids; numeric conversion would drop the property and can invent `0` for empty kode).

Batas (tiga gerbang):

1. **500 KB per tile MVT** — payload satu `z/x/y` di dalam arsip (yang diunduh MapLibre). Bukan ukuran file `.pmtiles`.
2. **Anggaran arsip village** — `village-r3p.pmtiles` under 4 MB. Rebuild from geoportal desa + profil_desa; `check:tiles` still enforces the archive budget.
3. **Anggaran arsip kecamatan** — `kecamatan-r3p.pmtiles` under 2 MB.

Pada arsip yang ter-commit, tile terberat village ada di zoom rendah (~145 KB di z7), bukan z12. `check:tiles` tetap menolak jika *satu* tile melewati 500 KB.

```bash
# Cek per-tile + anggaran arsip + source-layer (cepat; tidak rebuild)
# aceh-osm.pmtiles: skip jika belum dibangun; jika ada, cek header + source-layers saja
npm run check:tiles

# Rebuild overlay lokal — butuh tippecanoe (`sudo apt install tippecanoe`), lalu check:tiles
npm run build:tiles

# Rebuild Aceh OSM extract (lokal/manual — bukan CI). Planetiler atau osmium+tippecanoe.
npm run build:aceh-osm
```

CI (`.github/workflows/overlay-tiles.yml`) hanya menjalankan `check:tiles` pada PMTiles yang sudah di-commit, plus probe `verify:basemap` (non-blocking). Tidak memasang tippecanoe/Planetiler, tidak rebuild di setiap PR, tidak deploy GitHub Pages.

## Aceh OSM extract (opsional, preset merek)

Bukan default. Carto Positron tetap `positron`. Jangan self-host planet PMTiles.

1. Unduh PBF regional: extract Aceh di openstreetmap.fr (default), atau `--indonesia` untuk Geofabrik Indonesia lalu clip `ACEH_BBOX` `[95.0, 2.0, 98.3, 6.15]`. Override: `ACEH_OSM_PBF_URL`.
2. Planetiler (Java/Docker) menulis arsip OpenMapTiles — layer yang dipakai style merek: `landcover`, `water`, `waterway`, `building`, `transportation`, `boundary`, `place`, `water_name`, `transportation_name` (plus `landuse` / `park` jika ada). Fallback: osmium + tippecanoe dengan class tags yang sama.
3. Keluaran: `public/tiles/aceh-osm.pmtiles` (gitignored). Target ukuran web (puluhan MB). Host di S3/R2 bila perlu; jangan commit planet.

```bash
npm run build:aceh-osm
# ACEH_OSM_PBF_URL=https://… npm run build:aceh-osm
# bash scripts/build-aceh-osm-pmtiles.sh --indonesia
```

Jalur tile brand: `NEXT_PUBLIC_ACEH_OSM_PMTILES` (path lokal `/tiles/aceh-osm.pmtiles` atau URL publik) → file lokal/S3 terdeteksi (HEAD) → OpenFreeMap TileJSON `https://tiles.openfreemap.org/planet` → Carto jika fetch gagal.

## S3 / R2 (opsional)

Tidak ada secret di repo. Sync hanya jika env ada:

```
TILES_S3_ENDPOINT     # https://<account>.r2.cloudflarestorage.com
TILES_S3_BUCKET
TILES_S3_PREFIX       # opsional, mis. tiles
TILES_S3_REGION       # R2: auto
AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
NEXT_PUBLIC_TILES_BASE_URL   # prefix publik, mis. https://pub.example/tiles
NEXT_PUBLIC_ACEH_OSM_PMTILES # URL publik aceh-osm.pmtiles, atau /tiles/aceh-osm.pmtiles
```

```bash
bash scripts/sync-tiles-s3.sh --dry-run
bash scripts/sync-tiles-s3.sh
```

Workflow `.github/workflows/sync-tiles-s3.yml` adalah `workflow_dispatch` saja — tidak ada cron. Tanpa secret, job skip. CORS bucket harus mengizinkan GET/HEAD + Range dari origin aplikasi. Content-Type `application/vnd.pmtiles`, Cache-Control `public, max-age=86400`.

## Operasi

```bash
# Cek STAC + tulis fixture pratinjau statis
node scripts/refresh-sentinel-status.mjs

# Verifikasi CDN (Carto raster + Sentinel tile + STAC; OpenFreeMap opsional)
node scripts/verify-basemap.mjs

# Sync overlay + Aceh extract ke S3/R2 (skip jika env kosong)
bash scripts/sync-tiles-s3.sh --dry-run
```

Ganti tahun mosaik: `SENTINEL_CLOUDLESS_TILES` / `SENTINEL_CLOUDLESS_YEAR` di `src/lib/basemap.ts`.
