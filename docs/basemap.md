# Basemap — arsitektur, Sentinel, dan performa

Rencana operasional untuk peta Aceh Tangguh. Bukan glosarium vendor: ini pilihan yang sengaja dibuat agar peta **mutakhir, ringan, dan cepat** di perangkat operator lapangan.

## Yang sudah ada di kode

- **Renderer:** MapLibre GL JS (WebGL) + react-map-gl — jalur yang dipakai tim peta FOSS 2024–2026, bukan Leaflet DOM raster.
- **Overlay wilayah:** PMTiles (tippecanoe) untuk choropleth kab/desa/IRBI, fallback GeoJSON.
- **Titik:** sebelumnya HTML `<Marker>` per fitur. Fasilitas pendidikan saja >3.000 titik — itu memaksa layout DOM, bukan GPU.
- **Basemap lama:** raster Carto / OSM / Esri. Mudah, tapi raster OSM/Carto lebih berat di zoom, tidak sharp di retina, dan tile OSM.org tidak untuk aplikasi produksi.

## Target (yang dikerjakan sekarang)

| Lapisan | Teknologi | Alasan |
|---|---|---|
| Peta dasar OSM | **OpenFreeMap vector** (Positron / Dark / Liberty) | Ubin vektor GPU, tanpa API key, data OSM berjalan. Raster Carto tetap jadi *fallback* jika CDN vektor diblokir. |
| Satelit HD | Esri World Imagery | Resolusi tinggi untuk identifikasi bangunan/jalan. Bukan citra “hari ini”. |
| Satelit Copernicus | **Sentinel-2 Cloudless 2024 (EOX WMTS)** | 10 m, mosaik tahunan bebas awan, CORS terbuka, tanpa kunci. Ini jalur Sentinel yang *bisa* masuk basemap tanpa tile server sendiri. |
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

- Mengganti Esri/OpenFreeMap dengan *hanya* Sentinel: 10 m terlalu kasar untuk jalan desa, dan tidak ada label.
- Tile proxy L2A real-time di Next.js: timeout, biaya, dan awan tropis.
- Sentinel-1 SAR sebagai basemap: bagus untuk *flood overlay* pasca kejadian (fase terpisah), buruk sebagai peta dasar.

## Aturan performa yang dipegang

1. Basemap vektor atau satu raster; overlay vektor PMTiles; titik di *satu* GeoJSON source ber-cluster.
2. Jangan `key={basemap}` (itu merusak cache GL dan memuat ulang semua overlay).
3. Cluster radius ~48 px, `clusterMaxZoom` 12 — di atas itu titik individual.
4. HTML pin hanya untuk popup, bukan untuk 3.000 sekolah.
5. Attribution selalu terlihat (OSM, EOX/Copernicus, Esri).

## Operasi

```bash
# Cek STAC + tulis fixture pratinjau statis
node scripts/refresh-sentinel-status.mjs

# Verifikasi CDN (vektor + Sentinel tile + STAC)
node scripts/verify-basemap.mjs
```

Ganti tahun mosaik: `SENTINEL_CLOUDLESS_TILES` / `SENTINEL_CLOUDLESS_YEAR` di `src/lib/basemap.ts`.
