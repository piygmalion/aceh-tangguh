# DATA-11 — dump tubuh `upsert_marker_features`

Agent: data
Gelombang: 15
Status: selesai

## Niat

Dump tubuh fungsi produksi. Jangan apply. Jangan mengarang.

## Bacaan ulang niat

Hanya berkas baru. Produksi sudah punya fungsi.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `supabase/migrations/20260922_upsert_marker_features_body.sql` | dump `pg_get_functiondef` 5 Sep 2026 |

## Bukti

```
pg_get_functiondef: CREATE OR REPLACE FUNCTION public.upsert_marker_features(rows jsonb)
loop jsonb_array_elements → insert marker_features on conflict update
tidak di-apply ke produksi
uji berkas memuat jsonb_array_elements + "Jangan apply"
```

## Bacaan ulang bukti versus kriteria

- [x] Tubuh dari produksi
- [x] Tidak apply
- [x] Tidak mengarang

## Keputusan

selesai
