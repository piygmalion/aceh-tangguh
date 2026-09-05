-- BE-6 / AN-4: calon kejadian from overlay_live_features.
-- Does not change is_ops() / is_staff(). Job otomatis memakai service role.

create table if not exists public.overlay_calon_kejadian (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('bmkg', 'magma', 'sipongi', 'tatonas')),
  layer_key text not null,
  external_id text not null,
  overlay_feature_id text,
  status text not null default 'draf' check (status in ('draf', 'ditolak', 'diterima')),
  tautan_status text not null default 'utuh' check (tautan_status in ('utuh', 'putus')),
  kejadian_id uuid null references public.kejadian_operasi(id) on delete set null,
  nama_sinyal text not null,
  waktu_sinyal timestamptz null,
  kabupaten text null,
  kode_kabupaten text null,
  latitude double precision not null,
  longitude double precision not null,
  usulan_kode_jenis int null,
  usulan_jenis_bencana text null,
  sumber_label text not null,
  penyebab_ringkas text null,
  properties_snapshot jsonb not null default '{}'::jsonb,
  asal_buat text not null check (asal_buat in ('otomatis', 'manual')),
  created_by uuid null,
  decided_by uuid null,
  decided_at timestamptz null,
  ditolak_alasan text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint overlay_calon_kejadian_kejadian_id_status_check
    check (
      (status = 'diterima' and kejadian_id is not null)
      or (status <> 'diterima' and kejadian_id is null)
    )
);

create unique index if not exists overlay_calon_kejadian_draf_source_ext_uidx
  on public.overlay_calon_kejadian (source, external_id)
  where status = 'draf';

create index if not exists overlay_calon_kejadian_status_created_idx
  on public.overlay_calon_kejadian (status, created_at desc);

create index if not exists overlay_calon_kejadian_kode_kabupaten_idx
  on public.overlay_calon_kejadian (kode_kabupaten);

create index if not exists overlay_calon_kejadian_layer_key_idx
  on public.overlay_calon_kejadian (layer_key);

alter table public.overlay_calon_kejadian enable row level security;

revoke all on table public.overlay_calon_kejadian from anon, public;
grant select, insert, update on table public.overlay_calon_kejadian to authenticated;

drop policy if exists overlay_calon_kejadian_select_ops on public.overlay_calon_kejadian;
create policy overlay_calon_kejadian_select_ops
  on public.overlay_calon_kejadian
  for select to authenticated
  using (public.is_ops());

drop policy if exists overlay_calon_kejadian_insert_ops on public.overlay_calon_kejadian;
create policy overlay_calon_kejadian_insert_ops
  on public.overlay_calon_kejadian
  for insert to authenticated
  with check (public.is_ops());

drop policy if exists overlay_calon_kejadian_update_ops on public.overlay_calon_kejadian;
create policy overlay_calon_kejadian_update_ops
  on public.overlay_calon_kejadian
  for update to authenticated
  using (public.is_ops())
  with check (public.is_ops());
