-- DATA-8: staging profil desa sheet leftover. Not used by the app.
-- Do not drop the table. Do not delete rows. Do not add Data API policies.
-- Anon/authenticated currently have full privileges while RLS is off.

alter table public._tmp_profil_sheet_apply enable row level security;

comment on table public._tmp_profil_sheet_apply is
  'Staging profil desa sheet. Not an app table. RLS on; no Data API policies. Service role / SQL editor only.';

revoke all on table public._tmp_profil_sheet_apply from anon, authenticated, public;

-- DATA-1 revoked EXECUTE from PUBLIC only; anon/authenticated still had EXECUTE.
revoke all on function public.purge_expired_overlay_rows() from public, anon, authenticated;
