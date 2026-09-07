-- Gelombang 33 / AN-41: paket akses modul per peran katalog.
-- Jangan sunting migrasi lama. Jangan merevoke is_staff / is_ops / is_walidata.

create table if not exists public.admin_role_modules (
  role text not null,
  module text not null,
  allowed boolean not null default false,
  primary key (role, module)
);

alter table public.admin_role_modules
  drop constraint if exists admin_role_modules_role_check;
alter table public.admin_role_modules
  add constraint admin_role_modules_role_check check (role in (
    'super_admin',
    'admin',
    'admin_provinsi',
    'admin_kabkota',
    'admin_desa',
    'penilai_pkd',
    'admin_rr'
  ));

alter table public.admin_role_modules
  drop constraint if exists admin_role_modules_module_check;
alter table public.admin_role_modules
  add constraint admin_role_modules_module_check check (module in (
    'overview',
    'moderasi',
    'kejadian',
    'logistik',
    'master',
    'destana',
    'rehab',
    'disabilitas',
    'publikCms',
    'cms',
    'database',
    'dailyBrief'
  ));

alter table public.admin_role_modules enable row level security;

drop policy if exists admin_role_modules_select_super on public.admin_role_modules;
create policy admin_role_modules_select_super on public.admin_role_modules
  for select to authenticated
  using (public.is_super_admin());

revoke all on table public.admin_role_modules from public;
grant select on table public.admin_role_modules to authenticated;
grant all on table public.admin_role_modules to service_role;

insert into public.admin_role_modules (role, module, allowed)
select r.role, m.module,
  case
    when r.role = 'super_admin' then true
    when m.module = 'overview' then true
    when m.module in ('cms', 'database') then false
    when m.module in ('moderasi', 'kejadian', 'logistik')
      then r.role in ('admin_provinsi', 'admin', 'admin_kabkota')
    when m.module = 'master' then r.role in ('admin_provinsi', 'admin')
    when m.module = 'destana'
      then r.role in ('admin_provinsi', 'admin', 'admin_kabkota', 'admin_desa', 'penilai_pkd')
    when m.module = 'rehab'
      then r.role in ('admin_rr', 'admin_provinsi', 'admin', 'admin_kabkota')
    when m.module in ('disabilitas', 'publikCms')
      then r.role in ('admin_provinsi', 'admin', 'admin_kabkota')
    when m.module = 'dailyBrief' then r.role in ('admin_provinsi', 'admin')
    else false
  end
from (
  values
    ('super_admin'),
    ('admin'),
    ('admin_provinsi'),
    ('admin_kabkota'),
    ('admin_desa'),
    ('penilai_pkd'),
    ('admin_rr')
) as r(role)
cross join (
  values
    ('overview'),
    ('moderasi'),
    ('kejadian'),
    ('logistik'),
    ('master'),
    ('destana'),
    ('rehab'),
    ('disabilitas'),
    ('publikCms'),
    ('cms'),
    ('database'),
    ('dailyBrief')
) as m(module)
on conflict (role, module) do nothing;
