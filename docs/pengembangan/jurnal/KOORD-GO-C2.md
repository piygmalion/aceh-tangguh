# KOORD-GO-C2 — opt-in tile CDN verify + ops runbook

Agent: koordinator (GO C #2; skrip di wilayah data)
Gelombang: GO C (lanjutan Stage 3 / #66)
Status: selesai

## Niat

- Tujuan: Production blocking hari ini adalah ops (secret + URL publik + aceh-osm belum dibangun), bukan kode sync. Kirim skrip verify CDN yang opt-in (URL publik saja, tanpa kredensial AWS) plus runbook 5 langkah. Scaffold S3/R2 Stage 3 sudah di main (#66).
- Berkas:
  - `scripts/lib/verify-tiles-cdn.mjs` — helper murni (URL join, skip, HEAD/Range, CORS)
  - `scripts/lib/verify-tiles-cdn.test.mjs` — uji offline (mock fetch)
  - `scripts/verify-tiles-cdn.mjs` — CLI
  - `package.json` — `verify:tiles-cdn`
  - `docs/basemap.md` — runbook 5 langkah
  - `docs/pengembangan/STATUS.md` — tutup tiket
  - jurnal ini
- Langkah:
  1. Helper + uji: skip jika `NEXT_PUBLIC_TILES_BASE_URL` kosong; HEAD 2xx + Range 206/200 untuk empat overlay; aceh-osm hanya jika URL absolut/https atau `{base}/aceh-osm.pmtiles`.
  2. CLI + `npm run verify:tiles-cdn`. Tidak butuh AWS.
  3. Runbook di `docs/basemap.md`: build aceh-osm → sync dry-run → secret Actions → env Vercel → verify. Carto tetap default. Jangan hapus `r3p-kab.pmtiles`.
  4. CI: jangan menambah upload terjadwal/push. Verify tetap lokal/manual (hindari false red).
- Cara membuktikan:
  - Uji helper + jalur skip lulus (fetch di-mock).
  - `npm run verify:tiles-cdn` tanpa env → exit 0, teks `skip — local /tiles default`.
  - `npm run check:tiles` tetap hijau untuk overlay di disk.
  - `.github/workflows/sync-tiles-s3.yml` tetap `workflow_dispatch` saja.
- Risiko:
  - Memakai fetch hidup di CI tanpa URL → false red. Mitigasi: jangan pasang ke workflow.
  - Menghapus `r3p-kab` / mengganti default Carto / commit `aceh-osm.pmtiles`. Dilarang.
  - Mengarang kredensial bucket. Dilarang.

## Bacaan ulang niat

Satu PR dari `main` terbaru. Bukan merge. Bukan Destana / UI / SIK / AreaProfil. Bukan rebuild atau commit `aceh-osm.pmtiles`. `OVERLAY_PMTILES_FILES` = `r3p-kab.pmtiles`, `kecamatan-r3p.pmtiles`, `village-r3p.pmtiles`, `irbi-2025.pmtiles`. Range: `bytes=0-1` atau `0-16383`. CORS yang diharapkan tertulis di runbook dan pesan gagal. DATA-4 / POST nasional / P2 tidak dibuka.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `scripts/lib/verify-tiles-cdn.mjs` | URL join, skip, HEAD/Range, CORS, `runVerifyTilesCdn` |
| `scripts/lib/verify-tiles-cdn.test.mjs` | 13 uji offline (mock fetch + CLI skip) |
| `scripts/verify-tiles-cdn.mjs` | CLI; `npm run verify:tiles-cdn` |
| `docs/basemap.md` | Runbook 5 langkah |
| `.github/workflows/*` | tidak diubah |

## Bukti

```
TDD RED: node --import tsx --test scripts/lib/verify-tiles-cdn.test.mjs
  ERR_MODULE_NOT_FOUND verify-tiles-cdn.mjs (commit 0dc57d7)

TDD GREEN: 13/13 pass (commit 3964f75)

npm run verify:tiles-cdn  (NEXT_PUBLIC_TILES_BASE_URL unset)
  skip — local /tiles default
  NEXT_PUBLIC_ACEH_OSM_PMTILES unset (optional brand extract)
  exit 0

npm run check:tiles
  irbi / kecamatan / r3p-kab / village ok
  aceh-osm.pmtiles skip (not built)
  required archives including r3p-kab present

npm test
  tests 586  pass 586  fail 0

sync-tiles-s3.yml: workflow_dispatch only (no schedule/push)
overlay-tiles.yml: tidak memanggil verify:tiles-cdn
PR #86 terbuka, tidak di-merge
DATA-4 / POST nasional / P2 / Destana / SIK / AreaProfil tidak dikode
nilai secret tidak tertulis
```

## Bacaan ulang bukti versus kriteria

- [x] `verify:tiles-cdn` + helper skip / URL / HEAD+Range (mock)
- [x] Runbook 5 langkah + Carto default + CORS + jangan hapus r3p-kab
- [x] CI tidak menambah upload terjadwal; sync tetap workflow_dispatch
- [x] `check:tiles` hijau; PR terbuka, tidak di-merge

## Keputusan

selesai
