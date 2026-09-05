-- Narrow PII SELECT (and storage) from is_staff() to is_ops().
-- Does not change is_ops() / is_staff() definitions.
-- Does not change laporan_kejadian / laporan_penanganan (not pelapor identity).
-- Does not change anon insert (already revoked in 20260902).

drop policy if exists laporan_pelapor_select_staff on public.laporan_pelapor;
create policy laporan_pelapor_select_staff on public.laporan_pelapor
  for select to authenticated
  using (public.is_ops());

drop policy if exists notifikasi_wa_select_staff on public.notifikasi_wa;
create policy notifikasi_wa_select_staff on public.notifikasi_wa
  for select to authenticated
  using (public.is_ops());

drop policy if exists laporan_media_select_staff on storage.objects;
create policy laporan_media_select_staff on storage.objects
  for select to authenticated
  using (bucket_id = 'laporan-media' and public.is_ops());
