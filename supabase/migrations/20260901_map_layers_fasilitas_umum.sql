-- Move public-facility layers under Data utama (Fasilitas Umum nest).
-- UI-only regroup: titles, enabled flags, and marker_features stay unchanged.

update public.map_layers
set
  meta = coalesce(meta, '{}'::jsonb) || '{"toolbar":"groupMain"}'::jsonb,
  updated_at = now()
where key in (
  'facHealth',
  'facEducation',
  'policeOffices',
  'facGov',
  'facReligious'
);
