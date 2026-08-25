-- Column-limit authenticated SELECT on laporan_kejadian / laporan_penanganan
-- to the same public overlay columns as anon (20260902).
-- Apply after 20260902_harden_laporan_rls.sql. Do not rewrite 20260902.
--
-- Gap: RLS laporan_*_select_published allows anon AND authenticated to read
-- published rows (status = approved AND tampil_di_peta = true). 20260902 already
-- revoked jawaban_json / pelapor_id from anon via column GRANT. authenticated
-- still had table-level GRANT SELECT, so a logged-in non-staff JWT could
-- PostgREST select=jawaban_json on those published rows.
--
-- Postgres GRANT is role-level; is_staff() cannot grant extra columns to staff.
-- Staff /api/admin/laporan reads/updates laporan_* through the service-role
-- client after requireStaffApi. service_role bypasses GRANT + RLS.
--
-- Do not drop published-map SELECT for anon/authenticated.
-- Do not change laporan_pelapor GRANTs (staff JWT still selects telepon_enc).

revoke select on public.laporan_kejadian from authenticated;
grant select (
  id, nomor_laporan, jenis_bencana, status,
  latitude, longitude, kabupaten_kota, kecamatan, desa, provinsi,
  skor_urgensi, tampil_di_peta, submitted_at, created_at, updated_at
) on public.laporan_kejadian to authenticated;

revoke select on public.laporan_penanganan from authenticated;
grant select (
  id, nomor_laporan, jenis_bencana, tipe_laporan, fase_penanganan,
  status_kebutuhan_sisa, tanggal_penanganan, deskripsi_penanganan,
  status, latitude, longitude, kabupaten_kota, kecamatan, desa, provinsi,
  tampil_di_peta, submitted_at, created_at, updated_at
) on public.laporan_penanganan to authenticated;

-- Table-level UPDATE from 20260902 is unchanged (RLS still requires is_staff()).
