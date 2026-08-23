#!/usr/bin/env bun
/**
 * Seed area_feature_meta from local fixtures.
 * Uses NEXT_PUBLIC_SUPABASE_* from .env.local (anon).
 * Prefer SUPABASE_SERVICE_ROLE_KEY when set — anon has no INSERT policy on this table.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const root = resolve(import.meta.dir, "..");

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

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / anon or service role key");
  process.exit(1);
}

const usingServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log(
  `Connecting to ${url} (key=${usingServiceRole ? "service_role" : "anon"})`
);

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function slugId(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function loadJson(rel) {
  return JSON.parse(readFileSync(resolve(root, rel), "utf8"));
}

/** @type {{ id: string, layer_key: string, name: string, kabupaten: string|null, properties: object }[]} */
const rows = [];

// --- IRBI 2025 from analysis fixture + geojson properties ---
try {
  const irbi = loadJson("public/fixtures/irbi-2025.json");
  for (const kab of irbi.kabupaten_kota || []) {
    const name = kab.kabupaten_kota;
    if (!name) continue;
    const id = slugId(name);
    const { no, ...rest } = kab;
    rows.push({
      id,
      layer_key: "irbi2025",
      name,
      kabupaten: name,
      properties: rest,
    });
  }
  console.log(`Prepared ${irbi.kabupaten_kota?.length ?? 0} irbi-2025.json rows`);
} catch (e) {
  console.warn("Skip irbi-2025.json:", e.message);
}

try {
  const gj = loadJson("public/fixtures/areas/irbi2025.geojson");
  let merged = 0;
  for (const f of gj.features || []) {
    const p = f.properties || {};
    const name = p.name;
    if (!name) continue;
    const id = slugId(name);
    const existing = rows.find((r) => r.layer_key === "irbi2025" && r.id === id);
    if (existing) {
      existing.properties = { ...existing.properties, ...p };
      merged++;
    } else {
      rows.push({
        id,
        layer_key: "irbi2025",
        name,
        kabupaten: name,
        properties: p,
      });
    }
  }
  console.log(`Merged irbi2025.geojson props into ${merged} rows`);
} catch (e) {
  console.warn("Skip irbi2025.geojson:", e.message);
}

// --- R3P kab distribution ---
try {
  const gj = loadJson("public/fixtures/areas/r3pDistribution.geojson");
  let n = 0;
  for (const f of gj.features || []) {
    const p = f.properties || {};
    const name = p.name;
    if (!name) continue;
    const id = String(p.kode_kab || slugId(name));
    rows.push({
      id,
      layer_key: "r3pDistribution",
      name,
      kabupaten: name,
      properties: p,
    });
    n++;
  }
  console.log(`Prepared ${n} r3pDistribution rows`);
} catch (e) {
  console.warn("Skip r3pDistribution.geojson:", e.message);
}

console.log(`Upserting ${rows.length} rows into area_feature_meta…`);

const chunkSize = 50;
let upserted = 0;
for (let i = 0; i < rows.length; i += chunkSize) {
  const chunk = rows.slice(i, i + chunkSize);
  const { data, error } = await supabase
    .from("area_feature_meta")
    .upsert(chunk, { onConflict: "layer_key,id" })
    .select("id, layer_key");

  if (error) {
    console.error("Upsert failed:", error.message, error.code || "", error.details || "");
    if (!usingServiceRole) {
      console.error(
        "Hint: anon RLS has SELECT-only on area_feature_meta. Re-run with SUPABASE_SERVICE_ROLE_KEY or seed via SQL/MCP."
      );
    }
    process.exit(1);
  }
  upserted += data?.length ?? chunk.length;
}

const { count: irbiCount } = await supabase
  .from("area_feature_meta")
  .select("id", { count: "exact", head: true })
  .eq("layer_key", "irbi2025");
const { count: r3pCount } = await supabase
  .from("area_feature_meta")
  .select("id", { count: "exact", head: true })
  .eq("layer_key", "r3pDistribution");

console.log(`Done. Upserted≈${upserted}. Counts: irbi2025=${irbiCount}, r3pDistribution=${r3pCount}`);
