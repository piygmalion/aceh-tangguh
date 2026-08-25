# Security

Aceh Tangguh handles citizen PII (NIK, phone, name) in disaster reports.

## Reporting a vulnerability

Email the repository owner. Do not open a public GitHub issue for secrets, RLS bypasses, or PII leaks.

## Production checklist

1. Apply `supabase/migrations/20260902_harden_laporan_rls.sql` so anon cannot INSERT laporan rows.
2. Set `SUPABASE_SERVICE_ROLE_KEY` only on the Node server — never in `NEXT_PUBLIC_*` or GitHub Pages.
3. Set `LAPORAN_PII_KEY` (64 hex) and a non-default `LAPORAN_PII_SALT`.
4. Set `LAPORAN_CRON_SECRET` / `WEATHER_CRON_SECRET` as random Bearer tokens.
5. Do not commit `.env.local` or `.data/`.

Public map and GET APIs must not return pelapor fields or raw `jawaban_json`.
