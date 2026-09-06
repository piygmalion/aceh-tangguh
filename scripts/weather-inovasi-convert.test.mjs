import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  humidityFromTandTd,
  kelvinToC,
  metersToMm,
  msToKmh,
} from "./lib/weather-inovasi-convert.mjs";
import {
  ACEH_INOVASI_BBOX,
  convertRawPoint,
  isEarthEngineConfigured,
  unconfiguredSnapshot,
} from "./build-weather-inovasi-snapshot.mjs";

describe("weather inovasi convert (DATA-13)", () => {
  it("converts WN3 native units", () => {
    assert.equal(kelvinToC(300.15), 27);
    assert.equal(metersToMm(0.0015), 1.5);
    assert.equal(msToKmh(10), 36);
  });

  it("returns null for non-finite inputs and does not invent humidity", () => {
    assert.equal(kelvinToC(Number.NaN), null);
    assert.equal(humidityFromTandTd(27, null), null);
    const rh = humidityFromTandTd(27, 20);
    assert.ok(rh != null && rh > 0 && rh <= 100);
  });

  it("unconfigured snapshot has no weather numbers", () => {
    const snap = unconfiguredSnapshot();
    assert.equal(snap.metadata.official, false);
    assert.equal(snap.metadata.status, "unconfigured");
    assert.deepEqual(snap.kabupaten_kota, []);
    assert.equal(JSON.stringify(snap).includes("temperature_c"), false);
  });

  it("is unconfigured without EE project + credential", () => {
    assert.equal(isEarthEngineConfigured({}), false);
    assert.equal(
      isEarthEngineConfigured({ WEATHERNEXT_EE_PROJECT: "p" }),
      false,
    );
    assert.equal(
      isEarthEngineConfigured({
        WEATHERNEXT_EE_PROJECT: "p",
        WEATHERNEXT_EE_ACCESS_TOKEN: "t",
      }),
      true,
    );
  });

  it("uses ACEH_BBOX not laporan ACEH_BOUNDS", () => {
    assert.deepEqual(ACEH_INOVASI_BBOX, [95.0, 2.0, 98.3, 6.15]);
  });

  it("maps a raw EE point through convertRawPoint", () => {
    const point = convertRawPoint(
      {
        slug: "banda-aceh",
        kabupaten_kota: "Banda Aceh",
        latitude: 5.55,
        longitude: 95.32,
      },
      {
        temperature_k: 300.15,
        dewpoint_k: 294.15,
        temperature_p10_k: 298.15,
        temperature_p90_k: 302.15,
        precip_m: 0.002,
        precip_p90_m: 0.004,
        wind_ms: 5,
        forecast_hour: 6,
        valid_time: "2026-09-05T12:00:00Z",
      },
    );
    assert.equal(point.temperature_c, 27);
    assert.equal(point.precipitation_mm, 2);
    assert.equal(point.wind_speed_kmh, 18);
    assert.equal(point.weather_code, undefined);
  });
});
