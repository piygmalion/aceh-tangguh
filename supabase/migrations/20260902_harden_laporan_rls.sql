-- Harden citizen-report RLS: no public INSERT. Writes go through the Next.js
-- API with SUPABASE_SERVICE_ROLE_KEY after Zod validation.
-- Apply after 20260826_laporan_production.sql and 20260829_map_layers_partisipasi.sql.

-- ---------------------------------------------------------------------------
-- Drop public insert policies (and leftover MVP open-read policies)
-- ---------------------------------------------------------------------------
drop policy if exists laporan_kejadian_insert on public.laporan_kejadian;
drop policy if exists laporan_penanganan_insert on public.laporan_penanganan;
drop policy if exists laporan_pelapor_insert on public.laporan_pelapor;
drop policy if exists notifikasi_wa_insert on public.notifikasi_wa;
drop policy if exists reports_insert_anon on public.reports;
drop policy if exists laporan_kejadian_select_all_mvp on public.laporan_kejadian;
drop policy if exists laporan_penanganan_select_mvp on public.laporan_penanganan;

-- Keep / restore published SELECT so anon map overlays still work (PR #21).
drop policy if exists laporan_kejadian_select_published on public.laporan_kejadian;
create policy laporan_kejadian_select_published on public.laporan_kejadian
  for select to anon, authenticated
  using (status = 'approved' and tampil_di_peta = true);

drop policy if exists laporan_penanganan_select_published on public.laporan_penanganan;
create policy laporan_penanganan_select_published on public.laporan_penanganan
  for select to anon, authenticated
  using (status = 'approved' and tampil_di_peta = true);

-- Staff can inspect the WA queue; cron still uses service_role for send/update.
drop policy if exists notifikasi_wa_select_staff on public.notifikasi_wa;
create policy notifikasi_wa_select_staff on public.notifikasi_wa
  for select to authenticated using (public.is_staff());

-- Defense in depth: even if a WITH CHECK (true) policy is re-added, anon
-- cannot INSERT. service_role bypasses GRANT + RLS.
revoke insert, update, delete, truncate, references, trigger
  on public.laporan_pelapor from anon, authenticated;
revoke insert, delete, truncate
  on public.laporan_kejadian from anon, authenticated;
revoke update, truncate
  on public.laporan_kejadian from anon;
revoke insert, delete, truncate
  on public.laporan_penanganan from anon, authenticated;
revoke update, truncate
  on public.laporan_penanganan from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.notifikasi_wa from anon, authenticated;
revoke insert, delete, truncate
  on public.reports from anon, authenticated;
revoke truncate on public.reports from anon;

grant select on public.laporan_pelapor to authenticated;
grant select on public.laporan_kejadian to anon, authenticated;
grant update on public.laporan_kejadian to authenticated;
grant select on public.laporan_penanganan to anon, authenticated;
grant update on public.laporan_penanganan to authenticated;
grant select on public.notifikasi_wa to authenticated;
grant select on public.reports to anon, authenticated;
grant update on public.reports to authenticated;

-- ---------------------------------------------------------------------------
-- Collision-safe report numbers (service_role / definer only)
-- ---------------------------------------------------------------------------
create sequence if not exists public.laporan_kejadian_nomor_seq;
create sequence if not exists public.laporan_penanganan_nomor_seq;

create or replace function public.next_laporan_nomor(prefix text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  n bigint;
begin
  if prefix = 'KJD' then
    n := nextval('public.laporan_kejadian_nomor_seq');
  elsif prefix = 'PNG' then
    n := nextval('public.laporan_penanganan_nomor_seq');
  else
    raise exception 'unknown laporan prefix: %', prefix;
  end if;
  return prefix || '-' || to_char((now() at time zone 'Asia/Jakarta'), 'YYYYMMDD')
    || '-' || lpad(n::text, 4, '0');
end;
$$;

revoke all on function public.next_laporan_nomor(text) from public;
grant execute on function public.next_laporan_nomor(text) to service_role;

-- ---------------------------------------------------------------------------
-- Bounds + score CHECKs
-- ---------------------------------------------------------------------------
alter table public.laporan_penanganan
  drop constraint if exists laporan_penanganan_latitude_check;
alter table public.laporan_penanganan
  add constraint laporan_penanganan_latitude_check
  check (latitude between 1.5 and 6.5);

alter table public.laporan_penanganan
  drop constraint if exists laporan_penanganan_longitude_check;
alter table public.laporan_penanganan
  add constraint laporan_penanganan_longitude_check
  check (longitude between 95.0 and 98.5);

alter table public.laporan_kejadian
  drop constraint if exists laporan_kejadian_skor_urgensi_check;
alter table public.laporan_kejadian
  add constraint laporan_kejadian_skor_urgensi_check
  check (skor_urgensi between 0 and 200);
