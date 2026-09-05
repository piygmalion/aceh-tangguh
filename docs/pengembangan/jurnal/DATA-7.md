# DATA-7 — terapkan migrasi G2–G9 ke produksi

Agent: data
Gelombang: 10
Status: selesai

## Niat

- Tujuan: Menerapkan berkas migrasi yang sudah ada di repo ke proyek Supabase `aceh-tangguh` (`whojoxrbcdyotrpolgav`). Tidak menulis SQL baru. Tidak mengubah berkas migrasi. Tidak memetakan Tatonas.
- Berkas: hanya jurnal + STATUS. SQL yang diterapkan = isi `supabase/migrations/` yang belum hidup di remote.
- Tidak diubah: `src/**`, rumus PKD, DATA-4, P2 Juklak.
- Langkah:
  1. Remote sudah punya SIK/KRB/Juklak (nama versi lain). Jangan menerapkan ulang `20260907`–`20260909`.
  2. Terapkan berurutan, isi berkas apa adanya: `20260910_overlay_layers`, `20260911_overlay_static_seed`, `20260912_overlay_prune_non_aceh`, `20260913_overlay_live_ttl`, `20260914_laporan_pii_is_ops`, `20260915_overlay_calon_kejadian`, `20260916_overlay_live_refresh`, `20260917_sdb_daerah`, `20260918_destana_dua_instrumen`, `20260918_panduan_faq_unknown`.
  3. Buktikan dengan `list_tables`: `overlay_live_features`, `overlay_calon_kejadian`, `sdb_katalog`, `destana_si`, `destana_aktivitas`, `panduan_faq` ada.
- Cara membuktikan: daftar migrasi remote memuat nama di atas; tabel ada.
- Risiko: constraint `map_layers` sudah beda — jika gagal, catat blocker, jangan mengarang SQL pengganti di tiket ini. Jangan menyentuh `_tmp_profil_sheet_apply` (RLS mati; di luar niat).

## Bacaan ulang niat

Satu proyek, berkas yang sudah ada, urutan ketergantungan overlay → calon → SDB → Destana → panduan. Bukan seed Destana. Bukan tebakan Tatonas.

## Perubahan

| Berkas | Isi |
| --- | --- |
| (remote saja) | isi migrasi repo diterapkan; berkas SQL repo tidak disunting |
| STATUS.md | baris DATA-7 |

## Bukti

```
list_migrations memuat:
20260910_overlay_layers
20260911_overlay_static_seed
20260912_overlay_prune_non_aceh
20260913_overlay_live_ttl
20260914_laporan_pii_is_ops
20260915_overlay_calon_kejadian
20260916_overlay_live_refresh
20260917_sdb_daerah
20260918_destana_dua_instrumen
20260918_panduan_faq_unknown

execute_sql:
port_rows=15 xb005_rows=0 sdb_katalog_rows=12
destana_si / destana_aktivitas / overlay_calon_kejadian
overlay_live_refresh / panduan_faq / sdb_validasi ada
```

## Bacaan ulang bukti versus kriteria

- [x] Tabel overlay / calon / SDB / destana / panduan_faq ada
- [x] Berkas migrasi repo tidak disunting
- [x] XB005 tidak tersisa (15 pelabuhan Aceh)
- [x] `_tmp_profil_sheet_apply` tidak disentuh

## Keputusan

selesai
