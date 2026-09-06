# Quarantine — dirty fasum sheets

**Do not ingest. Do not overwrite `facGov` / `facHealth`.**

These workbooks stay in `.data/drive-clean/_raw/` for audit only.

## Kantor pemerintah

- Original: `1goz7f3Oez5bN5rd2avaNEiYmbpOHgVMLn9kqu-OByiY`
- Working copy: `1riRCwB-JGFL07OajkhA-w59jZv4cc96gTfjc5gJJxtw`
- Rows with a name or coordinate: 273
- Coord quality: `{'truncated_integer': 239, 'ok': 34}`
- Distinct mapped kabupaten: 7 (DB `facGov` already has 273 points / 7 kab and is cleaner)
- Typical failure: longitude stored as a truncated integer (`968811072`), not a decimal degree

A missing-decimal guess would invent GPS. Repo policy (`flag-truncated-coords.js`) is to flag, not invent. If the 16 missing kab need coverage, collect new GPS that already passes the quality gate.

## Faskes

- Original: `1aKKoxhsrSil2K9dq2ioIfzD5o44f8nFGBLJjJsFX3w8` (no extra Drive copy)
- Tab `05032026` (curated label): 255 nonempty, quality `{'ok': 198, 'out_of_bbox': 2, 'truncated_integer': 55}`, 15 kab
- Tab `RAW`: 259 nonempty, quality `{'ok': 198, 'truncated_integer': 59, 'out_of_bbox': 2}`
- Live `facHealth` already has 255 points, all with lat/lng

`RAW` and the integer-latitude cells are not repairable without another coordinate source. The curated tab is still **not** a replace source for `facHealth`.

## Also unused from the tilikan workbook

Starlink, helipad, posko, rumah ibadah, and the two kantor pemerintah tabs stay unused. `tendPoints`, `poskos`, helipad, and Starlink stay retired.
