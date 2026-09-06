# Ingest tilikan kerusakan (staff table)

Jalan rusak dan jembatan tilikan yang sudah lolos gerbang. **Bukan** titik pengungsi, **bukan** orang hilang.

## Review overlap dulu

```
node scripts/review-tilikan-overlap.mjs
```

Tulis `overlap-infra.csv`: `exact` / `near` (≤50 m) / `baru`. Inventaris diambil dari `marker_features` (layer `infraRoadBridge`) jika env Supabase ada; kalau tidak, dari `public/fixtures/markers.geojson` (fixture lokal hanya beberapa titik contoh). Baris exact/near hanya dapat `marker_feature_id`; tidak diduplikasi ke `marker_features`.

Hasil review terhadap 7547 titik live: 0 exact, 67 near, 251 baru (318 observasi, 0 ditolak). Near = observasi kerusakan dekat inventaris, bukan alasan menimpa `infraRoadBridge`.

## Dry-run, lalu apply setelah review koordinator

```
node scripts/ingest-tilikan-kerusakan.mjs
node scripts/ingest-tilikan-kerusakan.mjs --apply
```

`--apply` butuh `SUPABASE_SERVICE_ROLE_KEY`. Hanya insert ke `tilikan_kerusakan_infra`. Tidak memanggil `upsert_marker_features`. Tidak mengisi `tempat_pengungsian`, `pengungsian_kaji`, `kejadian_korban`, `pengungsi_terpilah`. Tidak menghidupkan `tendPoints` / `missingPersons`.

Parser menolak path pengungsian, Haifa, Padal, polsek, fasum, dan CSV berkolom HP.

Skema: [`supabase/migrations/20260924_tilikan_kerusakan_infra.sql`](../../../supabase/migrations/20260924_tilikan_kerusakan_infra.sql) — RLS `is_staff()` saja; anon tidak baca.
