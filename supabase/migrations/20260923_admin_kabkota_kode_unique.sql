-- One active admin_kabkota per 4-digit kabupaten code.
-- Do not revoke is_staff / is_ops / is_super_admin.
-- Apply in SQL editor when inviting kabupaten staff. Not applied from this ticket.

create unique index if not exists idx_admin_kabkota_kode
  on public.admin_profiles (kode_kabupaten)
  where role = 'admin_kabkota'
    and kode_kabupaten is not null;
