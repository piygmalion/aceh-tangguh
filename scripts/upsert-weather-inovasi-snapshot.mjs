/**
 * DATA-19: upsert fixture into weather_inovasi_snapshot + expires_at.
 * Does not write official forecasts. Official strip stays on its own table.
 * Cron POST /api/weather/inovasi/refresh may stay stub until EE allowlist.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const FIXTURE = path.join(
  process.cwd(),
  "public/fixtures/weather-inovasi-snapshot.json",
);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const raw = await readFile(FIXTURE, "utf8");
const payload = JSON.parse(raw);
if (!payload?.metadata || !Array.isArray(payload.kabupaten_kota)) {
  console.error("Fixture is not an inovasi snapshot");
  process.exit(1);
}

const fetchedAt = new Date().toISOString();
const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
const supabase = createClient(url, serviceKey);
const { error } = await supabase.from("weather_inovasi_snapshot").upsert({
  id: 1,
  payload,
  fetched_at: fetchedAt,
  expires_at: expiresAt,
  updated_at: fetchedAt,
});

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(
  JSON.stringify({
    upserted: true,
    points: payload.kabupaten_kota.length,
    expires_at: expiresAt,
  }),
);
