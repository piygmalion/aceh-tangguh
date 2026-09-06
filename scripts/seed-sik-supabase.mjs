#!/usr/bin/env node
/**
 * Upsert merged kejadian into Supabase (dry-run default).
 *
 *   node scripts/seed-sik-supabase.mjs
 *   node scripts/seed-sik-supabase.mjs --apply
 *
 * --apply upserts kejadian_bencana by id, then calls the existing
 * upsert_marker_features RPC for disasterEvents only.
 * Do not run --apply against production until the coordinator reviews.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { rebuildDisasterEventLayer, kejadianToSupabaseRow, featureToMarkerRow } from "./lib/sik-markers.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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
  if (apply && argv.includes("--dry-run")) {
    console.error("Pass only one of --dry-run or --apply.");
    process.exit(1);
  }
  return { apply, dryRun: !apply };
}

async function upsertKejadian(supabase, rows) {
  const chunkSize = 100;
  let upserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("kejadian_bencana")
      .upsert(chunk, { onConflict: "id" })
      .select("id");
    if (error) {
      throw new Error(`kejadian_bencana upsert failed: ${error.message}`);
    }
    upserted += data?.length ?? chunk.length;
  }
  return upserted;
}

async function upsertMarkers(supabase, features) {
  const rows = features.map(featureToMarkerRow);
  const { error } = await supabase.rpc("upsert_marker_features", { rows });
  if (error) {
    throw new Error(
      `upsert_marker_features RPC failed: ${error.message}. Coordinator runs this RPC; do not invent a new one.`
    );
  }
  return rows.length;
}

async function main() {
  loadEnvLocal();
  const { apply, dryRun } = parseArgs(process.argv.slice(2));

  console.log(
    "SIK → Supabase seed. Fill-null merge must already be in kejadian-bencana.json."
  );
  console.log("Do not run --apply against production until the coordinator reviews.");

  const fixture = JSON.parse(
    readFileSync(resolve(root, "public/fixtures/kejadian-bencana.json"), "utf8")
  );
  const markers = JSON.parse(
    readFileSync(resolve(root, "public/fixtures/markers.geojson"), "utf8")
  );
  const kejadianRows = (fixture.kejadian || []).map(kejadianToSupabaseRow);
  const rebuilt = rebuildDisasterEventLayer(markers, fixture.kejadian || []);
  const disasterFeatures = rebuilt.collection.features.filter(
    (f) => f?.properties?.layer === "disasterEvents"
  );

  console.log(
    JSON.stringify(
      {
        kejadianRows: kejadianRows.length,
        disasterEvents: disasterFeatures.length,
        mode: apply ? "apply" : "dry-run",
      },
      null,
      2
    )
  );

  if (dryRun || !apply) {
    console.log("Dry-run: wrote 0 rows. Re-seed marker_features via upsert_marker_features after apply.");
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "Refusing --apply: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
    process.exit(1);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const kejadianUpserted = await upsertKejadian(supabase, kejadianRows);
  const markersUpserted = await upsertMarkers(supabase, disasterFeatures);
  console.log(
    JSON.stringify({ apply: true, kejadianUpserted, markersUpserted }, null, 2)
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
