# DATA-22 — tabel staf tilikan kerusakan infra

Agent: data
Gelombang: 22
Status: selesai

## Niat

Observasi jalan/jembatan dari CSV tilikan bersih masuk tabel staf `tilikan_kerusakan_infra`. Bukan layer peta publik. Bukan pengungsian/orang. RLS `is_staff()`. Anon tidak baca. Jangan `upsert_marker_features`. Jangan `--apply` ingest dari tiket merge.

## Bukti

Migrasi [`20260924_tilikan_kerusakan_infra.sql`](../../../supabase/migrations/20260924_tilikan_kerusakan_infra.sql). Parser + `review-tilikan-overlap.mjs` + `ingest-tilikan-kerusakan.mjs`. Arsip [`data/drive-clean/`](../../../data/drive-clean/) (PII tetap di `.data/` yang gitignore). Tes [`tilikan-kerusakan-infra.test.ts`](../../../src/lib/security/tilikan-kerusakan-infra.test.ts).
