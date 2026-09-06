-- Cache for WeatherNext 3 inovasi lane only. Do not store official BMKG payloads here.
create table if not exists public.weather_inovasi_snapshot (
  id smallint primary key default 1 check (id = 1),
  payload jsonb not null,
  fetched_at timestamptz,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

comment on table public.weather_inovasi_snapshot is
  'Experimental WeatherNext 3 snapshot. Not official BMKG. GET /api/weather/inovasi reads this.';

alter table public.weather_inovasi_snapshot enable row level security;

create policy weather_inovasi_snapshot_select on public.weather_inovasi_snapshot
  for select to anon, authenticated
  using (true);
