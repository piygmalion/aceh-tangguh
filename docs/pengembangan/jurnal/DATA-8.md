# DATA-8 — kunci staging `_tmp_profil_sheet_apply`

Agent: data
Gelombang: 11
Status: selesai

## Niat

- Tujuan: Menutup celah Data API pada `public._tmp_profil_sheet_apply` (RLS mati, `anon`/`authenticated` punya SELECT–DELETE). Aktifkan RLS, cabut hak Data API, jangan hapus 300 baris, jangan menambah kebijakan tulis. Lengkapi revoke `purge_expired_overlay_rows()` ke `anon`/`authenticated` (DATA-1 hanya `public`, masih bisa dieksekusi).
- Berkas: `supabase/migrations/20260919_tmp_profil_sheet_rls.sql` (baru), jurnal, STATUS. Terapkan isi berkas ke proyek `aceh-tangguh`.
- Tidak diubah: migrasi lama, `src/**`, `pkd.ts`, DATA-4, P2 Juklak, fungsi peran (`is_staff` / `is_ops` / …), `upsert_marker_features`, `next_laporan_nomor`.
- Langkah:
  1. Migrasi baru: `ENABLE ROW LEVEL SECURITY`; `REVOKE ALL` dari `anon`, `authenticated`, `public`; komentar tabel; tanpa `CREATE POLICY`.
  2. `REVOKE ALL` pada `purge_expired_overlay_rows()` dari `public`, `anon`, `authenticated`.
  3. Terapkan ke `whojoxrbcdyotrpolgav`. Jangan `DROP TABLE`. Jangan `DELETE` baris.
- Cara membuktikan: `relrowsecurity = true`; grant `anon`/`authenticated` pada tabel kosong; `anon` tidak EXECUTE purge; jumlah baris tetap 300; berkas `20260910`–`20260918` tidak disunting.
- Risiko: menambah kebijakan yang membuka Data API; menghapus staging; merevoke `is_staff()` (memecah RLS lain); DATA-4.

## Bacaan ulang niat

Satu tabel staging + satu fungsi purge. Bukan audit seluruh SECURITY DEFINER. Bukan tebakan Tatonas. Tanpa kebijakan = Data API ditolak; service role / editor SQL tetap bisa.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `supabase/migrations/20260919_tmp_profil_sheet_rls.sql` | RLS + revoke tabel + revoke purge |
| STATUS.md | baris DATA-8 |

## Bukti

```
relrowsecurity=true row_count=300
grant anon/authenticated pada tabel = []
anon/authenticated EXECUTE purge = false
list_migrations memuat 20260919_tmp_profil_sheet_rls
advisor rls_disabled_in_public hilang; tersisa INFO rls_enabled_no_policy (sengaja)
```

## Bacaan ulang bukti versus kriteria

- [x] RLS nyala, tanpa kebijakan
- [x] anon/authenticated tidak punya grant tabel
- [x] 300 baris utuh
- [x] migrasi lama tidak disunting

## Keputusan

selesai
