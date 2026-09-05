-- Juklak BNPB 7/2023: KIB, fase data dinamis/statis, formulir Lampiran I, 13 jenis laporan warga.
-- Apply after 20260907_sik_operasional.sql.

-- ---------------------------------------------------------------------------
-- Walidata (provinsi / super_admin) — kunci/buka data statis
-- ---------------------------------------------------------------------------
create or replace function public.is_walidata()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles p
    where p.user_id = auth.uid()
      and p.role in ('super_admin', 'admin', 'admin_provinsi')
  );
$$;

revoke all on function public.is_walidata() from public;
grant execute on function public.is_walidata() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Kejadian operasional — identitas Juklak
-- ---------------------------------------------------------------------------
alter table public.kejadian_operasi
  add column if not exists kib text,
  add column if not exists tarikh date,
  add column if not exists kode_provinsi text not null default '11',
  add column if not exists kib_index smallint,
  add column if not exists kondisi_mutakhir text,
  add column if not exists upaya_penanganan text,
  add column if not exists permintaan_bantuan_nasional boolean not null default false,
  add column if not exists fase_data text not null default 'dinamis',
  add column if not exists rekap_statis jsonb;

update public.kejadian_operasi
set tarikh = (waktu_kejadian at time zone 'Asia/Jakarta')::date
where tarikh is null;

alter table public.kejadian_operasi drop constraint if exists kejadian_operasi_fase_data_check;
alter table public.kejadian_operasi
  add constraint kejadian_operasi_fase_data_check
  check (fase_data in ('dinamis', 'diajukan', 'statis'));

alter table public.kejadian_operasi drop constraint if exists kejadian_operasi_kib_format;
alter table public.kejadian_operasi
  add constraint kejadian_operasi_kib_format
  check (kib is null or kib ~ '^[0-9]{16}$');

create unique index if not exists kejadian_operasi_kib_uidx
  on public.kejadian_operasi (kib)
  where kib is not null;

create index if not exists kejadian_operasi_tarikh_idx on public.kejadian_operasi (tarikh desc);
create index if not exists kejadian_operasi_fase_idx on public.kejadian_operasi (fase_data);

-- ---------------------------------------------------------------------------
-- Dampak — klaster Lampiran I
-- ---------------------------------------------------------------------------
alter table public.kejadian_dampak
  add column if not exists korban_terpilah jsonb not null default '{}'::jsonb,
  add column if not exists kondisi_mutakhir text,
  add column if not exists upaya_penanganan text,
  add column if not exists dokumentasi_url text,
  add column if not exists kebutuhan_dana_juta double precision,
  add column if not exists kebutuhan_sdm text,
  add column if not exists kebutuhan_sapras text,
  add column if not exists kebutuhan_logistik text,
  add column if not exists kebutuhan_peralatan text,
  add column if not exists aset_kedaruratan text,
  add column if not exists pendidikan_rb int not null default 0,
  add column if not exists pendidikan_rs int not null default 0,
  add column if not exists pendidikan_rr int not null default 0,
  add column if not exists pendidikan_terendam int not null default 0,
  add column if not exists ibadah_rb int not null default 0,
  add column if not exists ibadah_rs int not null default 0,
  add column if not exists ibadah_rr int not null default 0,
  add column if not exists ibadah_terendam int not null default 0,
  add column if not exists faskes_rb int not null default 0,
  add column if not exists faskes_rs int not null default 0,
  add column if not exists faskes_rr int not null default 0,
  add column if not exists faskes_terendam int not null default 0,
  add column if not exists kantor_rb int not null default 0,
  add column if not exists kantor_rs int not null default 0,
  add column if not exists kantor_rr int not null default 0,
  add column if not exists kantor_terendam int not null default 0,
  add column if not exists pasar_rb int not null default 0,
  add column if not exists pasar_rs int not null default 0,
  add column if not exists pasar_rr int not null default 0,
  add column if not exists pasar_terendam int not null default 0,
  add column if not exists sawah_ha double precision,
  add column if not exists kebun_ha double precision,
  add column if not exists hutan_ha double precision,
  add column if not exists kolam_ha double precision,
  add column if not exists toko_rb int not null default 0,
  add column if not exists toko_rs int not null default 0,
  add column if not exists toko_rr int not null default 0,
  add column if not exists toko_terendam int not null default 0,
  add column if not exists pabrik_rb int not null default 0,
  add column if not exists pabrik_rs int not null default 0,
  add column if not exists pabrik_rr int not null default 0,
  add column if not exists pabrik_terendam int not null default 0,
  add column if not exists air_jaringan text,
  add column if not exists listrik_jaringan text,
  add column if not exists telekom_jaringan text,
  add column if not exists irigasi_jaringan text,
  add column if not exists jalan_km double precision,
  add column if not exists jembatan_rb int not null default 0,
  add column if not exists jembatan_rs int not null default 0,
  add column if not exists jembatan_rr int not null default 0,
  add column if not exists jembatan_terendam int not null default 0,
  add column if not exists transportasi_jaringan text,
  add column if not exists spbu_jaringan text;

-- ---------------------------------------------------------------------------
-- RLS: data statis terkunci kecuali walidata (unlock / kunci)
-- ---------------------------------------------------------------------------
drop policy if exists kejadian_operasi_write_staff on public.kejadian_operasi;
create policy kejadian_operasi_write_staff on public.kejadian_operasi
  for all to authenticated
  using (
    public.is_staff()
    and (fase_data is distinct from 'statis' or public.is_walidata())
  )
  with check (
    public.is_staff()
    and (fase_data is distinct from 'statis' or public.is_walidata())
  );

drop policy if exists kejadian_dampak_write_staff on public.kejadian_dampak;
create policy kejadian_dampak_write_staff on public.kejadian_dampak
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

drop policy if exists kejadian_lokasi_write_staff on public.kejadian_lokasi;
create policy kejadian_lokasi_write_staff on public.kejadian_lokasi
  for all to authenticated
  using (
    public.is_staff()
    and exists (
      select 1 from public.kejadian_operasi o
      where o.id = kejadian_id
        and (o.fase_data is distinct from 'statis' or public.is_walidata())
    )
  )
  with check (
    public.is_staff()
    and exists (
      select 1 from public.kejadian_operasi o
      where o.id = kejadian_id
        and (o.fase_data is distinct from 'statis' or public.is_walidata())
    )
  );

-- ---------------------------------------------------------------------------
-- Laporan masyarakat: 13 jenis (kode lama tetap)
-- ---------------------------------------------------------------------------
alter table public.laporan_kejadian drop constraint if exists laporan_kejadian_jenis_bencana_check;
alter table public.laporan_kejadian
  add constraint laporan_kejadian_jenis_bencana_check check (jenis_bencana in (
    'banjir',
    'longsor',
    'gempa',
    'tsunami',
    'gunung_meletus',
    'abrasi',
    'cuaca_ekstrem',
    'kekeringan',
    'karhutla',
    'epidemi',
    'kebakaran_permukiman',
    'gagal_teknologi',
    'konflik_sosial'
  ));

alter table public.laporan_penanganan drop constraint if exists laporan_penanganan_jenis_bencana_check;
alter table public.laporan_penanganan
  add constraint laporan_penanganan_jenis_bencana_check check (jenis_bencana in (
    'banjir',
    'longsor',
    'gempa',
    'tsunami',
    'gunung_meletus',
    'abrasi',
    'cuaca_ekstrem',
    'kekeringan',
    'karhutla',
    'epidemi',
    'kebakaran_permukiman',
    'gagal_teknologi',
    'konflik_sosial'
  ));
