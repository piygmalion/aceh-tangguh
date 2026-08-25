-- Aceh Tangguh backend schema
create extension if not exists "pgcrypto";

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  topic text not null check (topic in ('banjir','longsor','hunian','perlindungan','logistik','kesehatan','lainnya')),
  description text not null check (char_length(description) between 10 and 2000),
  longitude double precision not null check (longitude between 94 and 99),
  latitude double precision not null check (latitude between 2 and 6),
  place_name text,
  consent_map_display boolean not null default false,
  status text not null default 'queued' check (status in ('queued','published','rejected')),
  created_at timestamptz not null default now()
);

create index if not exists reports_created_at_idx on public.reports (created_at desc);
create index if not exists reports_status_idx on public.reports (status);

create table if not exists public.live_stats (
  id int primary key default 1 check (id = 1),
  active_incidents int not null default 0,
  posko_count int,
  reports_last_24h int not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.live_stats (id, active_incidents, posko_count, reports_last_24h)
values (1, 3, null, 0)
on conflict (id) do nothing;

create table if not exists public.hazard_status (
  kind text primary key check (kind in ('banjir','longsor','gempa','kebakaran','lainnya')),
  label text not null,
  count int not null default 0,
  severity text check (severity in ('low','med','high')),
  updated_at timestamptz not null default now()
);

insert into public.hazard_status (kind, label, count, severity) values
  ('banjir','Banjir',2,'med'),
  ('longsor','Longsor',1,'high'),
  ('gempa','Gempa',0,'low'),
  ('kebakaran','Kebakaran',0,'low')
on conflict (kind) do nothing;

create table if not exists public.map_layers (
  key text primary key,
  kind text not null check (kind in ('area','marker','boundary')),
  title_id text not null,
  title_en text,
  description text,
  source_path text,
  source_type text check (source_type in ('geojson','pmtiles','api','mixed')),
  pmtiles_path text,
  legend jsonb,
  enabled boolean not null default true,
  sort_order int not null default 0,
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.area_feature_meta (
  id text not null,
  layer_key text not null references public.map_layers(key) on delete cascade,
  name text not null,
  kabupaten text,
  properties jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (layer_key, id)
);

create index if not exists area_feature_meta_kab_idx on public.area_feature_meta (kabupaten);

-- RLS
alter table public.reports enable row level security;
alter table public.live_stats enable row level security;
alter table public.hazard_status enable row level security;
alter table public.map_layers enable row level security;
alter table public.area_feature_meta enable row level security;

-- reports: anyone can insert with consent; public can read published+consent
create policy reports_insert_anon on public.reports
  for insert to anon, authenticated
  with check (consent_map_display = true);

create policy reports_select_published on public.reports
  for select to anon, authenticated
  using (status = 'published' and consent_map_display = true);

create policy reports_select_own_queued on public.reports
  for select to anon, authenticated
  using (true);

-- For MVP allow reading all reports via anon (API will filter); tighten later with auth
drop policy if exists reports_select_own_queued on public.reports;
create policy reports_select_all_mvp on public.reports
  for select to anon, authenticated
  using (true);

create policy live_stats_select on public.live_stats
  for select to anon, authenticated
  using (true);

create policy hazard_status_select on public.hazard_status
  for select to anon, authenticated
  using (true);

create policy map_layers_select on public.map_layers
  for select to anon, authenticated
  using (enabled = true);

create policy area_feature_meta_select on public.area_feature_meta
  for select to anon, authenticated
  using (true);

-- Note: area_feature_meta is SELECT-only for anon/authenticated.
-- Seed/upsert via service_role (bypasses RLS) or dashboard SQL:
--   bun run seed:area-meta   # set SUPABASE_SERVICE_ROLE_KEY for writes
