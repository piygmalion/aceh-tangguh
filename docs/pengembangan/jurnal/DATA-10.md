# DATA-10 — cabut anon dari next_kejadian_nomor

Agent: data
Gelombang: review 5 September 2026
Status: selesai

## Niat

- Tujuan: Anon masih EXECUTE `next_kejadian_nomor()` di produksi (bukan SECURITY DEFINER). Data API bisa menaikkan `kejadian_operasi_nomor_seq`. Cabut dari `public`/`anon`. Pertahankan `authenticated` karena DEFAULT kolom dipakai insert staf JWT. Jangan ganti isi fungsi. Jangan merevoke fungsi peran.
- Berkas: `supabase/migrations/20260921_revoke_next_kejadian_nomor_anon.sql` (baru), jurnal, STATUS.
- Tidak diubah: `20260907`, `20260920`, `is_staff`/`is_ops`, DATA-4, secret cron.
- Langkah:
  1. REVOKE ALL dari `public`, `anon`.
  2. GRANT EXECUTE ke `authenticated` dan `service_role`.
  3. Terapkan ke proyek `aceh-tangguh`.
- Cara membuktikan: anon EXECUTE = false; authenticated = true; service_role = true; isi fungsi tidak diganti.
- Risiko: mencabut authenticated sehingga insert kejadian gagal; CREATE OR REPLACE.

## Bacaan ulang niat

Hanya anon. Staf tetap bisa DEFAULT. Bukan Tatonas.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `supabase/migrations/20260921_revoke_next_kejadian_nomor_anon.sql` | REVOKE anon; GRANT authenticated + service_role |

## Bukti

```
apply_migration proyek aceh-tangguh (whojoxrbcdyotrpolgav), nama revoke_next_kejadian_nomor_anon
execute_sql next_kejadian_nomor:
  anon EXECUTE = false
  authenticated EXECUTE = true
  service_role EXECUTE = true
  prosecdef = false
Tidak CREATE OR REPLACE tubuh fungsi. authenticated tidak dicabut.
```

## Bacaan ulang bukti versus kriteria

- [x] Berkas tidak CREATE OR REPLACE
- [x] authenticated tidak dicabut
- [x] EXECUTE anon di produksi = false

## Keputusan

selesai
