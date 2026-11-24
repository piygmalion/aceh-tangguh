/**
 * Kontrak kesegaran dari berkas repo. Tidak memanggil produksi,
 * tidak membaca secret, dan tidak membuka cron.job_run_details.
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const PATHS = {
  overlay: join(ROOT, ".github/workflows/overlay-live-refresh.yml"),
  weather: join(ROOT, ".github/workflows/weather-refresh.yml"),
  dibi: join(ROOT, ".github/workflows/dibi-refresh.yml"),
  sipongi: join(ROOT, ".github/workflows/sipongi-refresh.yml"),
  route: join(ROOT, "src/app/api/weather/refresh/route.ts"),
  dibiFixture: join(ROOT, "public/fixtures/dibi-aceh.json"),
  sipongiFixture: join(ROOT, "public/fixtures/peringatan-sipongi.json"),
  weatherSnapshot: join(ROOT, "public/fixtures/weather-snapshot.json"),
};

const BEARER_LITERAL = /Bearer\s+(?!\{\{)['"]?[A-Za-z0-9._\-]{12,}/;

/**
 * @param {string | undefined} value
 */
export function isIsoTimestamp(value) {
  if (typeof value !== "string" || value.trim() === "") return false;
  return Number.isFinite(Date.parse(value));
}

/**
 * @param {{
 *   overlay: string,
 *   weather: string,
 *   dibi: string,
 *   sipongi: string,
 *   route: string,
 *   dibiFixture: { metadata?: { fetched_at?: unknown } },
 *   sipongiFixture: { fetched_at?: unknown, stale?: unknown, example?: unknown },
 *   weatherSnapshot: { metadata?: { fetched_at?: unknown, total_kabupaten_kota?: unknown }, kabupaten_kota?: unknown },
 * }} input
 * @returns {string[]}
 */
export function assessFreshnessContract(input) {
  /** @type {string[]} */
  const errors = [];
  if (!input.overlay.includes('cron: "*/15 * * * *"')) {
    errors.push("overlay-live-refresh tidak lagi menjadwalkan */15");
  }
  if (!input.overlay.includes("overlay-live-refresh")) {
    errors.push("nama job overlay-live-refresh hilang dari workflow");
  }
  if (!input.weather.includes("weather-refresh-hourly")) {
    errors.push("workflow cuaca tidak menyebut job weather-refresh-hourly");
  }
  if (!input.weather.includes('cron: "0 */6 * * *"')) {
    errors.push("cadangan GitHub cuaca tidak lagi 0 */6 * * *");
  }
  if (!input.dibi.includes('cron: "0 2 * * 1-5"')) {
    errors.push("jadwal fixture DIBI berubah");
  }
  if (!input.sipongi.includes("cron:")) {
    errors.push("workflow SiPongi tidak punya jadwal");
  }
  if (!/4\s*\*\s*60\s*\*\s*60\s*\*\s*1000/.test(input.route)) {
    errors.push("TTL cache cuaca di route bukan 4 jam");
  }
  for (const [name, text] of [
    ["overlay", input.overlay],
    ["cuaca", input.weather],
    ["dibi", input.dibi],
    ["sipongi", input.sipongi],
  ]) {
    if (BEARER_LITERAL.test(text)) errors.push(`${name} memuat token Bearer`);
  }
  if (!isIsoTimestamp(input.dibiFixture.metadata?.fetched_at)) {
    errors.push("fixture DIBI tanpa fetched_at");
  }
  if (!isIsoTimestamp(input.sipongiFixture.fetched_at)) {
    errors.push("fixture SiPongi tanpa fetched_at");
  }
  if (input.sipongiFixture.stale !== false) errors.push("fixture SiPongi ditandai stale");
  if (input.sipongiFixture.example !== false) errors.push("fixture SiPongi ditandai example");
  if (!isIsoTimestamp(input.weatherSnapshot.metadata?.fetched_at)) {
    errors.push("snapshot cuaca tanpa fetched_at");
  }
  const declared = input.weatherSnapshot.metadata?.total_kabupaten_kota;
  const rows = input.weatherSnapshot.kabupaten_kota;
  if (typeof declared !== "number" || !Array.isArray(rows) || rows.length !== declared) {
    errors.push("jumlah baris snapshot cuaca tidak sama dengan metadata");
  }
  return errors;
}

async function main() {
  const [overlay, weather, dibi, sipongi, route, dibiRaw, sipongiRaw, weatherRaw] =
    await Promise.all([
      readFile(PATHS.overlay, "utf8"),
      readFile(PATHS.weather, "utf8"),
      readFile(PATHS.dibi, "utf8"),
      readFile(PATHS.sipongi, "utf8"),
      readFile(PATHS.route, "utf8"),
      readFile(PATHS.dibiFixture, "utf8"),
      readFile(PATHS.sipongiFixture, "utf8"),
      readFile(PATHS.weatherSnapshot, "utf8"),
    ]);
  const errors = assessFreshnessContract({
    overlay,
    weather,
    dibi,
    sipongi,
    route,
    dibiFixture: JSON.parse(dibiRaw),
    sipongiFixture: JSON.parse(sipongiRaw),
    weatherSnapshot: JSON.parse(weatherRaw),
  });
  if (errors.length > 0) {
    console.error("Kontrak kesegaran gagal");
    for (const error of errors) console.error(`  ${error}`);
    process.exit(1);
  }
  console.log(
    "Kontrak kesegaran berkas lulus (jadwal workflow, TTL 4 jam di kode, cap waktu fixture). Produksi dan cron.job_run_details tidak dibaca.",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
