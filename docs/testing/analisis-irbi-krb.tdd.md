# TDD evidence — IRBI/KRB on Analisis data

Source plan: `/opt/cursor/artifacts/plans/analisis_irbi_krb_53ce1dfa.plan.md` (journal IDs AN-32 / FE-30 / AN-33 after merge; branch first used FE-27, but main G22 already claimed FE-27 for cuaca).

## User journeys

- As an analyst, I want to pick a kabupaten and an IRBI/KRB threat type so I can see the published class and score next to catalogue history.
- As an analyst, I want a historical RR/RS/RB analog labelled as not a forecast, so I do not treat IRBI scores as predicted fatalities.
- As a reader, I want English copy on `/en/disaster-analysis` and an intact Data bencana teaser.

## Task report

| Task | Summary | Command | Result | Guarantee |
| --- | --- | --- | --- | --- |
| RED suite | Failing tests for mapping, gold join, URL `ancaman`, analog copy | `npm test` on `c17ae59` | RED (missing module / missing i18n / `ancaman` undefined) | Checkpoint `test: add RED suite for IRBI/KRB analysis join` |
| GREEN helper + panel | `analisis-ancaman`, URL parse, panel, i18n, payload extras | `npm test` | 515 pass / 0 fail | Gold case TINGGI / 26.4 / `11.18`; failed join stays null; analog `none` without housing cards |
| Acceptance | AN-33 source + i18n | same | PASS | “bukan prediksi” / “not a forecast”; KPI total not mixed with IRBI |

## Test specification

| # | What is guaranteed | Test | Type | Result |
|---|--------------------|------|------|--------|
| 1 | `Gempa Bumi` maps to `gempabumi`; pemukiman/Lainnya → null | `src/lib/analisis-ancaman.test.ts` | unit | PASS |
| 2 | Pidie Jaya × gempabumi = TINGGI / 26.4 / `11.18` | same | unit | PASS |
| 3 | Missing kabupaten does not invent a class | same | unit | PASS |
| 4 | Differing IRBI/KRB classes are kept, not averaged | same | unit | PASS |
| 5 | Analog grain kab → provinsi → none; even-n median averages | same | unit | PASS |
| 6 | Helper source has no fatality-from-score and no `KRB I` | same | unit | PASS |
| 7 | URL accepts `gempabumi` and drops `zona3` | `src/lib/analisis-url.test.ts` | unit | PASS |
| 8 | Analog disclaimer + isolated KPI | `src/lib/analisis-data-acceptance.test.ts` | unit | PASS |
| 9 | Analisis payload carries `rumahImpacts` and newest `latestDate` | `src/lib/kejadian-analisis.test.ts` | unit | PASS |

## Coverage and gaps

Full `npm test` is the project runner (no separate coverage script): 523 pass / 0 fail after G23.

G23 RED `0c09143` (missing `proyeksi-dampak`); GREEN `d6cd7ce` + corridor fix `20ec6d7`. Parser + Pidie Jaya flood jiwa + earthquake magnitude bands covered in `src/lib/proyeksi-dampak.test.ts`.

Browser 2026-09-06 on `next dev` :3000 (FE-27 / AN-33):

- Gold URL shows TINGGI, 26,4, kode 11.18; history “Tidak ada di katalog”; analog none; KPI Kejadian = 8.
- `ancaman=banjir` shows catalogue history (8); `likuefaksi` shows “Tidak ada di katalog”; Reset shows no invented class.
- `/en/disaster-analysis` shows “not a forecast” and TINGGI 26.4.
- `/id/data-bencana` teaser remains `AnalisisTeaser` and links to `/analisis-data`.

## Merge evidence

- RED: `c17ae59` — `test: add RED suite for IRBI/KRB analysis join`
- GREEN: implementation commit on this branch after 515/515 pass
