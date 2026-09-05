-- DATA-10: Data API anon must not bump kejadian_operasi_nomor_seq.
-- next_kejadian_nomor() is a column DEFAULT on staff JWT inserts — keep authenticated.
-- Do not replace the function body.
-- Do not revoke is_staff / is_ops / is_super_admin / is_walidata / staff_kode_*.

revoke all on function public.next_kejadian_nomor() from public, anon;
grant execute on function public.next_kejadian_nomor() to authenticated, service_role;
