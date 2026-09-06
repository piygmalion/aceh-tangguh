-- Re-enable Distribusi R3P as a live toolbar radio.
-- Does not rewrite 20260903_map_layers_retire_r3p.sql (already applied).
-- NGO / alokasi dana stay retired.

update public.map_layers
set
  enabled = true,
  description = 'Choropleth R3P rumah rusak (RR+RS+RB) with kab → kecamatan → desa zoom LOD.',
  meta = coalesce(meta, '{}'::jsonb) - 'retired',
  updated_at = now()
where key = 'r3pDistribution';
