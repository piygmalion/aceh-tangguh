# Admin dashboard setup

The staff console lives at `/id/admin` (and `/en/admin`). The Next.js app only needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. **Do not add `SUPABASE_SERVICE_ROLE_KEY` for the app to run.**

This PR does **not** seed any Auth user or password.

## 1. Apply the migration

In the Supabase SQL editor (project `whojoxrbcdyotrpolgav`), paste and run:

`supabase/migrations/20260825_admin_auth.sql`

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
| `admin` | Overview + Moderasi Laporan |
| `super_admin` | Overview + Moderasi + CMS + Database tools |
| Signed in, no profile | `/admin/denied` |
| Signed out | Redirected to `/admin/login` |

## Roles

- `admin` — report moderation only (`queued` / `published` / `rejected`).
- `super_admin` — moderation plus CMS (`publikasi`, `kejadian_bencana`) and typed table editors (not a raw SQL console).

## Optional one-off scripts

If you later add a seed script, gate it behind `SUPABASE_SERVICE_ROLE_KEY` and keep it out of the browser bundle. Runtime APIs always act as the signed-in user JWT + anon key.
