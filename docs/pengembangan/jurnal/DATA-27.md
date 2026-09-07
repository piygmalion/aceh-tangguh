# DATA-27 — tabel `maritime_warning_cache`

Agent: data
Gelombang: 34
Status: selesai

Kontrak: [AN-36](AN-36.md).

## Niat

- Tujuan: Menyimpan buletin resmi gelombang tinggi (jalur B) terpisah dari `maritime_forecast_cache` dan `overlay_live_features`.
- Berkas: `supabase/migrations/20260928_maritime_warning_cache.sql`, jurnal ini.
- Tidak diubah: migrasi lama, AN-4, DATA-4, `is_staff` / `is_ops`.
- Langkah: tabel baru + indeks + RLS + perluas `purge_expired_overlay_rows()` di berkas baru.
- Cara membuktikan: migrasi ada; PK `external_id`; `expires_at`; SELECT publik; tulis bukan anon; purge menyebut tabel baru; revoke PUBLIC/anon/authenticated pada fungsi.
- Risiko: menulis ke `overlay_live_features`; menimpa `20260927`; merevoke `is_staff`.

## Bacaan ulang niat

Satu migrasi baru. Bukan overlay live. Purge diganti di berkas ini lalu di-revoke lagi seperti DATA-8.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `supabase/migrations/20260928_maritime_warning_cache.sql` | tabel + RLS + purge |

## Bukti

`supabase/migrations/20260928_maritime_warning_cache.sql` — tabel baru PK `external_id`, `expires_at`, SELECT anon/authenticated, revoke tulis. `purge_expired_overlay_rows()` diganti di berkas ini dan di-revoke dari public/anon/authenticated. Tidak ada `INSERT` ke `overlay_live_features`. `20260910` tidak disunting.

`npm test` 678 lulus. `tsc --noEmit` hijau.

## Bacaan ulang bukti versus kriteria

- [x] Migrasi baru
- [x] Bukan `overlay_live_features`
- [x] Purge + revoke

## Keputusan

selesai
