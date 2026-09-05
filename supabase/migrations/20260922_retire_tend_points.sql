-- Corrective: 20260907_sik_operasional.sql re-enabled tendPoints.
-- Live Supabase already has enabled=false / meta.retired=true — this
-- migration only aligns other environments that applied 20260907.
-- Same lock as poskos / missingPersons (20260827): do not re-enable.
-- Merge meta (keep existing keys + description); do not DELETE the row.

update public.map_layers
set
  enabled = false,
  meta = coalesce(meta, '{}'::jsonb) || '{"retired":true}'::jsonb,
  updated_at = now()
where key = 'tendPoints';
