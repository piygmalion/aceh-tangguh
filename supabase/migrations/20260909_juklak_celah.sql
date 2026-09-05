-- Juklak 7/2023 celah: kerugian per baris, kode wilayah, override KIB, pengungsi 9/2023.
-- Apply after 20260908_juklak_pelaporan.sql.

-- ---------------------------------------------------------------------------
-- Kejadian — kode kecamatan + KIB episentrum/laut
-- ---------------------------------------------------------------------------
alter table public.kejadian_operasi
  add column if not exists kode_kecamatan text,
  add column if not exists kode_desa_kelurahan text,
  add column if not exists kode_kabupaten_kib text,
  add column if not exists kib_sumber text not null default 'lokasi',
  add column if not exists kib_catatan text;

alter table public.kejadian_operasi drop constraint if exists kejadian_operasi_kib_sumber_check;
alter table public.kejadian_operasi
  add constraint kejadian_operasi_kib_sumber_check
  check (kib_sumber in ('lokasi', 'episentrum', 'laut'));

update public.kejadian_operasi
set kode_kabupaten_kib = kode_kabupaten
where kode_kabupaten_kib is null and kode_kabupaten is not null;

alter table public.kejadian_lokasi
  add column if not exists kode_kecamatan text;

-- ---------------------------------------------------------------------------
-- Dampak — taksiran kerugian per baris Lampiran I
-- ---------------------------------------------------------------------------
alter table public.kejadian_dampak
  add column if not exists kerugian_rinci jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- Tempat pengungsian + kaji pos (Juklak 9/2023)
-- ---------------------------------------------------------------------------
alter table public.tempat_pengungsian
  add column if not exists jenis_pos text,
  add column if not exists tanggal_buka date,
  add column if not exists tanggal_tutup date,
  add column if not exists kota_terdekat text;

alter table public.tempat_pengungsian drop constraint if exists tempat_pengungsian_jenis_pos_check;
alter table public.tempat_pengungsian
  add constraint tempat_pengungsian_jenis_pos_check
  check (jenis_pos is null or jenis_pos in ('terkonsentrasi', 'tidak_terkonsentrasi'));

create table if not exists public.pengungsian_kaji (
  id uuid primary key default gen_random_uuid(),
  kejadian_id uuid not null references public.kejadian_operasi (id) on delete cascade,
  tempat_pengungsian_id uuid not null references public.tempat_pengungsian (id) on delete cascade,
  tanggal date not null default (now() at time zone 'Asia/Jakarta')::date,
  jumlah_kk int not null default 0,
  jiwa jsonb not null default '{}'::jsonb,
  rentan jsonb not null default '{}'::jsonb,
  air_sanitasi text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kejadian_id, tempat_pengungsian_id, tanggal)
);

create index if not exists pengungsian_kaji_kejadian_idx
  on public.pengungsian_kaji (kejadian_id, tanggal desc);

alter table public.pengungsian_kaji enable row level security;

drop policy if exists pengungsian_kaji_read_staff on public.pengungsian_kaji;
create policy pengungsian_kaji_read_staff on public.pengungsian_kaji
  for select to authenticated
  using (public.is_staff());

drop policy if exists pengungsian_kaji_write_staff on public.pengungsian_kaji;
create policy pengungsian_kaji_write_staff on public.pengungsian_kaji
  for all to authenticated
  using (
    public.is_staff()
    and exists (
      select 1 from public.kejadian_operasi o
      where o.id = kejadian_id
        and o.fase_data is distinct from 'statis'
    )
  )
  with check (
    public.is_staff()
    and exists (
      select 1 from public.kejadian_operasi o
      where o.id = kejadian_id
        and o.fase_data is distinct from 'statis'
    )
  );

grant select, insert, update, delete on public.pengungsian_kaji to authenticated;
