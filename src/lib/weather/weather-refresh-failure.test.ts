import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import type { KabWeatherRegistryEntry, WeatherForecastKab } from "@/lib/weather-types";

const ROOT = process.cwd();
const WORKFLOW = ".github/workflows/weather-refresh.yml";
const CRON_SECRET = "cron-test-secret";
const SERVICE_KEY = "service-role-test-key";

const entry: KabWeatherRegistryEntry = {
  slug: "banda-aceh",
  kabupaten_kota: "Kota Banda Aceh",
  kabupaten_kota_kode: "BANDA ACEH",
  adm2: "11.71",
  adm4: "1171010001",
  latitude: 5.55,
  longitude: 95.32,
  is_kota: true,
};

function forecastFor(kab: KabWeatherRegistryEntry): WeatherForecastKab {
  return {
    slug: kab.slug,
    kabupaten_kota: kab.kabupaten_kota,
    kabupaten_kota_kode: kab.kabupaten_kota_kode,
    latitude: kab.latitude,
    longitude: kab.longitude,
    adm2: kab.adm2,
    adm4: kab.adm4,
    is_kota: kab.is_kota,
    current: {
      temperature_c: 30,
      humidity_pct: 80,
      weather_code: 0,
      weather_desc_id: "Cerah",
      weather_desc_en: "Clear",
      wind_speed_kmh: 5,
      wind_direction_deg: 90,
      precipitation_mm: 0,
    },
    hourly: [],
    daily: [],
    source: "bmkg",
    fetched_at: "2026-10-28T00:00:00.000Z",
  };
}

function workflowText(): string {
  return readFileSync(path.join(ROOT, WORKFLOW), "utf8");
}

function supabaseStep(wf: string): string {
  const start = wf.indexOf("name: Trigger deployed weather cache refresh");
  assert.ok(start >= 0, "refresh-supabase step missing");
  return wf.slice(start);
}

function secretBranch(step: string): string {
  const start = step.indexOf('if [ -z "$WEATHER_CRON_SECRET" ]; then');
  const end = step.indexOf("\n          fi", start);
  assert.ok(start >= 0 && end > start, "empty-secret branch missing");
  return step.slice(start, end);
}

type RouteModule = typeof import("@/app/api/weather/refresh/route");

async function loadRoute(): Promise<RouteModule> {
  const route = await import("@/app/api/weather/refresh/route");
  assert.ok(route.weatherRefreshDeps, "weatherRefreshDeps missing");
  if (!originalDeps) originalDeps = { ...route.weatherRefreshDeps };
  routeModule = route;
  return route;
}

const envKeys = ["WEATHER_CRON_SECRET", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL"] as const;
const savedEnv = new Map<string, string | undefined>();
let routeModule: RouteModule | undefined;
let originalDeps: RouteModule["weatherRefreshDeps"] | undefined;

function rememberEnv() {
  if (savedEnv.size > 0) return;
  for (const key of envKeys) savedEnv.set(key, process.env[key]);
}

function restoreEnv() {
  for (const key of envKeys) {
    if (!savedEnv.has(key)) continue;
    const value = savedEnv.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

afterEach(() => {
  restoreEnv();
  if (routeModule && originalDeps) {
    routeModule.weatherRefreshDeps.loadRegistry = originalDeps.loadRegistry;
    routeModule.weatherRefreshDeps.fetchBmkgForecast = originalDeps.fetchBmkgForecast;
    routeModule.weatherRefreshDeps.fetchOpenMeteoForecast = originalDeps.fetchOpenMeteoForecast;
    routeModule.weatherRefreshDeps.createWriter = originalDeps.createWriter;
    routeModule.weatherRefreshDeps.revalidateTag = originalDeps.revalidateTag;
  }
});

describe("BE-80 weather refresh failures", () => {
  it("fails the workflow step when the refresh URL is set and the cron secret is empty", () => {
    const wf = workflowText();
    assert.equal(wf.includes('cron: "0 */6 * * *"'), true);
    assert.equal(wf.includes("pg_cron is primary"), true);
    assert.equal(wf.includes('cron: "0 */3 * * *"'), false);
    assert.equal(wf.includes("if: ${{ vars.WEATHER_REFRESH_URL != '' }}"), true);

    const step = supabaseStep(wf);
    const branch = secretBranch(step);
    assert.match(branch, /exit 1/);
    assert.equal(branch.includes("exit 0"), false);
    const echo = branch.split("\n").find((line) => line.includes("echo "));
    assert.ok(echo, "empty-secret branch has no message");
    assert.equal(echo.includes("$"), false);
    assert.match(echo, /WEATHER_REFRESH_URL is set but WEATHER_CRON_SECRET is empty/);
    assert.match(step, /curl -fsS -X POST "\$WEATHER_REFRESH_URL"/);

    const scriptStart = step.indexOf('if [ -z "$WEATHER_CRON_SECRET" ]; then');
    const script = step.slice(scriptStart);
    const run = spawnSync("bash", ["-c", script], {
      env: {
        ...process.env,
        WEATHER_CRON_SECRET: "",
        WEATHER_REFRESH_URL: "http://127.0.0.1:9/weather-refresh-test",
      },
      encoding: "utf8",
    });
    assert.equal(run.status, 1);
    assert.match(run.stdout, /WEATHER_CRON_SECRET is empty/);
    assert.equal(`${run.stdout}${run.stderr}`.includes("127.0.0.1"), false);
  });

  it("returns 502 when the supabase upsert mock returns an error", async () => {
    rememberEnv();
    process.env.WEATHER_CRON_SECRET = CRON_SECRET;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:9";

    const route = await loadRoute();
    const second: KabWeatherRegistryEntry = {
      ...entry,
      slug: "aceh-besar",
      kabupaten_kota: "Kabupaten Aceh Besar",
      adm4: "1108012001",
    };
    route.weatherRefreshDeps.loadRegistry = async () => [entry, second];
    route.weatherRefreshDeps.fetchBmkgForecast = async (kab) => forecastFor(kab);
    route.weatherRefreshDeps.fetchOpenMeteoForecast = async () => {
      throw new Error("open-meteo must not run");
    };
    const revalidated: string[] = [];
    route.weatherRefreshDeps.revalidateTag = (tag) => {
      revalidated.push(tag);
    };
    let writes = 0;
    route.weatherRefreshDeps.createWriter = () => ({
      from(table) {
        assert.equal(table, "weather_forecasts");
        return {
          upsert: async () => {
            writes += 1;
            return { error: { code: "42P01", message: "relation weather_forecasts does not exist" } };
          },
        };
      },
    });

    const logs: unknown[][] = [];
    const origErr = console.error;
    console.error = (...args: unknown[]) => {
      logs.push(args);
    };
    try {
      const response = await route.POST(
        new Request("http://127.0.0.1/api/weather/refresh", {
          method: "POST",
          headers: { authorization: `Bearer ${CRON_SECRET}` },
        }),
      );
      const body = await response.json();
      assert.equal(response.status, 502);
      assert.deepEqual(body, { ok: false, error: "upsert_failed", failed: 2 });
      assert.equal(writes, 2);
      assert.deepEqual(revalidated, []);
      const logged = JSON.stringify(logs);
      assert.match(logged, /42P01/);
      assert.match(logged, /relation weather_forecasts does not exist/);
      assert.equal(logged.includes(CRON_SECRET), false);
      assert.equal(logged.includes(SERVICE_KEY), false);
      assert.equal(logged.includes("Bearer"), false);
    } finally {
      console.error = origErr;
    }
  });

  it("returns the current 200 body when every upsert succeeds", async () => {
    rememberEnv();
    process.env.WEATHER_CRON_SECRET = CRON_SECRET;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:9";

    const route = await loadRoute();
    route.weatherRefreshDeps.loadRegistry = async () => [entry];
    route.weatherRefreshDeps.fetchBmkgForecast = async (kab) => ({
      ...forecastFor(kab),
      fetched_at: new Date().toISOString(),
    });
    route.weatherRefreshDeps.fetchOpenMeteoForecast = async () => {
      throw new Error("open-meteo must not run");
    };
    const revalidated: string[] = [];
    route.weatherRefreshDeps.revalidateTag = (tag) => {
      revalidated.push(tag);
    };
    let written: { fetched_at?: string; expires_at?: string } | undefined;
    route.weatherRefreshDeps.createWriter = () => ({
      from() {
        return {
          upsert: async (row: Record<string, unknown>) => {
            written = row;
            return { error: null };
          },
        };
      },
    });

    const logs: unknown[][] = [];
    const origErr = console.error;
    console.error = (...args: unknown[]) => {
      logs.push(args);
    };
    try {
      const response = await route.POST(
        new Request("http://127.0.0.1/api/weather/refresh", {
          method: "POST",
          headers: { authorization: `Bearer ${CRON_SECRET}` },
        }),
      );
      const body = (await response.json()) as {
        refreshed?: number;
        providers?: string[];
        expires_at?: string;
        ok?: boolean;
        error?: string;
      };
      assert.equal(response.status, 200);
      assert.equal(body.refreshed, 1);
      assert.deepEqual(body.providers, ["bmkg"]);
      assert.equal(body.expires_at, written?.expires_at);
      const fetchedMs = Date.parse(written?.fetched_at ?? "");
      const expiresMs = Date.parse(written?.expires_at ?? "");
      const fourHours = 4 * 60 * 60 * 1000;
      assert.ok(Number.isFinite(fetchedMs) && Number.isFinite(expiresMs));
      assert.ok(Math.abs(expiresMs - fetchedMs - fourHours) < 5000);
      assert.equal(body.ok, undefined);
      assert.equal(body.error, undefined);
      assert.deepEqual(logs, []);
      assert.deepEqual(revalidated, ["weather"]);
    } finally {
      console.error = origErr;
    }
  });

  it("keeps 401 and 503 before any upsert", async () => {
    rememberEnv();
    const route = await loadRoute();
    let writes = 0;
    route.weatherRefreshDeps.createWriter = () => {
      writes += 1;
      throw new Error("upsert must not run");
    };

    delete process.env.WEATHER_CRON_SECRET;
    const unconfigured = await route.POST(
      new Request("http://127.0.0.1/api/weather/refresh", { method: "POST" }),
    );
    assert.equal(unconfigured.status, 503);

    process.env.WEATHER_CRON_SECRET = CRON_SECRET;
    const denied = await route.POST(
      new Request("http://127.0.0.1/api/weather/refresh", {
        method: "POST",
        headers: { authorization: "Bearer wrong-token" },
      }),
    );
    assert.equal(denied.status, 401);

    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const noKey = await route.POST(
      new Request("http://127.0.0.1/api/weather/refresh", {
        method: "POST",
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      }),
    );
    assert.equal(noKey.status, 503);
    assert.equal(writes, 0);
  });
});
