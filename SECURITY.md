# Security

Aceh Tangguh handles citizen PII (NIK, phone, name) in disaster reports.

## Reporting a vulnerability

Email the repository owner. Do not open a public GitHub issue for secrets, RLS bypasses, or PII leaks.

## Production checklist

1. Apply `supabase/migrations/20260902_harden_laporan_rls.sql` and `20260904_harden_laporan_auth_select.sql` so anon cannot INSERT laporan rows and authenticated JWTs cannot SELECT PII columns.
2. Set `SUPABASE_SERVICE_ROLE_KEY` only on the Node server — never in `NEXT_PUBLIC_*` or GitHub Pages.
3. Set `LAPORAN_PII_KEY` (64 hex) and a non-default `LAPORAN_PII_SALT`.
4. Set `LAPORAN_CRON_SECRET` / `WEATHER_CRON_SECRET` as random Bearer tokens.
5. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` when Supabase/laporan is enabled (required for distributed rate limiting on public POSTs; those routes return 503 without it).
6. Do not commit `.env.local` or `.data/`.

Verify laporan + RLS + env:

```bash
npm run verify:laporan
```

The Node server validates required production secrets at startup (`src/instrumentation.ts`).

Public map and GET APIs must not return pelapor fields or raw `jawaban_json`.

## Authorized testing (Strix Cloud)

Pentests of this app use **Strix Cloud** only against this repository and an **isolated staging** host. Do not point a scanner at production Vercel or the production Supabase project (citizen PII).

Operator runbook: `docs/security/strix.md`. Engagement rules: `security/strix-instructions.md`. Baseline status: `security/strix-baseline.md`.

Do not open a public issue for scanner output that includes secrets, RLS bypasses, or PII. Keep proofs in the Strix dashboard; do not commit exploits or `strix_runs/`.
