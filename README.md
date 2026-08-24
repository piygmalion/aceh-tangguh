# Aceh Tangguh

MVP scaffold: mandum rimba-inspired homepage × Tanggapi-inspired map.

Inspired-by only. Does **not** copy AGPL Mandum source — patterns only, own implementation.

## Pengembangan lokal

Development utama di folder **`Aceh tangguh`**. GitHub hanya di-push setelah fitur final.

```bash
# Clone langsung ke nama folder kerja
git clone https://github.com/piygmalion/aceh-tangguh.git "Aceh tangguh"
cd "Aceh tangguh"

# atau buat salinan terstruktur (+ zip) dari repo ini:
# bash scripts/pack-local.sh "$HOME/Aceh tangguh"
```

Mulai: `MULAI-DISINI.md` · peta folder: `docs/STRUKTUR.md` · alur kerja: `docs/PENGEMBANGAN-LOKAL.md`

## Stack

- Next.js 14 + React 18 + TypeScript
- Tailwind CSS 3
- next-intl (id, en) with localized pathnames
- MapLibre + react-map-gl + PMTiles
- TanStack Query + Zod + lucide-react + Recharts

## Run

```
cd "Aceh tangguh"
bun install
bun run dev
```

Build: `bun run build`

Static GitHub Pages preview (homepage + map from fixtures, no API routes):

```
STATIC_EXPORT=1 bun run build
# or: STATIC_EXPORT=1 npm run build
```

Writes `out/`. Serve locally with any static server, e.g. `npx serve out`.
The production Node app is unchanged: omit `STATIC_EXPORT` and use `bun run build` + `bun run start`.

## GitHub Pages

Expected URL: `https://piygmalion.github.io/aceh-tangguh/`

1. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push to `main` (or run **Actions → Deploy GitHub Pages preview → Run workflow**).
3. Optional repository **Variables / Secrets** (preview works from fixtures without them):

| Name | Type | Required | Purpose |
|------|------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Variable | No | Exposed to the static bundle if you want the anon client available |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Secret | No | Same; never commit `.env.local` |

Do **not** set `SUPABASE_SERVICE_ROLE_KEY` or laporan/weather cron secrets on the Pages job.

### What works on the static preview

- `/` → `/id/` (and `/en/`) homepage: hero stats (fallback numbers), hazards fallback, weather snapshot, R3P + IRBI charts, map teaser
- `/id/peta` (and `/en/peta`): marker + area layers from `public/fixtures`, PMTiles from `public/tiles`
- Read-only catalogs: data bencana, anggaran, publikasi, sumber data, metodologi

### What does not work

- All `src/app/api/**` routes (GitHub Pages is static files only)
- Staff admin (`/id/admin`) — shows a short “not available” page
- Submitting laporan / reports / uploads
- Village profile panel (needs `profil_desa` via API; the public fixture is a summary only)
- Live Supabase-backed stats unless you later point clients at anon queries; this preview prefers fixtures

`scripts/run-next-build.mjs` parks `src/app/api`, `src/middleware.ts`, and admin SSR only for the export build, then restores them. Normal `bun run build` is still `next build` for Node hosting.


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
4. Staff admin (`/id/admin`): apply `supabase/migrations/20260825_admin_auth.sql` then create the first `super_admin` manually — see `docs/admin-setup.md`. Do not put `SERVICE_ROLE` in `.env` for the app to run.
5. Seed area feature metadata from fixtures (needs service role or SQL admin; anon is SELECT-only on `area_feature_meta`):
   ```
   bun run seed:area-meta
   ```

Geometry stays in `public/fixtures` + `public/tiles` (PMTiles). Domain JSON (kejadian, markers, anggaran, publikasi, R3P, IRBI analysis) is read from Supabase first; loaders fall back to fixtures if env is missing, a query fails, or the table is empty.

### API endpoints

| Method | Path | Source |
|--------|------|--------|
| GET/POST | `/api/reports` | Supabase `reports` (GET = published + consent) |
| GET/PATCH | `/api/admin/reports` | Staff JWT — list / set status |
| GET | `/api/admin/me` | Session + `admin_profiles` |
| GET/POST/PATCH/DELETE | `/api/admin/cms/*` | Super-admin CMS |
| GET/PATCH | `/api/admin/database` | Super-admin typed table editor |
| GET | `/api/stats/live` | `live_stats` (+ 24h report count) |
| GET | `/api/hazards` | `hazard_status` |
| GET | `/api/layers/catalog` | enabled `map_layers` merged with local toolbar catalog (`src/lib/map-layers-catalog.ts`) |
| GET | `/api/layers/meta/[layerKey]` | `area_feature_meta` |
| GET | `/api/irbi` | `irbi_documents` / fixture + optional `area_feature_meta` merge |
| GET | `/api/layers/areas/[key]` | GeoJSON fixtures (polygons stay on disk) |
| GET | `/api/layers/markers` | `marker_features` → GeoJSON, else fixture |
| GET | `/api/layers/markers/summary` | Same as markers (debug counts) |
| GET | `/api/boundaries` | GeoJSON fixtures |
| GET | `/api/kejadian` | `kejadian_bencana` (filter/paginate), else fixture |
| GET | `/api/kejadian/[id]` | Single event detail |
| GET | `/api/anggaran` | `anggaran_analisis` + `anggaran_kegiatan`, else fixture |
| GET | `/api/publikasi` | `publikasi` + `publikasi_meta`, else fixture |
| GET | `/api/r3p/summary` | `r3p_summary`, else fixture |
| GET | `/api/profil-desa/kecamatan` | Supabase `profil_desa` kecamatan aggregate (`?kabupaten=&kecamatan=` or `?kode_kecamatan=`) |
| GET | `/api/profil-desa/desa` | Single desa (`?kode=` or `?id=`) |
| GET | `/api/profil-desa/kabupaten` | Optional kabupaten rollup (`?kabupaten=` or `?kode_kabupaten=`) |

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

Requires [tippecanoe](https://github.com/felt/tippecanoe) (`sudo apt install tippecanoe`).

```
bun run build:tiles
# or: bash scripts/build-pmtiles.sh
```

Outputs:

- `public/tiles/r3p-kab.pmtiles` — from `fixtures/areas/r3pDistribution.geojson`
- `public/tiles/village-r3p.pmtiles` — from `fixtures/areas/villageDistribution.geojson` (simplified)
- `public/tiles/irbi-2025.pmtiles` — from `fixtures/areas/irbi2025.geojson` (BNPB IRBI 2025 kab choropleth)

`MapViewport` prefers these vector tiles when the files exist; otherwise it falls back to `/api/layers/areas/...` GeoJSON.

## IRBI 2025

Rebuild kab GeoJSON + legend + raw fixture (exact name join 23/23 onto `r3pDistribution`):

```
python3 scripts/build-irbi-fixtures.py [/path/to/risiko_bencana_aceh_irbi_2025.json]
```

Homepage hero tabs: **Utama** · **Peta** · **Irbi 2025**. Map deep-link: `/id/peta?area=irbi2025&basemap=positron`. Analysis API: `GET /api/irbi`.


## Data Utama (marker layers)

Map toolbar **Data utama** (`groupMain`) defaults to:

1. `disasterEvents` — Kejadian bencana (`kejadian_bencana_aceh_lengkap.json`)
2. `facHealth` — Fasilitas kesehatan (Google Sheet `1npB5v7T…`)
3. `facEducation` — Fasilitas pendidikan (Google Sheet `1fguZcbW…`; **coordinates approximated to kabupaten centroids** — schools have no precise lat/lng in the sheet)
4. `policeOffices` — kept when present

`missingPersons` / `tendPoints` / `poskos` were removed from the toolbar and from `markers.geojson`, but remain in the `MarkerLayerKey` union so old `?layers=` URLs still parse. They are seeded in `map_layers` with `enabled=false` (see `supabase/migrations/20260827_map_layers_live_registry.sql`). Default URL layers: `disasterEvents,facHealth,citizenReports`.

Live toolbar layers that must exist in `map_layers`: `facGov`, `facReligious`, `infraRoadBridge`, `helipad`, `starlink` (plus the Data Utama + citizenReports keys). The catalog API falls back to `src/lib/map-layers-catalog.ts` so admin/catalog stays consistent even before the SQL seed is applied.

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
