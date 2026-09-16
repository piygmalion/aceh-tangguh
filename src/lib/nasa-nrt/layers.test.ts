import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultGibsDate,
  encodeNasaNrtLayers,
  gibsTileUrl,
  GIBS_THERMAL,
  GIBS_TRUE_COLOR,
  parseNasaDate,
  parseNasaNrtLayers,
  worldviewHref,
} from "./layers";

describe("NASA NRT URL helpers (AN-57)", () => {
  it("parses allowlist tokens and drops overlay keys", () => {
    assert.deepEqual(parseNasaNrtLayers(null), []);
    assert.deepEqual(
      parseNasaNrtLayers("gibsTrueColor,sipongiHotspots,firmsHotspots,gibsTrueColor"),
      ["gibsTrueColor", "firmsHotspots"],
    );
    assert.equal(
      encodeNasaNrtLayers(["gibsTrueColor", "firmsHotspots"]),
      "gibsTrueColor,firmsHotspots",
    );
  });

  it("defaults GIBS date to UTC yesterday and rejects future days", () => {
    const now = new Date(Date.UTC(2026, 8, 9, 15, 0, 0));
    assert.equal(defaultGibsDate(now), "2026-09-08");
    assert.equal(parseNasaDate("2026-09-08", now), "2026-09-08");
    assert.equal(parseNasaDate("not-a-date", now), "2026-09-08");
    assert.equal(parseNasaDate("2026-09-10", now), "2026-09-08");
    assert.equal(parseNasaDate("2026-09-09", now), "2026-09-09");
  });

  it("builds allowlisted WMTS REST templates only", () => {
    const url = gibsTileUrl(GIBS_TRUE_COLOR, "2026-09-08");
    assert.match(url, /epsg3857\/best\/VIIRS_SNPP_CorrectedReflectance_TrueColor/);
    assert.match(url, /GoogleMapsCompatible_Level9\/\{z\}\/\{y\}\/\{x\}\.jpg/);
    assert.match(
      gibsTileUrl(GIBS_THERMAL, "2026-09-08"),
      /VIIRS_SNPP_Thermal_Anomalies_375m_Night/,
    );
    assert.match(worldviewHref("2026-09-08", [GIBS_TRUE_COLOR.layer]), /worldview\.earthdata\.nasa\.gov/);
  });
});
