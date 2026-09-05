# DATA-5 — tiga tabel SDI daerah

Agent: data
Gelombang: 5
Status: selesai

## Niat

- Tujuan: Menambah tiga tabel metadata SDI daerah plus seed 12 kunci katalog, persis `jurnal/AN-8.md` §3–§4. Tiket ini SQL saja. Tidak mengubah TypeScript. Tidak menambah kolom pada `kejadian_operasi` atau `overlay_calon_kejadian`. Tidak memperlebar `is_ops()` / `is_staff()` / `is_walidata()`.
- Berkas:
  - `supabase/migrations/20260917_sdb_daerah.sql` (baru; jangan sunting `20260907`, `20260908`, `20260909`, `20260915`, atau migrasi lama lain)
  - `docs/pengembangan/STATUS.md` — hanya baris DATA-5 setelah bukti lolos
  - `docs/pengembangan/jurnal/DATA-5.md`
- Tidak diubah: `src/**`, `types.ts`, `crypto.ts`, rute calon, definisi `is_ops()` / `is_staff()` / `is_walidata()` (`is_walidata` sudah ada di `20260908_juklak_pelaporan.sql` — pakai, jangan `create or replace`), DATA-4, AN-7.
- Langkah:
  1. `sdb_katalog`: `kunci` text PK; `judul`, `konsep`, `definisi` text not null; `satuan` text null; `klaster` check `pra|darurat|pasca|pembiayaan`; `kelas_akses` check `terbuka|terbatas|rahasia|sangat_rahasia`; `produsen` check `admin_kabkota|admin_provinsi|sistem`; `periode_kirim` check `harian|bulanan|triwulan|semester|tahunan|insidental`; `kode_referensi` check `jenis_bencana|wilayah_kemendagri|kib|tidak_ada`; `tabel_sumber` text not null; `updated_at` timestamptz not null default now(). RLS ENABLE. `SELECT` authenticated `using is_staff()`. `INSERT`/`UPDATE`/`DELETE` authenticated `using`+`check is_walidata()` (DELETE hanya `using`). Tanpa anon. Tanpa kebijakan `ALL`.
  2. Seed tepat 12 kunci tabel AN-8 §3.1 (`kunci`, `klaster`, `kelas_akses`, `produsen`, `periode_kirim`, `kode_referensi`, `tabel_sumber`). Jangan seed `sangat_rahasia`. Jangan seed Destana 7/2025. `judul`/`konsep`/`definisi`: teks operasional pendek bahasa Indonesia dari nama tabel SIK yang sudah ada. Bukan angka korban, bukan zona KRB, bukan klaim definisi resmi BNPB. `satuan` boleh null.
  3. `sdb_validasi`: `id` uuid PK default `gen_random_uuid()`; `kejadian_id` uuid not null references `kejadian_operasi(id)` on delete cascade; `status` check `diajukan|dikembalikan|diterima`; `catatan` text null; `created_by` uuid null; `created_at` timestamptz not null default now(). Append-only: `SELECT` `is_staff()`; `INSERT` `is_ops()`; jangan kebijakan `UPDATE`/`DELETE` staf. Indeks `(kejadian_id, created_at desc)`.
  4. `sdb_jadwal_kirim`: `id` uuid PK default `gen_random_uuid()`; `kunci` text not null references `sdb_katalog(kunci)`; `periode_label` text not null; `jatuh_tempo` date not null; `status` check `terbuka|terkirim|terlambat`; `updated_at` timestamptz not null default now(); unique `(kunci, periode_label)`. Tanpa seed baris. RLS: `SELECT` `is_staff()`; tulis (`INSERT`/`UPDATE`/`DELETE`) `is_walidata()` saja. Tanpa indeks ekstra.
  5. Jangan menambah kolom pada `kejadian_operasi` / `overlay_calon_kejadian`. Jangan `CREATE OR REPLACE FUNCTION` untuk ketiga fungsi peran.
- Cara membuktikan:
  - Baca SQL versus AN-8 §3–§4 (kolom, check, FK, unique, RLS, tanpa `ALL`, tanpa anon).
  - Uji string (perintah baca berkas): 12 kunci seed ada; `sangat_rahasia` tidak muncul sebagai nilai seed `kelas_akses`.
  - Grep berkas baru: tidak ada `ALTER TABLE kejadian_operasi` / `overlay_calon_kejadian`; tidak ada `CREATE OR REPLACE FUNCTION` `is_ops` / `is_staff` / `is_walidata`.
  - Tidak ada TypeScript di tiket ini.
- Risiko:
  - Menyunting migrasi Juklak lama — dicegah: berkas baru `20260917`.
  - Menambah kolom DIBI / fase pada `kejadian_operasi` — dilarang AN-8.
  - Memperlebar atau menimpa `is_walidata()` — dilarang; fungsi 20260908 dipakai apa adanya.
  - Kebijakan `ALL` atau RLS `sdb_validasi` `is_ops()` untuk SELECT — dilarang; SELECT staf, INSERT ops, tanpa UPDATE/DELETE.
  - Seed Destana / `sangat_rahasia` / definisi resmi BNPB / angka korban / zona KRB — dilarang.

## Bacaan ulang niat

Niat draf pertama salah: nama berkas `20260917_sdb_katalog.sql`, SELECT/INSERT validasi `is_ops()`, jadwal SELECT+tulis `is_walidata()`, indeks `jatuh_tempo` opsional. Kontrak pelaksana: berkas `20260917_sdb_daerah.sql`; validasi SELECT `is_staff()` + INSERT `is_ops()` tanpa UPDATE/DELETE; jadwal SELECT `is_staff()` + tulis walidata termasuk DELETE; indeks hanya `(kejadian_id, created_at desc)`; `is_walidata` tidak dibuat ulang. Setelah koreksi, niat bisa dijalankan tanpa tebakan: satu SQL baru, tiga tabel, 12 seed, RLS terpisah, tanpa `src/`. Checklist kunci statis dan API bukan tiket ini (BE-9 / BE-10). Tidak commit. Tidak DATA-4. Tidak AN-7.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `supabase/migrations/20260917_sdb_daerah.sql` | Tiga tabel + RLS terpisah + seed 12 kunci; pakai `is_walidata()` 20260908 |
| `docs/pengembangan/STATUS.md` | Baris DATA-5 saja → `selesai` |

## Bukti

Putaran 1. Migrasi tidak diterapkan ke basis jarak jauh pada tiket ini (berkas baru saja).

Baca SQL versus AN-8 §3–§4:

| Butir | SQL |
| --- | --- |
| `sdb_katalog` kolom + check | `kunci` PK; judul/konsep/definisi not null; satuan null; empat check klaster/kelas/produsen/periode/referensi; `tabel_sumber`; `updated_at default now()` |
| RLS katalog | ENABLE; SELECT `is_staff()`; INSERT/UPDATE/DELETE walidata terpisah; tanpa `ALL`; tanpa `to anon` |
| Seed 12 | nilai `kunci`–`tabel_sumber` sama tabel AN-8; `satuan` null; teks operasional nama tabel SIK |
| `sdb_validasi` | uuid PK; FK cascade `kejadian_operasi`; status tiga nilai; catatan/created_by null; indeks `(kejadian_id, created_at desc)` |
| Validasi append-only | SELECT `is_staff()`; INSERT `is_ops()`; GRANT hanya select+insert; tanpa kebijakan UPDATE/DELETE |
| `sdb_jadwal_kirim` | uuid PK; FK `sdb_katalog(kunci)`; unique `(kunci, periode_label)`; status tiga nilai; tanpa `INSERT` baris |
| Jadwal RLS | SELECT `is_staff()`; tulis INSERT/UPDATE/DELETE `is_walidata()` |
| Non-tujuan | tidak ada `alter table` kejadian/calon; tidak ada `create or replace function` peran |

Uji string seed (skrip sementara, dihapus setelah jalan):

```
node .tmp-data5-seed-check.mjs
seed_row_count 12
keys kejadian_operasi,kejadian_dampak,pengungsian_kaji,kejadian_korban,pengungsi_terpilah,overlay_calon_kejadian,irbi,krb,profil_desa,pkd,rehab_kebutuhan,anggaran
missing []
extra []
sangat_rahasia_seed_rows []
sangat_rahasia_quoted_in_seed_block 0
SEED_OK
no_alter_kejadian / no_alter_calon / no_replace_is_* / no_policy_all / no_to_anon = true
validasi_no_update_policy / validasi_no_delete_policy / validasi_has_index_desc = true
jadwal_unique / jadwal_no_insert = true
```

`sangat_rahasia` hanya di CHECK `kelas_akses`, tidak di nilai seed. Grep berkas baru: tidak ada `for all`, `to anon`, `create or replace function`, `alter table` kejadian/calon, `insert into public.sdb_jadwal_kirim`.

## Bacaan ulang bukti versus kriteria

- [x] Migrasi baru `20260917_sdb_daerah.sql` saja
- [x] Tiga tabel + check + RLS sesuai AN-8 §3–§4 dan kontrak pelaksana
- [x] Seed 12 kunci; tanpa `sangat_rahasia`
- [x] Tanpa kolom baru di `kejadian_operasi` / `overlay_calon_kejadian`
- [x] Tanpa TypeScript; tanpa `create or replace` fungsi peran

## Keputusan

selesai

