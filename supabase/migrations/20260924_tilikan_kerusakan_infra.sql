-- Staff-only field observations of damaged roads/bridges from cleaned tilikan CSVs.
-- Not a public map layer. Do not merge into the existing bridge inventory.
-- Do not store shelter-site or person-level rows here.

create table if not exists public.tilikan_kerusakan_infra (
  id uuid primary key default gen_random_uuid(),
  jenis text not null,
  nama text not null,
  alamat text,
  kabupaten text,
  kode_kabupaten text,
  kecamatan text,
  desa text,
  kode_desa_kelurahan text,
  latitude double precision not null,
  longitude double precision not null,
  coord_quality text not null default 'ok',
  approx boolean not null default false,
  sumber text,
  media_url text,
  marker_feature_id text,
  source_row text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tilikan_kerusakan_infra_jenis_check
    check (jenis in ('jalan', 'jembatan')),
  constraint tilikan_kerusakan_infra_kode_kab_check
    check (kode_kabupaten is null or kode_kabupaten ~ '^\d{4}$'),
  constraint tilikan_kerusakan_infra_kode_desa_check
    check (kode_desa_kelurahan is null or kode_desa_kelurahan ~ '^\d{10}$')
);

create unique index if not exists tilikan_kerusakan_infra_dedup_idx
  on public.tilikan_kerusakan_infra (
    jenis,
    (round(latitude::numeric, 5)),
    (round(longitude::numeric, 5)),
    (lower(nama))
  );

create index if not exists tilikan_kerusakan_infra_kab_idx
  on public.tilikan_kerusakan_infra (kode_kabupaten);

create index if not exists tilikan_kerusakan_infra_jenis_idx
  on public.tilikan_kerusakan_infra (jenis);

alter table public.tilikan_kerusakan_infra enable row level security;

drop policy if exists tilikan_kerusakan_infra_staff_all on public.tilikan_kerusakan_infra;
create policy tilikan_kerusakan_infra_staff_all
  on public.tilikan_kerusakan_infra
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

revoke all on public.tilikan_kerusakan_infra from public, anon;
grant select, insert, update, delete on public.tilikan_kerusakan_infra to authenticated;
