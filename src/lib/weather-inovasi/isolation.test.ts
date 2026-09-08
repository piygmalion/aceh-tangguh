import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { emptyInovasiResponse } from "./types";
import { inovasiHttpStatus } from "./load";
import { CALON_SOURCES } from "@/lib/overlay-calon";
import { summarizeWeatherWarning } from "@/lib/peringatan-dini/weather-summary";
import type { WeatherApiResponse } from "@/lib/weather-types";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("AN-25 isolation: official weather vs WN3 inovasi", () => {
  it("official service and types do not mention WeatherNext or inovasi", () => {
    const service = read("src/lib/weather/service.ts");
    const types = read("src/lib/weather-types.ts");
    const officialRoute = read("src/app/api/weather/route.ts");
    const officialRefresh = read("src/app/api/weather/refresh/route.ts");
    const summary = read("src/lib/peringatan-dini/weather-summary.ts");
    const snapshotBuilder = read("scripts/build-weather-snapshot.mjs");
    for (const src of [service, types, officialRoute, officialRefresh, summary, snapshotBuilder]) {
      assert.doesNotMatch(src, /weathernext|weather-inovasi|weatherInovasi/i);
    }
    assert.match(types, /export type WeatherSource = "bmkg" \| "open-meteo" \| "cached" \| "fixture"/);
  });

  it("calon overlay sources stay BMKG MAGMA Sipongi Tatonas", () => {
    assert.deepEqual([...CALON_SOURCES], ["bmkg", "magma", "sipongi", "tatonas"]);
  });

  it("scoreKab path ignores inovasi payload shape", () => {
    const resmi: WeatherApiResponse = {
      metadata: {
        total_kabupaten_kota: 1,
        fetched_at: "2026-09-05T00:00:00.000Z",
        source: "bmkg",
        providers: ["bmkg"],
      },
      kabupaten_kota: [
        {
          slug: "banda-aceh",
          kabupaten_kota: "Banda Aceh",
          kabupaten_kota_kode: "BANDA ACEH",
          latitude: 5.55,
          longitude: 95.32,
          adm2: "11.71",
          is_kota: true,
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
          fetched_at: "2026-09-05T00:00:00.000Z",
        },
      ],
    };
    const card = summarizeWeatherWarning(resmi);
    assert.equal(card.empty, true);
    assert.equal(card.kind, "cuaca");
  });

  it("inovasi empty bodies stay unofficial and do not invent points", () => {
    const unconfigured = emptyInovasiResponse("unconfigured");
    assert.equal(unconfigured.metadata.official, false);
    assert.deepEqual(unconfigured.kabupaten_kota, []);
    assert.equal(inovasiHttpStatus(unconfigured), 200);
    assert.equal(inovasiHttpStatus(emptyInovasiResponse("upstream")), 503);
  });

  it("default inovasi fixture is unconfigured and empty", () => {
    const fixture = JSON.parse(
      read("public/fixtures/weather-inovasi-snapshot.json"),
    ) as { metadata: { official: boolean; status: string }; kabupaten_kota: unknown[] };
    assert.equal(fixture.metadata.official, false);
    assert.equal(fixture.metadata.status, "unconfigured");
    assert.deepEqual(fixture.kabupaten_kota, []);
  });

  it("inovasi GET does not import official weather service", () => {
    const route = read("src/app/api/weather/inovasi/route.ts");
    assert.doesNotMatch(route, /getWeatherForecasts|fetchBmkgForecast|open-meteo/);
    assert.match(route, /getWeatherInovasi/);
  });

  it("WeatherStrip still fetches only /api/weather", () => {
    const strip = read("src/components/weather/WeatherStrip.tsx");
    assert.match(strip, /\/api\/weather"/);
    assert.doesNotMatch(strip, /\/api\/weather\/inovasi/);
  });

  it("inovasi lives as a dialog inside homepage weather chrome, not a homepage section", () => {
    const page = read("src/app/[locale]/page.tsx");
    assert.match(page, /<CuacaStrip \/>/);
    assert.doesNotMatch(page, /WeatherInovasiStrip/);
    const cuaca = read("src/components/beranda/CuacaStrip.tsx");
    assert.match(cuaca, /WeatherInovasiStrip/);
    assert.doesNotMatch(cuaca, /\/api\/weather\/inovasi/);
    const official = read("src/components/weather/WeatherStrip.tsx");
    assert.match(official, /WeatherInovasiStrip/);
    assert.doesNotMatch(official, /\/api\/weather\/inovasi/);
    const strip = read("src/components/weather/WeatherInovasiStrip.tsx");
    assert.doesNotMatch(strip, /<section/);
    assert.doesNotMatch(strip, /id="cuaca-inovasi"/);
    assert.match(strip, /weatherInovasi/);
    assert.match(strip, /\/api\/weather\/inovasi/);
    assert.doesNotMatch(strip, /summarizeWeatherWarning|scoreKab/);
  });

  it("i18n inovasi copy matches AN-24", () => {
    const id = JSON.parse(read("messages/id.json")) as {
      weatherInovasi: Record<string, string>;
      weather: { attribution: string };
    };
    const en = JSON.parse(read("messages/en.json")) as {
      weatherInovasi: Record<string, string>;
    };
    assert.equal(id.weatherInovasi.pill, "Bukan peringatan resmi");
    assert.equal(en.weatherInovasi.pill, "Not an official warning");
    assert.match(id.weather.attribution, /BMKG/);
    assert.doesNotMatch(id.weather.attribution, /WeatherNext/);
  });
});
