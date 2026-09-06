import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  humidityFromTandTd,
  kelvinToC,
  metersToMm,
  msToKmh,
  windDirectionFromUv,
} from "./convert";

describe("weather-inovasi convert", () => {
  it("converts Kelvin, meters, and m/s", () => {
    assert.equal(kelvinToC(273.15), 0);
    assert.equal(metersToMm(0.01), 10);
    assert.equal(msToKmh(2.5), 9);
  });

  it("does not invent humidity when dewpoint is missing", () => {
    assert.equal(humidityFromTandTd(26, null), null);
    assert.ok((humidityFromTandTd(26, 22) ?? 0) > 50);
  });

  it("derives meteorological wind direction from u/v", () => {
    const deg = windDirectionFromUv(0, -5);
    assert.ok(deg != null);
    assert.ok(deg >= 0 && deg < 360);
  });
});
