# Basemap — arsitektur, Sentinel, dan performa

Rencana operasional untuk peta Aceh Tangguh. Bukan glosarium vendor: ini pilihan yang sengaja dibuat agar peta **mutakhir, ringan, dan cepat** di perangkat operator lapangan.

## Yang sudah ada di kode

- **Renderer:** MapLibre GL JS (WebGL) + react-map-gl — jalur yang dipakai tim peta FOSS 2024–2026, bukan Leaflet DOM raster.
- **Overlay wilayah:** PMTiles (tippecanoe) untuk choropleth kab/desa/IRBI, fallback GeoJSON. Geometri tetap di disk (`public/fixtures` + `public/tiles`), bukan PostGIS.
- **Titik:** sebelumnya HTML `<Marker>` per fitur. Fasilitas pendidikan saja >3.000 titik — itu memaksa layout DOM, bukan GPU.
- **Basemap default:** vektor PMTiles milik sendiri (terang dan gelap) bila `NEXT_PUBLIC_BASEMAP_PMTILES_URL` terpasang. Jika URL kosong atau ubin gagal, kanvas tetap warna tema dan ada pemberitahuan singkat. Tidak ada ubin `tile.openstreetmap.org` dan tidak ada Carto — ketentuan CARTO mensyaratkan kunci, jadi pemakaian tanpa kunci tidak dipakai.

## Target (yang dikerjakan sekarang)

| Lapisan | Teknologi | Alasan |
|---|---|---|
| Peta dasar OSM | **PMTiles Aceh (OpenMapTiles)** di `NEXT_PUBLIC_BASEMAP_PMTILES_URL` | Terang dan gelap. URL kosong atau ubin gagal → kanvas tema + pemberitahuan. Bukan Carto, bukan OSM raster publik. |
| Preset merek | Style JSON yang sama (Light / Dark / Abu-abu minimal) di atas arsip itu | Warna: kertas `#F4F5F0`, tinta `#1A1A17`, hutan `#1F4C15`, teal `#2F6B66`, air gelap `#4D807B`, sage `#8A9A5B`. Glif Noto Sans di `/fonts`. Tanpa sprite. |
| Vektor pihak ketiga | Tidak dipakai | `?vector=1` tidak lagi memuat OpenFreeMap. |
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

- Mengganti PMTiles/Esri dengan *hanya* Sentinel: 10 m terlalu kasar untuk jalan desa, dan tidak ada label.
- Menjadikan OpenFreeMap default: CDN vektor sudah gagal sekali di sandbox ini.
- Tile proxy L2A real-time di Next.js: timeout, biaya, dan awan tropis.
- Sentinel-1 SAR sebagai basemap: bagus untuk *flood overlay* pasca kejadian (fase terpisah), buruk sebagai peta dasar.

## Aturan performa yang dipegang

1. Satu basemap (PMTiles milik sendiri, atau citra Esri/Sentinel); overlay vektor PMTiles; titik di *satu* GeoJSON source ber-cluster.
2. Jangan `key={basemap}` (itu merusak cache GL dan memuat ulang semua overlay).
3. Cluster radius ~48 px, `clusterMaxZoom` 12 — di atas itu titik individual.
4. HTML pin hanya untuk popup, bukan untuk 3.000 sekolah.
5. Attribution selalu terlihat dari sumber yang aktif (OSM pada PMTiles, EOX/Copernicus, Esri). Kanvas kosong tidak menampilkan atribusi OSM.

## Overlay PMTiles (bukan basemap)

`public/tiles/*.pmtiles` untuk choropleth (R3P kecamatan, village, IRBI) dibangun tippecanoe dari `public/fixtures/areas/*.geojson`. Geometri tetap di disk — **bukan PostGIS**. **Basemap operasional adalah PMTiles Aceh** (`aceh-osm.pmtiles`, gitignored) bila URL-nya terpasang. Jangan self-host planet PMTiles. Keputusan yang tetap ditolak: Cesium/globe, terrain DEM, Mapbox token, TiTiler di runtime, ubin OSM publik, Carto. GitHub Pages auto-deploy tetap mati; workflow overlay tidak menghidupkannya.

`MapViewport` membaca `source-layer` yang sama dengan `tippecanoe --layer`:

| Arsip | Source-layer | Sumber |
|---|---|---|
| `kecamatan-r3p.pmtiles` | `kecamatan` | `kecamatanDistribution.geojson` (dissolve by `kode_kecamatan`) |
| `village-r3p.pmtiles` | `village` | `villageDistribution.geojson` |
| `irbi-2025.pmtiles` | `irbi` | `irbi2025.geojson` |

`villageDistribution` / `r3pDistribution` drill down on click, not zoom: overview paints kabupaten GeoJSON from `r3pDistribution.geojson` (23 kab/kota; villageDistribution recolors with desa terciles 106 / 1184); a kabupaten click filters `kecamatan-r3p` to that kab; a kecamatan click paints `village-r3p` filtered to that `kode_kecamatan`. `r3p-kab.pmtiles` is **retired** and is not in `OVERLAY_PMTILES_FILES`. After a kab/kec selection, kecamatan and village features filter on existing `kode_kecamatan` (6-digit) / `kode_kab` / `kode_kabupaten` / `kode_desa_kelurahan` — never kecamatan name. Leftovers without `kode_kecamatan` stay **out** of the kecamatan dissolve (no invented codes) and remain on village tiles only. Overlay fill/outline/highlight use `beforeId=marker-clusters` when that layer exists, else `basemap-label-place`. Status overlays (WASPADA/SIAGA/AWAS) use `statusOverlayBeforeId` so they stay above basemap labels.

Overlay URLs default ke `/tiles/...`. Set `NEXT_PUBLIC_TILES_BASE_URL` (prefix publik S3/R2, tanpa trailing slash) jika arsip di-host di object storage — filename tetap sama (`kecamatan-r3p.pmtiles`, …). Choropleth tetap di disk kecuali URL itu diisi.

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

# Rebuild basemap Aceh (lokal/manual — bukan CI). Planetiler OpenMapTiles.
npm run build:basemap
```

CI (`.github/workflows/overlay-tiles.yml`) hanya menjalankan `check:tiles` pada PMTiles yang sudah di-commit, plus probe `verify:basemap` (non-blocking). `verify:tiles-cdn` tidak dipasang di CI (URL publik opsional — false red jika secret belum ada). Tidak memasang tippecanoe/Planetiler, tidak rebuild di setiap PR, tidak deploy GitHub Pages. Jangan menambah upload S3 terjadwal atau on-push.

## Aceh OSM extract (basemap operasional)

Ini basemap operasional (`positron` / `dark` / `streets` dan preset merek). Jangan self-host planet PMTiles. Jangan jatuh ke ubin OSM publik atau Carto.

1. Unduh Geofabrik Indonesia (tidak ada subregion Sumatra), lalu gunting `ACEH_BBOX` `[95.0, 2.0, 98.3, 6.15]` dengan osmium. Bbox ini amplop operasional yang sudah dipakai aplikasi, bukan batas administratif resmi.
2. Planetiler 0.9.0 (Java 21) menulis arsip OpenMapTiles — layer yang dipakai gaya: `landcover`, `water`, `waterway`, `building`, `transportation`, `boundary`, `place`, `water_name`, `transportation_name` (plus `landuse` / `park` jika ada).
3. Keluaran: `public/tiles/aceh-osm.pmtiles` (gitignored). Target ukuran web (puluhan MB). Host di R2/CDN dengan HTTP Range; jangan commit biner.

```bash
npm run build:basemap
# bash scripts/basemap/build-aceh-pmtiles.sh
```

Rincian, profil OpenMapTiles, dan glif: `scripts/basemap/README.md`.

Jalur tile: `NEXT_PUBLIC_BASEMAP_PMTILES_URL` (alias lama `NEXT_PUBLIC_ACEH_OSM_PMTILES`) → `pmtiles://` dengan HTTP Range. Jika kosong atau sumber `openmaptiles` gagal → kanvas tema, tanpa OpenFreeMap dan tanpa Carto.

## S3 / R2 (opsional)

Tidak ada secret di repo. Sync hanya jika env ada:

```
TILES_S3_ENDPOINT     # https://<account>.r2.cloudflarestorage.com
TILES_S3_BUCKET
TILES_S3_PREFIX       # opsional, mis. tiles
TILES_S3_REGION       # R2: auto
AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
NEXT_PUBLIC_TILES_BASE_URL      # prefix publik, mis. https://pub.example/tiles
NEXT_PUBLIC_BASEMAP_PMTILES_URL # URL publik aceh-osm.pmtiles (Range)
NEXT_PUBLIC_ACEH_OSM_PMTILES    # alias lama, jika URL di atas kosong
```

```bash
bash scripts/sync-tiles-s3.sh --dry-run
bash scripts/sync-tiles-s3.sh
```

Workflow `.github/workflows/sync-tiles-s3.yml` adalah `workflow_dispatch` saja — tidak ada cron. Tanpa secret, job skip. CORS bucket harus mengizinkan GET/HEAD + Range dari origin aplikasi. Content-Type `application/vnd.pmtiles`, Cache-Control `public, max-age=86400`.

## CDN verify runbook (opt-in, Stage 3)

Production blocking hari ini adalah ops (secret + URL publik + `aceh-osm.pmtiles` belum dibangun), bukan kode sync. Basemap operasional adalah PMTiles milik sendiri bila `NEXT_PUBLIC_BASEMAP_PMTILES_URL` terpasang; jika kosong, kanvas tema. Tidak ada Carto dan tidak ada ubin OSM publik. `r3p-kab.pmtiles` is retired (LOD0 is kabupaten GeoJSON). Jangan commit artefak `aceh-osm.pmtiles` (gitignored). Verify ini **lokal/manual** — jangan pasang ke CI terjadwal agar tidak false-red saat URL belum diisi.

CORS bucket/CDN harus mengizinkan **GET, HEAD, Range** dari origin aplikasi (`Access-Control-Allow-Origin` = origin app atau `*`; `Access-Control-Allow-Headers: Range`; expose `Content-Range` / `Accept-Ranges`). Range 206 lebih baik; HTTP 200 (badan penuh) diterima.

1. `npm run build:basemap` (lokal; keluaran `public/tiles/aceh-osm.pmtiles` gitignored — bukan CI).
2. `npm run sync:tiles -- --dry-run` dengan `TILES_S3_*` + `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` di shell lokal (nilai tidak ditulis di git).
3. Isi GitHub Actions secrets untuk `.github/workflows/sync-tiles-s3.yml` (`TILES_S3_ENDPOINT`, `TILES_S3_BUCKET`, `TILES_S3_PREFIX`, `TILES_S3_REGION`, `TILES_S3_ACCESS_KEY_ID`, `TILES_S3_SECRET_ACCESS_KEY`). Workflow **dispatch saja** — jangan tambah cron/push upload.
4. Isi Vercel `NEXT_PUBLIC_TILES_BASE_URL` (prefix publik, tanpa trailing slash). Basemap: `NEXT_PUBLIC_BASEMAP_PMTILES_URL` (alias lama `NEXT_PUBLIC_ACEH_OSM_PMTILES`, URL https publik atau `/tiles/aceh-osm.pmtiles`).
5. `npm run verify:tiles-cdn` — HEAD 2xx + Range `bytes=0-16383` (206/200) untuk `kecamatan-r3p.pmtiles`, `village-r3p.pmtiles`, `irbi-2025.pmtiles`. Tanpa `NEXT_PUBLIC_TILES_BASE_URL`: exit 0, `skip — local /tiles default`. Tidak butuh kredensial AWS.

## Operasi

```bash
# Cek STAC + tulis fixture pratinjau statis
node scripts/refresh-sentinel-status.mjs

# Verifikasi (Sentinel tile + STAC; Range PMTiles hanya jika URL terpasang)
node scripts/verify-basemap.mjs

# Overlay S3/R2 publik (skip jika NEXT_PUBLIC_TILES_BASE_URL kosong)
npm run verify:tiles-cdn

# Sync overlay + Aceh extract ke S3/R2 (skip jika env kosong)
bash scripts/sync-tiles-s3.sh --dry-run
```

Ganti tahun mosaik: `SENTINEL_CLOUDLESS_TILES` / `SENTINEL_CLOUDLESS_YEAR` di `src/lib/basemap.ts`.
