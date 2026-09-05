-- DATA-9: Data API must not execute write SECURITY DEFINER RPCs.
-- next_laporan_nomor is called only via service_role (requireLaporanWriter).
-- upsert_marker_features is a coordinator seed RPC; no src/ caller.
-- Do not replace function bodies.
-- Do not revoke is_staff / is_ops / is_super_admin / is_walidata / staff_kode_*.

revoke all on function public.next_laporan_nomor(text) from public, anon, authenticated;
grant execute on function public.next_laporan_nomor(text) to service_role;

revoke all on function public.upsert_marker_features(jsonb) from public, anon, authenticated;
grant execute on function public.upsert_marker_features(jsonb) to service_role;
