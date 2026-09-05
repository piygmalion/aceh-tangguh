-- Remove non-Aceh overlay features that leaked in through the bbox-only ETL filter.
--
-- The Aceh bbox envelope (95.0, 2.0, 98.3, 6.15) overlaps Sumatera Utara, so
-- `filterAcehPorts` admitted Pangkalan Susu (XB005, lon 98.213 / lat 4.123)
-- even though its province is Sumatra Utara. The ETL now treats an explicit
-- non-Aceh province as authoritative; this migration cleans the seeded rows.

delete from public.overlay_static_features
where layer_key = 'maritimePorts'
  and (
    external_id = 'XB005'
    or properties->>'province' ilike '%sumat%utara%'
  );

-- Live point snapshots are re-derived from upstream on every refresh, but any
-- previously persisted Sumatera Utara rows should not linger on the map.
delete from public.overlay_live_features
where layer_key = 'seismicSensors'
  and properties->>'stakeholder' ilike '%sumat%utara%';
