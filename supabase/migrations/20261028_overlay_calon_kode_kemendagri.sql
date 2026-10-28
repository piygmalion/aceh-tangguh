-- DATA-kode 2026-10-28: selaraskan kode_kabupaten lama di overlay_calon_kejadian.
-- Hanya empat pasangan (nama + kode lama). Tidak menambah baris. Tidak menyentuh tabel lain.
-- Tidak diterapkan ke basis data hidup dari tiket ini.
--
-- Nama dinormalisasi: awalan Kabupaten / Kab. / Kota dibuang, huruf diabaikan.
-- Kode dinormalisasi: titik diabaikan (11.14 dan 1114 sama).
-- Jika kode tersimpan memakai titik, hasil tetap bertitik (11.14 → 11.16, bukan 1116).
-- CASE hanya menuliskan kode baru untuk pasangan lama, jadi menjalankan ulang tidak menukar balik.

update public.overlay_calon_kejadian
set kode_kabupaten = case
  when regexp_replace(lower(btrim(kabupaten)), '^(kabupaten|kab\.|kota)\s+', '') = 'aceh tamiang'
   and regexp_replace(btrim(kode_kabupaten), '\.', '', 'g') = '1114'
    then case when btrim(kode_kabupaten) ~ '\.' then '11.16' else '1116' end
  when regexp_replace(lower(btrim(kabupaten)), '^(kabupaten|kab\.|kota)\s+', '') = 'aceh jaya'
   and regexp_replace(btrim(kode_kabupaten), '\.', '', 'g') = '1116'
    then case when btrim(kode_kabupaten) ~ '\.' then '11.14' else '1114' end
  when regexp_replace(lower(btrim(kabupaten)), '^(kabupaten|kab\.|kota)\s+', '') = 'langsa'
   and regexp_replace(btrim(kode_kabupaten), '\.', '', 'g') = '1173'
    then case when btrim(kode_kabupaten) ~ '\.' then '11.74' else '1174' end
  when regexp_replace(lower(btrim(kabupaten)), '^(kabupaten|kab\.|kota)\s+', '') = 'lhokseumawe'
   and regexp_replace(btrim(kode_kabupaten), '\.', '', 'g') = '1174'
    then case when btrim(kode_kabupaten) ~ '\.' then '11.73' else '1173' end
  else kode_kabupaten
end
where (
  regexp_replace(lower(btrim(kabupaten)), '^(kabupaten|kab\.|kota)\s+', ''),
  regexp_replace(btrim(kode_kabupaten), '\.', '', 'g')
) in (
  ('aceh tamiang', '1114'),
  ('aceh jaya', '1116'),
  ('langsa', '1173'),
  ('lhokseumawe', '1174')
);

-- Verifikasi (harapan: 0 baris). Jangan dijalankan sebagai bagian migrasi.
-- select id, kabupaten, kode_kabupaten
-- from public.overlay_calon_kejadian
-- where (
--   regexp_replace(lower(btrim(kabupaten)), '^(kabupaten|kab\.|kota)\s+', ''),
--   regexp_replace(btrim(kode_kabupaten), '\.', '', 'g')
-- ) in (
--   ('aceh tamiang', '1114'),
--   ('aceh jaya', '1116'),
--   ('langsa', '1173'),
--   ('lhokseumawe', '1174')
-- );

-- Rollback (manual, hanya jika pasangan baru harus dikembalikan ke kode lama):
-- update public.overlay_calon_kejadian
-- set kode_kabupaten = case
--   when regexp_replace(lower(btrim(kabupaten)), '^(kabupaten|kab\.|kota)\s+', '') = 'aceh tamiang'
--    and regexp_replace(btrim(kode_kabupaten), '\.', '', 'g') = '1116'
--     then case when btrim(kode_kabupaten) ~ '\.' then '11.14' else '1114' end
--   when regexp_replace(lower(btrim(kabupaten)), '^(kabupaten|kab\.|kota)\s+', '') = 'aceh jaya'
--    and regexp_replace(btrim(kode_kabupaten), '\.', '', 'g') = '1114'
--     then case when btrim(kode_kabupaten) ~ '\.' then '11.16' else '1116' end
--   when regexp_replace(lower(btrim(kabupaten)), '^(kabupaten|kab\.|kota)\s+', '') = 'langsa'
--    and regexp_replace(btrim(kode_kabupaten), '\.', '', 'g') = '1174'
--     then case when btrim(kode_kabupaten) ~ '\.' then '11.73' else '1173' end
--   when regexp_replace(lower(btrim(kabupaten)), '^(kabupaten|kab\.|kota)\s+', '') = 'lhokseumawe'
--    and regexp_replace(btrim(kode_kabupaten), '\.', '', 'g') = '1173'
--     then case when btrim(kode_kabupaten) ~ '\.' then '11.74' else '1174' end
--   else kode_kabupaten
-- end
-- where (
--   regexp_replace(lower(btrim(kabupaten)), '^(kabupaten|kab\.|kota)\s+', ''),
--   regexp_replace(btrim(kode_kabupaten), '\.', '', 'g')
-- ) in (
--   ('aceh tamiang', '1116'),
--   ('aceh jaya', '1114'),
--   ('langsa', '1174'),
--   ('lhokseumawe', '1173')
-- );
