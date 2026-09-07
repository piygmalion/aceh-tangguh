-- DATA-27: official BMKG PDGT bulletin cache (jalur B).
-- New file. Do not edit the original overlay-layers migration.
-- Do not store warnings in overlay_live_features.

create table if not exists public.maritime_warning_cache (
  external_id text primary key,
  kode text,
  nama text not null default '',
  wave_cat text not null default '',
  wave_min_m numeric,
  wave_max_m numeric,
  valid_from timestamptz,
  valid_to timestamptz,
  issued text,
  no_surat text,
  sinoptik text,
  source_url text,
  payload jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz
);

comment on table public.maritime_warning_cache is
  'BMKG PDGT bulletin rows for Aceh / M.01 / M.03. Not overlay_live_features. Cron writes; GET reads.';

create index if not exists maritime_warning_cache_wave_valid_idx
  on public.maritime_warning_cache (wave_cat, valid_to);

create index if not exists maritime_warning_cache_kode_idx
  on public.maritime_warning_cache (kode);

alter table public.maritime_warning_cache enable row level security;

drop policy if exists maritime_warning_cache_select_public on public.maritime_warning_cache;
create policy maritime_warning_cache_select_public
  on public.maritime_warning_cache
  for select to anon, authenticated
  using (true);

revoke insert, update, delete on public.maritime_warning_cache from public, anon, authenticated;
grant select on public.maritime_warning_cache to anon, authenticated;

create or replace function public.purge_expired_overlay_rows()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
  n integer;
begin
  delete from public.overlay_live_features
  where expires_at is not null
    and expires_at < now();
  get diagnostics n = row_count;
  deleted_count := deleted_count + n;

  delete from public.maritime_forecast_cache
  where expires_at is not null
    and expires_at < now();
  get diagnostics n = row_count;
  deleted_count := deleted_count + n;

  delete from public.maritime_warning_cache
  where expires_at is not null
    and expires_at < now();
  get diagnostics n = row_count;
  deleted_count := deleted_count + n;

  return deleted_count;
end;
$$;

comment on function public.purge_expired_overlay_rows() is
  'Deletes overlay_live_features, maritime_forecast_cache, and maritime_warning_cache rows where expires_at < now(). Leaves null expires_at untouched.';

revoke all on function public.purge_expired_overlay_rows() from public, anon, authenticated;
