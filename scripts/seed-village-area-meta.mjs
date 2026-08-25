#!/usr/bin/env node
/**
 * Seed area_feature_meta for villageDistribution.
 *
 * Apply path (not a SQL migration):
 *   node scripts/seed-village-area-meta.mjs --dry-run
 *   node scripts/seed-village-area-meta.mjs --apply
 *
 * Rule: upsert only the intersection of
 *   (1) village GeoJSON features that already have a 10-digit properties.kode_desa_kelurahan
 *   (2) profil_desa rows that already have that same kode (the coded 6499)
 *
 * Join on properties.kode_desa_kelurahan, never feature.id.
 * Stamp name/kabupaten and copied attributes from profil_desa only.
 *
 * Do not run against production until the coordinator reviews this PR.
 * This script does not invent kodes, fill slug-only polygons, or fill null profil rows.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { buildVillageAreaMeta, VILLAGE_LAYER_KEY } from "./lib/village-area-meta.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GEOJSON_REL = "public/fixtures/areas/villageDistribution.geojson";
const PROFIL_SELECT = [
  "id",
  "kode_desa_kelurahan",
  "nama",
  "kabupaten",
  "kecamatan",
  "kode_kabupaten",
  "kode_kecamatan",
  "kondisi_kode",
  "kk",
  "populasi",
  "kk_terdampak",
  "populasi_terdampak",
  "korban_meninggal",
  "korban_hilang",
  "rumah_rr",
  "rumah_rs",
  "rumah_rb",
  "total_rumah_rusak",
].join(",");

function loadEnvLocal() {
  const envPath = resolve(root, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function parseArgs(argv) {
  const apply = argv.includes("--apply");
  const dryRun = argv.includes("--dry-run") || !apply;
  if (apply && argv.includes("--dry-run")) {
    console.error("Pass only one of --dry-run or --apply.");
    process.exit(1);
  }
  return { apply, dryRun };
}

async function fetchAllProfilDesa(supabase) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("profil_desa")
      .select(PROFIL_SELECT)
      .order("id", { ascending: true })
      .range(from, to);
    if (error) {
      throw new Error(`profil_desa select failed: ${error.message}`);
    }
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows;
}

async function upsertRows(supabase, rows) {
  const chunkSize = 100;
  let upserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("area_feature_meta")
      .upsert(chunk, { onConflict: "layer_key,id" })
      .select("id, layer_key");
    if (error) {
      throw new Error(`area_feature_meta upsert failed: ${error.message}`);
    }
    upserted += data?.length ?? chunk.length;
  }
  return upserted;
}

async function main() {
  loadEnvLocal();
  const { apply, dryRun } = parseArgs(process.argv.slice(2));

  console.log(
    "villageDistribution area_feature_meta seed — intersection of geojson-coded ∩ profil-coded only."
  );
  console.log(
    "Do not run --apply against production until the coordinator reviews."
  );

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;
  if (!url || !key) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or anon key for --dry-run reads)."
    );
    process.exit(1);
  }

  if (apply && !serviceKey) {
    console.error(
      "Refusing --apply: anon RLS is SELECT-only on area_feature_meta. Set SUPABASE_SERVICE_ROLE_KEY."
    );
    process.exit(1);
  }

  const usingServiceRole = Boolean(serviceKey);
  const geoPath = resolve(root, GEOJSON_REL);
  const fc = JSON.parse(readFileSync(geoPath, "utf8"));
  const features = fc.features || [];

  const supabase = createClient(url, apply ? serviceKey : key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  console.log(
    `Connecting to ${url} (key=${usingServiceRole ? "service_role" : "anon"}; mode=${apply ? "apply" : "dry-run"})`
  );

  const profilRows = await fetchAllProfilDesa(supabase);
  const { rows, counts } = buildVillageAreaMeta(features, profilRows);

  console.log(JSON.stringify(counts, null, 2));
  console.log(
    `Prepared ${rows.length} ${VILLAGE_LAYER_KEY} rows (id=10-digit kode, name+kabupaten from profil_desa).`
  );

  if (dryRun || !apply) {
    console.log("Dry-run: wrote 0 rows.");
    return;
  }

  const upserted = await upsertRows(supabase, rows);
  const { count: villageCount } = await supabase
    .from("area_feature_meta")
    .select("id", { count: "exact", head: true })
    .eq("layer_key", VILLAGE_LAYER_KEY);
  console.log(`Apply complete. Upserted≈${upserted}. villageDistribution=${villageCount}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
