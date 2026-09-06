# sik_aceh.db → Aceh Tangguh mapping

The live master file lives on the operator machine
(`…/data bencana aceh/database/master/sik_aceh.db`) and is copied locally to
`data/sik/sik_aceh.db` (gitignored). This document is the **supported mapping**,
not a dump of a specific file. Refresh counts with:

```
python3 scripts/import-sik-aceh.py --db data/sik/sik_aceh.db
```

That command prints `.tables`, resolved mapping, and row counts. It writes
`scripts/_/sik-inspect.json` + `scripts/_/sik-extracted.json` (also gitignored).
Cloud/CI checkouts usually omit `sik_aceh.db`; Data/Backend re-runs this dry-run
locally after pulling. Do not invent GPS or codes to compensate.

## What is imported

| SIK-like table (any alias) | Target | Rule |
|---|---|---|
| `kejadian` / `kejadian_bencana` / `t_kejadian` / `bencana` | `kejadian_bencana` + `disasterEvents` | Enrichment merge |
| `desa` / `wilayah` / `m_desa` / `gampong` | join key only | 10-digit `kode_desa_kelurahan` |
| `korban` / `kerusakan` (same row or 1:1 by kejadian id) | `payload` + fill-null fields | Never overwrite non-null |
| `users` / `session` / `log` / `audit` / `token` | **rejected** | Not imported |

Geometry stays on disk. No PostGIS. `laporan_*` is never touched.

## Column aliases (kejadian)

The extractor picks the first present name (case-insensitive):

| Field | Aliases |
|---|---|
| `sik_id` | `id`, `id_kejadian`, `kejadian_id`, `kode`, `kode_kejadian`, `no` |
| `jenis_bencana` | `jenis_bencana`, `jenis_bencana_teks`, `jenis`, `tipe_bencana`, `nama_bencana`, `bencana` |
| `hari_tanggal` | `hari_tanggal`, `tanggal`, `tgl`, `date`, `waktu` |
| `latitude` | `latitude`, `lat`, `y`, `koordinat_y` |
| `longitude` | `longitude`, `lon`, `lng`, `long`, `x`, `koordinat_x` |
| `kabupaten` | `kabupaten`, `kab`, `kabupaten_kota`, `nama_kabupaten` |
| `kecamatan` | `kecamatan`, `kec`, `nama_kecamatan` |
| `desa` | `desa`, `kelurahan`, `gampong`, `nama_desa` |
| `kode_desa_kelurahan` | `kode_desa_kelurahan`, `kode_desa`, `kode_bps`, `kd_desa` |
| `jiwa_terdampak` | `jiwa_terdampak`, `jiwa`, `penduduk_terdampak` |
| `kk_terdampak` | `kk_terdampak`, `kk` |
| `pengungsi` | `pengungsi`, `mengungsi` |
| `meninggal` | `meninggal`, `korban_meninggal`, `mati` |
| `hilang` | `hilang`, `korban_hilang` |
| `kronologi` | `kronologi`, `uraian`, `deskripsi`, `keterangan` |
| `status_proses` | `status_proses`, `status`, `status_penanganan` |

If no kejadian-like table exists, the inspector looks for any non-rejected table
that has both a jenis-like column and (a date or lat/lng pair).

## Identity (no overwrite of `ACEH-…`)

1. Existing `payload.sik_id`
2. Existing id equal to SIK `ACEH-…` id
3. Natural key: `jenis` + tanggal + (10-digit kode **or** kab|kec|desa) + coords rounded to 4 decimals

New rows get `SIK-{sik_id}`. Existing `ACEH-…` ids are never reused for new events.

## Quality gates

- Skip `Rekapitulasi Tahunan`
- Do not invent GPS or kab centroids
- Integer existing GPS + decimal SIK in the Aceh bbox → upgrade
- Two decimal GPS > 100 m apart → quarantine (`decimal_gps_gt_100m`). Keeps existing GPS. Blocks `--write-fixtures` unless `--accept-gps-quarantine` is set. The flag never overwrites with SIK decimal >100 m; it only records the quarantine count in `metadata.sik_merge.gpsConflicts`.
- Fill-null only for attributes; conflicts stay in `payload.sik`
- Desa join is 10-digit BPS only — names never invent a kode
