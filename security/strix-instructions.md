# Aceh Tangguh — Strix engagement rules

Use this file as the scan instruction. It maps what to **verify**, not how to attack.

Do **not** commit credentials, PoCs, payloads, or request traces into this repository.

## Authorization

Only test hosts the operator listed as in-scope. Default production host `aceh-tangguh.vercel.app` and Supabase project `whojoxrbcdyotrpolgav` are **out of scope** for live tests (citizen PII).

Live tests require a **staging** Next.js host whose `NEXT_PUBLIC_SUPABASE_URL` is **not** the production project.

## In scope

- This repository (white-box / `code_review`).
- The operator-supplied staging origin (grey-box / `live_test`), including `/id` and `/en` locale prefixes.
- Staff UI at `/id/admin/login` using **Strix Cloud test users** (never production staff).

Suggested test users (create in Strix Cloud, not here):

- `admin_kabkota` with a filled `kode_kabupaten`
- `admin_desa` with a filled `kode_desa_kelurahan`
- optional staging-only `super_admin`

Login URL: `{STAGING_ORIGIN}/id/admin/login` (email + password, Supabase Auth).

## Out of scope

- Production Vercel and production Supabase.
- Third-party feeds and CDNs: MAGMA, Sipongi, Tatonas, BNPB DIBI, BMKG, Open-Meteo, Carto, Esri, EOX Sentinel, WhatsApp gateway.
- Brute-force of `LAPORAN_CRON_SECRET` / `WEATHER_CRON_SECRET`.
- Denial of service, rate-limit exhaustion, or load tests.
- Changing production data, deleting rows, or sending real WhatsApp messages.

## Application model (for the agent)

- Next.js 14 App Router. APIs live under `src/app/api/**/route.ts`.
- Public citizen writes go through the Node server with the **service role** after Zod + `guardPublicPost` (origin check + Upstash). Anon JWTs must not INSERT laporan.
- Staff sessions: Supabase cookie + `admin_profiles`. `src/middleware.ts` refreshes the session and does **not** gate `/admin/*`. Page/API guards in `src/lib/auth/admin.ts` do.
- Roles: `super_admin`, `admin` (alias of `admin_provinsi`), `admin_provinsi`, `admin_kabkota`, `admin_desa`, `penilai_pkd`, `admin_rr`. Module matrix: `src/lib/sik/roles.ts`.
- Public map of laporan: `GET /api/laporan/peta` — approved + `tampil_di_peta` only; no `jawaban_json` or pelapor fields.

See `security/attack-surface.md` for the endpoint inventory.

## Verify (priority order)

1. **Authorization / IDOR** — `admin_kabkota` and `admin_desa` cannot read or mutate rows outside `kode_kabupaten` / `kode_desa_kelurahan`. `admin_desa` cannot use kejadian/moderasi APIs. Non-super-admin cannot call `/api/admin/cms/*` or `/api/admin/database`.
2. **Staff vs public PII** — `GET /api/laporan/peta`, `GET /api/layers/markers`, and public pages must not expose pelapor NIK/phone/name, ciphertext, or raw `jawaban_json`. Staff `/api/admin/laporan` may decrypt for moderation; confirm it still requires a staff session.
3. **Public writes** — `POST /api/laporan/kejadian`, `/api/laporan/penanganan`, `/api/laporan/upload` reject invalid bodies, enforce MIME magic-bytes and 10 MB cap, and rate-limit via Upstash (in-memory fallback if unset). Confirm anon cannot insert laporan rows directly in Postgres (RLS).
4. **Origin check** — `rejectCrossOrigin` allows requests with neither Origin nor Referer (`src/lib/security/origin.ts`). Confirm mutating staff and public routes still require a valid session or other server-side checks so a missing Origin is not enough to change data.
5. **Unauthenticated admin** — `/id/admin` (except login/denied) redirects to login. `/api/admin/*` and `/api/sik/*` mutating routes return 401/403 without a profile.
6. **Cron** — `POST /api/cron/laporan-wa`, `/api/cron/laporan-media-gc`, `/api/weather/refresh`, `/api/weather/inovasi/refresh`, `/api/cron/daily-brief` return 401 without a matching Bearer, and 503 if the secret is unset. Do not brute-force. Do not reuse `WEATHER_CRON_SECRET` on the inovasi refresh route. Do not reuse `DAILY_BRIEF_CRON_SECRET` on laporan or overlay.
7. **Upload storage** — object keys are UUID paths under `laporan-media`; confirm the public cannot list or overwrite arbitrary objects.
8. **Headers** — `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: SAMEORIGIN` are set; CSP and HSTS are currently absent (`next.config.mjs`). Report missing CSP/HSTS as informational, not as a confirmed exploit.
9. **`POST /api/sik/public`** — training-request insert uses origin check but not Upstash. Confirm Zod limits fields; do not flood the table.
10. **Service role blast radius** — service role is server-only. Confirm it is never in `NEXT_PUBLIC_*`. Do not exfiltrate env from the staging host.

## Reporting

- Record severity, affected route or file, and a defensive fix (authz check, column allowlist, RLS, rate limit).
- Keep proof in the Strix Cloud dashboard only.
- Do not add exploit files, payloads, or replay scripts to this git tree.
