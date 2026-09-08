# Preview Vercel — Aceh Tangguh

Preview online memakai **Next.js Node di Vercel**, bukan GitHub Pages / static export. API routes, admin, laporan, dan fallback fixture tetap hidup.

## 1. Import repo (sekali)

1. Buka [vercel.com/new](https://vercel.com/new/import?s=https://github.com/piygmalion/aceh-tangguh) dan login (GitHub `piygmalion`).
2. Import `piygmalion/aceh-tangguh`.
3. Framework terdeteksi **Next.js**. Biarkan Root Directory `.`
4. **Jangan** set `STATIC_EXPORT`, `GITHUB_PAGES`, atau `NEXT_PUBLIC_BASE_PATH`.
5. Deploy. URL produksi biasanya `https://aceh-tangguh.vercel.app` (atau nama proyek yang dipilih). Setiap PR mendapat URL preview sendiri.

`vercel.json` memaksa `npm ci` (bukan Bun — repo punya `bun.lock` dan `package-lock.json`; CI memakai npm) dan region `sin1` (Singapura). Versi Node **tidak** diatur di `vercel.json`.

## 1b. Node.js 22.x — jangan naik ke 24.x

Vercel sekarang default dashboard ke **24.x**. Proyek ini tetap di **22.x** karena Next.js 14.2 dan CI (`AN-2`) dikunci ke major itu. Sumber kebenaran:

| Tempat | Nilai |
| --- | --- |
| `package.json` `engines.node` | `22.x` (Vercel memakai ini; menimpa dashboard) |
| `.nvmrc` | `22` |
| `.github/workflows/ci.yml` | `node-version: "22"` |

Jika Settings → Build and Deployment menampilkan **22.x** dan **24.x** tercoret plus tooltip *Project Setting overridden by package.json*, itu peringatan tampilan, bukan gagal deploy. Runtime yang dipakai sudah 22.x.

Agar tooltip hilang: ubah dropdown **Node.js Version** di dashboard menjadi **22.x**, lalu Save. Jangan mengubah `engines.node` menjadi `24.x` — itu membuat Vercel membangun Next 14 di runtime yang bukan target uji.

**Cold Start Prevention** (Disabled) adalah sakelar Fluid di dashboard, bukan dari `package.json`. Biarkan mati kecuali paket Vercel mendukungnya dan operator menyalakannya sadar.

## 2. Supabase (sudah terhubung di Vercel)

Klien Supabase memakai default proyek `whojoxrbcdyotrpolgav` di `src/lib/supabase/public-env.ts` (plus `.env.production`). Vercel Functions sering tidak memuat file `.env*` di runtime, jadi default di kode yang membuat `/api/stats/live` memakai Supabase.

Cek: `GET https://aceh-tangguh.vercel.app/api/stats/live` harus `"source":"supabase"`.

Admin login (`/id/admin/login`) memakai kunci publik yang sama. Undangan staf memakai `GET /auth/confirm?token_hash=…&type=invite` (bukan OTP publik). Di **Supabase Auth → Redirect URLs** tambah `https://aceh-tangguh.vercel.app/auth/confirm` dan URL preview yang sama. Templat email Invite: tautan ke `/auth/confirm?token_hash={{ .TokenHash }}&type=invite`. Public signup dimatikan. Jangan menulis nilai SMTP.

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
| `DAILY_BRIEF_CRON_SECRET` | `POST /api/cron/daily-brief` | Bearer; jangan reuse secret overlay/cuaca/laporan |
| `WHATSAPP_GATEWAY_URL` | Daily Brief + laporan WA | Fonnte: `https://api.fonnte.com/send`. Bukan secret. |
| `WHATSAPP_GATEWAY_TOKEN` | Daily Brief + laporan WA | Token dashboard Fonnte/Wablas. Jangan commit. |

Setelah URL Vercel hidup, isi GitHub variable:

- `WEATHER_REFRESH_URL` = `https://aceh-tangguh.vercel.app/api/weather/refresh` (atau alias `/api/cron/weather`; path lama jangan dihapus)
- `LAPORAN_WA_URL` = `https://aceh-tangguh.vercel.app/api/cron/laporan-wa`
- `OVERLAY_REFRESH_URL` = `https://aceh-tangguh.vercel.app/api/cron/overlay-live`
- `DAILY_BRIEF_URL` = `https://aceh-tangguh.vercel.app/api/cron/daily-brief`

## 4. Yang sengaja tidak diubah

- GitHub Pages tetap mati. Pipeline `STATIC_EXPORT=1` tetap di repo untuk nanti.
- Cron cuaca / overlay live / DIBI / Sipongi / WA tetap di GitHub Actions (mereka butuh Bearer sendiri; cron Vercel tidak dikonfigurasi di sini).
