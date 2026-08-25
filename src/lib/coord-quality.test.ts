import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import type { Feature, FeatureCollection, Point } from "geojson";
import {
  annotatePoliceOfficeCoordQuality,
  COORD_QUALITY_TRUNCATED,
  isTruncatedAcehLongitude,
} from "./coord-quality";

describe("policeOffices coord_quality", () => {
  it("flags integer lon 95–98 as truncated and keeps the row and stored coords", () => {
    const coordinates: [number, number] = [96, 4.52];
    const feature: Feature<Point> = {
      type: "Feature",
      id: "pol-truncated",
      geometry: { type: "Point", coordinates },
      properties: { layer: "policeOffices", title: "Polsek Contoh" },
    };

    const out = annotatePoliceOfficeCoordQuality(feature);

    assert.equal(out.properties?.coord_quality, COORD_QUALITY_TRUNCATED);
    assert.equal(out.properties?.coord_quality, "truncated");
    assert.ok(out, "row stays present");
    assert.deepEqual(out.geometry?.coordinates, [96, 4.52]);
    assert.equal(out.geometry?.coordinates[0], coordinates[0]);
    assert.equal(out.geometry?.coordinates[1], coordinates[1]);
  });

  it("does not drop any policeOffices from the existing fixture", () => {
    const file = path.join(process.cwd(), "public/fixtures/markers.geojson");
    const fc = JSON.parse(readFileSync(file, "utf8")) as FeatureCollection;
    const police = fc.features.filter(
      (f) => f.properties && f.properties.layer === "policeOffices"
    );
    assert.equal(police.length, 254);

    const annotated = police.map((f) => annotatePoliceOfficeCoordQuality(f));
    assert.equal(annotated.length, 254);

    for (let i = 0; i < police.length; i += 1) {
      const before = police[i];
      const after = annotated[i];
      assert.ok(after, "row stays present");
      assert.deepEqual(after.geometry, before.geometry);
      const lon = (before.geometry as Point).coordinates[0];
      if (isTruncatedAcehLongitude(lon)) {
        assert.equal(after.properties?.coord_quality, "truncated");
      }
    }
  });
});
