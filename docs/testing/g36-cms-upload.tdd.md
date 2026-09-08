# G36 CMS cover upload — TDD evidence

Source plan: `docs/pengembangan/jurnal/AN-49.md`, `KOORD-G36.md`.

## User journeys

- As a super admin, I want to upload a JPEG/PNG/WebP cover so `foto_sampul_url` can store a `cms-media` public URL.
- As an anonymous client, I must not use this route as a public POST.
- As a citizen reporter, `/api/laporan/upload` stays on `guardPublicPost` and `laporan-media`.

## Task report

| Task | Summary | Command | RED | GREEN |
| --- | --- | --- | --- | --- |
| DATA-28 | New `cms-media` bucket SQL | `node --import tsx --test src/lib/cms/upload-media.test.ts` | missing module | DATA-28 suite PASS |
| BE-36 | Prepare + POST staff route | same | missing module | prepare + route scan PASS |
| FE-51 | Database explorer file field | same | missing files | wiring + i18n PASS |
| AN-50 | Inventory + close wave | inventory test includes `/api/admin/cms/upload` | — | PASS |

## Test specification

| # | What is guaranteed | Test | Type | Result |
|---|--------------------|------|------|--------|
| 1 | Migration adds `cms-media` 5 MiB jpeg/png/webp without dropping citizen-report media policies | `upload-media.test.ts` DATA-28 | unit | PASS |
| 2 | JPEG is re-encoded; path is `sampul/{uuid}.jpg` | `prepareCmsCoverUpload` | unit | PASS |
| 3 | HTML / >5 MiB → 400 | `prepareCmsCoverUpload` | unit | PASS |
| 4 | Staff route uses `requireSuperAdminApi` + `rejectCrossOrigin`, not `guardPublicPost` | route scan | integration | PASS |
| 5 | Laporan upload still imports `guardPublicPost` | route scan | regression | PASS |
| 6 | UI posts to `/api/admin/cms/upload`; ID≠EN `cmsCover*` | wiring scan | unit | PASS |

## Coverage and gaps

- No live Storage upload in CI (no service role in unit tests).
- Dialog file picker not clicked in browser (harness blocked the Sunting click). `/id` and `/en` database pages loaded with super-admin session.
- Full `npm test` 752 pass / 2 fail unrelated (`email-invite`, FE-53).
- DATA-4, Juklak P2, and laporan upload changes were not implemented.

## Merge evidence

RED: missing `./upload-media`. GREEN: six CMS tests pass. No git commit from this wave.
