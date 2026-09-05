-- BE-8 / AN-5: per-layer refresh ledger so GET can tell empty success from 503.
-- Do not insert fictional rows into overlay_live_features.
-- Writes are service role only — no staff INSERT/UPDATE/DELETE policy.

create table if not exists public.overlay_live_refresh (
  layer_key text primary key
    check (layer_key in (
      'bmkgQuakes',
      'magmaQuakes',
      'magmaVolcanoes',
      'sipongiHotspots',
      'tatonasStations'
    )),
  refreshed_at timestamptz not null,
  ok boolean not null,
  feature_count integer not null check (feature_count >= 0),
  error text null
);

comment on table public.overlay_live_refresh is
  'Live overlay refresh ledger. GET distinguishes empty success from never-refreshed / upstream fail. Service role writes; anon/authenticated SELECT.';

alter table public.overlay_live_refresh enable row level security;

drop policy if exists overlay_live_refresh_select_public on public.overlay_live_refresh;
create policy overlay_live_refresh_select_public
  on public.overlay_live_refresh for select to anon, authenticated using (true);
