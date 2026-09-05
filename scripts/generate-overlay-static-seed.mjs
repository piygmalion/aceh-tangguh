import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const jsonPath = path.join(root, "public/fixtures/overlays/overlay-static-rows.json");
const outPath = path.join(
  root,
  "supabase/migrations/20260924_overlay_static_seed_from_json.sql",
);

const parsed = JSON.parse(readFileSync(jsonPath, "utf8"));
const rows = (parsed.rows ?? []).filter((row) => row.id !== "XB005");
const payload = JSON.stringify(rows).replace(/'/g, "''");

const sql = `-- DATA-16: upsert overlay_static_features from overlay-static-rows.json
-- Do not edit 20260911. Runtime GET still reads GeoJSON fixtures.
-- XB005 stays excluded (20260912 prune).

insert into public.overlay_static_features (
  id, layer_key, external_id, name, kode_bmkg, longitude, latitude,
  source, source_url, properties, updated_at
)
select
  r->>'id',
  r->>'layer_key',
  r->>'external_id',
  r->>'name',
  r->>'kode_bmkg',
  (r->>'longitude')::double precision,
  (r->>'latitude')::double precision,
  coalesce(r->>'source', 'ruangkita'),
  r->>'source_url',
  coalesce(r->'properties', '{}'::jsonb),
  now()
from jsonb_array_elements('${payload}'::jsonb) as r
on conflict (layer_key, source, external_id) do update set
  name = excluded.name,
  kode_bmkg = excluded.kode_bmkg,
  longitude = excluded.longitude,
  latitude = excluded.latitude,
  source_url = excluded.source_url,
  properties = excluded.properties,
  updated_at = now();
`;

writeFileSync(outPath, sql);
console.log(`wrote ${rows.length} rows to ${path.relative(root, outPath)}`);
