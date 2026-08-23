-- profil_desa for villageDistribution hierarchy
create table if not exists public.profil_desa (
  id text primary key,
  kode_desa_kelurahan text unique,
  nama text not null,
  kabupaten text,
  kecamatan text,
  kode_kabupaten text,
  kode_kecamatan text,
  kondisi_kode text,
  kk integer,
  populasi integer,
  kk_terdampak integer,
  populasi_terdampak integer,
  korban_meninggal integer,
  korban_hilang integer,
  rumah_rr integer,
  rumah_rs integer,
  rumah_rb integer,
  total_rumah_rusak integer,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists profil_desa_kab_idx on public.profil_desa (kabupaten);
create index if not exists profil_desa_kec_idx on public.profil_desa (kabupaten, kecamatan);
create index if not exists profil_desa_kode_kec_idx on public.profil_desa (kode_kecamatan);
alter table public.profil_desa enable row level security;
drop policy if exists "profil_desa_select_anon" on public.profil_desa;
create policy "profil_desa_select_anon" on public.profil_desa for select to anon, authenticated using (true);
