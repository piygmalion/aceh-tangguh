# DATA-12 — unik satu admin_kabkota per kode

Agent: data
Gelombang: 18
Status: selesai

## Niat

Migrasi baru unique parsial. Jangan apply dari tiket ini. Jangan revoke fungsi peran.

## Bacaan ulang niat

Berkas baru. Bukan sunting migrasi lama.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `supabase/migrations/20260923_admin_kabkota_kode_unique.sql` | `idx_admin_kabkota_kode` |

## Bukti

```
SQL: unique (kode_kabupaten) where role = admin_kabkota and kode_kabupaten is not null
Tidak ada REVOKE is_staff / is_ops
Tidak di-apply ke produksi dari tiket ini
```

## Bacaan ulang bukti versus kriteria

- [x] Migrasi baru
- [x] Tidak apply
- [x] Fungsi peran utuh

## Keputusan

selesai
