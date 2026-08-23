-- Sync map_layers with the live map toolbar catalog.
-- Adds missing live keys (facGov, facReligious, infraRoadBridge, helipad, starlink)
-- and seeds the rest of the toolbar so admin/catalog matches Lokasi / Distribusi.
-- Retired poskos / tendPoints / missingPersons stay enabled = false.

insert into public.map_layers (
  key, kind, title_id, title_en, description,
  source_path, source_type, pmtiles_path,
  enabled, sort_order, meta, updated_at
) values
  (
    'villageDistribution', 'area',
    'Distribusi desa', 'Village distribution',
    'Choropleth desa / gampong (R3P rumah rusak).',
    '/fixtures/areas/villageDistribution.geojson', 'pmtiles', '/tiles/village-r3p.pmtiles',
    true, 10, '{"toolbar":"distribusi"}'::jsonb, now()
  ),
  (
    'r3pDistribution', 'area',
    'Distribusi R3P', 'R3P distribution',
    'Choropleth kab/kota R3P (RR+RS+RB).',
    '/fixtures/areas/r3pDistribution.geojson', 'pmtiles', '/tiles/r3p-kab.pmtiles',
    true, 20, '{"toolbar":"distribusi"}'::jsonb, now()
  ),
  (
    'irbi2025', 'area',
    'IRBI 2025 (risiko kab)', 'IRBI 2025 (kab risk)',
    'Indeks Risiko Bencana Indonesia 2025 per kab/kota Aceh.',
    '/fixtures/areas/irbi2025.geojson', 'pmtiles', '/tiles/irbi-2025.pmtiles',
    true, 30, '{"toolbar":"distribusi"}'::jsonb, now()
  ),
  (
    'ngoDistribution', 'area',
    'Distribusi NGO', 'NGO distribution',
    'Sebaran kegiatan NGO per kab/kota.',
    '/fixtures/areas/ngoDistribution.geojson', 'geojson', null,
    true, 40, '{"toolbar":"distribusi"}'::jsonb, now()
  ),
  (
    'regencyFundAllocation', 'area',
    'Alokasi dana kab/kota', 'Regency fund allocation',
    'Alokasi dana penanganan per kab/kota.',
    '/fixtures/areas/regencyFundAllocation.geojson', 'geojson', null,
    true, 50, '{"toolbar":"distribusi"}'::jsonb, now()
  ),
  (
    'disasterEvents', 'marker',
    'Kejadian bencana', 'Disaster events',
    'Titik kejadian BPBA/BNPB/BMKG (termasuk episenter lepas pantai berflag).',
    '/fixtures/markers.geojson', 'geojson', null,
    true, 100, '{"toolbar":"groupMain"}'::jsonb, now()
  ),
  (
    'facHealth', 'marker',
    'Fasilitas kesehatan', 'Health facilities',
    'Fasyankes terdampak; sebagian koordinat approx ke sentroid kab.',
    '/fixtures/markers.geojson', 'geojson', null,
    true, 110, '{"toolbar":"groupMain"}'::jsonb, now()
  ),
  (
    'facEducation', 'marker',
    'Fasilitas pendidikan', 'Education facilities',
    'Sekolah terdampak; GPS jika ada, else sentroid kab (approx).',
    '/fixtures/markers.geojson', 'geojson', null,
    true, 120, '{"toolbar":"groupMain"}'::jsonb, now()
  ),
  (
    'policeOffices', 'marker',
    'Kantor polisi', 'Police offices',
    'Kantor polisi terdampak. Banyak lon/lat integer (coord_quality=truncated_integer).',
    '/fixtures/markers.geojson', 'geojson', null,
    true, 130, '{"toolbar":"groupMain"}'::jsonb, now()
  ),
  (
    'facGov', 'marker',
    'Fasilitas pemerintahan', 'Government facilities',
    'Kantor pemerintahan terdampak. Cakupan kab tidak lengkap — jangan mengarang titik.',
    '/fixtures/markers.geojson', 'geojson', null,
    true, 200, '{"toolbar":"groupFacilities"}'::jsonb, now()
  ),
  (
    'facReligious', 'marker',
    'Fasilitas keagamaan', 'Religious facilities',
    'Tempat ibadah terdampak. Cakupan kab tidak lengkap — jangan mengarang titik.',
    '/fixtures/markers.geojson', 'geojson', null,
    true, 210, '{"toolbar":"groupFacilities"}'::jsonb, now()
  ),
  (
    'infraRoadBridge', 'marker',
    'Jalan & jembatan', 'Roads & bridges',
    'Titik infrastruktur jalan/jembatan terdampak.',
    '/fixtures/markers.geojson', 'geojson', null,
    true, 300, '{"toolbar":"groupInfra"}'::jsonb, now()
  ),
  (
    'helipad', 'marker',
    'Helipad', 'Helipads',
    'Titik helipad operasional.',
    '/fixtures/markers.geojson', 'geojson', null,
    true, 310, '{"toolbar":"groupInfra"}'::jsonb, now()
  ),
  (
    'starlink', 'marker',
    'Starlink', 'Starlink',
    'Titik terminal Starlink.',
    '/fixtures/markers.geojson', 'geojson', null,
    true, 320, '{"toolbar":"groupInfra"}'::jsonb, now()
  ),
  (
    'citizenReports', 'marker',
    'Laporan warga', 'Citizen reports',
    'Laporan partisipasi publik (fixture + laporan masyarakat).',
    '/fixtures/markers.geojson', 'mixed', null,
    true, 400, '{"toolbar":"groupParticipation"}'::jsonb, now()
  )
on conflict (key) do update set
  kind = excluded.kind,
  title_id = excluded.title_id,
  title_en = excluded.title_en,
  description = excluded.description,
  source_path = excluded.source_path,
  source_type = excluded.source_type,
  pmtiles_path = excluded.pmtiles_path,
  enabled = true,
  sort_order = excluded.sort_order,
  meta = excluded.meta,
  updated_at = now();

-- Retired toolbar keys: insert if missing, never re-enable if already present.
insert into public.map_layers (
  key, kind, title_id, title_en, description,
  source_path, source_type, enabled, sort_order, meta, updated_at
) values
  (
    'poskos', 'marker',
    'Posko', 'Posts',
    'Dihapus dari Data Utama; key dipertahankan untuk URL lama.',
    null, 'geojson', false, 900, '{"retired":true}'::jsonb, now()
  ),
  (
    'tendPoints', 'marker',
    'Titik pengungsian', 'Shelter points',
    'Dihapus dari Data Utama; key dipertahankan untuk URL lama.',
    null, 'geojson', false, 910, '{"retired":true}'::jsonb, now()
  ),
  (
    'missingPersons', 'marker',
    'Orang hilang', 'Missing persons',
    'Dihapus dari Data Utama; key dipertahankan untuk URL lama.',
    null, 'geojson', false, 920, '{"retired":true}'::jsonb, now()
  )
on conflict (key) do update set
  title_id = excluded.title_id,
  title_en = excluded.title_en,
  description = excluded.description,
  enabled = false,
  sort_order = excluded.sort_order,
  meta = excluded.meta,
  updated_at = now();
