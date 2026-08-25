#!/usr/bin/env node
/**
 * Refresh profil_desa from the coordinator Google Sheet.
 *
 *   node scripts/update-profil-from-sheet.mjs
 *   node scripts/update-profil-from-sheet.mjs /path/to/sheet.csv
 *   node scripts/update-profil-from-sheet.mjs --apply
 *
 * Dry-run by default. --apply updates matched 10-digit rows only
 * (never inserts, never fills the 4 null-kode villages).
 *
 * Join ONLY on 10-digit kode_desa_kelurahan ∩ existing profil_desa.
 * Do not invent kodes, remap names, write live_stats/posko, create
 * desa_indikator, reseed area_feature_meta, or edit tiles.
 *
 * Live apply is Backend-only after coordinator review.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  DEFAULT_SHEET_URL,
  buildProfilUpdate,
  joinByTenDigitKode,
  parseProfilSheet,
} from "./lib/profil-sheet.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const LIVE_SELECT = [
  "id",
  "kode_desa_kelurahan",
  "nama",
  "kabupaten",
  "kecamatan",
  "payload",
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
  const pathArg = argv.find((arg) => !arg.startsWith("-"));
  return { apply, dryRun, csvSource: pathArg || DEFAULT_SHEET_URL };
}

async function readCsv(source) {
  if (/^https?:\/\//i.test(source)) {
    const res = await fetch(source);
    if (!res.ok) {
      throw new Error(`Failed to download sheet CSV: ${res.status} ${res.statusText}`);
    }
    return await res.text();
  }
  const path = resolve(source);
  if (!existsSync(path)) {
    throw new Error(`CSV not found: ${path}`);
  }
  return readFileSync(path, "utf8");
}

async function fetchAllProfilDesa(supabase) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("profil_desa")
      .select(LIVE_SELECT)
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

async function applyUpdates(supabase, updates) {
  let updated = 0;
  for (const item of updates) {
    const { error } = await supabase
      .from("profil_desa")
      .update(item.patch)
      .eq("id", item.id)
      .eq("kode_desa_kelurahan", item.kode);
    if (error) {
      throw new Error(`profil_desa update failed for ${item.kode} (${item.id}): ${error.message}`);
    }
    updated += 1;
  }
  return updated;
}

async function main() {
  loadEnvLocal();
  const { apply, dryRun, csvSource } = parseArgs(process.argv.slice(2));

  console.log("profil_desa sheet refresh — 10-digit kode join only.");
  console.log("Never insert. Never fill the 4 null-kode rows. Never overwrite names.");
  console.log("Do not run --apply against production until the coordinator reviews.");
  console.log(`CSV source: ${csvSource}`);

  const csvText = await readCsv(csvSource);
  const { rows, stats } = parseProfilSheet(csvText);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;
  if (!url || !key) {
    console.log(
      JSON.stringify(
        {
          ...stats,
          matched: null,
          unmatched_sheet: null,
          unmatched_live: null,
          skipped_empty_kode: stats.sheet_empty_kode,
          note: "Sheet parsed. Set NEXT_PUBLIC_SUPABASE_URL and anon/service key to join live profil_desa.",
        },
        null,
        2
      )
    );
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or anon key for --dry-run reads)."
    );
    process.exit(1);
  }

  if (apply && !serviceKey) {
    console.error(
      "Refusing --apply: anon RLS is SELECT-only on profil_desa. Set SUPABASE_SERVICE_ROLE_KEY."
    );
    process.exit(1);
  }

  const supabase = createClient(url, apply ? serviceKey : key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  console.log(
    `Connecting to ${url} (key=${serviceKey ? "service_role" : "anon"}; mode=${apply ? "apply" : "dry-run"})`
  );

  const liveRows = await fetchAllProfilDesa(supabase);
  const join = joinByTenDigitKode(rows, liveRows);
  const updates = [];
  for (const pair of join.matched) {
    const update = buildProfilUpdate(pair.live, pair.sheet);
    if (update) updates.push(update);
  }

  const counts = {
    sheet_rows: stats.sheet_rows,
    sheet_coded: stats.sheet_coded,
    sheet_empty_kode: stats.sheet_empty_kode,
    matched: join.matched.length,
    unmatched_sheet: join.unmatched_sheet.length,
    unmatched_live: join.unmatched_live.length,
    skipped_empty_kode: join.skipped_empty_kode.length,
    dash_null_by_column: stats.dash_null_by_column,
    zero_00_by_column: stats.zero_00_by_column,
    updates_prepared: updates.length,
  };
  console.log(JSON.stringify(counts, null, 2));

  if (dryRun || !apply) {
    console.log("Dry-run: wrote 0 rows. Live apply is Backend-only after coordinator review.");
    return;
  }

  const updated = await applyUpdates(supabase, updates);
  console.log(`Apply complete. Updated ${updated} matched 10-digit rows. Inserted 0.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
