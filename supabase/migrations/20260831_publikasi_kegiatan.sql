-- BPBA kegiatan publications (slideshow on /publikasi).
-- Public read-only; not mixed into the Tanggapi analisis `publikasi` table.

create table if not exists public.publikasi_kegiatan (
  id text primary key,
  slug text,
  judul text not null,
  ringkasan text,
  tanggal_publikasi date,
  penulis text,
  kategori text,
  jenis_kegiatan text,
  jenis_bencana text,
  fase text,
  lokasi_teks text,
  url text,
  foto_sampul_url text,
  foto_sampul_thumbnail_url text,
  jumlah_foto integer default 0,
  kabupaten jsonb default '[]'::jsonb,
  photos jsonb default '[]'::jsonb,
  sumber text,
  updated_at timestamptz default now()
);

create index if not exists publikasi_kegiatan_tanggal_idx
  on public.publikasi_kegiatan (tanggal_publikasi desc);

alter table public.publikasi_kegiatan enable row level security;

drop policy if exists publikasi_kegiatan_select_public on public.publikasi_kegiatan;
create policy publikasi_kegiatan_select_public on public.publikasi_kegiatan
  for select to anon, authenticated
  using (true);
