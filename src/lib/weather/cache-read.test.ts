import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { composeDailyBrief, feedAvailability } from "@/lib/daily-brief/compose";
import {
  emptyMaritimCard,
  unavailableMagmaCard,
  type CuacaWarningCard,
  type PeringatanDiniResponse,
} from "@/lib/peringatan-dini-types";
import { emptyTatonasCard } from "@/lib/tatonas/parse";
import type { WeatherApiResponse, WeatherForecastKab } from "@/lib/weather-types";

const ROOT = process.cwd();
const NOW_MS = Date.parse("2026-10-28T02:00:00.000Z");
const FUTURE = "2026-10-28T04:00:00.000Z";
const PAST = "2026-10-28T01:00:00.000Z";
const FETCHED = "2026-10-28T00:00:00.000Z";

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

function kab(
  slug: string,
  expiresAt: string | null,
  storm = false,
): {
  payload: WeatherForecastKab;
  source: string;
  fetched_at: string;
  expires_at: string | null;
} {
  const name = storm ? "Kabupaten Basi" : slug;
  return {
    source: "bmkg",
    fetched_at: FETCHED,
    expires_at: expiresAt,
    payload: {
      slug,
      kabupaten_kota: name,
      kabupaten_kota_kode: slug.toUpperCase(),
      latitude: 5.5,
      longitude: 95.3,
      adm2: "11.71",
      is_kota: false,
      current: {
        temperature_c: storm ? 41 : 28,
        humidity_pct: 80,
        weather_code: storm ? 95 : 0,
        weather_desc_id: storm ? "Hujan petir" : "Cerah",
        weather_desc_en: storm ? "Thunderstorm" : "Clear",
        wind_speed_kmh: storm ? 70 : 5,
        wind_direction_deg: 90,
        precipitation_mm: storm ? 80 : 0,
      },
      hourly: [],
      daily: [],
      source: "bmkg",
      fetched_at: FETCHED,
    },
  };
}

function freshRows(count: number) {
  return Array.from({ length: count }, (_, index) => kab(`segar-${index}`, FUTURE));
}

function stormBody(): WeatherApiResponse {
  const row = kab("basi-petir", PAST, true);
  return {
    metadata: {
      total_kabupaten_kota: 1,
      fetched_at: FETCHED,
      source: "cached",
      providers: ["bmkg"],
    },
    kabupaten_kota: [row.payload],
  };
}

function peringatan(cuaca: CuacaWarningCard): PeringatanDiniResponse {
  return {
    cuaca,
    magma: unavailableMagmaCard(FETCHED),
    sipongi: {
      kind: "sipongi",
      tone: "neutral",
      empty: true,
      points: [],
      fetched_at: null,
      href: "https://sipongi.gakkum.kehutanan.go.id/peta",
      stale: false,
      source: "live",
    },
    tatonas: emptyTatonasCard({ source: "live", fetched_at: FETCHED, stale: false }),
    maritim: emptyMaritimCard(FETCHED),
  };
}

describe("BE-79 weather cache expiry", () => {
  it("locks the 4 hour write TTL against the 3 hour GitHub schedule", () => {
    const workflow = read(".github/workflows/weather-refresh.yml");
    const route = read("src/app/api/weather/refresh/route.ts");
    const alias = read("src/app/api/cron/weather/route.ts");
    assert.match(workflow, /cron:\s*"0 \*\/3 \* \* \*"/);
    assert.match(route, /4 \* 60 \* 60 \* 1000/);
    assert.doesNotMatch(route, /2 \* 60 \* 60 \* 1000/);
    assert.match(alias, /weather\/refresh\/route/);
    assert.doesNotMatch(workflow, /pg_cron/);
    assert.equal(4 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000, 60 * 60 * 1000);
  });

  it("selects expires_at and returns expired cache before any live or fixture fallback", () => {
    const src = read("src/lib/weather/service.ts");
    const pd = read("src/lib/peringatan-dini/service.ts");
    assert.match(src, /select\("payload, source, fetched_at, expires_at"\)/);
    assert.doesNotMatch(src, /select\("kabupaten_kota, payload, source, fetched_at"\)/);
    assert.match(src, /classifyWeatherCache/);
    const expiredAt = src.indexOf('decision.kind === "expired"');
    const fallbackCall = src.indexOf("loadWeatherFallback()");
    assert.ok(expiredAt > 0);
    assert.ok(fallbackCall > expiredAt);
    const cuacaFn = pd.slice(
      pd.indexOf("async function getCuacaPeringatan"),
      pd.indexOf("export async function getPeringatanDini"),
    );
    assert.match(cuacaFn, /getOfficialWeatherRead/);
    assert.match(cuacaFn, /cuacaCardFromOfficialRead\(read\.kind, read\.body, CUACA_HREF\)/);
    assert.doesNotMatch(cuacaFn, /summarizeWeatherWarning\(weather/);
  });

  it("drops rows past expires_at and does not serve them as a current forecast", async () => {
    const cache = await import("./cache-read");
    const summary = await import("../peringatan-dini/weather-summary");
    assert.equal(cache.WEATHER_CACHE_MIN_ROWS, 20);
    assert.equal(typeof summary.cuacaCardFromOfficialRead, "function");

    const rows = [
      ...freshRows(20),
      kab("basi-petir", PAST, true),
    ];
    const decision = cache.classifyWeatherCache(rows, NOW_MS);
    assert.equal(decision.kind, "fresh");
    if (decision.kind !== "fresh") return;
    const body = cache.weatherApiFromFreshRows(decision.rows);
    assert.equal(body.kabupaten_kota.length, 20);
    assert.equal(body.metadata.source, "cached");
    assert.equal(body.metadata.fetched_at, FETCHED);
    assert.equal(JSON.stringify(body).includes("Kabupaten Basi"), false);
    assert.equal(JSON.stringify(body).includes("basi-petir"), false);
    assert.equal(JSON.stringify(body).includes("41"), false);

    const card = summary.cuacaCardFromOfficialRead("current", body);
    assert.equal(card.source, "live");
    assert.equal(card.stale, false);
    assert.equal(card.empty, true);
    assert.equal(card.fetched_at, FETCHED);
    assert.equal(Object.hasOwn(card, "reason"), false);
  });

  it("fail-closes an expired cache without old highlights or a made-up timestamp", async () => {
    const cache = await import("./cache-read");
    const summary = await import("../peringatan-dini/weather-summary");
    const rows = Array.from({ length: 23 }, (_, index) =>
      kab(index === 0 ? "basi-petir" : `basi-${index}`, PAST, index === 0),
    );
    assert.equal(cache.classifyWeatherCache(rows, NOW_MS).kind, "expired");
    assert.equal(cache.classifyWeatherCache([kab("satu", new Date(NOW_MS).toISOString(), true)], NOW_MS).kind, "expired");
    assert.equal(cache.classifyWeatherCache([kab("kosong", null, true)], NOW_MS).kind, "expired");
    assert.equal(cache.classifyWeatherCache([kab("rusak", "bukan-tanggal", true)], NOW_MS).kind, "expired");
    assert.equal(cache.classifyWeatherCache(freshRows(19), NOW_MS).kind, "miss");
    assert.equal(cache.classifyWeatherCache([], NOW_MS).kind, "miss");
    assert.equal(cache.classifyWeatherCache(null, NOW_MS).kind, "miss");

    const offsetFuture = "2026-10-28T10:00:00+07:00";
    const offsetPast = "2026-10-28T07:00:00+07:00";
    assert.equal(cache.classifyWeatherCache(freshRows(19).concat(kab("zona", offsetFuture)), NOW_MS).kind, "fresh");
    assert.equal(cache.classifyWeatherCache([kab("zona-basi", offsetPast, true)], NOW_MS).kind, "expired");

    const mixedShort = freshRows(19).concat(kab("basi-petir", PAST, true));
    assert.equal(cache.classifyWeatherCache(mixedShort, NOW_MS).kind, "expired");

    const body = cache.expiredWeatherApiResponse();
    assert.deepEqual(body.kabupaten_kota, []);
    assert.equal(body.metadata.total_kabupaten_kota, 0);
    assert.equal(body.metadata.fetched_at, null);
    assert.deepEqual(body.metadata.providers, []);

    const card = summary.cuacaCardFromOfficialRead("expired", stormBody());
    assert.equal(card.empty, true);
    assert.equal(card.stale, true);
    assert.equal(card.source, "unavailable");
    assert.deepEqual(card.highlights, []);
    assert.equal(card.extra_count, 0);
    assert.deepEqual(card.providers, []);
    assert.equal(card.fetched_at, null);
    assert.equal(card.tone, "neutral");
    assert.equal(Object.hasOwn(card, "reason"), false);
    assert.equal(JSON.stringify(card).includes("Kabupaten Basi"), false);
    assert.equal(JSON.stringify(card).includes("Hujan petir"), false);

    assert.equal(feedAvailability(card), "unavailable");
    const brief = composeDailyBrief({
      briefDate: "2026-10-28",
      peringatan: peringatan(card),
      gempa: { queryOk: true, count: 0 },
      kejadian: { rowOk: true, activeIncidents: 0 },
      composedAt: FETCHED,
    });
    const cuaca = brief.feeds.find((feed) => feed.kind === "cuaca");
    assert.equal(cuaca?.availability, "unavailable");
    assert.equal(cuaca?.headline, "data tertunda");
    assert.equal(JSON.stringify(brief).includes("Kabupaten Basi"), false);
    assert.equal(JSON.stringify(brief).includes("Hujan petir"), false);
  });
});
