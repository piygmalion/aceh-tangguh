import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import type { FeatureCollection } from "geojson";
import { summarizeMarkerLayers } from "./markers-summary";

const mixed: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: "lap-1",
      geometry: { type: "Point", coordinates: [95.3, 5.5] },
      properties: { layer: "laporanKejadian" },
    },
    {
      type: "Feature",
      id: "ops-1",
      geometry: { type: "Point", coordinates: [95.4, 5.4] },
      properties: { layer: "disasterEvents", source: "kejadian_operasi" },
    },
    {
      type: "Feature",
      id: "peng-1",
      geometry: { type: "Point", coordinates: [95.2, 5.6] },
      properties: { layer: "tendPoints", source: "tempat_pengungsian" },
    },
  ],
};

describe("marker summary matches marker sources", () => {
  it("counts operasi and pengungsian, not only laporan overlays", () => {
    const summary = summarizeMarkerLayers(mixed);
    assert.equal(summary.total, 3);
    assert.equal(summary.byLayer.laporanKejadian, 1);
    assert.equal(summary.byLayer.disasterEvents, 1);
    assert.equal(summary.byLayer.tendPoints, 1);
  });

  it("wires summary and marker GET to the same public collection loader", () => {
    const summarySrc = readFileSync(
      path.join(process.cwd(), "src/app/api/layers/markers/summary/route.ts"),
      "utf8",
    );
    const markerSrc = readFileSync(
      path.join(process.cwd(), "src/app/api/layers/markers/route.ts"),
      "utf8",
    );
    const loaderSrc = readFileSync(
      path.join(process.cwd(), "src/app/api/layers/markers/load-public.ts"),
      "utf8",
    );
    assert.match(summarySrc, /loadPublicMarkerCollection/);
    assert.match(markerSrc, /loadPublicMarkerCollection/);
    assert.match(loaderSrc, /mergeLaporanOverlays/);
    assert.match(loaderSrc, /mergeOperasiDisasterEvents/);
    assert.match(loaderSrc, /mergePengungsianOverlays/);
    assert.equal(summarySrc.includes("export async function POST"), false);
  });
});
