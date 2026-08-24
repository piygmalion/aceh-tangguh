-- Split Partisipasi into laporanKejadian + laporanPenanganan.
-- Retire citizenReports (keep row disabled for catalog history).
-- Public map reads laporan_* live — do not seed marker_features.

insert into public.map_layers (
  key, kind, title_id, title_en, description,
  source_path, source_type, pmtiles_path,
  enabled, sort_order, meta, updated_at
) values
  (
    'laporanKejadian', 'marker',
    'Laporan Kejadian', 'Incident reports',
    'Live overlay from laporan_kejadian: status=approved AND tampil_di_peta=true. Empty until moderators publish a point.',
    '/api/laporan/peta', 'api', null,
    true, 400, '{"toolbar":"groupParticipation"}'::jsonb, now()
  ),
  (
    'laporanPenanganan', 'marker',
    'Laporan Penanganan', 'Response reports',
    'Live overlay from laporan_penanganan: status=approved AND tampil_di_peta=true. Empty until moderators publish a point.',
    '/api/laporan/peta', 'api', null,
    true, 410, '{"toolbar":"groupParticipation"}'::jsonb, now()
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

insert into public.map_layers (
  key, kind, title_id, title_en, description,
  source_path, source_type, enabled, sort_order, meta, updated_at
) values (
  'citizenReports', 'marker',
  'Laporan warga', 'Citizen reports',
  'Retired Partisipasi key. Old ?layers=citizenReports expands to laporanKejadian+laporanPenanganan.',
  null, 'api', false, 930,
  '{"retired":true,"aliasOf":["laporanKejadian","laporanPenanganan"]}'::jsonb,
  now()
)
on conflict (key) do update set
  title_id = excluded.title_id,
  title_en = excluded.title_en,
  description = excluded.description,
  source_path = excluded.source_path,
  source_type = excluded.source_type,
  enabled = false,
  sort_order = excluded.sort_order,
  meta = excluded.meta,
  updated_at = now();

-- Public read for moderated penanganan (mirrors laporan_kejadian_select_published).
-- Required so the anon server client can overlay laporanPenanganan.
drop policy if exists laporan_penanganan_select_published on public.laporan_penanganan;
create policy laporan_penanganan_select_published on public.laporan_penanganan
  for select to anon, authenticated
  using (status = 'approved' and tampil_di_peta = true);

create index if not exists laporan_penanganan_peta_idx
  on public.laporan_penanganan (tampil_di_peta, status);
