begin;
drop policy if exists anggaran_analisis_select on public.anggaran_analisis;
drop policy if exists anggaran_kegiatan_select on public.anggaran_kegiatan;
drop policy if exists r3p_summary_select on public.r3p_summary;
drop policy if exists anggaran_analisis_select_public on public.anggaran_analisis;
drop policy if exists anggaran_kegiatan_select_public on public.anggaran_kegiatan;
drop policy if exists r3p_summary_select_public on public.r3p_summary;

revoke all on public.anggaran_analisis, public.anggaran_kegiatan, public.r3p_summary from anon;
revoke truncate, references, trigger
  on public.anggaran_analisis, public.anggaran_kegiatan, public.r3p_summary from authenticated;

create policy anggaran_analisis_select_staff on public.anggaran_analisis
  for select to authenticated using (public.is_staff());
create policy anggaran_kegiatan_select_staff on public.anggaran_kegiatan
  for select to authenticated using (public.is_staff());
create policy r3p_summary_select_staff on public.r3p_summary
  for select to authenticated using (public.is_staff());
commit;
