# Admin dashboard setup

The staff console lives at `/id/admin` (and `/en/admin`). The admin UI only needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. **Do not put `SUPABASE_SERVICE_ROLE_KEY` in the browser bundle or GitHub Pages.** Citizen-report *writes* on the Node host do need the service role — see `docs/laporan-production.md`.

This PR does **not** seed any Auth user or password.

## 1. Apply the migration

In the Supabase SQL editor (project `whojoxrbcdyotrpolgav`), paste and run:

1. `supabase/migrations/20260825_admin_auth.sql` — `admin_profiles`, staff helpers, RLS
2. `supabase/migrations/20260906_cms_domain_tables.sql` — CREATE TABLE for CMS domains (`kejadian_bencana`, `marker_features`, `publikasi`, `publikasi_kegiatan`, `anggaran_*`, `irbi_documents`, `data_documents`, `r3p_summary`) if they do not exist yet
3. `supabase/migrations/20260907_sik_operasional.sql` — SIK roles, kejadian operasional, kaji cepat, logistik, PKD, rehab-rekon, nomor penting
4. `supabase/migrations/20260908_juklak_pelaporan.sql` — KIB, fase dinamis/statis, formulir Lampiran I, 13 jenis laporan warga

That creates `public.admin_profiles`, staff/super-admin helpers, tightens `reports` RLS (public reads published + consent only; staff can read/update all), and adds super-admin write policies on CMS/domain tables.

## 2. Create the first `super_admin`

1. In **Authentication → Users**, create a user (email + password). Copy the user UUID.
2. In the SQL editor, insert a profile (service role / postgres only — there is no authenticated insert policy):

```sql
insert into public.admin_profiles (user_id, role, display_name)
values ('00000000-0000-0000-0000-000000000000', 'super_admin', 'Nama staf');
```

Replace the UUID and display name. To add a report-moderator later, use `role = 'admin'`.

## 3. Sign in

Open `/id/admin/login` (or the **Masuk** control in the navbar) with that email/password.

| Role | Access |
|------|--------|
| `super_admin` | Semua modul SIK + CMS + Database + kelola user |
| `admin` / `admin_provinsi` | Overview, moderasi, kejadian operasional, logistik, Destana, rehab, layanan publik |
| `admin_kabkota` | Sama seperti operator, scoped `kode_kabupaten` |
| `admin_desa` | Profil desa + PKD mandiri (`kode_desa_kelurahan`) |
| `penilai_pkd` | Evaluasi/verifikasi PKD |
| `admin_rr` | Rehab-rekon per kejadian |
| Signed in, no profile | `/admin/denied` |
| Signed out | Redirected to `/admin/login` |

## Roles

- `admin` — alias operator provinsi (kompatibel dengan baris lama).
- `super_admin` — Pusdalops BPBA: seluruh SIK, CMS, dan editor tabel.
- Jangan set password default `password`. Buat user di Supabase Auth, lalu sisipkan `admin_profiles`.

Schema SIK: `supabase/migrations/20260907_sik_operasional.sql` (kejadian operasional, kaji cepat, logistik, PKD, rehab, nomor penting). Apply di SQL editor setelah migrasi admin/CMS.

## Optional one-off scripts

If you later add a seed script, gate it behind `SUPABASE_SERVICE_ROLE_KEY` and keep it out of the browser bundle. Runtime APIs always act as the signed-in user JWT + anon key.
