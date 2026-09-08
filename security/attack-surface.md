# Aceh Tangguh attack surface (inventory)

Locale prefix is always present: `/id/...` or `/en/...`. API routes are unprefixed (`/api/...`).

This is a map of what exists. It is not a test procedure.

## Auth and tenancy

| Piece | Where |
| --- | --- |
| Session refresh | `src/middleware.ts` (does not block `/admin`) |
| Staff page guard | `requireStaffPage` / `requireSuperAdminPage` in `src/lib/auth/admin.ts` |
| Staff API guard | `requireStaffApi` / `requireSuperAdminApi` / `requireOpsApi` |
| Roles / modules | `src/lib/sik/roles.ts` |
| Console layout | `src/app/[locale]/admin/(console)/layout.tsx` |
| CMS / database layouts | super-admin only |

Roles: `super_admin`, `admin` → `admin_provinsi`, `admin_kabkota` (scoped), `admin_desa` (scoped), `penilai_pkd`, `admin_rr`.

## Public pages

| Path (id) | Notes |
| --- | --- |
| `/id` | Homepage, early warning |
| `/id/peta` | MapLibre map |
| `/id/lapor`, `/id/lapor/kejadian`, `/id/lapor/penanganan` | Citizen forms |
| `/id/data-bencana` | Event table (`/en/disaster-data`) |
| `/id/anggaran-bencana`, `/id/publikasi` | Budget / publications |
| `/id/destana`, `/id/nomor-penting`, `/id/pelatihan`, `/id/mitra` | Public SIK pages |
| `/id/sumber-data`, `/id/metodologi` | Docs |
| `/id/brief/[ymd]` | Daily Brief publik (tanpa PII) |

## Staff pages

| Path | Guard |
| --- | --- |
| `/id/admin/login` | Public |
| `/id/admin/denied` | Signed in, no profile |
| `/id/admin`, `/id/admin/moderasi` | Staff |
| `/id/admin/operasi` | Staff (`overview`) — baca agregat, tanpa API baru |
| `/id/admin/daily-brief` | Provinsi ops (`dailyBrief`) |
| `/id/admin/sik/*` | Staff + `canAccessModule` |
| `/id/admin/cms/*`, `/id/admin/database` | Super-admin |

## Public GET APIs

`GET /api/stats/live`, `/api/peringatan-dini`, `/api/peringatan-dini/magma`, `/api/peringatan-dini/sipongi`, `/api/peringatan-dini/tatonas`, `/api/peringatan-dini/maritim`, `/api/weather`, `/api/weather/inovasi`, `/api/weather/[kab]`, `/api/dibi/aceh`, `/api/irbi`, `/api/krb`, `/api/kejadian`, `/api/kejadian/analisis`, `/api/kejadian/[id]`, `/api/anggaran`, `/api/publikasi`, `/api/publikasi/kegiatan`, `/api/prrpka/summary`, `/api/r3p/summary`, `/api/layers/catalog`, `/api/layers/meta/[layerKey]`, `/api/layers/areas/[key]`, `/api/layers/markers`, `/api/layers/markers/summary`, `/api/boundaries`, `/api/laporan/peta`, `/api/profil-desa/desa`, `/api/profil-desa/kecamatan`, `/api/profil-desa/kabupaten`, `/api/sentinel/status`, `/api/sik/public`, `/api/overlay/[key]`, `/api/overlay/static/[key]`, `/api/overlay/tiles/[...parts]`, `/api/overlay/maritime/perairan`, `/api/overlay/maritime/pelabuhan/[kode]`, `/api/brief/[ymd]` (snapshot tanpa PII), `/api/admin/me` (null session if logged out).

`GET|POST /api/reports` is **410 Gone**.

`GET /api/laporan/peta` must not include pelapor fields or `jawaban_json`.

Public maritime GET (`/api/overlay/maritime/perairan`, `/api/overlay/maritime/pelabuhan/[kode]`) reads `maritime_forecast_cache` only. Cron `POST /api/cron/overlay-live` writes the forecast cache (`refreshMaritimeForecasts`) and the PDGT bulletin cache (`refreshMaritimeWarnings` → `maritime_warning_cache`). GET `/api/peringatan-dini` and `/api/peringatan-dini/maritim` read the bulletin cache only. G14 live overlay GET does not write.

## Public POST APIs

| Method | Path | Controls |
| --- | --- | --- |
| POST | `/api/laporan/kejadian` | Zod, origin, Upstash ~8/hour, service-role insert, PII encrypt |
| POST | `/api/laporan/penanganan` | Same |
| POST | `/api/laporan/upload` | Multipart, magic-byte MIME, 10 MB, UUID storage path, Upstash ~20/hour |
| POST | `/api/sik/public` | Zod + `guardPublicPost` (origin + Upstash ~8/hour, in-memory fallback if Upstash unset) |
| POST | `/api/panduan/ask` | `guardPublicPost` (~20/hour); LLM only if `PANDUAN_LLM_ENABLED` |
| POST | `/api/panduan/unknown` | `guardPublicPost` (~30/hour); writes `panduan_unknown` |

Origin helper (`src/lib/security/origin.ts`): mismatched Origin/Referer → 403; **neither header present → allowed** (curl/cron).

Live overlay `GET /api/overlay/{key}`: ledger kosong + tanpa baris → **503**; ledger sukses 0 fitur → **200** kosong; cache ada tetapi hulu gagal → **200 stale**. Bukan keberhasilan kosong.

Dua jalur laporan: `laporan_*` + `/api/admin/laporan` (hidup) versus tabel warisan `reports` + `/api/admin/reports` (arsip). `GET|POST /api/reports` tetap 410.

## Staff APIs (session cookie)

| Auth | Methods | Path |
| --- | --- | --- |
| Staff + `moderasi`; kab 403 (tanpa kolom kab) | GET, PATCH | `/api/admin/reports` (tabel warisan `reports`) |
| Staff + `moderasi`; kab filter AN-22 (`authorizeLaporanList` / `matchesLaporanKabScope`) | GET, PATCH | `/api/admin/laporan` |
| Super-admin + `rejectCrossOrigin` pada POST; undangan Auth | GET, POST | `/api/admin/users` |
| Super-admin + `rejectCrossOrigin`; tangguh/hapus/ubah peran | PATCH, DELETE | `/api/admin/users/[id]` |
| Super-admin + `rejectCrossOrigin` pada PATCH; matriks modul | GET, PATCH | `/api/admin/roles` |
| Staff + modul per sumber; `sanitizeSearch` pada `q`; kab filter AN-20 (`authorizeResourceList` / `authorizeResourceRow`) | GET, POST, PATCH, DELETE | `/api/sik/resource` |
| Staff + Destana | GET, POST | `/api/sik/pkd` |
| Staff + Destana | GET | `/api/sik/destana/program` |
| Staff + Destana; tulis `admin_desa` / `super_admin` + `rejectCrossOrigin` | PATCH, PUT | `/api/sik/destana/program` |
| Ops (`kejadian`) | GET, POST | `/api/sik/kejadian` |
| Ops | GET, PATCH, DELETE | `/api/sik/kejadian/[id]` |
| Ops | GET, POST | `.../dampak`, `.../pengungsian-kaji` |
| Ops | GET | `.../sdb-paket` |
| Ops + `matchesKabScope`; kunci/buka `canLockStatis` | POST | `.../fase` |
| Ops | POST | `/api/sik/verifikasi` |
| Ops + `calonVisibleToOps` | GET | `/api/sik/calon-kejadian` |
| Ops + `rejectCrossOrigin` | POST | `/api/sik/calon-kejadian` |
| Ops + `authorizeCalonTerima` | POST | `/api/sik/calon-kejadian/[id]/terima` |
| Ops + `authorizeCalonTolak` | POST | `/api/sik/calon-kejadian/[id]/tolak` |
| Staff | GET | `/api/sik/sdb/katalog` |
| Staff + `canLockStatis` | PATCH | `/api/sik/sdb/katalog/[kunci]` |
| Staff + `canLockStatis` | GET, POST | `/api/sik/sdb/jadwal` |
| Staff + `canLockStatis` | PATCH | `/api/sik/sdb/jadwal/[id]` |
| Ops + `matchesKabScope` | GET, POST | `/api/sik/kejadian/[id]/validasi` (`POST` `diterima` → 400) |
| Ops + `matchesKabScope` | GET | `/api/sik/kejadian/peringatan-dinamis` |
| Super-admin | CRUD | `/api/admin/cms/kejadian`, `/api/admin/cms/publikasi` |
| Super-admin | GET, POST, PATCH, DELETE | `/api/admin/database` |
| Provinsi (`dailyBrief`) + `rejectCrossOrigin` pada tulis | GET, POST, PATCH | `/api/admin/daily-brief/subscribers` |
| Provinsi (`dailyBrief`) + `rejectCrossOrigin` pada POST | GET, POST | `/api/admin/daily-brief/briefs` |

`/api/admin/laporan` reads PII columns via service role after `requireModuleApi("moderasi")`.

`requireOpsApi` is `requireModuleApi("kejadian")`. POST/PATCH on calon, SDB katalog/jadwal, validasi, and fase also call `rejectCrossOrigin`. POST validasi `dikembalikan` also requires `canLockStatis`.

## Cron (Bearer, constant-time compare)

| Method | Path | Secret |
| --- | --- | --- |
| POST | `/api/cron/laporan-wa` | `LAPORAN_CRON_SECRET` |
| POST | `/api/cron/laporan-media-gc` | `LAPORAN_CRON_SECRET` |
| POST | `/api/weather/refresh` | `WEATHER_CRON_SECRET` |
| POST | `/api/weather/inovasi/refresh` | `WEATHER_INOVASI_CRON_SECRET` |
| POST | `/api/cron/overlay-live` | `OVERLAY_CRON_SECRET` |
| POST | `/api/cron/daily-brief` | `DAILY_BRIEF_CRON_SECRET` |

Unset secret → 503. Wrong Bearer → 401.

## Server env (never pass into Strix)

`SUPABASE_SERVICE_ROLE_KEY`, `LAPORAN_PII_KEY`, `LAPORAN_PII_SALT`, `LAPORAN_PII_KEY_ID`, `LAPORAN_PII_KEYS`, `LAPORAN_CRON_SECRET`, `WEATHER_CRON_SECRET`, `WEATHER_INOVASI_CRON_SECRET`, `OVERLAY_CRON_SECRET`, `DAILY_BRIEF_CRON_SECRET`, `UPSTASH_REDIS_REST_*`, `WHATSAPP_GATEWAY_*`, `PANDUAN_LLM_*`, `XAI_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`.

GitHub (bukan secret): `OVERLAY_REFRESH_URL`, `WEATHER_REFRESH_URL`, `LAPORAN_WA_URL`, `DAILY_BRIEF_URL`.

Public: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Existing controls

- Headers in `next.config.mjs`: nosniff, Referrer-Policy, SAMEORIGIN, Permissions-Policy. No CSP, no HSTS.
- Production boot check: `src/instrumentation.ts` → `assertProductionConfig()`.
- Search boxes strip PostgREST metacharacters (`sanitizeSearch`).
- RLS migrations for laporan are documented in `SECURITY.md`; confirm they are applied on the **staging** project before a live test.
