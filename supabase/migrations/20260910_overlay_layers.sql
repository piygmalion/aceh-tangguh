-- Overlay registry for Ruang Kita-inspired geospasial layers.
-- Geometry stays in fixtures / live APIs — these tables hold catalog + point snapshots + forecast cache.

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid
    where c.conrelid = 'public.map_layers'::regclass
      and c.contype = 'c'
      and a.attnum = any (c.conkey)
      and a.attname in ('kind', 'source_type')
  loop
    execute format('alter table public.map_layers drop constraint if exists %I', r.conname);
  end loop;
end $$;

alter table public.map_layers
  add constraint map_layers_kind_check
  check (kind in ('area', 'marker', 'boundary', 'overlay'));

alter table public.map_layers
  add constraint map_layers_source_type_check
  check (
    source_type is null
    or source_type in (
      'geojson',
      'pmtiles',
      'api',
      'mixed',
      'xyz',
      'wms',
      'arcgis',
      'live-geojson',
      'scrape-static'
    )
  );

create table if not exists public.overlay_static_features (
  id text primary key,
  layer_key text not null references public.map_layers(key) on delete cascade,
  external_id text not null,
  name text not null,
  kode_bmkg text,
  longitude double precision not null,
  latitude double precision not null,
  source text not null default 'ruangkita',
  source_url text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (layer_key, source, external_id)
);

create index if not exists overlay_static_features_layer_idx
  on public.overlay_static_features (layer_key);

create table if not exists public.overlay_live_features (
  id text primary key,
  layer_key text not null references public.map_layers(key) on delete cascade,
  source text not null check (source in ('bmkg', 'magma', 'sipongi', 'tatonas')),
  external_id text not null,
  longitude double precision not null,
  latitude double precision not null,
  occurred_at timestamptz,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_id)
);

create index if not exists overlay_live_features_layer_time_idx
  on public.overlay_live_features (layer_key, occurred_at desc);

create table if not exists public.maritime_forecast_cache (
  kode text primary key,
  jenis text not null check (jenis in ('perairan', 'pelabuhan')),
  issued text,
  valid_from text,
  valid_to text,
  payload jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now()
);

alter table public.overlay_static_features enable row level security;
alter table public.overlay_live_features enable row level security;
alter table public.maritime_forecast_cache enable row level security;

drop policy if exists overlay_static_features_select_public on public.overlay_static_features;
create policy overlay_static_features_select_public
  on public.overlay_static_features for select to anon, authenticated using (true);

drop policy if exists overlay_live_features_select_public on public.overlay_live_features;
create policy overlay_live_features_select_public
  on public.overlay_live_features for select to anon, authenticated using (true);

drop policy if exists maritime_forecast_cache_select_public on public.maritime_forecast_cache;
create policy maritime_forecast_cache_select_public
  on public.maritime_forecast_cache for select to anon, authenticated using (true);

do $$
begin
  if exists (select 1 from pg_proc where proname = 'is_super_admin') then
    execute $p$
      drop policy if exists overlay_static_features_write_super_admin on public.overlay_static_features;
      create policy overlay_static_features_write_super_admin
        on public.overlay_static_features for all to authenticated
        using (public.is_super_admin()) with check (public.is_super_admin());
    $p$;
    execute $p$
      drop policy if exists overlay_live_features_write_super_admin on public.overlay_live_features;
      create policy overlay_live_features_write_super_admin
        on public.overlay_live_features for all to authenticated
        using (public.is_super_admin()) with check (public.is_super_admin());
    $p$;
    execute $p$
      drop policy if exists maritime_forecast_cache_write_super_admin on public.maritime_forecast_cache;
      create policy maritime_forecast_cache_write_super_admin
        on public.maritime_forecast_cache for all to authenticated
        using (public.is_super_admin()) with check (public.is_super_admin());
    $p$;
  end if;
end $$;

insert into public.map_layers (
  key, kind, title_id, title_en, description,
  source_path, source_type, pmtiles_path,
  enabled, sort_order, meta, updated_at
) values
  (
    'maritimePorts', 'overlay',
    'Pelabuhan', 'Ports',
    'Titik pelabuhan Aceh (URL ditemukan dari Ruang Kita; geometri BMKG Maritim meta/pelabuhan.json).',
    '/fixtures/overlays/pelabuhan-aceh.geojson', 'scrape-static', null,
    true, 1000, '{"toolbar":"geospasial","group":"maritime"}'::jsonb, now()
  ),
  (
    'maritimeWaters', 'overlay',
    'Cuaca perairan', 'Maritime waters',
    'Poligon wilayah perairan Aceh + prakiraan live BMKG Maritim.',
    '/fixtures/overlays/perairan-aceh.geojson', 'live-geojson', null,
    true, 1010, '{"toolbar":"geospasial","group":"maritime"}'::jsonb, now()
  ),
  (
    'bmkgQuakes', 'overlay',
    'Gempa BMKG', 'BMKG earthquakes',
    'Gempa terkini / dirasakan BMKG TEWS, filter Aceh.',
    '/api/overlay/bmkgQuakes', 'live-geojson', null,
    true, 1100, '{"toolbar":"geospasial","group":"live"}'::jsonb, now()
  ),
  (
    'magmaQuakes', 'overlay',
    'Gempa MAGMA', 'MAGMA earthquakes',
    'Titik gempa MAGMA PVMBG (markersGempa) relevan Aceh.',
    '/api/overlay/magmaQuakes', 'live-geojson', null,
    true, 1110, '{"toolbar":"geospasial","group":"live"}'::jsonb, now()
  ),
  (
    'magmaVolcanoes', 'overlay',
    'Gunung api MAGMA', 'MAGMA volcanoes',
    'Status gunung api MAGMA jika feed homepage tersedia; kosong jika tidak.',
    '/api/overlay/magmaVolcanoes', 'live-geojson', null,
    true, 1120, '{"toolbar":"geospasial","group":"live"}'::jsonb, now()
  ),
  (
    'sipongiHotspots', 'overlay',
    'Hotspot Sipongi', 'Sipongi hotspots',
    'Hotspot karhutla Aceh (confidence medium/high) dari opsroom Sipongi.',
    '/api/overlay/sipongiHotspots', 'live-geojson', null,
    true, 1130, '{"toolbar":"geospasial","group":"live"}'::jsonb, now()
  ),
  (
    'tatonasStations', 'overlay',
    'Pos hidrologi (Tatonas)', 'Hydrology stations (Tatonas)',
    'Pos hidrologi Tatonas Aceh — toggle Geospasial.',
    '/api/overlay/tatonasStations', 'live-geojson', null,
    true, 1140, '{"toolbar":"geospasial","group":"live"}'::jsonb, now()
  ),
  (
    'seismicSensors', 'overlay',
    'Sensor seismik BMKG', 'BMKG seismic sensors',
    'Stasiun sensor gempa BMKG di bbox Aceh (URL dari Ruang Kita).',
    '/fixtures/overlays/sensor-seismic-aceh.geojson', 'scrape-static', null,
    true, 1150, '{"toolbar":"geospasial","group":"live"}'::jsonb, now()
  ),
  (
    'inariskSumateraFault', 'overlay',
    'Patahan Sumatera', 'Sumatran fault',
    'InaRISK Faults layer Sumatera clip Aceh.',
    '/fixtures/overlays/sumatera-fault-aceh.geojson', 'geojson', null,
    true, 1200, '{"toolbar":"geospasial","group":"faults"}'::jsonb, now()
  ),
  (
    'inariskMegathrust', 'overlay',
    'Megathrust', 'Megathrust',
    'InaRISK Faults Megathrust clip Aceh.',
    '/fixtures/overlays/megathrust-aceh.geojson', 'geojson', null,
    true, 1210, '{"toolbar":"geospasial","group":"faults"}'::jsonb, now()
  ),
  (
    'inariskBahayaGempa', 'overlay',
    'Bahaya gempa (InaRISK)', 'Earthquake hazard (InaRISK)',
    'Raster ImageServer InaRISK layer_bahaya_gempabumi via proxy ubin.',
    '/api/overlay/tiles/inariskBahayaGempa', 'arcgis', null,
    true, 1300, '{"toolbar":"geospasial","group":"bahaya","service":"layer_bahaya_gempabumi"}'::jsonb, now()
  ),
  (
    'inariskBahayaTsunami', 'overlay',
    'Bahaya tsunami (InaRISK)', 'Tsunami hazard (InaRISK)',
    'Raster ImageServer InaRISK layer_bahaya_tsunami via proxy ubin.',
    '/api/overlay/tiles/inariskBahayaTsunami', 'arcgis', null,
    true, 1310, '{"toolbar":"geospasial","group":"bahaya","service":"layer_bahaya_tsunami"}'::jsonb, now()
  ),
  (
    'inariskBahayaLongsor', 'overlay',
    'Bahaya longsor (InaRISK)', 'Landslide hazard (InaRISK)',
    'Raster ImageServer InaRISK layer_bahaya_tanah_longsor via proxy ubin.',
    '/api/overlay/tiles/inariskBahayaLongsor', 'arcgis', null,
    true, 1320, '{"toolbar":"geospasial","group":"bahaya","service":"layer_bahaya_tanah_longsor"}'::jsonb, now()
  ),
  (
    'inariskBahayaBanjir', 'overlay',
    'Bahaya banjir (InaRISK)', 'Flood hazard (InaRISK)',
    'Raster ImageServer InaRISK layer_bahaya_banjir via proxy ubin.',
    '/api/overlay/tiles/inariskBahayaBanjir', 'arcgis', null,
    true, 1330, '{"toolbar":"geospasial","group":"bahaya","service":"layer_bahaya_banjir"}'::jsonb, now()
  ),
  (
    'inariskBahayaKarhutla', 'overlay',
    'Bahaya karhutla (InaRISK)', 'Wildfire hazard (InaRISK)',
    'Raster ImageServer InaRISK layer_bahaya_kebakaran_hutan_dan_lahan via proxy ubin.',
    '/api/overlay/tiles/inariskBahayaKarhutla', 'arcgis', null,
    true, 1340, '{"toolbar":"geospasial","group":"bahaya","service":"layer_bahaya_kebakaran_hutan_dan_lahan"}'::jsonb, now()
  ),
  (
    'inariskBahayaGunungApi', 'overlay',
    'Bahaya gunung api (InaRISK)', 'Volcano hazard (InaRISK)',
    'Raster ImageServer InaRISK layer_bahaya_letusan_gunungapi (pengganti poligon KRB resmi di disk).',
    '/api/overlay/tiles/inariskBahayaGunungApi', 'arcgis', null,
    true, 1350, '{"toolbar":"geospasial","group":"bahaya","service":"layer_bahaya_letusan_gunungapi"}'::jsonb, now()
  )
on conflict (key) do update set
  kind = excluded.kind,
  title_id = excluded.title_id,
  title_en = excluded.title_en,
  description = excluded.description,
  source_path = excluded.source_path,
  source_type = excluded.source_type,
  enabled = excluded.enabled,
  sort_order = excluded.sort_order,
  meta = excluded.meta,
  updated_at = now();
