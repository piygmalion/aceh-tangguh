-- DATA-5 / AN-8 §3–§4: katalog, jejak validasi, jadwal kirim SDI daerah.
-- Pakai is_staff() / is_ops() / is_walidata() yang sudah ada (20260907 / 20260908).
-- Jangan create or replace fungsi peran. Jangan menambah kolom kejadian_operasi
-- atau overlay_calon_kejadian. Jangan seed sangat_rahasia.

-- ---------------------------------------------------------------------------
-- sdb_katalog
-- ---------------------------------------------------------------------------
create table if not exists public.sdb_katalog (
  kunci text primary key,
  judul text not null,
  konsep text not null,
  definisi text not null,
  satuan text null,
  klaster text not null check (klaster in ('pra', 'darurat', 'pasca', 'pembiayaan')),
  kelas_akses text not null check (kelas_akses in ('terbuka', 'terbatas', 'rahasia', 'sangat_rahasia')),
  produsen text not null check (produsen in ('admin_kabkota', 'admin_provinsi', 'sistem')),
  periode_kirim text not null check (periode_kirim in (
    'harian', 'bulanan', 'triwulan', 'semester', 'tahunan', 'insidental'
  )),
  kode_referensi text not null check (kode_referensi in (
    'jenis_bencana', 'wilayah_kemendagri', 'kib', 'tidak_ada'
  )),
  tabel_sumber text not null,
  updated_at timestamptz not null default now()
);

alter table public.sdb_katalog enable row level security;

revoke all on table public.sdb_katalog from anon, public;
grant select, insert, update, delete on table public.sdb_katalog to authenticated;

drop policy if exists sdb_katalog_select_staff on public.sdb_katalog;
create policy sdb_katalog_select_staff
  on public.sdb_katalog
  for select to authenticated
  using (public.is_staff());

drop policy if exists sdb_katalog_insert_walidata on public.sdb_katalog;
create policy sdb_katalog_insert_walidata
  on public.sdb_katalog
  for insert to authenticated
  with check (public.is_walidata());

drop policy if exists sdb_katalog_update_walidata on public.sdb_katalog;
create policy sdb_katalog_update_walidata
  on public.sdb_katalog
  for update to authenticated
  using (public.is_walidata())
  with check (public.is_walidata());

drop policy if exists sdb_katalog_delete_walidata on public.sdb_katalog;
create policy sdb_katalog_delete_walidata
  on public.sdb_katalog
  for delete to authenticated
  using (public.is_walidata());

-- 12 kunci AN-8 §3.1. judul/konsep/definisi = teks operasional dari nama tabel SIK.
-- Bukan angka korban, bukan zona KRB, bukan klaim definisi resmi BNPB.
insert into public.sdb_katalog (
  kunci, judul, konsep, definisi, satuan,
  klaster, kelas_akses, produsen, periode_kirim, kode_referensi, tabel_sumber
) values
  (
    'kejadian_operasi',
    'Kejadian operasi',
    'Baris induk SIK operasional',
    'Satu baris tabel kejadian_operasi: identitas, waktu, wilayah, status, fase data.',
    null,
    'darurat', 'terbuka', 'admin_kabkota', 'insidental', 'kib', 'kejadian_operasi'
  ),
  (
    'kejadian_dampak',
    'Dampak kejadian',
    'Rekap dampak harian per kejadian',
    'Satu baris tabel kejadian_dampak terikat kejadian_operasi, satu tanggal Asia/Jakarta.',
    null,
    'darurat', 'terbatas', 'admin_kabkota', 'harian', 'kib', 'kejadian_dampak'
  ),
  (
    'pengungsian_kaji',
    'Kaji pengungsian',
    'Catatan harian tempat pengungsian',
    'Satu baris tabel pengungsian_kaji: kejadian, tempat pengungsian, tanggal.',
    null,
    'darurat', 'terbatas', 'admin_kabkota', 'harian', 'kib', 'pengungsian_kaji'
  ),
  (
    'kejadian_korban',
    'Korban per orang',
    'Identitas orang di kejadian_korban',
    'Satu baris tabel kejadian_korban (kolom enkripsi/hash sudah ada). Bukan rekap angka.',
    null,
    'darurat', 'rahasia', 'admin_kabkota', 'insidental', 'tidak_ada', 'kejadian_korban'
  ),
  (
    'pengungsi_terpilah',
    'Pengungsi terpilah',
    'Identitas orang di pengungsi_terpilah',
    'Satu baris tabel pengungsi_terpilah (kolom enkripsi/hash sudah ada). Bukan rekap angka.',
    null,
    'darurat', 'rahasia', 'admin_kabkota', 'insidental', 'tidak_ada', 'pengungsi_terpilah'
  ),
  (
    'overlay_calon_kejadian',
    'Calon kejadian overlay',
    'Sinyal overlay sebelum jadi kejadian',
    'Satu baris tabel overlay_calon_kejadian (draf, ditolak, atau diterima).',
    null,
    'darurat', 'terbatas', 'sistem', 'insidental', 'tidak_ada', 'overlay_calon_kejadian'
  ),
  (
    'irbi',
    'Dokumen IRBI',
    'Snapshot dokumen IRBI',
    'Satu baris tabel irbi_documents (key dan payload).',
    null,
    'pra', 'terbuka', 'admin_provinsi', 'tahunan', 'wilayah_kemendagri', 'irbi_documents'
  ),
  (
    'krb',
    'Dokumen KRB',
    'Metadata dokumen KRB',
    'Satu baris tabel krb_dokumen (judul, jenis, wilayah). Bukan geometri kawasan.',
    null,
    'pra', 'terbuka', 'admin_provinsi', 'tahunan', 'wilayah_kemendagri', 'krb_dokumen'
  ),
  (
    'profil_desa',
    'Profil desa',
    'Identitas desa/kelurahan SIK',
    'Satu baris tabel profil_desa (kode, nama, kabupaten).',
    null,
    'pra', 'terbuka', 'admin_provinsi', 'tahunan', 'wilayah_kemendagri', 'profil_desa'
  ),
  (
    'pkd',
    'Tugas PKD',
    'Tugas penilaian ketahanan desa',
    'Satu baris tabel pkd_tugas (tahun, kode desa, status).',
    null,
    'pra', 'terbatas', 'admin_kabkota', 'tahunan', 'wilayah_kemendagri', 'pkd_tugas'
  ),
  (
    'rehab_kebutuhan',
    'Kebutuhan rehab-rekon',
    'Kebutuhan sektor pasca kejadian',
    'Satu baris tabel rehab_kebutuhan terikat kejadian_operasi.',
    null,
    'pasca', 'terbatas', 'admin_kabkota', 'insidental', 'kib', 'rehab_kebutuhan'
  ),
  (
    'anggaran',
    'Analisis anggaran',
    'Snapshot anggaran tahunan',
    'Satu baris tabel anggaran_analisis (tahun dan payload).',
    null,
    'pembiayaan', 'terbuka', 'admin_provinsi', 'tahunan', 'tidak_ada', 'anggaran_analisis'
  );

-- ---------------------------------------------------------------------------
-- sdb_validasi (append-only)
-- ---------------------------------------------------------------------------
create table if not exists public.sdb_validasi (
  id uuid primary key default gen_random_uuid(),
  kejadian_id uuid not null references public.kejadian_operasi (id) on delete cascade,
  status text not null check (status in ('diajukan', 'dikembalikan', 'diterima')),
  catatan text null,
  created_by uuid null,
  created_at timestamptz not null default now()
);

create index if not exists sdb_validasi_kejadian_created_idx
  on public.sdb_validasi (kejadian_id, created_at desc);

alter table public.sdb_validasi enable row level security;

revoke all on table public.sdb_validasi from anon, public, authenticated;
grant select, insert on table public.sdb_validasi to authenticated;

drop policy if exists sdb_validasi_select_staff on public.sdb_validasi;
create policy sdb_validasi_select_staff
  on public.sdb_validasi
  for select to authenticated
  using (public.is_staff());

drop policy if exists sdb_validasi_insert_ops on public.sdb_validasi;
create policy sdb_validasi_insert_ops
  on public.sdb_validasi
  for insert to authenticated
  with check (public.is_ops());

-- ---------------------------------------------------------------------------
-- sdb_jadwal_kirim — tanpa seed baris
-- ---------------------------------------------------------------------------
create table if not exists public.sdb_jadwal_kirim (
  id uuid primary key default gen_random_uuid(),
  kunci text not null references public.sdb_katalog (kunci),
  periode_label text not null,
  jatuh_tempo date not null,
  status text not null check (status in ('terbuka', 'terkirim', 'terlambat')),
  updated_at timestamptz not null default now(),
  unique (kunci, periode_label)
);

alter table public.sdb_jadwal_kirim enable row level security;

revoke all on table public.sdb_jadwal_kirim from anon, public;
grant select, insert, update, delete on table public.sdb_jadwal_kirim to authenticated;

drop policy if exists sdb_jadwal_kirim_select_staff on public.sdb_jadwal_kirim;
create policy sdb_jadwal_kirim_select_staff
  on public.sdb_jadwal_kirim
  for select to authenticated
  using (public.is_staff());

drop policy if exists sdb_jadwal_kirim_insert_walidata on public.sdb_jadwal_kirim;
create policy sdb_jadwal_kirim_insert_walidata
  on public.sdb_jadwal_kirim
  for insert to authenticated
  with check (public.is_walidata());

drop policy if exists sdb_jadwal_kirim_update_walidata on public.sdb_jadwal_kirim;
create policy sdb_jadwal_kirim_update_walidata
  on public.sdb_jadwal_kirim
  for update to authenticated
  using (public.is_walidata())
  with check (public.is_walidata());

drop policy if exists sdb_jadwal_kirim_delete_walidata on public.sdb_jadwal_kirim;
create policy sdb_jadwal_kirim_delete_walidata
  on public.sdb_jadwal_kirim
  for delete to authenticated
  using (public.is_walidata());
