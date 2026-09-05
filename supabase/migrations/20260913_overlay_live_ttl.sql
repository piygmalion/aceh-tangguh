-- TTL columns for live overlay snapshots and maritime forecast cache.
-- Backend fills expires_at on ingest in gelombang 2 (BE-4). This migration
-- does not set TTL values. Null expires_at means "not expired yet".

alter table public.overlay_live_features
  add column if not exists expires_at timestamptz;

comment on column public.overlay_live_features.expires_at is
  'Set by backend on ingest (gelombang 2). Null is kept by purge_expired_overlay_rows().';

create index if not exists overlay_live_features_layer_expires_idx
  on public.overlay_live_features (layer_key, expires_at);

alter table public.maritime_forecast_cache
  add column if not exists expires_at timestamptz;

comment on column public.maritime_forecast_cache.expires_at is
  'Set by backend on ingest (gelombang 2). Null is kept by purge_expired_overlay_rows().';

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
  -- Only past expires_at. Null expires_at is not expired (gelombang 1).
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

  return deleted_count;
end;
$$;

comment on function public.purge_expired_overlay_rows() is
  'Deletes overlay_live_features and maritime_forecast_cache rows where expires_at < now(). Leaves null expires_at untouched. Backend sets expires_at in gelombang 2.';

revoke all on function public.purge_expired_overlay_rows() from public;
