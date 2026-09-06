#!/usr/bin/env node
/**
 * Dry-run (default) ingest of cleaned tilikan jalan/jembatan into
 * tilikan_kerusakan_infra. Never writes marker_features.
 *
 *   node scripts/ingest-tilikan-kerusakan.mjs
 *   node scripts/ingest-tilikan-kerusakan.mjs --apply
 *
 * --apply upserts staff rows only after coordinator review of
 * data/drive-clean/tilikan/overlap-infra.csv. Do not run against
 * production until that review. Does not seed tempat_pengungsian,
 * pengungsian_kaji, kejadian_korban, pengungsi_terpilah, or
 * missingPersons / tendPoints.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyOverlap,
  inventoryFromMarkerRows,
  inventoryFromMarkers,
  overlapStats,
  parseTilikanKerusakanCsv,
} from "./lib/tilikan-kerusakan.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const JALAN = resolve(root, "data/drive-clean/tilikan/jalan_rusak.csv");
const JEMBATAN = resolve(root, "data/drive-clean/tilikan/jembatan.csv");
const MARKERS = resolve(root, "public/fixtures/markers.geojson");

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

function toInsertRow(row) {
  return {
    jenis: row.jenis,
    nama: row.nama,
    alamat: row.alamat,
    kabupaten: row.kabupaten,
    kode_kabupaten: row.kode_kabupaten,
    kecamatan: row.kecamatan,
    desa: row.desa,
    kode_desa_kelurahan: row.kode_desa_kelurahan,
    latitude: row.latitude,
    longitude: row.longitude,
    coord_quality: row.coord_quality,
    approx: row.approx,
    sumber: row.sumber,
    media_url: row.media_url,
    marker_feature_id: row.marker_feature_id,
    source_row: row.source_row,
  };
}

function existingKey(row) {
  return `${row.jenis}|${Number(row.latitude).toFixed(5)}|${Number(row.longitude).toFixed(5)}|${String(row.nama || "").trim().toLowerCase()}`;
}

async function fetchExisting(supabase) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("tilikan_kerusakan_infra")
      .select("id,jenis,nama,latitude,longitude,marker_feature_id")
      .range(from, to);
    if (error) {
      throw new Error(`tilikan_kerusakan_infra select failed: ${error.message}`);
    }
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows;
}

async function applyInserts(supabase, rows) {
  const chunkSize = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("tilikan_kerusakan_infra")
      .insert(chunk)
      .select("id");
    if (error) {
      throw new Error(`tilikan_kerusakan_infra insert failed: ${error.message}`);
    }
    inserted += data?.length ?? chunk.length;
  }
  return inserted;
}

async function loadInventory(supabase) {
  if (supabase) {
    const pageSize = 1000;
    const rows = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("marker_features")
        .select("id,title,latitude,longitude,kabupaten,layer")
        .eq("layer", "infraRoadBridge")
        .range(from, from + pageSize - 1);
      if (error) break;
      if (!data?.length) break;
      rows.push(...data);
      if (data.length < pageSize) break;
    }
    const live = inventoryFromMarkerRows(rows);
    if (live.length) return live;
  }
  if (!existsSync(MARKERS)) {
    throw new Error(`infraRoadBridge inventory not found: ${MARKERS}`);
  }
  return inventoryFromMarkers(JSON.parse(readFileSync(MARKERS, "utf8")));
}

async function loadClassified(supabase) {
  const inventory = await loadInventory(supabase);
  const accepted = [];
  let skipped = 0;
  for (const filePath of [JALAN, JEMBATAN]) {
    const parsed = parseTilikanKerusakanCsv(readFileSync(filePath, "utf8"), filePath);
    accepted.push(...parsed.accepted);
    skipped += parsed.skipped.length;
  }
  return { classified: classifyOverlap(accepted, inventory), skipped, inventory: inventory.length };
}

async function main() {
  loadEnvLocal();
  const { apply, dryRun } = parseArgs(process.argv.slice(2));
  console.log(
    "tilikan_kerusakan_infra ingest — jalan/jembatan only. No marker_features, no pengungsian, no orang hilang."
  );

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;
  if (apply && !serviceKey) {
    console.error(
      "Refusing --apply: anon cannot write tilikan_kerusakan_infra. Set SUPABASE_SERVICE_ROLE_KEY."
    );
    process.exit(1);
  }

  const supabase =
    url && key
      ? createClient(url, apply ? serviceKey : key, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;
  if (supabase) {
    console.log(
      `Connecting to ${url} (key=${serviceKey ? "service_role" : "anon"}; mode=${apply ? "apply" : "dry-run"})`
    );
  }

  const { classified, skipped, inventory } = await loadClassified(supabase);
  const prepared = classified.map(toInsertRow);
  const counts = {
    inventory,
    accepted: classified.length,
    skipped,
    ...overlapStats(classified),
    inserts_prepared: prepared.length,
  };

  if (!supabase) {
    console.log(JSON.stringify(counts, null, 2));
    console.log(
      "Dry-run against fixture inventory. Set NEXT_PUBLIC_SUPABASE_URL to compare live marker_features. Wrote 0 rows. Never calls upsert_marker_features."
    );
    return;
  }

  let existing;
  try {
    existing = await fetchExisting(supabase);
  } catch (err) {
    counts.already_in_db = null;
    counts.note = err instanceof Error ? err.message : String(err);
    console.log(JSON.stringify(counts, null, 2));
    if (apply) throw err;
    console.log(
      "Dry-run: wrote 0 rows. Apply migration 20260924 first; --apply only after coordinator review of overlap-infra.csv. Never calls upsert_marker_features."
    );
    return;
  }

  const have = new Set(existing.map(existingKey));
  const toInsert = prepared.filter((row) => !have.has(existingKey(row)));
  counts.already_in_db = existing.length;
  counts.inserts_new = toInsert.length;
  console.log(JSON.stringify(counts, null, 2));

  if (dryRun || !apply) {
    console.log(
      "Dry-run: wrote 0 rows. Live apply is Backend-only after coordinator review of overlap-infra.csv. Never calls upsert_marker_features."
    );
    return;
  }

  const inserted = await applyInserts(supabase, toInsert);
  console.log(`Apply complete. Inserted ${inserted} tilikan_kerusakan_infra rows. marker_features unchanged.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
