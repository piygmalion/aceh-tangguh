# Aceh Tangguh

MVP scaffold: mandum rimba-inspired homepage × Tanggapi-inspired map.

Inspired-by only. Does **not** copy AGPL Mandum source — patterns only, own implementation.

## Stack

- Next.js 14 + React 18 + TypeScript
- Tailwind CSS 3
- next-intl (id, en) with localized pathnames
- MapLibre + react-map-gl + PMTiles
- TanStack Query + Zod + lucide-react + Recharts

## Run (preview lokal)

Objek preview saat ini adalah **lokal**, bukan GitHub Pages.

```
npm install
npm run dev
```

Buka http://localhost:3000/id — hard refresh jika UI terlihat usang.

Build Node: `npm run build` lalu `npm run start`.

## GitHub Pages (dimatikan)

Deploy otomatis GitHub Pages dinonaktifkan. Situs `https://piygmalion.github.io/aceh-tangguh/` tidak lagi di-update dari CI dan tidak dipakai sebagai preview.

Pipeline static export (`STATIC_EXPORT=1 npm run build` → `out/`) tetap ada di repo untuk nanti, jika Pages dihidupkan lagi.


## Supabase backend

Project: `whojoxrbcdyotrpolgav` (`https://whojoxrbcdyotrpolgav.supabase.co`).

1. Copy `.env.example` → `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (legacy anon JWT for `@supabase/supabase-js`)
2. Install & build:
   ```
   bun install
   bun run build
   ```
3. Schema documentation: `supabase/migrations/20260823_init_aceh_tangguh_backend.sql`
4. Staff admin (`/id/admin`): apply `supabase/migrations/20260825_admin_auth.sql` then create the first `super_admin` manually — see `docs/admin-setup.md`. Laporan writes (not the admin UI) need `SUPABASE_SERVICE_ROLE_KEY` on the Node server — never on GitHub Pages.
5. Seed area feature metadata from fixtures (needs service role or SQL admin; anon is SELECT-only on `area_feature_meta`):
   ```
   bun run seed:area-meta
   ```
   `villageDistribution` is not included there. Seed it only for the intersection of GeoJSON 10-digit `properties.kode_desa_kelurahan` ∩ coded `profil_desa` rows (join on that kode, never `feature.id`). Do **not** run `--apply` against production until the coordinator reviews:
   ```
   npm run seed:village-area-meta -- --dry-run
   npm run seed:village-area-meta -- --apply
   ```

Geometry stays in `public/fixtures` + `public/tiles` (PMTiles). Domain JSON (kejadian, markers, anggaran, publikasi, IRBI analysis) is read from Supabase first; loaders fall back to fixtures if env is missing, a query fails, or the table is empty. The homepage PRRPKA section is fixture-driven (`prrpka_aceh.json` + `prrpka_ringkasan.json`); there is no matching Supabase seed table.

### API endpoints

| Method | Path | Source |
|--------|------|--------|
| GET/POST | `/api/reports` | Legacy `reports` (POST = service role; GET = published + consent) |
| GET/PATCH | `/api/admin/reports` | Staff JWT — legacy `reports` |
| GET/PATCH | `/api/admin/laporan` | Staff JWT — `laporan_kejadian` / `laporan_penanganan` |
| POST | `/api/laporan/kejadian` | Service role insert after Zod + rate limit |
| POST | `/api/laporan/penanganan` | Service role insert after Zod + rate limit |
| POST | `/api/laporan/upload` | Service role storage; magic-byte MIME; rate limit |
| GET | `/api/admin/me` | Session + `admin_profiles` |
| GET/POST/PATCH/DELETE | `/api/admin/cms/*` | Super-admin CMS |
| GET/PATCH | `/api/admin/database` | Super-admin typed table editor |
| GET | `/api/stats/live` | `live_stats` (+ 24h report count) |
| GET | `/api/hazards` | `hazard_status` |
| GET | `/api/peringatan-dini` | Homepage early-warning cards (cuaca + MAGMA + Sipongi; fail independently) |
| GET | `/api/peringatan-dini/magma` | MAGMA Indonesia Aceh gempa (live homepage / VSI homepage; empty+stale if both fail) |
| GET | `/api/peringatan-dini/sipongi` | Sipongi Aceh medium/high hotspots (live GeoJSON, else `peringatan-sipongi.json`) |
| GET | `/api/layers/catalog` | enabled `map_layers` merged with local toolbar catalog (`src/lib/map-layers-catalog.ts`) |
| GET | `/api/layers/meta/[layerKey]` | `area_feature_meta` |
| GET | `/api/irbi` | `irbi_documents` / fixture + optional `area_feature_meta` merge |
| GET | `/api/layers/areas/[key]` | GeoJSON fixtures (polygons stay on disk) |
| GET | `/api/layers/markers` | `marker_features` → GeoJSON, else fixture; merges overlay `laporanKejadian` / `laporanPenanganan` |
| GET | `/api/laporan/peta` | Moderated `laporan_kejadian` + `laporan_penanganan` (`status=approved` AND `tampil_di_peta`; no `jawaban_json`) |
| GET | `/api/layers/markers/summary` | Same as markers (debug counts) |
| GET | `/api/boundaries` | GeoJSON fixtures |
| GET | `/api/kejadian` | `kejadian_bencana` (filter/paginate), else fixture |
| GET | `/api/kejadian/[id]` | Single event detail |
| GET | `/api/anggaran` | `anggaran_analisis` + `anggaran_kegiatan`, else fixture |
| GET | `/api/publikasi` | `publikasi` + `publikasi_meta`, else fixture |
| GET | `/api/prrpka/summary` | PRRPKA fixtures (`prrpka_aceh.json` + `prrpka_ringkasan.json`) |
| GET | `/api/r3p/summary` | Same PRRPKA payload (legacy path) |
| GET | `/api/dibi/aceh` | Live BNPB DIBI Superset (Aceh-only), else `dibi-aceh.json` |
| GET | `/api/weather` | 23 kab/kota forecasts (BMKG / Open-Meteo + `weather-snapshot.json`) |
| GET | `/api/profil-desa/kecamatan` | Supabase `profil_desa` kecamatan aggregate (`?kabupaten=&kecamatan=` or `?kode_kecamatan=`) |
| GET | `/api/profil-desa/desa` | Single desa (`?kode=` or `?id=`) |
| GET | `/api/profil-desa/kabupaten` | Optional kabupaten rollup (`?kabupaten=` or `?kode_kabupaten=`) |

Homepage **Peringatan Dini** (`#status`) summarises existing weather plus live MAGMA / Sipongi feeds. Refresh snapshots with `npm run refresh:peringatan` — the script writes only what the official feeds return and never invents events.

## Screens

| Locale | Path |
|--------|------|
| id | `/id/admin` staff dashboard (login at `/id/admin/login`) |
| id | `/id` homepage |
| id | `/id/peta` map |
| id | `/id/lapor` report form |
| id | `/id/data-bencana` disaster events table |
| id | `/id/sumber-data` data sources |
| id | `/id/metodologi` methodology |
| en | `/en/disaster-data`, `/en/data-sources`, `/en/methodology` (localized pathnames) |

## Rebuild PMTiles

Overlay vector tiles only (R3P / IRBI choropleth). **Carto raster stays the default basemap.**

Requires [tippecanoe](https://github.com/felt/tippecanoe) (`sudo apt install tippecanoe`). CI does **not** rebuild — it only checks already-committed archives.

```
bun run build:tiles
# or: bash scripts/build-pmtiles.sh
```

Per-tile size cap: **500 KB** (not the `.pmtiles` file size). Second gate: `village-r3p.pmtiles` archive **under 4 MB** (~2.9 MB today is fine).

```
npm run check:tiles
```

Outputs (tippecanoe `--layer` must match `MapViewport` `source-layer`):

- `public/tiles/r3p-kab.pmtiles` — `r3p` — from `fixtures/areas/r3pDistribution.geojson`
- `public/tiles/village-r3p.pmtiles` — `village` — from `fixtures/areas/villageDistribution.geojson` (simplified)
- `public/tiles/irbi-2025.pmtiles` — `irbi` — from `fixtures/areas/irbi2025.geojson` (BNPB IRBI 2025 kab choropleth)

`MapViewport` prefers these vector tiles when the files exist; otherwise it falls back to `/api/layers/areas/...` GeoJSON. Geometry stays on disk (fixtures + PMTiles), not PostGIS.

## Basemap (Carto raster + Sentinel)

The map uses MapLibre with **Carto Positron raster** (OSM) as the default Simple / Dark / Streets basemap. OpenFreeMap vector is optional (`?vector=1`) and falls back to Carto if the style CDN fails. Three brand style presets (Sederhana merek / Gelap merek / Abu-abu minimal) are additional options (`?basemap=brand-light` and siblings) — they are not the default. **Esri World Imagery** is the HD satellite option, and **EOX Sentinel-2 Cloudless 2024** is the Copernicus option (`?basemap=sentinel`). Markers are GPU-clustered GeoJSON (not HTML pins). Architecture and the Sentinel update path: `docs/basemap.md`.

```
node scripts/verify-basemap.mjs
node scripts/refresh-sentinel-status.mjs
```

Deep-link Sentinel: `/id/peta?basemap=sentinel`.

## IRBI 2025

Rebuild kab GeoJSON + legend + raw fixture (exact name join 23/23 onto `r3pDistribution`):

```
python3 scripts/build-irbi-fixtures.py [/path/to/risiko_bencana_aceh_irbi_2025.json]
```

Homepage hero tabs: **Utama** · **Peta** · **Irbi 2025**. Map deep-link: `/id/peta?area=irbi2025&basemap=positron`. Analysis API: `GET /api/irbi`.


## Data Utama (marker layers)

Map toolbar **Data utama** (`groupMain`) has two expandable parents:

1. `disasterEvents` — Kejadian bencana (`kejadian_bencana_aceh_lengkap.json`), with a jenis nest
2. **Fasilitas Umum** (UI nest only, not a layer key) — `facHealth`, `facEducation`, `policeOffices`, `facGov`, `facReligious`

Facility children keep their existing keys and `?layers=` URLs. Parent checkbox is on if any child is on; toggling the parent turns all five on or off.

`missingPersons` / `tendPoints` / `poskos` were removed from the toolbar and from `markers.geojson`, but remain in the `MarkerLayerKey` union so old `?layers=` URLs still parse. They are seeded in `map_layers` with `enabled=false` (see `supabase/migrations/20260827_map_layers_live_registry.sql`).

**Partisipasi** toolbar layers: `laporanKejadian` and `laporanPenanganan` (live query from `laporan_*` where `status = approved` AND `tampil_di_peta = true`). `citizenReports` is removed (helipad pattern): not in the toolbar or type union; `?layers=citizenReports` aliases to `laporanKejadian` and is rewritten away. Default URL layers: `disasterEvents,facHealth,laporanKejadian`. Layers stay empty until a moderator publishes a real laporan — no dummy fixture points. `/admin/moderasi` edits `laporan_kejadian` / `laporan_penanganan` (legacy `reports` remains a third tab).

Live toolbar layers that must exist in `map_layers`: `facHealth`, `facEducation`, `policeOffices`, `facGov`, `facReligious` (Data utama → Fasilitas Umum nest), `infraRoadBridge`, `laporanKejadian`, `laporanPenanganan` (plus `disasterEvents`). There is no separate Fasilitas toolbar cluster. `helipad` and `starlink` were removed from the toolbar, fixtures, and `map_layers`. The catalog API falls back to `src/lib/map-layers-catalog.ts` so admin/catalog stays consistent even before the SQL seed is applied.

Integer lon/lat (truncated GPS) are flagged `properties.coord_quality = "truncated_integer"` and `approx=true`. Do not invent decimals. Re-flag:

```
bun run flag:coords
# or: node scripts/flag-truncated-coords.js --dry-run
```

`ACEH-2023-0005` (offshore Singkil epicentre ~1.91°N) is included on `disasterEvents` with `coord_quality=offshore_or_out_of_bbox` so the map count matches kejadian (427). The map does not clamp an Aceh bbox.

After fixture changes, re-seed Supabase `marker_features` via the existing `upsert_marker_features` RPC (coordinator; this PR does not require `service_role`).

Rebuild (does not run in CI; inputs under `/workspace/drive-aceh-data/`):

```
python3 scripts/build-main-markers.py          # dry-run counts
python3 scripts/build-main-markers.py --write  # overwrite public/fixtures/markers.geojson
node scripts/flag-truncated-coords.js          # re-flag integer coords
```

## Planning docs

`/workspace/aceh-kebencanaan-*.md`
