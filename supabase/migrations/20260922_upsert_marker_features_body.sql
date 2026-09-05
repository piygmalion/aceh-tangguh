-- DATA-11: tubuh fungsi di-dump dari produksi aceh-tangguh (5 September 2026).
-- Jangan apply ke proyek yang sudah punya fungsi ini. Berkas untuk greenfield/repo.
-- Hak EXECUTE tetap seperti 20260920 (service_role saja). Jangan mengarang ulang tubuh.

CREATE OR REPLACE FUNCTION public.upsert_marker_features(rows jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  r jsonb;
  n int := 0;
begin
  for r in select * from jsonb_array_elements(rows)
  loop
    insert into public.marker_features (id, layer, title, status, kabupaten, longitude, latitude, properties)
    values (
      r->>'id',
      r->>'layer',
      r->>'title',
      nullif(r->>'status',''),
      nullif(r->>'kabupaten',''),
      (r->>'longitude')::float8,
      (r->>'latitude')::float8,
      coalesce(r->'properties', '{}'::jsonb)
    )
    on conflict (id) do update set
      layer = excluded.layer,
      title = excluded.title,
      status = excluded.status,
      kabupaten = excluded.kabupaten,
      longitude = excluded.longitude,
      latitude = excluded.latitude,
      properties = excluded.properties,
      updated_at = now();
    n := n + 1;
  end loop;
  return n;
end;
$function$;
