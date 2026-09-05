-- DATA-6 / AN-7 §4: registri program Destana 7/2025. Bukan skor PKD.
-- Jangan create or replace fungsi peran. Jangan alter pkd_*. Jangan seed desa.

-- ---------------------------------------------------------------------------
-- destana_si — satu baris per desa (SI Pasal 20)
-- ---------------------------------------------------------------------------
create table if not exists public.destana_si (
  kode_desa_kelurahan text primary key
    check (char_length(kode_desa_kelurahan) = 10),
  info_umum text not null default '',
  sebaran text not null,
  penilaian_rujukan uuid null references public.pkd_tugas (id) on delete set null,
  fasilitator text not null default '',
  pembelajaran text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint destana_si_sebaran_eq_kode check (sebaran = kode_desa_kelurahan)
);

alter table public.destana_si enable row level security;

revoke all on table public.destana_si from anon, public;
grant select, insert, update on table public.destana_si to authenticated;

drop policy if exists destana_si_select_staff on public.destana_si;
create policy destana_si_select_staff
  on public.destana_si
  for select to authenticated
  using (public.is_staff());

drop policy if exists destana_si_insert_desa on public.destana_si;
create policy destana_si_insert_desa
  on public.destana_si
  for insert to authenticated
  with check (
    public.staff_kode_desa() = kode_desa_kelurahan
    or exists (
      select 1 from public.admin_profiles p
      where p.user_id = auth.uid() and p.role = 'super_admin'
    )
  );

drop policy if exists destana_si_update_desa on public.destana_si;
create policy destana_si_update_desa
  on public.destana_si
  for update to authenticated
  using (
    public.staff_kode_desa() = kode_desa_kelurahan
    or exists (
      select 1 from public.admin_profiles p
      where p.user_id = auth.uid() and p.role = 'super_admin'
    )
  )
  with check (
    public.staff_kode_desa() = kode_desa_kelurahan
    or exists (
      select 1 from public.admin_profiles p
      where p.user_id = auth.uid() and p.role = 'super_admin'
    )
  );

-- ---------------------------------------------------------------------------
-- destana_aktivitas — 17 huruf Pasal 8 per desa per tahun
-- ---------------------------------------------------------------------------
create table if not exists public.destana_aktivitas (
  id uuid primary key default gen_random_uuid(),
  kode_desa_kelurahan text not null
    check (char_length(kode_desa_kelurahan) = 10),
  tahun int not null,
  kode_aktivitas text not null check (kode_aktivitas in (
    'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q'
  )),
  status text not null default 'belum' check (status in ('belum', 'berjalan', 'selesai')),
  catatan text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kode_desa_kelurahan, tahun, kode_aktivitas)
);

create index if not exists destana_aktivitas_desa_tahun_idx
  on public.destana_aktivitas (kode_desa_kelurahan, tahun);

alter table public.destana_aktivitas enable row level security;

revoke all on table public.destana_aktivitas from anon, public;
grant select, insert, update on table public.destana_aktivitas to authenticated;

drop policy if exists destana_aktivitas_select_staff on public.destana_aktivitas;
create policy destana_aktivitas_select_staff
  on public.destana_aktivitas
  for select to authenticated
  using (public.is_staff());

drop policy if exists destana_aktivitas_insert_desa on public.destana_aktivitas;
create policy destana_aktivitas_insert_desa
  on public.destana_aktivitas
  for insert to authenticated
  with check (
    public.staff_kode_desa() = kode_desa_kelurahan
    or exists (
      select 1 from public.admin_profiles p
      where p.user_id = auth.uid() and p.role = 'super_admin'
    )
  );

drop policy if exists destana_aktivitas_update_desa on public.destana_aktivitas;
create policy destana_aktivitas_update_desa
  on public.destana_aktivitas
  for update to authenticated
  using (
    public.staff_kode_desa() = kode_desa_kelurahan
    or exists (
      select 1 from public.admin_profiles p
      where p.user_id = auth.uid() and p.role = 'super_admin'
    )
  )
  with check (
    public.staff_kode_desa() = kode_desa_kelurahan
    or exists (
      select 1 from public.admin_profiles p
      where p.user_id = auth.uid() and p.role = 'super_admin'
    )
  );
