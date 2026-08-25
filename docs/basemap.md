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

`public/tiles/*.pmtiles` adalah **overlay vektor** (R3P kab, village, IRBI) yang dibangun tippecanoe dari `public/fixtures/areas/*.geojson`. Geometri tetap di disk — **bukan PostGIS**. **Carto raster tetap basemap default.** Jangan ganti default ke OpenFreeMap atau self-host planet PMTiles. Keputusan yang tetap ditolak: Cesium/globe, terrain DEM, Mapbox token, TiTiler di runtime. GitHub Pages auto-deploy tetap mati; workflow overlay tidak menghidupkannya.

`MapViewport` membaca `source-layer` yang sama dengan `tippecanoe --layer`:

| Arsip | Source-layer | Sumber |
|---|---|---|
| `r3p-kab.pmtiles` | `r3p` | `r3pDistribution.geojson` |
| `village-r3p.pmtiles` | `village` | `villageDistribution.geojson` |
| `irbi-2025.pmtiles` | `irbi` | `irbi2025.geojson` |

Batas (dua gerbang):

1. **500 KB per tile MVT** — payload satu `z/x/y` di dalam arsip (yang diunduh MapLibre). Bukan ukuran file `.pmtiles`.
2. **Anggaran arsip village** — `village-r3p.pmtiles` under 4 MB. Arsip ~2.9 MB sekarang itu wajar.

Pada arsip yang ter-commit, tile terberat village ada di zoom rendah (~125 KB di z7), bukan z12 (~18 KB). `check:tiles` tetap menolak jika *satu* tile melewati 500 KB.

```bash
# Cek per-tile + anggaran arsip + source-layer (cepat; tidak rebuild)
npm run check:tiles

# Rebuild lokal — butuh tippecanoe (`sudo apt install tippecanoe`), lalu check:tiles
npm run build:tiles
```

CI (`.github/workflows/overlay-tiles.yml`) hanya menjalankan `check:tiles` pada PMTiles yang sudah di-commit, plus probe `verify:basemap` (non-blocking). Tidak memasang tippecanoe, tidak rebuild di setiap PR, tidak deploy GitHub Pages.

## Operasi

```bash
# Cek STAC + tulis fixture pratinjau statis
node scripts/refresh-sentinel-status.mjs

# Verifikasi CDN (Carto raster + Sentinel tile + STAC; OpenFreeMap opsional)
node scripts/verify-basemap.mjs
```

Ganti tahun mosaik: `SENTINEL_CLOUDLESS_TILES` / `SENTINEL_CLOUDLESS_YEAR` di `src/lib/basemap.ts`.
