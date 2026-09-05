# Brief agent data

Anda mengurus kebenaran wilayah, umur data, dan mutu ETL. Baca [00-protokol.md](00-protokol.md) lalu kerjakan tiket sesuai gelombang di [STATUS.md](STATUS.md).

## Sudah selesai — jangan diulang

Filter pelabuhan/sensor menolak provinsi non-Aceh; baris tanpa geometri dibuang; fixture dibersihkan; migrasi `20260912_overlay_prune_non_aceh.sql` menghapus XB005 dan sensor Sumatera Utara.

## Tiket gelombang 1

### DATA-1 — masa berlaku data live dan cache maritim

Jurnal: `jurnal/DATA-1.md`

**Niat yang harus tertulis.** Tambah kolom kedaluwarsa dan fungsi hapus baris basi. Jangan mengubah `src/lib/overlay-live.ts` — itu wilayah backend.

**Berkas.** Migrasi baru, misalnya `supabase/migrations/20260913_overlay_live_ttl.sql`.

**Langkah.**

1. `overlay_live_features`: kolom `expires_at timestamptz` (nullable), indeks `(layer_key, expires_at)`.
2. `maritime_forecast_cache`: kolom `expires_at timestamptz` (nullable).
3. Fungsi `public.purge_expired_overlay_rows()` yang menghapus baris `expires_at < now()`. Jangan hapus baris `expires_at` null pada gelombang ini.
4. Komentar SQL menjelaskan bahwa backend yang mengisi `expires_at` pada gelombang 2.

**Kriteria.**

- Migrasi baru, bukan suntingan berkas lama.
- `expires_at` ada di kedua tabel.
- Fungsi purge hanya menyentuh baris kedaluwarsa.
- Tidak ada perubahan TypeScript pada tiket ini.

### DATA-2 — checksum dan ambang jumlah fitur ETL

Jurnal: `jurnal/DATA-2.md`

**Niat yang harus tertulis.** Scrape Ruang Kita gagal jika jumlah fitur anjlok di bawah ambang, atau checksum tidak cocok dengan manifest sebelumnya kecuali dipaksa.

**Berkas.** `scripts/scrape-ruangkita-static.mjs`, `scripts/lib/overlay-etl.mjs` jika perlu helper murni, `scripts/overlay-etl.test.mjs`, `public/fixtures/overlays/manifest.json`.

**Langkah.**

1. Manifest mencatat `featureCount` dan checksum isi per layer.
2. Jika jumlah fitur = 0, proses keluar selain 0.
3. Jika jumlah turun lebih dari 40% dibanding manifest sebelumnya, proses keluar selain 0 kecuali `FORCE_OVERLAY_ETL=1`.
4. Uji unit untuk gagal-nol dan gagal-anjlok.

**Kriteria.**

- Uji baru lulus.
- `npm test` tetap hijau.
- Scrape tidak menulis fixture kosong tanpa gagal.

## Tiket kemudian — jangan dikerjakan di gelombang 1

### DATA-3 — potong geometri patahan/megathrust ke Aceh

Jurnal: `jurnal/DATA-3.md`. Gelombang 3. Selesai. Jangan diulang.

### DATA-4 — pemetaan `loggerKind` Tatonas

Tunggu konfirmasi penyedia di `jurnal/AN-3.md`. Jangan memetakan kode perangkat dari tebakan.

## Tiket gelombang 5

### DATA-5 — tiga tabel SDI daerah

Jurnal: `jurnal/DATA-5.md`. Gelombang 5. Selesai. Jangan diulang. Migrasi `20260917_sdb_daerah.sql` sudah ada.

### DATA-6 — tabel Destana SI + aktivitas

Jurnal: `jurnal/DATA-6.md`. Gelombang 9. Selesai. Jangan diulang.

### DATA-7 — terapkan migrasi overlay–Destana ke produksi

Jurnal: `jurnal/DATA-7.md`. Gelombang 10. Selesai. Jangan diulang.

Terapkan isi berkas `20260910`–`20260918` (termasuk `20260918_panduan_faq_unknown`) ke proyek `aceh-tangguh`. Jangan menulis SQL baru. Jangan menyunting berkas migrasi. Jangan menerapkan ulang `20260907`–`20260909`. Jangan DATA-4. Jangan menyentuh `_tmp_profil_sheet_apply`.

### DATA-8 — kunci staging `_tmp_profil_sheet_apply`

Jurnal: `jurnal/DATA-8.md`. Gelombang 11. Selesai. Jangan diulang.

Migrasi baru `20260919_tmp_profil_sheet_rls.sql`: ENABLE RLS, REVOKE Data API, tanpa POLICY, tanpa DELETE/DROP. Lengkapi revoke `purge_expired_overlay_rows()`. Jangan DATA-4. Jangan merevoke `is_staff` / `is_ops`.

### DATA-9 — cabut Data API pada RPC definer tulis

Jurnal: `jurnal/DATA-9.md`. Gelombang 12. Selesai. Jangan diulang.

Migrasi baru `20260920_revoke_definer_write_rpcs.sql`: REVOKE `next_laporan_nomor` / `upsert_marker_features` dari Data API; GRANT `service_role`. Jangan `CREATE OR REPLACE` isi fungsi. Jangan merevoke `is_staff` / `is_ops`. Jangan DATA-4.

### DATA-11 — dump tubuh `upsert_marker_features`

Jurnal: `jurnal/DATA-11.md`. Gelombang 15. Dump `pg_get_functiondef` dari produksi ke migrasi baru. Jangan apply. Jangan mengarang `CREATE`. Jangan DATA-4. Jangan merevoke fungsi peran.

### DATA-12 — unik satu `admin_kabkota` per kode

Jurnal: `jurnal/DATA-12.md`. Gelombang 18. Migrasi baru unique parsial. Jangan apply dari tiket. Jangan merevoke `is_staff` / `is_ops`. Jangan DATA-4.

### DATA-13 — ingest WeatherNext 3 inovasi

Jurnal: `jurnal/DATA-13.md`. Gelombang 19. Jangan dikode sebelum AN-24. Skrip baru; jangan sunting `build-weather-snapshot.mjs`. Tanpa allowlist EE: fixture `unconfigured` + `kabupaten_kota: []`, bukan suhu karangan. Migrasi baru jika perlu cache. Jangan DATA-4.

## Tiket gelombang ECC-S — kerapian

Kontrak: [06-skema-kerapian.md](06-skema-kerapian.md). Jangan DATA-4.

### DATA-18 — fixture yatim (S1)

Jurnal: `jurnal/DATA-18.md`. Hapus atau dokumentasikan `boundaries-aceh-stub.geojson`. Pulihkan atau cabut `/fixtures/jembatan.json` dari `map-layers-catalog.ts`. Jangan seed overlay. Jangan apply `20260923`.

### DATA-14 / DATA-15 — registri kab + ruang Aceh (S2)

Kontrak: [jurnal/AN-27.md](jurnal/AN-27.md) (`siap-kode`). Jangan mengubah `matchesKabScope`. Jangan menukar `kode_sik` staf. Jangan memakai `toDottedKabKode` sebagai identitas (empat pasang Tamiang/Jaya dan Langsa/Lhokseumawe). Jangan menebak kode perangkat.

## Saat menutup tiket

Perbarui baris tiket di [STATUS.md](STATUS.md). Jangan commit.
