# DATA-9 — cabut Data API pada RPC definer tulis

Agent: data
Gelombang: 12
Status: selesai

## Niat

- Tujuan: Melengkapi niat `20260902` untuk `next_laporan_nomor` (hanya `service_role`) dan menutup `upsert_marker_features` dari Data API. Anon/authenticated masih EXECUTE keduanya. Jangan mengganti isi fungsi. Jangan merevoke fungsi peran.
- Berkas: `supabase/migrations/20260920_revoke_definer_write_rpcs.sql` (baru), jurnal, STATUS. Terapkan ke proyek `aceh-tangguh`.
- Tidak diubah: migrasi lama, `src/**`, `pkd.ts`, DATA-4, P2 Juklak, `is_staff` / `is_ops` / `is_super_admin` / `is_walidata` / `staff_kode_desa` / `staff_kode_kabupaten`.
- Langkah:
  1. `REVOKE ALL` `next_laporan_nomor(text)` dari `public`, `anon`, `authenticated`; `GRANT EXECUTE` ke `service_role`.
  2. Sama untuk `upsert_marker_features(jsonb)`.
  3. Jangan `CREATE OR REPLACE` isi fungsi. Jangan menyentuh cron overlay / nilai secret.
- Cara membuktikan: `anon`/`authenticated` EXECUTE = false; `service_role` = true; `is_staff` tetap EXECUTE untuk `authenticated`; berkas `20260902` tidak disunting.
- Risiko: merevoke fungsi peran (memecah RLS); mengganti body RPC; DATA-4; menulis langkah serangan.

## Bacaan ulang niat

Dua RPC tulis. Laporan memakai service role (`requireLaporanWriter`). Seed marker tidak ada pemanggil di `src/`. Bukan secret cron. Bukan Tatonas.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `supabase/migrations/20260920_revoke_definer_write_rpcs.sql` | revoke + grant service_role |
| STATUS.md | baris DATA-9 |

## Bukti

```
next_laporan_nomor: anon=false authenticated=false service_role=true
upsert_marker_features: anon=false authenticated=false service_role=true
is_staff: authenticated=true (tidak disentuh)
is_ops: authenticated=true (tidak disentuh)
```

## Bacaan ulang bukti versus kriteria

- [x] anon/authenticated tidak EXECUTE kedua RPC
- [x] service_role tetap EXECUTE
- [x] fungsi peran tidak disentuh
- [x] migrasi lama tidak disunting

## Keputusan

selesai
