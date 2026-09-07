# DATA-26 — tabel `admin_role_modules`

Agent: data
Gelombang: 33
Status: selesai

Kontrak: [AN-41](AN-41.md).

## Niat

- Tujuan: Menyimpan paket akses modul per peran katalog, di-seed dari matriks `canAccessModule` hari ini termasuk `dailyBrief`.
- Berkas: `supabase/migrations/20260927_admin_role_modules.sql`, jurnal ini.
- Tidak diubah: migrasi lama, `is_staff` / `is_ops` / `is_super_admin` / `is_walidata`, DATA-4.
- Langkah: tabel baru + check + RLS + seed. Baca ulang niat. Jangan sunting SQL lama.
- Cara membuktikan: berkas migrasi ada; tidak ada `revoke` pada fungsi peran; seed memuat `dailyBrief`.
- Risiko: menimpa `20260926_daily_brief.sql`; merevoke helper SQL.

## Bacaan ulang niat

Satu migrasi baru. SELECT hanya `is_super_admin()`. Tulis `service_role`. Seed memakai `role IN` yang sama dengan switch TypeScript, termasuk alias `admin`.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `supabase/migrations/20260927_admin_role_modules.sql` | tabel + RLS + seed |

## Bukti

Migrasi baru; tidak ada revoke fungsi peran; seed memuat `dailyBrief`.

## Bacaan ulang bukti versus kriteria

- [x] Migrasi baru, bukan suntingan lama
- [x] Seed termasuk `dailyBrief`
- [x] Helper SQL tidak di-revoke

## Keputusan

selesai
