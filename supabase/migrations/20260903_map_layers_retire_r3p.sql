-- Retire Distribusi R3P / NGO / alokasi dana kab/kota from the live catalog.
-- Same pattern as poskos / tendPoints / missingPersons (20260827):
-- enabled=false, meta.retired=true, keep the row and key for old URLs.
-- Prefer this follow-up over rewriting 20260827_map_layers_live_registry.sql
-- (already applied).
--
-- Do not DELETE map_layers rows: area_feature_meta.layer_key references
-- map_layers(key) ON DELETE CASCADE (r3pDistribution has existing meta rows).
-- Do not drop r3p_summary, area_feature_meta, or public/tiles pmtiles.

update public.map_layers
set
  enabled = false,
  meta = coalesce(meta, '{}'::jsonb) || '{"retired":true}'::jsonb,
  updated_at = now()
where key in ('r3pDistribution', 'ngoDistribution', 'regencyFundAllocation');

-- villageDistribution stays enabled. Drop leftover "R3P rumah rusak" wording
-- if still present. Fact-only: desa/gampong choropleth of damaged houses.
-- Do not mention PRRPKA.
update public.map_layers
set
  description = 'Choropleth desa / gampong (rumah rusak RR+RS+RB).',
  updated_at = now()
where key = 'villageDistribution'
  and description ilike '%R3P rumah rusak%';
