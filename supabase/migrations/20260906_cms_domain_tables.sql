-- CMS / domain tables referenced by TypeScript loaders and admin explorer.
-- These were historically created outside the repo; commit DDL for reproducible staging.
-- Apply after 20260825_admin_auth.sql (is_staff / is_super_admin).
-- Geometry stays in fixtures + PMTiles — do not store polygon GeoJSON here.

-- ---------------------------------------------------------------------------
-- kejadian_bencana
-- ---------------------------------------------------------------------------
create table if not exists public.kejadian_bencana (
  id text primary key,
  jenis_bencana text not null,
  hari_tanggal text,
  kabupaten text,
  kecamatan text,
  desa text,
  longitude double precision,
  latitude double precision,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists kejadian_bencana_hari_tanggal_idx
  on public.kejadian_bencana (hari_tanggal desc);
create index if not exists kejadian_bencana_kabupaten_idx
  on public.kejadian_bencana (kabupaten);

-- ---------------------------------------------------------------------------
-- marker_features
-- ---------------------------------------------------------------------------
create table if not exists public.marker_features (
  id text primary key,
  layer text not null,
  title text,
  status text,
  kabupaten text,
  longitude double precision not null,
  latitude double precision not null,
  properties jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists marker_features_layer_idx
  on public.marker_features (layer);
create index if not exists marker_features_kabupaten_idx
  on public.marker_features (kabupaten);

-- ---------------------------------------------------------------------------
-- anggaran_analisis + anggaran_kegiatan
-- ---------------------------------------------------------------------------
create table if not exists public.anggaran_analisis (
  tahun int primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.anggaran_kegiatan (
  id text primary key,
  tahun int not null references public.anggaran_analisis (tahun) on delete cascade,
  nama text,
  skpd text,
  fase text,
  kategori text,
  total_rp double precision,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists anggaran_kegiatan_tahun_idx
  on public.anggaran_kegiatan (tahun);

-- ---------------------------------------------------------------------------
-- publikasi (+ meta) — Tanggapi BTT analisis articles
-- ---------------------------------------------------------------------------
create table if not exists public.publikasi_meta (
  id int primary key default 1 check (id = 1),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.publikasi (
  slug text primary key,
  title text not null,
  description text,
  published_at timestamptz,
  tags text[] not null default '{}'::text[],
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists publikasi_published_at_idx
  on public.publikasi (published_at desc);

-- ---------------------------------------------------------------------------
-- Document snapshots (IRBI / generic JSON payloads)
-- ---------------------------------------------------------------------------
create table if not exists public.irbi_documents (
  key text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.data_documents (
  key text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.r3p_summary (
  id int primary key default 1 check (id = 1),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS: public SELECT; writes via service_role or super_admin JWT
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'kejadian_bencana',
    'marker_features',
    'anggaran_analisis',
    'anggaran_kegiatan',
    'publikasi_meta',
    'publikasi',
    'irbi_documents',
    'data_documents',
    'r3p_summary'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security', t);

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = t and cmd = 'SELECT'
    ) then
      execute format(
        'create policy %I on public.%I for select to anon, authenticated using (true)',
        t || '_select_public',
        t
      );
    end if;

    execute format('drop policy if exists %I on public.%I', t || '_insert_super_admin', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_super_admin', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_super_admin', t);

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_super_admin())',
      t || '_insert_super_admin',
      t
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin())',
      t || '_update_super_admin',
      t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_super_admin())',
      t || '_delete_super_admin',
      t
    );
  end loop;
end $$;
