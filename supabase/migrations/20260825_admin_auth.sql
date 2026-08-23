-- Admin auth + RBAC for Aceh Tangguh
-- Apply in the Supabase SQL editor (project whojoxrbcdyotrpolgav) if the
-- CLI is not wired. Do NOT seed auth users here — see docs/admin-setup.md.

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('super_admin', 'admin')),
  display_name text,
  created_at timestamptz not null default now()
);

create index if not exists admin_profiles_role_idx on public.admin_profiles (role);

alter table public.admin_profiles enable row level security;

drop policy if exists admin_profiles_select_own on public.admin_profiles;
create policy admin_profiles_select_own on public.admin_profiles
  for select to authenticated
  using (user_id = auth.uid());

-- Inserts are intentional: SQL editor / service_role only (no authenticated insert).

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
      and p.role in ('admin', 'super_admin')
  );
$$;

create or replace function public.is_super_admin()
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
      and p.role = 'super_admin'
  );
$$;

revoke all on function public.is_staff() from public;
revoke all on function public.is_super_admin() from public;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.is_super_admin() to anon, authenticated;

-- reports: public reads published+consent; insert with consent; staff can read/update all
drop policy if exists reports_select_all_mvp on public.reports;
drop policy if exists reports_select_own_queued on public.reports;
drop policy if exists reports_select_published on public.reports;
drop policy if exists reports_select_staff on public.reports;
drop policy if exists reports_update_staff on public.reports;
drop policy if exists reports_insert_anon on public.reports;

create policy reports_select_published on public.reports
  for select to anon, authenticated
  using (status = 'published' and consent_map_display = true);

create policy reports_select_staff on public.reports
  for select to authenticated
  using (public.is_staff());

create policy reports_insert_anon on public.reports
  for insert to anon, authenticated
  with check (consent_map_display = true);

create policy reports_update_staff on public.reports
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Super-admin write policies on CMS / domain tables (create if the table exists).
-- Public SELECT policies are added only when the table has no SELECT policy yet,
-- so enabling RLS does not lock out existing public loaders.
do $$
declare
  t text;
  tables text[] := array[
    'publikasi',
    'publikasi_meta',
    'kejadian_bencana',
    'marker_features',
    'anggaran_kegiatan',
    'profil_desa'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = t
        and cmd = 'SELECT'
    ) then
      execute format(
        'create policy %I on public.%I for select to anon, authenticated using (true)',
        t || '_select_public',
        t
      );
    end if;

    execute format('drop policy if exists %I on public.%I', t || '_insert_super_admin', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_super_admin', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_super_admin', t);

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_super_admin())',
      t || '_insert_super_admin',
      t
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin())',
      t || '_update_super_admin',
      t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_super_admin())',
      t || '_delete_super_admin',
      t
    );
  end loop;
end $$;
