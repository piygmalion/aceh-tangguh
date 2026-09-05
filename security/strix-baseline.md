# Strix Cloud baseline — 2026-09-03 (updated)

## Cloud scan

| Item | Result |
| --- | --- |
| CLI | `strix-agent` 1.6.1, signed in (`strix cloud whoami`, org Pygmalion's Workspace) |
| Dry-run archive | **449** files, ~1.0 MiB zip, sha256 `36aa3c89836ef14f87ed66862b3bec9e8c0135d7fc0a1a523b7186b8309c4058` |
| Excluded | 81 paths (57 `.strixignore`, 24 hidden) |
| Secrets in archive | `.env*` / `.env.production` **not** in file list (dry-run `--show-files` checked) |
| `scans start --approve-sha256` | **Blocked:** `scan_credit_limit_reached`. Needs **~60** credits ($0.60/credit); wallet **0**. |
| Live test | Deferred until staging uses a Supabase project other than `whojoxrbcdyotrpolgav` |
| GitHub App | Token has `connectors:write` but **not** `integrations:write`. `strix cloud repos list` → empty. Install via dashboard or re-login `--scope-profile full` then `integrations install github`. |

Buy credits (do not run `--yes` unless you intend to pay), then retry with the **current** digest:

```bash
# wallet: https://app.strix.ai/settings/billing
# or: strix cloud billing topup --credits 60
# Cloud plan trial (PR reviews, separate from scan credits):
# strix cloud billing subscribe --plan strix_cloud

strix cloud scans start --source . --approve-sha256 36aa3c89836ef14f87ed66862b3bec9e8c0135d7fc0a1a523b7186b8309c4058 --wait
strix cloud vulns list
```

If the working tree changed, run `--dry-run --show-files --json` again and use the new `archive_sha256`.

Windows: Strix 1.6.1 compares NTFS change-time while zipping and can report `README.md changed...` even when the file is still. A local CLI workaround is required on this machine; GitHub Actions (Linux) does not hit that check the same way.

## White-box notes (source only, no PoC)

These are hardening items from reading the tree. They are **not** Cloud-validated. After credits are available, merge validated Cloud findings into this table.

| Severity | Location | Finding | Defensive fix |
| --- | --- | --- | --- |
| High | `src/app/api/sik/resource/route.ts` | GET/POST/PATCH/DELETE check `canAccessModule` but do **not** apply `matchesKabScope` / `scopeDesa`. `admin_kabkota` with kejadian or logistik can list and change rows for other kabupaten (`select *`, mutate by id). | Filter list/write by `kode_kabupaten` (and desa where relevant). Reject writes whose payload kabupaten does not match the profile. |
| Medium | `src/lib/sik/roles.ts` `matchesKabScope` | If `admin_kabkota` has empty `kode_kabupaten` and `kabupaten`, `scopeKabupaten` is null and `matchesKabScope` returns true for every row. | Fail closed: kab-scoped staff without a filled scope get 403, not global access. |
| Medium | `src/app/api/admin/database/route.ts`, `src/app/api/admin/cms/kejadian/route.ts`, `src/app/api/admin/cms/publikasi/route.ts` | Mutating methods require super-admin session but never call `rejectCrossOrigin`. SIK/laporan mutating routes do. | Call `rejectCrossOrigin` on POST/PATCH/DELETE (same as `/api/admin/laporan`). |
| Medium | `src/lib/security/origin.ts` | Missing Origin and Referer is allowed (curl/cron). Empty `Host`/`X-Forwarded-Host` also skips the check. Host is taken from the first `X-Forwarded-Host` value. | On cookie-authenticated mutating routes, require Origin or Referer. Trust only the proxy-set host. Keep Bearer cron as the exception. |
| Medium | `src/app/api/sik/public/route.ts` POST | Training-request insert uses origin check + Zod but **not** Upstash (`guardPublicPost`). Stores name/phone/email. | Reuse `guardPublicPost` so production fails closed without Redis. |
| Low | `src/middleware.ts` | Middleware refreshes the session only; `/admin/*` is gated in layouts/API helpers, not here. | Keep layout/API guards; optionally deny `/admin` except login/denied in middleware. |
| Low | `next.config.mjs` | nosniff, Referrer-Policy, SAMEORIGIN, Permissions-Policy. No CSP, no HSTS. | Add a strict CSP and HSTS on the Vercel host. |
| Info | `src/lib/laporan/status.ts` | Public map columns omit `jawaban_json` and pelapor ids. | Keep this allowlist; Cloud live_test should confirm responses match. |

Do not paste payloads or PoCs into this file.
