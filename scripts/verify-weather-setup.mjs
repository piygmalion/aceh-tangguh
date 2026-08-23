/**
 * Verify weather cache + cron configuration.
 * Usage: node scripts/verify-weather-setup.mjs
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.WEATHER_CRON_SECRET;
const REFRESH_URL = process.env.WEATHER_REFRESH_URL;

const checks = [];

function ok(name, detail) {
  checks.push({ name, status: "ok", detail });
  console.log(`✓ ${name}: ${detail}`);
}

function warn(name, detail) {
  checks.push({ name, status: "warn", detail });
  console.log(`! ${name}: ${detail}`);
}

function fail(name, detail) {
  checks.push({ name, status: "fail", detail });
  console.log(`✗ ${name}: ${detail}`);
}

async function main() {
  console.log("Aceh Tangguh — weather setup verification\n");

  if (SUPABASE_URL) ok("NEXT_PUBLIC_SUPABASE_URL", "set");
  else fail("NEXT_PUBLIC_SUPABASE_URL", "missing");

  if (ANON_KEY) ok("NEXT_PUBLIC_SUPABASE_ANON_KEY", "set");
  else fail("NEXT_PUBLIC_SUPABASE_ANON_KEY", "missing");

  if (SERVICE_KEY) ok("SUPABASE_SERVICE_ROLE_KEY", "set");
  else warn("SUPABASE_SERVICE_ROLE_KEY", "missing — cache upsert disabled");

  if (CRON_SECRET) ok("WEATHER_CRON_SECRET", "set");
  else warn("WEATHER_CRON_SECRET", "missing — /api/weather/refresh returns 503");

  if (REFRESH_URL) ok("WEATHER_REFRESH_URL", REFRESH_URL);
  else warn("WEATHER_REFRESH_URL", "missing — GitHub Actions skip Supabase job");

  if (SUPABASE_URL && ANON_KEY) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/weather_forecasts?select=kabupaten_kota,source,fetched_at&limit=1`,
        {
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${ANON_KEY}`,
          },
        },
      );
      if (res.status === 404 || res.status === 400) {
        const body = await res.json().catch(() => ({}));
        if (body?.code === "PGRST205") {
          fail(
            "weather_forecasts table",
            "not found — run supabase/migrations/20260824_weather_forecasts.sql",
          );
        } else {
          fail("weather_forecasts table", `HTTP ${res.status}`);
        }
      } else if (!res.ok) {
        fail("weather_forecasts table", `HTTP ${res.status}`);
      } else {
        const rows = await res.json();
        if (rows.length === 0) {
          warn("weather_forecasts cache", "table exists but empty — run npm run refresh:weather");
        } else {
          ok(
            "weather_forecasts cache",
            `${rows.length}+ row(s), latest: ${rows[0].kabupaten_kota} (${rows[0].source})`,
          );
        }
      }
    } catch (err) {
      fail("weather_forecasts table", err.message);
    }
  }

  try {
    const res = await fetch("http://localhost:3000/api/weather");
    if (res.ok) {
      const data = await res.json();
      ok(
        "local /api/weather",
        `${data.kabupaten_kota?.length ?? 0} kab, source=${data.metadata?.source}`,
      );
    } else {
      warn("local /api/weather", `HTTP ${res.status} — start dev server to test`);
    }
  } catch {
    warn("local /api/weather", "dev server not running on :3000");
  }

  if (REFRESH_URL && CRON_SECRET) {
    try {
      const res = await fetch(REFRESH_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
          "Content-Type": "application/json",
        },
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        ok("POST /api/weather/refresh", `refreshed ${body.refreshed} kab`);
      } else {
        fail("POST /api/weather/refresh", `HTTP ${res.status}: ${body.error ?? "unknown"}`);
      }
    } catch (err) {
      fail("POST /api/weather/refresh", err.message);
    }
  }

  const failed = checks.filter((c) => c.status === "fail").length;
  const warned = checks.filter((c) => c.status === "warn").length;
  console.log(`\nDone: ${failed} failed, ${warned} warnings`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
