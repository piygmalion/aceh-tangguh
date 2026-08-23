-- Weather forecast cache for Aceh Tangguh
create table if not exists public.weather_forecasts (
  kabupaten_kota text primary key,
  adm4_code text,
  payload jsonb not null,
  source text not null,
  fetched_at timestamptz not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists weather_forecasts_expires_idx
  on public.weather_forecasts (expires_at);

alter table public.weather_forecasts enable row level security;

create policy weather_forecasts_select on public.weather_forecasts
  for select to anon, authenticated
  using (true);
