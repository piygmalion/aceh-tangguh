-- Remove helipad / starlink from the live map_layers registry.
-- Prefer this follow-up over rewriting 20260827_map_layers_live_registry.sql
-- (already applied). Coordinator also drops leftover marker_features rows.

do $$
begin
  if to_regclass('public.marker_features') is not null then
    delete from public.marker_features
    where layer in ('helipad', 'starlink');
  end if;
end $$;

delete from public.map_layers
where key in ('helipad', 'starlink');
