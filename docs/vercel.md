# Preview Vercel — Aceh Tangguh

Preview online memakai **Next.js Node di Vercel**, bukan GitHub Pages / static export. API routes, admin, laporan, dan fallback fixture tetap hidup.

## 1. Import repo (sekali)

1. Buka [vercel.com/new](https://vercel.com/new) dan login (GitHub `piygmalion`).
2. Import `piygmalion/aceh-tangguh`.
3. Framework terdeteksi **Next.js**. Biarkan Root Directory `.`
4. **Jangan** set `STATIC_EXPORT`, `GITHUB_PAGES`, atau `NEXT_PUBLIC_BASE_PATH`.
5. Deploy. URL produksi biasanya `https://aceh-tangguh.vercel.app` (atau nama proyek yang dipilih). Setiap PR mendapat URL preview sendiri.

`vercel.json` memaksa `npm ci` (bukan Bun — repo punya `bun.lock` dan `package-lock.json`; CI memakai npm) dan region `sin1` (Singapura).

## 2. Preview tanpa env (cukup untuk hasil UI hari ini)

Tanpa secret, homepage, peta, DIBI, cuaca, dan data bencana tetap tampil dari `public/fixtures`. Laporan tulis / admin login / cron tidak aktif.

## 3. Env produksi (opsional, setelah preview)

Set di Vercel → Project → Settings → Environment Variables (Production + Preview):

| Variabel | Wajib untuk | Catatan |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Admin, data live | `https://whojoxrbcdyotrpolgav.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Admin, SELECT publik | Anon JWT, boleh `NEXT_PUBLIC_*` |
| `SUPABASE_SERVICE_ROLE_KEY` | Tulis laporan, upload, cron | **Server only** — jangan prefix `NEXT_PUBLIC_` |
| `LAPORAN_PII_KEY` | Submit laporan | 64 hex; lihat `docs/laporan-production.md` |
| `LAPORAN_PII_SALT` | Submit laporan | Bukan default `aceh-tangguh-dev` |
| `LAPORAN_CRON_SECRET` | `POST /api/cron/laporan-wa` | Bearer |
| `WEATHER_CRON_SECRET` | `POST /api/weather/refresh` | Bearer |

Setelah URL Vercel hidup, isi GitHub variable:

- `WEATHER_REFRESH_URL` = `https://<proyek>.vercel.app/api/weather/refresh`
- `LAPORAN_WA_URL` = `https://<proyek>.vercel.app/api/cron/laporan-wa`

Tambah URL Vercel ke **Supabase Auth → Redirect URLs** (`https://<proyek>.vercel.app/**`) supaya `/id/admin/login` bisa redirect.

## 4. Yang sengaja tidak diubah

- GitHub Pages tetap mati. Pipeline `STATIC_EXPORT=1` tetap di repo untuk nanti.
- Cron cuaca / DIBI / Sipongi / WA tetap di GitHub Actions (mereka butuh Bearer sendiri; cron Vercel tidak dikonfigurasi di sini).
