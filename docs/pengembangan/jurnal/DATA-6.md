# DATA-6 — tabel Destana SI + aktivitas

Agent: data
Gelombang: 9
Status: selesai

## Niat

- Tujuan: Migrasi baru `destana_si` dan `destana_aktivitas` persis AN-7 §4. SQL saja. Tidak mengubah rumus PKD. Tidak menambah peran. Tidak seed baris desa.
- Berkas: `supabase/migrations/20260918_destana_dua_instrumen.sql`, STATUS baris DATA-6, jurnal ini.
- Tidak diubah: migrasi lama, `src/**`, `pkd.ts`, DATA-4, SDB seed, POST nasional.
- Langkah:
  1. `destana_si`: PK `kode_desa_kelurahan` text 10 karakter; `info_umum` text not null default ''; `sebaran` text not null check sama dengan `kode_desa_kelurahan`; `penilaian_rujukan` uuid null references `pkd_tugas(id)` on delete set null; `fasilitator` text not null default ''; `pembelajaran` text not null default ''; `created_at`/`updated_at` default now().
  2. `destana_aktivitas`: uuid PK; `kode_desa_kelurahan` 10 karakter; `tahun` int; `kode_aktivitas` check `a`–`q`; `status` `belum|berjalan|selesai`; `catatan` text null; unique `(kode_desa_kelurahan, tahun, kode_aktivitas)`; timestamps.
  3. RLS ENABLE. Tanpa anon. GRANT select/insert/update authenticated. SELECT `is_staff()`. INSERT/UPDATE: `staff_kode_desa() = kode` ATAU `admin_profiles.role = super_admin`. Tanpa DELETE. Tanpa `CREATE OR REPLACE` fungsi peran. Tanpa kebijakan `ALL`.
- Cara membuktikan: baca SQL versus AN-7 §4; grep tidak ada alter `pkd_*` rumus; tidak ada seed insert.
- Risiko: FK wajib ke profil_desa (jangan — profil bisa kosong); memperlebar `is_ops()`.

## Bacaan ulang niat

Sebaran = kode desa, bukan koordinat. Tulis hanya desa terikat atau super_admin. Kab/prov baca lewat `is_staff()`. Tidak ada skor.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `supabase/migrations/20260918_destana_dua_instrumen.sql` | dua tabel + RLS |

## Bukti

Berkas baru saja. Tanpa seed. Grep tidak ada `create or replace function` peran. `src/` tidak diubah tiket ini.

## Bacaan ulang bukti versus kriteria

- [x] Dua tabel + RLS terpisah
- [x] Tanpa seed, tanpa fungsi peran baru
- [x] Tanpa `src/`

## Keputusan

selesai
