import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyOverlayHealth,
  parseOverlayResponse,
  strongestLiveOverlayAlert,
} from "./useOverlayGeojson";

const quake = {
  type: "Feature" as const,
  id: "bmkg-cached",
  geometry: { type: "Point" as const, coordinates: [95.3, 5.5] },
  properties: { layer: "bmkgQuakes", title: "Gempa cache" },
};

describe("parseOverlayResponse", () => {
  it("does not treat 503 + upstream as an unlabeled empty success", () => {
    const parsed = parseOverlayResponse({
      ok: false,
      status: 503,
      body: {
        type: "FeatureCollection",
        features: [],
        stale: true,
        error: "upstream",
      },
    });
    assert.equal(parsed.health, "upstream");
    assert.equal(parsed.stale, true);
    assert.equal(parsed.error, "upstream");
    assert.equal(parsed.collection.features.length, 0);
    assert.notEqual(parsed.health, "ok");
  });

  it("keeps stale cached features on HTTP 200", () => {
    const parsed = parseOverlayResponse({
      ok: true,
      status: 200,
      body: {
        type: "FeatureCollection",
        features: [quake],
        stale: true,
      },
    });
    assert.equal(parsed.health, "stale");
    assert.equal(parsed.collection.features.length, 1);
    assert.equal(parsed.collection.features[0].id, "bmkg-cached");
    assert.equal(parsed.error, null);
  });

  it("keeps features on 503 if the body still has them", () => {
    const parsed = parseOverlayResponse({
      ok: false,
      status: 503,
      body: {
        type: "FeatureCollection",
        features: [quake],
        stale: true,
        error: "upstream",
      },
    });
    assert.equal(parsed.health, "upstream");
    assert.equal(parsed.collection.features.length, 1);
  });

  it("treats a successful empty collection as ok, not stale", () => {
    const parsed = parseOverlayResponse({
      ok: true,
      status: 200,
      body: { type: "FeatureCollection", features: [] },
    });
    assert.equal(parsed.health, "ok");
    assert.equal(parsed.stale, false);
    assert.equal(parsed.error, null);
    assert.deepEqual(parsed.collection.features, []);
  });

  it("marks unreadable non-2xx as failed without inventing features", () => {
    const parsed = parseOverlayResponse({
      ok: false,
      status: 502,
      body: { error: "bad gateway" },
    });
    assert.equal(parsed.health, "failed");
    assert.deepEqual(parsed.collection.features, []);
  });
});

describe("classifyOverlayHealth", () => {
  it("prefers upstream over stale when both flags are set", () => {
    assert.equal(
      classifyOverlayHealth({
        ok: false,
        status: 503,
        stale: true,
        upstream: true,
      }),
      "upstream",
    );
  });
});

describe("strongestLiveOverlayAlert", () => {
  it("surfaces upstream ahead of stale", () => {
    assert.equal(
      strongestLiveOverlayAlert({
        bmkgQuakes: "stale",
        magmaQuakes: "upstream",
      }),
      "upstream",
    );
    assert.equal(strongestLiveOverlayAlert({ bmkgQuakes: "stale" }), "stale");
    assert.equal(strongestLiveOverlayAlert({ bmkgQuakes: "ok" }), null);
  });
});
