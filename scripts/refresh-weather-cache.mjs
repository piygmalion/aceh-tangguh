/**
 * Periodic weather refresh: snapshot fixture + optional Supabase cache upsert.
 * Usage: node scripts/refresh-weather-cache.mjs
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (optional, for cache)
 */
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

async function main() {
  const { execSync } = await import("child_process");
  console.log("Building weather snapshot...");
  execSync("node scripts/build-weather-snapshot.mjs", {
    cwd: root,
    stdio: "inherit",
  });

  const snapshotPath = path.join(root, "public/fixtures/weather-snapshot.json");
  const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.log("Supabase cache skip: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    return;
  }

  const supabase = createClient(url, serviceKey);
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const rows = snapshot.kabupaten_kota.map((kab) => ({
    kabupaten_kota: kab.kabupaten_kota,
    adm4_code: kab.adm4 ?? null,
    payload: kab,
    source: kab.source,
    fetched_at: kab.fetched_at,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("weather_forecasts").upsert(rows, {
    onConflict: "kabupaten_kota",
  });
  if (error) {
    console.error("Supabase upsert failed:", error.message);
    process.exit(1);
  }
  console.log(`Supabase cache updated: ${rows.length} rows`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
