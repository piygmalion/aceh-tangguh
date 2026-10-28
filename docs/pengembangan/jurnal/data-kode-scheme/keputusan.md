# DATA-kode — keputusan pemilik 2026-10-28

Status: **diputuskan** 2026-10-28 (WIB). Menutup pertanyaan terbuka di [usulan.md](usulan.md).

## Keputusan

Kemendagri adalah kunci join kabupaten/kota. Kode BPS disimpan hanya sebagai kolom tambahan `kode_bps` pada registri. `kode_bps` bukan kunci join.

Registri yang diubah: `public/fixtures/aceh-kabupaten-registry.json` dan tipe/`ACEH_KABUPATEN_REGISTRY` di `src/lib/aceh-kabupaten.ts`. Tidak ada baris baru. Tidak ada tulis basis data. Tidak ada bangun ulang ubin. `adm2`, slug, nama, dan `is_kota` tidak diubah. Kode di luar empat pasang `kode_sik` tidak diubah.

## Empat pasang `kode_sik` yang diselaraskan

Nilai lama mengikuti urutan Kemendagri kecuali pasangan ini tertukar (catatan usulan dan `metadata.catatan` registri sebelum perbaikan). Nilai baru adalah `adm2` tanpa titik. `adm2` sendiri tidak berubah.

| nama | kode_sik sebelum | kode_sik sesudah | Kemendagri `adm2` |
| --- | --- | --- | --- |
| Aceh Tamiang | 1114 | 1116 | 11.16 |
| Aceh Jaya | 1116 | 1114 | 11.14 |
| Langsa | 1173 | 1174 | 11.74 |
| Lhokseumawe | 1174 | 1173 | 11.73 |

## `kode_bps`

Diisi dari `kode_kab` BPS di `public/fixtures/boundaries-aceh-kab.geojson`, dicocokkan lewat nama (awalan Kabupaten/Kota diabaikan). Pada tanggal keputusan, 23 nama punya tepat satu padanan, jadi tidak ada `kode_bps` null. Kode tidak dikarang. Kemendagri tidak dipakai sebagai rumus untuk menghasilkan BPS: 15 kab memang berbeda antara kedua skema.

| nama | Kemendagri `adm2` | `kode_sik` | `kode_bps` |
| --- | --- | --- | --- |
| Aceh Selatan | 11.01 | 1101 | 1103 |
| Aceh Tenggara | 11.02 | 1102 | 1104 |
| Aceh Timur | 11.03 | 1103 | 1105 |
| Aceh Tengah | 11.04 | 1104 | 1106 |
| Aceh Barat | 11.05 | 1105 | 1107 |
| Aceh Besar | 11.06 | 1106 | 1108 |
| Pidie | 11.07 | 1107 | 1109 |
| Aceh Utara | 11.08 | 1108 | 1111 |
| Simeulue | 11.09 | 1109 | 1101 |
| Aceh Singkil | 11.10 | 1110 | 1102 |
| Bireuen | 11.11 | 1111 | 1110 |
| Aceh Barat Daya | 11.12 | 1112 | 1112 |
| Gayo Lues | 11.13 | 1113 | 1113 |
| Aceh Tamiang | 11.16 | 1116 | 1114 |
| Nagan Raya | 11.15 | 1115 | 1115 |
| Aceh Jaya | 11.14 | 1114 | 1116 |
| Bener Meriah | 11.17 | 1117 | 1117 |
| Pidie Jaya | 11.18 | 1118 | 1118 |
| Banda Aceh | 11.71 | 1171 | 1171 |
| Sabang | 11.72 | 1172 | 1172 |
| Langsa | 11.74 | 1174 | 1173 |
| Lhokseumawe | 11.73 | 1173 | 1174 |
| Subulussalam | 11.75 | 1175 | 1175 |

## Join yang masih membaca `kode_sik`

Logika join ubin, basis data, dan API tidak diubah di keputusan ini. Pembacaan berikut tetap memakai `kode_sik` (sekarang selaras dengan Kemendagri, bukan lagi pasangan tertukar):

- `sikKodeToAdm2`, `adm2ToSikKode`, `resolveAdm2`, `findKabupatenRegistry` di `src/lib/aceh-kabupaten.ts`. `kode_bps` tidak masuk peta cari.
- `lookupKrbKabupaten`, `lookupKrbWilayah`, dan `kawasanOverlappingKab` di `src/lib/krb-by-kab.ts` lewat `resolveAdm2`.
- `ACEH_KABUPATEN` di `src/lib/sik/juklak.ts` menyalin `kode_sik`. Pemakai: undangan staf (`src/lib/sik/staff-invite.ts`), slot `/api/admin/users`, dan pencarian nama panduan.
- `kabupatenOptionsFromRegistry` / `resolveKabupatenOption` di `src/lib/laporan/wilayah-cascade.ts` mengembalikan `kode_sik`. Saringan kecamatan memakai awalan kode itu.

`matchesKabScope` / `kabScopeEqualsRow` tetap perbandingan tepat. `"1114"` tidak disamakan dengan `"11.16"`. Tidak ada migrasi profil staf yang sudah menyimpan `1114` sebagai Aceh Tamiang.

`scripts/lib/tilikan-kerusakan.mjs` tidak lagi menyalin kode. `ACEH_KABUPATEN` dibaca dari `adm2` registri (digit Kemendagri): Tamiang `1116`, Jaya `1114`, Langsa `1174`, Lhokseumawe `1173`. `tilikan_kerusakan_infra` dan `admin_profiles` tidak punya baris dengan keempat kode lama, jadi tidak ada migrasi data untuk keduanya.

## Perbaikan baris `overlay_calon_kejadian`

Pemeriksaan baca-saja pada proyek Supabase `whojoxrbcdyotrpolgav` (2026-10-28) menemukan 10 dari 190 baris `public.overlay_calon_kejadian` yang masih menyimpan kode SIK lama: 1 baris Aceh Tamiang `1114` dan 9 baris Aceh Jaya `1116`. Langsa dan Lhokseumawe tidak ketemu. Tabel lain yang dicek sudah memakai Kemendagri.

Migrasi baru `supabase/migrations/20261028_overlay_calon_kode_kemendagri.sql` memperbaiki hanya pasangan nama+kode lama itu, dalam satu `UPDATE` berkondisi `CASE`, sehingga menjalankan ulang tidak menukar balik. Format bertitik dipertahankan. Migrasi ini tidak diterapkan ke basis data hidup dari PR ini.

Penulis baru `overlay_calon_kejadian.kode_kabupaten` memakai digit `adm2` (Kemendagri), bukan kolom `kode_sik`: `kemendagriKab` di `src/lib/overlay-calon.ts`, dipanggil dari `wilayahDariProperties` (sisipan/pembaruan sinkron dan POST calon) dan dari `authorizeCalonTerima` (pembaruan saat diterima).

## Pemeriksaan

`node scripts/check-kab-kode.mjs` dan `scripts/check-kab-kode.test.mjs` menuntut 23 baris, `adm2` unik, `kode_bps` unik bila terisi, `kode_sik` sama dengan Kemendagri tanpa titik, dan `kode_bps` sama dengan `kode_kab` batas yang nama-nya cocok satu-satu.
