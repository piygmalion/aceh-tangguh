-- First-class demografi counts on profil_desa (already stored in payload.demografi).
-- Nullable integers. Do not backfill here; Backend runs
-- scripts/update-profil-from-sheet.mjs --apply after coordinator review.
-- Do not create desa_indikator. Do not touch live_stats / posko / area_feature_meta.

alter table public.profil_desa
  add column if not exists kk_laki_laki integer,
  add column if not exists kk_perempuan integer,
  add column if not exists bayi_0_1 integer,
  add column if not exists balita_1_4 integer,
  add column if not exists anak_5_12 integer,
  add column if not exists remaja_13_17 integer,
  add column if not exists dewasa_18_59 integer,
  add column if not exists lansia_60_plus integer,
  add column if not exists penyandang_disabilitas integer;
