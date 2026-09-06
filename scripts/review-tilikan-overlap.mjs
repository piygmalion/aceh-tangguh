#!/usr/bin/env node
/**
 * Read-only overlap review: tilikan jalan/jembatan vs infraRoadBridge inventory.
 *
 *   node scripts/review-tilikan-overlap.mjs
 *
 * Writes data/drive-clean/tilikan/overlap-infra.csv. Does not touch Supabase.
 */
import { createClient } from "@supabase/supabase-js";
import { createWriteStream, existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  OVERLAP_FIELDS,
  classifyOverlap,
  inventoryFromMarkerRows,
  inventoryFromMarkers,
  overlapStats,
  parseTilikanKerusakanCsv,
} from "./lib/tilikan-kerusakan.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const JALAN = resolve(root, "data/drive-clean/tilikan/jalan_rusak.csv");
const JEMBATAN = resolve(root, "data/drive-clean/tilikan/jembatan.csv");
const OUT = resolve(root, "data/drive-clean/tilikan/overlap-infra.csv");
const MARKERS = resolve(root, "public/fixtures/markers.geojson");

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function writeOverlapCsv(path, rows) {
  const handle = createWriteStream(path, { encoding: "utf8" });
  handle.write(`${OVERLAP_FIELDS.join(",")}\n`);
  for (const row of rows) {
    handle.write(`${OVERLAP_FIELDS.map((key) => csvEscape(row[key])).join(",")}\n`);
  }
  handle.end();
}

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

async function loadLiveInventory() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("marker_features")
      .select("id,title,latitude,longitude,kabupaten,layer")
      .eq("layer", "infraRoadBridge")
      .range(from, from + pageSize - 1);
    if (error) {
      return null;
    }
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return inventoryFromMarkerRows(rows);
}

async function loadInventory(markersPath) {
  const live = await loadLiveInventory();
  if (live && live.length) {
    return { inventory: live, source: "marker_features" };
  }
  if (!existsSync(markersPath)) {
    throw new Error(`infraRoadBridge inventory not found: ${markersPath}`);
  }
  const inventory = inventoryFromMarkers(JSON.parse(readFileSync(markersPath, "utf8")));
  if (!inventory.length) {
    throw new Error(`No infraRoadBridge points in ${markersPath}`);
  }
  return { inventory, source: markersPath };
}

async function main() {
  loadEnvLocal();
  const markersArg = process.argv.find((arg) => arg.startsWith("--markers="));
  const markersPath = markersArg ? resolve(markersArg.slice(10)) : MARKERS;
  const { inventory, source } = await loadInventory(markersPath);

  const parsed = [];
  for (const filePath of [JALAN, JEMBATAN]) {
    const { accepted, skipped } = parseTilikanKerusakanCsv(
      readFileSync(filePath, "utf8"),
      filePath
    );
    parsed.push({ filePath, accepted, skipped });
  }
  const accepted = parsed.flatMap((item) => item.accepted);
  const classified = classifyOverlap(accepted, inventory);
  writeOverlapCsv(OUT, classified);
  const stats = {
    inventory: inventory.length,
    inventory_source: source,
    ...overlapStats(classified),
    skipped: parsed.reduce((n, item) => n + item.skipped.length, 0),
    out: OUT,
  };
  console.log(JSON.stringify(stats, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
