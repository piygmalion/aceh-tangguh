# Preview Vercel — Aceh Tangguh

Preview online memakai **Next.js Node di Vercel**, bukan GitHub Pages / static export. API routes, admin, laporan, dan fallback fixture tetap hidup.

## 1. Import repo (sekali)

1. Buka [vercel.com/new](https://vercel.com/new/import?s=https://github.com/piygmalion/aceh-tangguh) dan login (GitHub `piygmalion`).
2. Import `piygmalion/aceh-tangguh`.
3. Framework terdeteksi **Next.js**. Biarkan Root Directory `.`
4. **Jangan** set `STATIC_EXPORT`, `GITHUB_PAGES`, atau `NEXT_PUBLIC_BASE_PATH`.
5. Deploy. URL produksi biasanya `https://aceh-tangguh.vercel.app` (atau nama proyek yang dipilih). Setiap PR mendapat URL preview sendiri.

`vercel.json` memaksa `npm ci` (bukan Bun — repo punya `bun.lock` dan `package-lock.json`; CI memakai npm), Node **22.x**, dan region `sin1` (Singapura).

## 2. Supabase (sudah terhubung di Vercel)

`.env.production` memuat `NEXT_PUBLIC_SUPABASE_URL` + anon JWT proyek `whojoxrbcdyotrpolgav`. `next build` di Vercel membacanya, jadi `/api/stats/live` dan loader domain memakai Supabase (bukan fixture) tanpa env dashboard.

Cek: `GET https://aceh-tangguh.vercel.app/api/stats/live` harus `"source":"supabase"`.

Admin login (`/id/admin/login`) memakai kunci publik yang sama. Tambah `https://aceh-tangguh.vercel.app/**` di **Supabase Auth → Redirect URLs** jika nanti memakai magic link / OAuth.

## 3. Env server-only (dashboard Vercel, jangan commit)

Set di Vercel → Project → Settings → Environment Variables (Production + Preview):

| Variabel | Wajib untuk | Catatan |
|----------|-------------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Tulis laporan, upload, cron | **Server only** — jangan prefix `NEXT_PUBLIC_` |
| `LAPORAN_PII_KEY` | Submit laporan | 64 hex; kunci tulis; lihat `docs/laporan-production.md` |
| `LAPORAN_PII_KEY_ID` | Submit laporan | Opsional; default `k1` |
| `LAPORAN_PII_KEYS` | Baca PII lama | Opsional; `id=hex64,...` saat rotasi |
| `LAPORAN_PII_SALT` | Submit laporan | Bukan default `aceh-tangguh-dev` |
| `LAPORAN_CRON_SECRET` | `POST /api/cron/laporan-wa` | Bearer |
| `WEATHER_CRON_SECRET` | `POST /api/weather/refresh` dan alias `POST /api/cron/weather` | Bearer. Path lama tetap; alias memanggil handler yang sama. |
| `WEATHER_INOVASI_CRON_SECRET` | `POST /api/weather/inovasi/refresh` dan alias `POST /api/cron/weather-inovasi` | Bearer terpisah; opsional. Tanpa ini + tanpa allowlist EE, strip inovasi tetap `unconfigured` (bukan angka palsu). Jangan reuse `WEATHER_CRON_SECRET`. Path lama tetap. |
| `OVERLAY_CRON_SECRET` | `POST /api/cron/overlay-live` | Bearer; jangan reuse secret lain |

Setelah URL Vercel hidup, isi GitHub variable:

- `WEATHER_REFRESH_URL` = `https://aceh-tangguh.vercel.app/api/weather/refresh` (atau alias `/api/cron/weather`; path lama jangan dihapus)
- `LAPORAN_WA_URL` = `https://aceh-tangguh.vercel.app/api/cron/laporan-wa`
- `OVERLAY_REFRESH_URL` = `https://aceh-tangguh.vercel.app/api/cron/overlay-live`

## 4. Yang sengaja tidak diubah

- GitHub Pages tetap mati. Pipeline `STATIC_EXPORT=1` tetap di repo untuk nanti.
- Cron cuaca / overlay live / DIBI / Sipongi / WA tetap di GitHub Actions (mereka butuh Bearer sendiri; cron Vercel tidak dikonfigurasi di sini).
