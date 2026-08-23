-- Laporan masyarakat: kejadian (peta publik) & penanganan (mandiri, tidak di peta)
-- Moderator: BPBA Pusdalops | Notifikasi: WhatsApp (antrean terpisah)

create table if not exists public.laporan_pelapor (
  id uuid primary key default gen_random_uuid(),
  nama_enc text not null,
  nik_hash text not null,
  nik_enc text not null,
  telepon_enc text,
  email_enc text,
  kontak_darurat_enc text,
  telepon_hash text,
  created_at timestamptz not null default now()
);

create index if not exists laporan_pelapor_nik_hash_idx on public.laporan_pelapor (nik_hash);

create table if not exists public.laporan_kejadian (
  id uuid primary key default gen_random_uuid(),
  nomor_laporan text unique not null,
  pelapor_id uuid not null references public.laporan_pelapor(id),
  jenis_bencana text not null check (jenis_bencana in ('banjir','longsor','gempa','tsunami','gunung_meletus')),
  status text not null default 'submitted' check (status in (
    'draft','submitted','in_review','approved','rejected','needs_info','archived'
  )),
  latitude double precision not null check (latitude between 1.5 and 6.5),
  longitude double precision not null check (longitude between 95.0 and 98.5),
  kabupaten_kota text not null,
  kecamatan text,
  desa text,
  provinsi text not null default 'Aceh',
  skor_urgensi int not null default 0,
  tampil_di_peta boolean not null default false,
  moderator_id text,
  moderator_unit text not null default 'bpba_pusdalops',
  catatan_moderator text,
  disetujui_at timestamptz,
  jawaban_json jsonb not null default '{}'::jsonb,
  addendum varchar(500),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists laporan_kejadian_status_idx on public.laporan_kejadian (status);
create index if not exists laporan_kejadian_peta_idx on public.laporan_kejadian (tampil_di_peta, status);

create table if not exists public.laporan_penanganan (
  id uuid primary key default gen_random_uuid(),
  nomor_laporan text unique not null,
  pelapor_id uuid not null references public.laporan_pelapor(id),
  jenis_bencana text not null check (jenis_bencana in ('banjir','longsor','gempa','tsunami','gunung_meletus')),
  tipe_laporan text not null check (tipe_laporan in (
    'bantuan_diterima','bantuan_belum_diterima','aktivitas_penanganan','umpan_balik'
  )),
  fase_penanganan text check (fase_penanganan in ('tanggap_darurat','penanganan','rehabilitasi')),
  status text not null default 'submitted' check (status in (
    'draft','submitted','in_review','approved','rejected','needs_info','archived'
  )),
  status_kebutuhan_sisa text check (status_kebutuhan_sisa in ('terpenuhi','parsial','belum_terpenuhi')),
  tanggal_penanganan date not null,
  jam_penanganan time,
  latitude double precision not null,
  longitude double precision not null,
  kabupaten_kota text not null,
  kecamatan text,
  desa text,
  provinsi text not null default 'Aceh',
  deskripsi_penanganan text not null,
  jumlah_penerima_estimasi int,
  rating_kepuasan smallint check (rating_kepuasan between 1 and 5),
  tampil_di_peta boolean not null default false,
  jawaban_json jsonb not null default '{}'::jsonb,
  addendum varchar(500),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifikasi_wa (
  id uuid primary key default gen_random_uuid(),
  laporan_tipe text not null check (laporan_tipe in ('kejadian','penanganan')),
  laporan_id uuid not null,
  nomor_tujuan_enc text not null,
  template_kode text not null,
  payload_json jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.laporan_pelapor enable row level security;
alter table public.laporan_kejadian enable row level security;
alter table public.laporan_penanganan enable row level security;
alter table public.notifikasi_wa enable row level security;

create policy laporan_kejadian_insert on public.laporan_kejadian
  for insert to anon, authenticated with check (true);

create policy laporan_penanganan_insert on public.laporan_penanganan
  for insert to anon, authenticated with check (true);

create policy laporan_kejadian_select_published on public.laporan_kejadian
  for select to anon, authenticated
  using (status = 'approved' and tampil_di_peta = true);

create policy laporan_kejadian_select_all_mvp on public.laporan_kejadian
  for select to anon, authenticated using (true);

create policy laporan_penanganan_select_mvp on public.laporan_penanganan
  for select to anon, authenticated using (true);
