# Struktur folder Aceh Tangguh

Seluruh kode aplikasi Next.js ada di dalam folder kerja **`Aceh tangguh`**. Ini peta direktori yang dipakai saat development lokal.

```
Aceh tangguh/
├── MULAI-DISINI.md          ← mulai dari sini
├── README.md
├── package.json             ← skrip bun/npm
├── bun.lock / package-lock.json
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── .env.example             ← salin ke .env.local (jangan di-commit)
├── .gitignore
│
├── src/                     ← kode aplikasi
│   ├── app/                 ← App Router (halaman + API)
│   ├── components/          ← UI React, dikelompokkan per fitur
│   ├── lib/                 ← logika domain, loader data, auth
│   ├── data/                ← definisi form laporan
│   ├── hooks/
│   ├── i18n/                ← next-intl (id / en)
│   └── middleware.ts
│
├── public/                  ← aset statis
│   ├── fixtures/            ← JSON + GeoJSON cadangan (tanpa backend)
│   ├── tiles/               ← PMTiles peta
│   ├── media/               ← foto & video homepage
│   └── icons/               ← ikon layer peta
│
├── supabase/migrations/     ← skema Postgres
├── scripts/                 ← seed, build tiles, cuaca, laporan
├── docs/                    ← dokumentasi
├── messages/                ← string UI id.json + en.json
└── .github/workflows/       ← Pages + cron cuaca (hanya dipakai saat rilis)
```

## `src/app` — rute

| Path | Fungsi |
|------|--------|
| `[locale]/page.tsx` | Homepage |
| `[locale]/peta` | Peta MapLibre |
| `[locale]/lapor` | Hub + form kejadian / penanganan |
| `[locale]/data-bencana` | Tabel kejadian |
| `[locale]/anggaran-bencana` | Dashboard anggaran |
| `[locale]/publikasi` | Katalog publikasi |
| `[locale]/sumber-data`, `metodologi` | Halaman penjelasan |
| `[locale]/admin` | Konsol staf (login, moderasi, CMS, database) |
| `api/**` | Route handler (Supabase + fallback fixture) |

Locale: `/id/...` dan `/en/...` (lihat `src/i18n/routing.ts`).

## `src/components` — UI per domain

| Folder | Isi |
|--------|-----|
| `map/` | Workspace peta, toolbar, marker, profil desa |
| `laporan/` | Form laporan masyarakat |
| `weather/` | Strip & kartu cuaca BMKG / Open-Meteo |
| `kejadian/` | Tabel + analisis kejadian |
| `anggaran/`, `publikasi/` | Katalog data |
| `admin/` | Shell, login, CMS, moderasi |
| `ui/` | Button, glass, chip, animasi |
| `providers/` | TanStack Query + tema |

Komponen homepage (`HeroSection`, `WeatherStrip`, `R3PChartSection`, …) ada di akar `src/components/`.

## `src/lib` — logika

| Folder / file | Fungsi |
|---------------|--------|
| `supabase/` | Client anon, SSR, fallback fixture |
| `laporan/` | Skema, PII crypto, upload, WhatsApp |
| `weather/` | BMKG + Open-Meteo |
| `auth/` | Peran admin |
| `preview/` | Mode static GitHub Pages |
| `kejadian*.ts`, `markers.ts`, `irbi.ts`, `anggaran.ts`, `profil-desa.ts` | Loader domain |

## Data yang tidak masuk Postgres

Geometri tetap di disk:

- `public/fixtures/areas/*.geojson`
- `public/fixtures/boundaries-aceh-kab.geojson`
- `public/tiles/*.pmtiles`

JSON domain (`kejadian`, marker, anggaran, IRBI, cuaca, profil desa) dibaca dari Supabase dulu, lalu jatuh ke fixture jika env kosong atau query gagal.

## Backend

`supabase/migrations/` — urutan:

1. `20260823_init_aceh_tangguh_backend.sql`
2. `20260823_profil_desa.sql`
3. `20260824_weather_forecasts.sql`
4. `20260825_admin_auth.sql`
5. `20260825_laporan_masyarakat.sql`
6. `20260826_laporan_production.sql`
7. `20260827_map_layers_live_registry.sql`

Setup admin: `docs/admin-setup.md`. Laporan produksi: `docs/laporan-production.md`.
