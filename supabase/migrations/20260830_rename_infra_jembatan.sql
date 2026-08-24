-- Rename user-facing titles for the existing infraRoadBridge layer.
-- Key stays infraRoadBridge; icon file and URL params are unchanged.

update public.map_layers
set
  title_id = 'Jembatan',
  title_en = 'Bridges',
  description = 'Inventarisasi jembatan Aceh (OSM + dokumen resmi BPJN/Bina Marga/Geoportal). 7547 titik, 23 kabupaten/kota.',
  source_path = '/fixtures/jembatan.json',
  updated_at = now()
where key = 'infraRoadBridge';
