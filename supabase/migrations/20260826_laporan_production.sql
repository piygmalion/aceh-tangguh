-- Production hardening for laporan masyarakat (apply after 20260825_laporan_masyarakat.sql)
-- Moderator: BPBA Pusdalops | WA queue processed by cron with service_role

-- Pelapor + WA queue: public insert only (no public read of PII)
drop policy if exists laporan_pelapor_insert on public.laporan_pelapor;
create policy laporan_pelapor_insert on public.laporan_pelapor
  for insert to anon, authenticated with check (true);

drop policy if exists laporan_pelapor_select_staff on public.laporan_pelapor;
create policy laporan_pelapor_select_staff on public.laporan_pelapor
  for select to authenticated using (public.is_staff());

drop policy if exists notifikasi_wa_insert on public.notifikasi_wa;
create policy notifikasi_wa_insert on public.notifikasi_wa
  for insert to anon, authenticated with check (true);

-- Replace MVP overly-open read policies
drop policy if exists laporan_kejadian_select_all_mvp on public.laporan_kejadian;
drop policy if exists laporan_penanganan_select_mvp on public.laporan_penanganan;

drop policy if exists laporan_kejadian_select_staff on public.laporan_kejadian;
create policy laporan_kejadian_select_staff on public.laporan_kejadian
  for select to authenticated using (public.is_staff());

drop policy if exists laporan_penanganan_select_staff on public.laporan_penanganan;
create policy laporan_penanganan_select_staff on public.laporan_penanganan
  for select to authenticated using (public.is_staff());

drop policy if exists laporan_kejadian_update_staff on public.laporan_kejadian;
create policy laporan_kejadian_update_staff on public.laporan_kejadian
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists laporan_penanganan_update_staff on public.laporan_penanganan;
create policy laporan_penanganan_update_staff on public.laporan_penanganan
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Media paths stored in jawaban_json (foto/video)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'laporan-media',
  'laporan-media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Upload via API (service_role) — no direct anon storage writes
drop policy if exists laporan_media_select_staff on storage.objects;
create policy laporan_media_select_staff on storage.objects
  for select to authenticated
  using (bucket_id = 'laporan-media' and public.is_staff());
