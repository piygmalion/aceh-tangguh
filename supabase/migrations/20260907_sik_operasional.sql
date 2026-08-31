-- SIK operasional Aceh Tangguh (pola SiAGA NTB, tanpa meniru praktik keamanan NTB).
-- Apply after 20260906_cms_domain_tables.sql + admin_auth.
-- Geometry stays in fixtures + PMTiles.

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------
alter table public.admin_profiles
  add column if not exists kode_kabupaten text,
  add column if not exists kabupaten text,
  add column if not exists kode_kecamatan text,
  add column if not exists kecamatan text,
  add column if not exists kode_desa_kelurahan text,
  add column if not exists desa text;

alter table public.admin_profiles drop constraint if exists admin_profiles_role_check;
alter table public.admin_profiles
  add constraint admin_profiles_role_check check (role in (
    'super_admin',
    'admin',
    'admin_provinsi',
    'admin_kabkota',
    'admin_desa',
    'penilai_pkd',
    'admin_rr'
  ));

create or replace function public.is_staff()
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
      and p.role in (
        'super_admin',
        'admin',
        'admin_provinsi',
        'admin_kabkota',
        'admin_desa',
        'penilai_pkd',
        'admin_rr'
      )
  );
$$;

create or replace function public.is_ops()
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
      and p.role in ('super_admin', 'admin', 'admin_provinsi', 'admin_kabkota')
  );
$$;

create or replace function public.staff_kode_kabupaten()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(trim(p.kode_kabupaten), '')
  from public.admin_profiles p
  where p.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.staff_kode_desa()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(trim(p.kode_desa_kelurahan), '')
  from public.admin_profiles p
  where p.user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.is_ops() from public;
revoke all on function public.staff_kode_kabupaten() from public;
revoke all on function public.staff_kode_desa() from public;
grant execute on function public.is_ops() to anon, authenticated;
grant execute on function public.staff_kode_kabupaten() to anon, authenticated;
grant execute on function public.staff_kode_desa() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Master: jenis bencana (Juklak BNPB 7/2023)
-- ---------------------------------------------------------------------------
create table if not exists public.jenis_bencana (
  kode int primary key,
  klasifikasi text not null check (klasifikasi in ('alam', 'non_alam', 'sosial')),
  nama text not null,
  label_peta text not null,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.nama_kejadian (
  slug text primary key,
  kode_jenis int not null references public.jenis_bencana (kode) on delete cascade,
  nama text not null,
  updated_at timestamptz not null default now()
);

insert into public.jenis_bencana (kode, klasifikasi, nama, label_peta, sort_order) values
  (101, 'alam', 'Banjir', 'Banjir', 10),
  (102, 'alam', 'Tanah longsor', 'Longsor', 20),
  (103, 'alam', 'Gelombang pasang dan abrasi', 'Abrasi', 30),
  (104, 'alam', 'Cuaca ekstrem', 'Angin Puting Beliung', 40),
  (105, 'alam', 'Kekeringan', 'Kekeringan', 50),
  (106, 'alam', 'Kebakaran hutan dan lahan', 'Kebakaran Hutan dan Lahan', 60),
  (107, 'alam', 'Gempa bumi', 'Gempa Bumi', 70),
  (108, 'alam', 'Tsunami', 'Lainnya', 80),
  (109, 'alam', 'Erupsi gunung api', 'Lainnya', 90),
  (201, 'non_alam', 'Epidemi dan wabah penyakit', 'Lainnya', 100),
  (202, 'non_alam', 'Kebakaran gedung dan permukiman', 'Kebakaran Pemukiman', 110),
  (203, 'non_alam', 'Gagal teknologi', 'Lainnya', 120),
  (301, 'sosial', 'Konflik sosial', 'Lainnya', 130)
on conflict (kode) do update set
  klasifikasi = excluded.klasifikasi,
  nama = excluded.nama,
  label_peta = excluded.label_peta,
  sort_order = excluded.sort_order;

insert into public.nama_kejadian (slug, kode_jenis, nama) values
  ('banjir-rob', 101, 'Banjir rob'),
  ('banjir-bandang', 101, 'Banjir bandang'),
  ('banjir-dan-tanah-longsor', 101, 'Banjir dan tanah longsor'),
  ('banjir-drainase', 101, 'Banjir drainase & selokan'),
  ('banjir-waduk', 101, 'Banjir waduk'),
  ('banjir-genangan', 101, 'Banjir genangan'),
  ('tanggul-jebol', 101, 'Tanggul jebol'),
  ('longsor', 102, 'Longsor'),
  ('gerakan-tanah', 102, 'Gerakan tanah'),
  ('gelombang-pasang', 103, 'Gelombang pasang'),
  ('abrasi-pantai', 103, 'Abrasi pantai'),
  ('puting-beliung', 104, 'Puting beliung'),
  ('angin-kencang', 104, 'Angin kencang'),
  ('angin-topan', 104, 'Angin topan'),
  ('hujan-es', 104, 'Hujan es'),
  ('siklon-tropis', 104, 'Siklon tropis'),
  ('suhu-udara-ekstrem', 104, 'Suhu udara ekstrem'),
  ('kekeringan-meteorologis', 105, 'Kekeringan meteorologis'),
  ('kekeringan-hidrologis', 105, 'Kekeringan hidrologis'),
  ('kekeringan-pertanian', 105, 'Kekeringan pertanian'),
  ('kebakaran-hutan', 106, 'Kebakaran hutan'),
  ('kebakaran-lahan', 106, 'Kebakaran lahan'),
  ('kebakaran-lahan-gambut', 106, 'Kebakaran lahan gambut'),
  ('gempa-tektonik', 107, 'Gempa tektonik'),
  ('gempa-vulkanik', 107, 'Gempa vulkanik'),
  ('gempa-runtuhan', 107, 'Gempa bumi runtuhan'),
  ('tsunami-seismogenik', 108, 'Tsunami seismogenik'),
  ('tsunami-nonseismik', 108, 'Tsunami nonseismik'),
  ('tsunami-lokal', 108, 'Tsunami lokal'),
  ('tsunami-regional', 108, 'Tsunami regional'),
  ('tsunami-jarak', 108, 'Tsunami jarak'),
  ('tsunami-meteorologi', 108, 'Tsunami meteorologi'),
  ('mikrotsunami', 108, 'Mikrotsunami'),
  ('awan-panas-guguran', 109, 'Awan panas guguran'),
  ('awan-panas', 109, 'Awan panas'),
  ('banjir-lahar', 109, 'Banjir lahar'),
  ('hujan-abu-vulkanik', 109, 'Hujan abu vulkanik'),
  ('gas-vulkanik', 109, 'Gas vulkanik beracun'),
  ('wabah-penyakit', 201, 'Wabah penyakit'),
  ('epidemi', 201, 'Epidemi'),
  ('kebakaran-gedung-permukiman', 202, 'Kebakaran gedung dan permukiman'),
  ('kegagalan-industri', 203, 'Kegagalan industri'),
  ('kecelakaan-industri', 203, 'Kecelakaan industri'),
  ('konflik-sosial', 301, 'Konflik sosial'),
  ('teror', 301, 'Teror'),
  ('kerusuhan-sosial', 301, 'Kerusuhan sosial')
on conflict (slug) do update set nama = excluded.nama, kode_jenis = excluded.kode_jenis;

-- ---------------------------------------------------------------------------
-- Instansi + pengungsian
-- ---------------------------------------------------------------------------
create table if not exists public.instansi (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  kategori text not null default 'opd' check (kategori in ('opd', 'swasta', 'ngo', 'lainnya')),
  kabupaten text,
  kode_kabupaten text,
  kontak text,
  alamat text,
  kop_surat_url text,
  penandatangan_nama text,
  penandatangan_pangkat text,
  penandatangan_nip text,
  tembusan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tempat_pengungsian (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  desa text,
  kecamatan text,
  kabupaten text,
  kode_kabupaten text,
  kode_desa_kelurahan text,
  kapasitas int,
  latitude double precision,
  longitude double precision,
  alamat text,
  pic_nama text,
  pic_kontak text,
  keterangan text,
  foto_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tempat_pengungsian_kab_idx on public.tempat_pengungsian (kode_kabupaten);

-- ---------------------------------------------------------------------------
-- Kejadian operasional
-- ---------------------------------------------------------------------------
create sequence if not exists public.kejadian_operasi_nomor_seq;

create or replace function public.next_kejadian_nomor()
returns text
language plpgsql
as $$
declare
  n bigint;
begin
  n := nextval('public.kejadian_operasi_nomor_seq');
  return 'ACEH-OPS-' || to_char(now() at time zone 'Asia/Jakarta', 'YYYY') || '-' || lpad(n::text, 4, '0');
end;
$$;

create table if not exists public.kejadian_operasi (
  id uuid primary key default gen_random_uuid(),
  nomor text unique not null default public.next_kejadian_nomor(),
  kode_jenis int references public.jenis_bencana (kode),
  jenis_bencana text not null,
  nama_kejadian text not null,
  slug_nama text,
  waktu_kejadian timestamptz not null,
  penyebab text,
  kronologi text,
  deskripsi text,
  cakupan text check (cakupan is null or cakupan in ('desa', 'kecamatan', 'kabupaten', 'provinsi', 'nasional')),
  kabupaten text,
  kode_kabupaten text,
  kecamatan text,
  desa_ringkas text,
  latitude double precision,
  longitude double precision,
  cuaca text,
  sumber_informasi text,
  status_darurat boolean not null default false,
  nomor_sk text,
  sebaran_dampak text,
  himbauan text,
  personil_terlibat text,
  is_bencana boolean not null default true,
  status text not null default 'draft' check (status in ('draft', 'aktif', 'selesai', 'diarsipkan')),
  laporan_id uuid references public.laporan_kejadian (id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kejadian_operasi_waktu_idx on public.kejadian_operasi (waktu_kejadian desc);
create index if not exists kejadian_operasi_kab_idx on public.kejadian_operasi (kode_kabupaten);
create index if not exists kejadian_operasi_status_idx on public.kejadian_operasi (status);

create table if not exists public.kejadian_lokasi (
  id uuid primary key default gen_random_uuid(),
  kejadian_id uuid not null references public.kejadian_operasi (id) on delete cascade,
  desa text,
  kecamatan text,
  kabupaten text,
  kode_desa_kelurahan text,
  alamat text,
  deskripsi text,
  latitude double precision,
  longitude double precision,
  foto_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kejadian_lokasi_kejadian_idx on public.kejadian_lokasi (kejadian_id);

create table if not exists public.kejadian_dampak (
  id uuid primary key default gen_random_uuid(),
  kejadian_id uuid not null references public.kejadian_operasi (id) on delete cascade,
  tanggal date not null default (now() at time zone 'Asia/Jakarta')::date,
  meninggal int not null default 0,
  luka_berat int not null default 0,
  luka_ringan int not null default 0,
  hilang int not null default 0,
  mengungsi int not null default 0,
  menderita int not null default 0,
  rumah_rb int not null default 0,
  rumah_rs int not null default 0,
  rumah_rr int not null default 0,
  rumah_terendam int not null default 0,
  kerugian_rumah_rp double precision,
  faskes int not null default 0,
  pendidikan int not null default 0,
  ibadah int not null default 0,
  kantor int not null default 0,
  pasar int not null default 0,
  kerugian_pelayanan_rp double precision,
  sapras int not null default 0,
  kerugian_sapras_rp double precision,
  lahan_ha double precision,
  toko int not null default 0,
  pabrik int not null default 0,
  kerugian_ekonomi_rp double precision,
  catatan text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists kejadian_dampak_kejadian_idx on public.kejadian_dampak (kejadian_id);
create index if not exists kejadian_dampak_tanggal_idx on public.kejadian_dampak (kejadian_id, tanggal desc);

alter table public.laporan_kejadian
  add column if not exists kejadian_id uuid references public.kejadian_operasi (id) on delete set null;

create index if not exists laporan_kejadian_kejadian_idx on public.laporan_kejadian (kejadian_id);

-- ---------------------------------------------------------------------------
-- Korban, pengungsi, kerusakan
-- ---------------------------------------------------------------------------
create table if not exists public.kejadian_korban (
  id uuid primary key default gen_random_uuid(),
  kejadian_id uuid not null references public.kejadian_operasi (id) on delete cascade,
  nama_enc text,
  nik_hash text,
  jenis_kelamin text,
  kondisi text,
  desa text,
  tempat_pengungsian_id uuid references public.tempat_pengungsian (id) on delete set null,
  ahli_waris text,
  kontak_keluarga_enc text,
  keterangan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pengungsi_terpilah (
  id uuid primary key default gen_random_uuid(),
  kejadian_id uuid not null references public.kejadian_operasi (id) on delete cascade,
  tempat_pengungsian_id uuid references public.tempat_pengungsian (id) on delete set null,
  nama_enc text,
  nik_hash text,
  jenis_kelamin text,
  tanggal_lahir date,
  alamat_asal text,
  kewarganegaraan text default 'WNI',
  kondisi text,
  ahli_waris text,
  kontak_enc text,
  kelompok_umur text,
  kelompok_rentan text,
  status_wali text,
  status_keluarga text,
  riwayat_penyakit boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kerusakan_aset (
  id uuid primary key default gen_random_uuid(),
  kejadian_id uuid not null references public.kejadian_operasi (id) on delete cascade,
  desa text,
  kabupaten text,
  kode_kabupaten text,
  kategori text,
  sektor text,
  jenis text,
  level_kerusakan text,
  jumlah double precision,
  ukuran double precision,
  satuan text,
  pemilik text,
  nomor_aset text,
  telepon_enc text,
  keterangan text,
  latitude double precision,
  longitude double precision,
  foto_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Logistik
-- ---------------------------------------------------------------------------
create table if not exists public.personil (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  instansi_id uuid references public.instansi (id) on delete set null,
  jabatan text,
  keahlian text,
  kabupaten text,
  kode_kabupaten text,
  kontak_enc text,
  status text not null default 'siap' check (status in ('siap', 'bertugas', 'cuti')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.peralatan (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  instansi_id uuid references public.instansi (id) on delete set null,
  kategori text,
  jumlah int not null default 0,
  satuan text,
  kondisi text,
  kabupaten text,
  kode_kabupaten text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kebutuhan_dasar (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  instansi_id uuid references public.instansi (id) on delete set null,
  kategori text,
  stok int not null default 0,
  satuan text,
  kabupaten text,
  kode_kabupaten text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.distribusi_personil (
  id uuid primary key default gen_random_uuid(),
  kejadian_id uuid not null references public.kejadian_operasi (id) on delete cascade,
  personil_id uuid not null references public.personil (id) on delete cascade,
  tempat_pengungsian_id uuid references public.tempat_pengungsian (id) on delete set null,
  mulai date,
  selesai date,
  created_at timestamptz not null default now()
);

create table if not exists public.distribusi_peralatan (
  id uuid primary key default gen_random_uuid(),
  kejadian_id uuid not null references public.kejadian_operasi (id) on delete cascade,
  peralatan_id uuid not null references public.peralatan (id) on delete cascade,
  jumlah int not null default 1,
  tempat_pengungsian_id uuid references public.tempat_pengungsian (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.distribusi_kebutuhan (
  id uuid primary key default gen_random_uuid(),
  kejadian_id uuid not null references public.kejadian_operasi (id) on delete cascade,
  kebutuhan_id uuid not null references public.kebutuhan_dasar (id) on delete cascade,
  jumlah int not null default 1,
  tempat_pengungsian_id uuid references public.tempat_pengungsian (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Destana / PKD
-- ---------------------------------------------------------------------------
alter table public.profil_desa
  add column if not exists destana_level text,
  add column if not exists destana_indeks numeric,
  add column if not exists destana_tahun int;

create table if not exists public.pkd_komponen (
  nomor int primary key check (nomor between 1 and 5),
  nama text not null,
  bobot numeric not null
);

create table if not exists public.pkd_indikator (
  nomor int primary key check (nomor between 1 and 32),
  komponen_nomor int not null references public.pkd_komponen (nomor) on delete cascade,
  nama text not null,
  bobot_kepentingan numeric not null,
  bobot_komponen_indikator numeric not null
);

create table if not exists public.pkd_pertanyaan (
  id uuid primary key default gen_random_uuid(),
  indikator_nomor int not null references public.pkd_indikator (nomor) on delete cascade,
  nomor int not null check (nomor between 1 and 4),
  teks text not null,
  unique (indikator_nomor, nomor)
);

create table if not exists public.pkd_tahun (
  id uuid primary key default gen_random_uuid(),
  tahun int not null unique,
  aktif boolean not null default true,
  metode text not null default 'by_system' check (metode in ('manual', 'by_system')),
  created_at timestamptz not null default now()
);

create table if not exists public.pkd_tugas (
  id uuid primary key default gen_random_uuid(),
  tahun_id uuid not null references public.pkd_tahun (id) on delete cascade,
  kode_desa_kelurahan text not null,
  nama_desa text,
  kabupaten text,
  kode_kabupaten text,
  status text not null default 'draft' check (status in (
    'draft', 'submitted', 'locked', 'in_review', 'returned', 'final'
  )),
  indeks numeric,
  level text,
  submitted_at timestamptz,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tahun_id, kode_desa_kelurahan)
);

create table if not exists public.pkd_jawaban (
  id uuid primary key default gen_random_uuid(),
  tugas_id uuid not null references public.pkd_tugas (id) on delete cascade,
  pertanyaan_id uuid not null references public.pkd_pertanyaan (id) on delete cascade,
  ya boolean not null default false,
  bukti_url text,
  evaluasi text check (evaluasi is null or evaluasi in ('terima', 'tolak', 'pending')),
  rekomendasi text,
  unique (tugas_id, pertanyaan_id)
);

insert into public.pkd_komponen (nomor, nama, bobot) values
  (1, 'Layanan dasar', 0.30),
  (2, 'Peraturan dan kebijakan penanggulangan bencana', 0.25),
  (3, 'Pencegahan dan mitigasi', 0.25),
  (4, 'Kesiapsiagaan', 0.10),
  (5, 'Pemulihan', 0.10)
on conflict (nomor) do update set nama = excluded.nama, bobot = excluded.bobot;

insert into public.pkd_indikator (nomor, komponen_nomor, nama, bobot_kepentingan, bobot_komponen_indikator) values
  (1, 1, 'Penyelenggaraan layanan pendidikan', 0.09, 0.02),
  (2, 1, 'Penyelenggaraan layanan kesehatan', 0.09, 0.02),
  (3, 1, 'Sarana dan prasarana transportasi', 0.06, 0.02),
  (4, 1, 'Penyediaan air bersih', 0.09, 0.02),
  (5, 1, 'Program dan kegiatan pangan & gizi', 0.07, 0.02),
  (6, 1, 'Pemberdayaan UMKM dan BUMDes', 0.06, 0.02),
  (7, 1, 'Sarana dan prasarana komunikasi/informasi', 0.07, 0.02),
  (8, 1, 'Pelayanan administrasi dan kependudukan', 0.06, 0.02),
  (9, 1, 'Perlindungan dan pengelolaan lingkungan hidup', 0.08, 0.02),
  (10, 1, 'Peraturan dan kegiatan keagamaan', 0.06, 0.02),
  (11, 1, 'Peraturan dan kegiatan kebudayaan', 0.05, 0.02),
  (12, 1, 'Perlindungan keamanan', 0.07, 0.02),
  (13, 1, 'Pemberdayaan perempuan dan perlindungan anak', 0.08, 0.02),
  (14, 1, 'Layanan khusus (difabel)', 0.08, 0.02),
  (15, 2, 'Pengkajian risiko bencana', 0.22, 0.05),
  (16, 2, 'Rencana penanggulangan bencana', 0.21, 0.05),
  (17, 2, 'Pelatihan penanggulangan bencana', 0.21, 0.05),
  (18, 2, 'Kelembagaan penanggulangan bencana', 0.20, 0.05),
  (19, 2, 'Bantuan/kerja sama kegiatan PB', 0.16, 0.05),
  (20, 3, 'Pencegahan bencana', 0.33, 0.08),
  (21, 3, 'Mitigasi bencana', 0.33, 0.08),
  (22, 3, 'Sosialisasi pengetahuan kebencanaan', 0.33, 0.08),
  (23, 4, 'Peringatan bahaya', 0.17, 0.02),
  (24, 4, 'Penyebarluasan peringatan bahaya', 0.16, 0.02),
  (25, 4, 'Rencana evakuasi', 0.17, 0.02),
  (26, 4, 'Jalur evakuasi', 0.17, 0.02),
  (27, 4, 'Tempat pengungsian', 0.16, 0.02),
  (28, 4, 'Uji kesiapsiagaan / simulasi', 0.16, 0.02),
  (29, 5, 'Penilaian pasca bencana secara mandiri', 0.25, 0.03),
  (30, 5, 'Pemulihan dini mandiri', 0.25, 0.03),
  (31, 5, 'Pengelolaan bantuan mandiri yang transparan', 0.25, 0.03),
  (32, 5, 'Membangun kembali dengan lebih baik', 0.25, 0.03)
on conflict (nomor) do update set nama = excluded.nama;

insert into public.pkd_pertanyaan (indikator_nomor, nomor, teks)
select i.nomor, n, 'Apakah desa memenuhi kriteria ' || i.nama || ' (butir ' || n || ')?'
from public.pkd_indikator i
cross join generate_series(1, 4) as n
on conflict (indikator_nomor, nomor) do nothing;

insert into public.pkd_tahun (tahun, aktif, metode)
values (2026, true, 'by_system')
on conflict (tahun) do nothing;

-- ---------------------------------------------------------------------------
-- Rehab-rekon
-- ---------------------------------------------------------------------------
create table if not exists public.rehab_kebutuhan (
  id uuid primary key default gen_random_uuid(),
  kejadian_id uuid not null references public.kejadian_operasi (id) on delete cascade,
  sektor text not null,
  subsektor text,
  kabupaten text,
  kode_kabupaten text,
  kecamatan text,
  desa text,
  rusak_berat int not null default 0,
  rusak_sedang int not null default 0,
  rusak_ringan int not null default 0,
  hilang int not null default 0,
  kebutuhan_rp double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rehab_monitoring (
  id uuid primary key default gen_random_uuid(),
  kebutuhan_id uuid not null references public.rehab_kebutuhan (id) on delete cascade,
  status text not null default 'rencana' check (status in ('rencana', 'proses', 'selesai')),
  progres_pct int not null default 0 check (progres_pct between 0 and 100),
  pelaksana text,
  catatan text,
  tanggal date not null default (now() at time zone 'Asia/Jakarta')::date,
  created_at timestamptz not null default now()
);

create table if not exists public.rehab_penerima (
  id uuid primary key default gen_random_uuid(),
  kebutuhan_id uuid not null references public.rehab_kebutuhan (id) on delete cascade,
  kerusakan_id uuid references public.kerusakan_aset (id) on delete set null,
  nama_enc text,
  desa text,
  status text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Publik: nomor penting, pelatihan, mitra, disabilitas agregat
-- ---------------------------------------------------------------------------
create table if not exists public.nomor_penting (
  id uuid primary key default gen_random_uuid(),
  kategori text not null,
  nama text not null,
  telepon text not null,
  kabupaten text,
  kode_kabupaten text,
  urutan int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pelatihan (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  deskripsi text,
  tanggal date,
  lokasi text,
  kabupaten text,
  status text not null default 'akan_datang' check (status in ('akan_datang', 'berlangsung', 'selesai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.permintaan_pelatihan (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  desa text,
  tanggal_rencana date,
  kontak_nama text,
  kontak_email text,
  kontak_telepon text,
  alamat text,
  status text not null default 'submitted' check (status in ('submitted', 'diterima', 'ditolak')),
  created_at timestamptz not null default now()
);

create table if not exists public.mitra_halaman (
  slug text primary key,
  judul text not null,
  isi_markdown text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.mitra_halaman (slug, judul, isi_markdown) values
  ('uld', 'Unit Layanan Disabilitas', 'Unit Layanan Disabilitas Penanggulangan Bencana (ULD PB) memastikan penyelenggaraan penanggulangan bencana yang inklusif bagi penyandang disabilitas di Aceh.'),
  ('fprb', 'Forum Pengurangan Risiko Bencana', 'Forum PRB Aceh adalah mitra multipihak untuk rekomendasi kebijakan, program pengurangan risiko, dan pemantauan implementasinya.')
on conflict (slug) do nothing;

create table if not exists public.disabilitas_agregat (
  id uuid primary key default gen_random_uuid(),
  kabupaten text not null,
  kode_kabupaten text,
  ragam text not null,
  jumlah int not null default 0,
  dengan_pengasuh int not null default 0,
  tanpa_pengasuh int not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  public_select text[] := array[
    'jenis_bencana',
    'nama_kejadian',
    'kejadian_operasi',
    'kejadian_lokasi',
    'kejadian_dampak',
    'tempat_pengungsian',
    'instansi',
    'pkd_komponen',
    'pkd_indikator',
    'pkd_pertanyaan',
    'pkd_tahun',
    'pkd_tugas',
    'nomor_penting',
    'pelatihan',
    'mitra_halaman',
    'disabilitas_agregat',
    'rehab_kebutuhan',
    'rehab_monitoring'
  ];
  staff_write text[] := array[
    'jenis_bencana',
    'nama_kejadian',
    'kejadian_operasi',
    'kejadian_lokasi',
    'kejadian_dampak',
    'tempat_pengungsian',
    'instansi',
    'kejadian_korban',
    'pengungsi_terpilah',
    'kerusakan_aset',
    'personil',
    'peralatan',
    'kebutuhan_dasar',
    'distribusi_personil',
    'distribusi_peralatan',
    'distribusi_kebutuhan',
    'pkd_komponen',
    'pkd_indikator',
    'pkd_pertanyaan',
    'pkd_tahun',
    'pkd_tugas',
    'pkd_jawaban',
    'rehab_kebutuhan',
    'rehab_monitoring',
    'rehab_penerima',
    'nomor_penting',
    'pelatihan',
    'permintaan_pelatihan',
    'mitra_halaman',
    'disabilitas_agregat'
  ];
begin
  foreach t in array public_select loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_select_public', t);
    if t = 'kejadian_operasi' then
      execute $p$
        create policy kejadian_operasi_select_public on public.kejadian_operasi
        for select to anon, authenticated
        using (status in ('aktif', 'selesai') or public.is_staff())
      $p$;
    elsif t = 'pkd_tugas' then
      execute $p$
        create policy pkd_tugas_select_public on public.pkd_tugas
        for select to anon, authenticated
        using (status = 'final' or public.is_staff())
      $p$;
    else
      execute format(
        'create policy %I on public.%I for select to anon, authenticated using (true)',
        t || '_select_public',
        t
      );
    end if;
  end loop;

  foreach t in array array['kejadian_korban', 'pengungsi_terpilah', 'kerusakan_aset', 'personil', 'peralatan', 'kebutuhan_dasar', 'distribusi_personil', 'distribusi_peralatan', 'distribusi_kebutuhan', 'pkd_jawaban', 'rehab_penerima', 'permintaan_pelatihan'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_select_staff', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_staff())',
      t || '_select_staff',
      t
    );
  end loop;

  foreach t in array staff_write loop
    execute format('drop policy if exists %I on public.%I', t || '_write_staff', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff())',
      t || '_write_staff',
      t
    );
  end loop;
end $$;

-- Public insert permintaan pelatihan (masyarakat)
drop policy if exists permintaan_pelatihan_insert_anon on public.permintaan_pelatihan;
create policy permintaan_pelatihan_insert_anon on public.permintaan_pelatihan
  for insert to anon, authenticated
  with check (true);

-- Re-enable tendPoints in map_layers if the row exists
update public.map_layers
set enabled = true,
    title_id = 'Titik pengungsian',
    title_en = 'Shelter points',
    description = 'Lokasi tempat pengungsian SIK (tempat_pengungsian).',
    updated_at = now()
where key = 'tendPoints';
