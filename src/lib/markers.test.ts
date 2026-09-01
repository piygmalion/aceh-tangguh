import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FeatureCollection } from "geojson";
import { featureFromRow, filterMarkersByKeys } from "./markers";
import type { MarkerFeatureRow } from "./supabase/types";

function row(partial: Partial<MarkerFeatureRow> & Pick<MarkerFeatureRow, "id" | "layer">): MarkerFeatureRow {
  return {
    title: "Titik",
    status: null,
    kabupaten: null,
    longitude: 96.12,
    latitude: 4.45,
    properties: {},
    updated_at: "2026-01-01T00:00:00Z",
    ...partial,
  };
}

describe("featureFromRow layer column", () => {
  it("uses the layer column when properties.layer is empty", () => {
    const feature = featureFromRow(
      row({ id: "a", layer: "disasterEvents", properties: { layer: "" } })
    );
    assert.equal(feature.properties?.layer, "disasterEvents");
  });

  it("overwrites a stale properties.layer with the column", () => {
    const feature = featureFromRow(
      row({
        id: "b",
        layer: "facHealth",
        properties: { layer: "poskos", title: "RSUD" },
      })
    );
    assert.equal(feature.properties?.layer, "facHealth");
    assert.equal(feature.properties?.title, "RSUD");
  });

  it("keeps toolbar filtering aligned with the column", () => {
    const fc: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        featureFromRow(
          row({ id: "c", layer: "facHealth", properties: { layer: "poskos" } })
        ),
      ],
    };
    const filtered = filterMarkersByKeys(fc, ["facHealth"]);
    assert.equal(filtered.features.length, 1);
    assert.equal(filterMarkersByKeys(fc, ["disasterEvents"]).features.length, 0);
  });
});
