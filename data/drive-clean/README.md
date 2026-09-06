# Drive clean working copies

Local working copies of coordinator Google Drive sheets. **Do not edit the
originals.** Nothing here is written to Supabase.

## Drive originals (read-only)

Folder [0Data untuk Aqin](https://drive.google.com/drive/folders/1JnNM3qFVFwGcLdhGJI3qvJATpLO5doOt):

| Dataset | File ID | Notes |
|---|---|---|
| Titik pengungsian | `1dli7npsetwfECQatMmi-YNy-dFlzf7atCwNLfIZlyM0` | 3 tabs; PII on contacts |
| Data Banjirsumatra.tilikan | `19xkEUKE1bzdxFjm9Zhe3wAO_UuBOpdS239MR1wTvwps` | Mixed tracker — split before use |
| Kantor pemerintah | `1goz7f3Oez5bN5rd2avaNEiYmbpOHgVMLn9kqu-OByiY` | Dirty lon/lat — quarantined |
| Faskes Tanggapi | `1aKKoxhsrSil2K9dq2ioIfzD5o44f8nFGBLJjJsFX3w8` | Tab `RAW` dirty; do not replace `facHealth` |

## Drive working folder (copies only)

[_kerja-bersih Aceh Tangguh (jangan timpa sumber)](https://drive.google.com/drive/folders/1hs0XZriKNIW7-Yhbqkh0Hya07iItN3S8)
in My Drive (`pygmalion.id@gmail.com`), **outside** the coordinator folder.

| Copy | File ID |
|---|---|
| Pengungsian | `11qyr4hKTn7RfbXgJQJYhfCgeVIIeoS_zHxbaQN5YvOs` |
| Tilikan | `1PBHR2UK5ZcRhcoqF7Y-DzHQeGnhKbD2DHBvK-Sfkk34` |
| Kantor pemerintah | `1riRCwB-JGFL07OajkhA-w59jZv4cc96gTfjc5gJJxtw` |

Faskes was **not** copied on Drive (create-copy was blocked). The local
xlsx under `.data/drive-clean/_raw/faskes.xlsx` is an export of the
original, used only to write the quarantine note.

## Local layout

Public (this folder, no phone/name columns):

- `pengungsian/titik.csv` — Diskominfo points, one row per site
- `pengungsian/kaji_agregat.csv` — KK/jiwa/terpilah only
- `pengungsian/haifa_titik.csv` — Haifa tab after its own dedup (not merged into `titik.csv`)
- `tilikan/pengungsian_padal.csv`, `jalan_rusak.csv`, `jembatan.csv`, `polsek.csv` (polsek fails the bbox gate)
- `fasum/QUARANTINE.md`
- `quality-gate-report.md`

Private (gitignored `.data/drive-clean/`):

- `_raw/*.xlsx` — workbook copies
- `pengungsian/kontak_internal.csv`, `tilikan/kontak_internal.csv`

Regenerate public + private outputs:

```
python scripts/drive-clean-sheets.py
```

## Ingest (setelah review overlap)

Hanya `tilikan/jalan_rusak.csv` + `tilikan/jembatan.csv` → tabel staf `tilikan_kerusakan_infra`. Lihat [`tilikan/INGEST.md`](tilikan/INGEST.md).

Jangan ingest `pengungsian/*`, Padal, polsek, fasum, atau orang hilang. Jangan `upsert_marker_features`. Dry-run default; `--apply` hanya setelah koordinator mereview `tilikan/overlap-infra.csv`.
