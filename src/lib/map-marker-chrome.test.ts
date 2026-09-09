import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "path";
import { describe, it } from "node:test";
import type { Feature, FeatureCollection, Point } from "geojson";
import { COORD_QUALITY_TRUNCATED, isTruncatedAcehLongitude } from "./coord-quality";
import type { KejadianFixture } from "./kejadian-types";
import { DEFAULT_VIEW } from "./types";
import {
  MAP_CLUSTER_COUNT_TEXT_PX,
  MAP_CLUSTER_FILL,
  MAP_CLUSTER_MAX_ZOOM,
  MAP_CLUSTER_RADIUS,
  MAP_CLUSTER_RING_WIDTH_PX,
  MAP_DOT_MAX_ZOOM,
  MAP_DOT_RADIUS_PX,
  MAP_DOT_STROKE_PX,
  MAP_ICON_MIN_ZOOM,
  MAP_ICON_ZOOM_STEPS,
  MAP_LIGHT_CANVAS_STROKE,
  MAP_PAPER_STROKE,
  MAP_PIN_DISC_PX,
  MAP_PIN_GLYPH_PX,
  MAP_UNCLUSTERED_ICON_ZOOM,
  TOOLBAR_DISC_PX,
  TOOLBAR_GLYPH_PX,
  annotateDisasterDesa,
  clusterCircleRadiusExpr,
  clusterCountTextColor,
  clusterRingColorExpr,
  markerHaloStroke,
  desaByIdFromKejadian,
  isUnknownDesaLabel,
  markerRenderMode,
  parseStackItems,
  stackSharedCentroidDisasterEvents,
} from "./map-marker-chrome";
import { COLOR_TOKENS, LAYER_COLORS } from "./layer-colors";
import { STATUS_HEX } from "./chart-colors";
import { TYPE_FLOOR_PX } from "./type-floor";

function asPointFeature(
  id: string,
  lon: number,
  lat: number,
  props: Record<string, unknown>
): Feature<Point> {
  return {
    type: "Feature",
    id,
    geometry: { type: "Point", coordinates: [lon, lat] },
    properties: props,
  };
}

describe("signed map-chrome sizes", () => {
  it("keeps 7px fallback dots and 24/28 pins for unclustered points at every zoom", () => {
    assert.equal(MAP_DOT_MAX_ZOOM, 0);
    assert.equal(MAP_ICON_MIN_ZOOM, 0);
    assert.equal(MAP_DOT_RADIUS_PX, 7);
    assert.equal(MAP_DOT_STROKE_PX, 1.5);
    assert.equal(MAP_PAPER_STROKE, COLOR_TOKENS.paper);
    assert.equal(MAP_LIGHT_CANVAS_STROKE, COLOR_TOKENS.ink);
    assert.equal(MAP_PIN_GLYPH_PX, 24);
    assert.equal(MAP_PIN_DISC_PX, 28);
    assert.equal(TOOLBAR_GLYPH_PX, 20);
    assert.equal(TOOLBAR_DISC_PX, 32);
  });

  it("shows unclustered icons on the third +1 zoom from the default Aceh view", () => {
    assert.equal(DEFAULT_VIEW.zoom, 7);
    assert.equal(MAP_ICON_ZOOM_STEPS, 3);
    assert.equal(MAP_UNCLUSTERED_ICON_ZOOM, 10);
    assert.equal(MAP_CLUSTER_MAX_ZOOM, 9);
    assert.equal(MAP_CLUSTER_MAX_ZOOM, MAP_UNCLUSTERED_ICON_ZOOM - 1);
  });
});

describe("overview cluster rings", () => {
  it("keeps numbered rings larger than 7px dots and uses status tokens, not invented severity", () => {
    assert.equal(MAP_CLUSTER_RADIUS, 56);
    assert.equal(MAP_CLUSTER_RING_WIDTH_PX, 4);
    assert.ok(MAP_CLUSTER_RING_WIDTH_PX > MAP_DOT_STROKE_PX);
    assert.equal(MAP_CLUSTER_FILL, COLOR_TOKENS.paper);
    assert.equal(MAP_CLUSTER_COUNT_TEXT_PX, TYPE_FLOOR_PX);
    assert.ok(MAP_CLUSTER_COUNT_TEXT_PX >= 13);

    const radius = clusterCircleRadiusExpr();
    const raw = JSON.stringify(radius);
    assert.equal(radius[0], "step");
    assert.deepEqual(radius[1], ["get", "point_count"]);
    assert.equal(raw.includes("interpolate"), true);
    assert.equal(raw.includes('["zoom"]'), true);
    assert.match(raw, /6,\s*28|6,28/);
    assert.ok(raw.includes("22") || raw.includes("20"));

    const ring = clusterRingColorExpr();
    const ringRaw = JSON.stringify(ring);
    assert.equal(ringRaw.includes("point_count"), true);
    assert.equal(ringRaw.includes(STATUS_HEX.RENDAH), true);
    assert.equal(ringRaw.includes(STATUS_HEX.SEDANG), true);
    assert.equal(ringRaw.includes(STATUS_HEX.TINGGI) || ringRaw.includes(COLOR_TOKENS.awas), true);
    assert.equal(clusterCountTextColor(), COLOR_TOKENS.ink);
  });

  it("MapViewport paints marker-clusters from the signed ring helpers", () => {
    const viewport = readFileSync(
      path.join(process.cwd(), "src/components/map/MapViewport.tsx"),
      "utf8"
    );
    assert.match(viewport, /clusterRadius=\{MAP_CLUSTER_RADIUS\}/);
    assert.match(viewport, /clusterCircleRadiusExpr/);
    assert.match(viewport, /clusterRingColorExpr/);
    assert.match(viewport, /MAP_CLUSTER_FILL/);
    assert.match(viewport, /MAP_CLUSTER_RING_WIDTH_PX/);
    assert.match(viewport, /MAP_CLUSTER_COUNT_TEXT_PX/);
    assert.equal(viewport.includes('"circle-radius": 16'), false);
    assert.equal(viewport.includes('"text-size": 12'), false);
    assert.ok(
      viewport.lastIndexOf("<MarkerClusterSource") >
        viewport.indexOf('id="area-layer-kab"'),
      "clusters must paint after kabupaten fill"
    );
  });
});

describe("basemap halo stroke", () => {
  it("uses ink on light canvases and paper on dark/imagery", () => {
    assert.equal(markerHaloStroke("positron"), COLOR_TOKENS.ink);
    assert.equal(markerHaloStroke("streets"), COLOR_TOKENS.ink);
    assert.equal(markerHaloStroke("brand-light"), COLOR_TOKENS.ink);
    assert.equal(markerHaloStroke("brand-grey"), COLOR_TOKENS.ink);
    assert.equal(markerHaloStroke("dark"), COLOR_TOKENS.paper);
    assert.equal(markerHaloStroke("brand-dark"), COLOR_TOKENS.paper);
    assert.equal(markerHaloStroke("satellite"), COLOR_TOKENS.paper);
    assert.equal(markerHaloStroke("sentinel"), COLOR_TOKENS.paper);
    assert.equal(LAYER_COLORS.infraRoadBridge, COLOR_TOKENS.gold);
    assert.equal(LAYER_COLORS.facEducation, COLOR_TOKENS.sage);
    assert.equal(LAYER_COLORS.disasterEvents, COLOR_TOKENS.orange);
  });
});

describe("truncated police render as approx discs", () => {
  it("uses approx discs for integer lon 95–98 and keeps all 254 points", () => {
    assert.equal(
      markerRenderMode({
        layer: "policeOffices",
        lon: 96,
        coordQuality: COORD_QUALITY_TRUNCATED,
      }),
      "approx"
    );
    assert.equal(
      markerRenderMode({ layer: "policeOffices", lon: 95.4916 }),
      "pin"
    );

    const file = path.join(process.cwd(), "public/fixtures/markers.geojson");
    const fc = JSON.parse(readFileSync(file, "utf8")) as FeatureCollection;
    const police = fc.features.filter(
      (f) => f.properties?.layer === "policeOffices"
    );
    assert.equal(police.length, 254);

    let approx = 0;
    for (const feature of police) {
      const lon = (feature.geometry as Point).coordinates[0];
      const mode = markerRenderMode({
        layer: "policeOffices",
        lon,
        coordQuality: feature.properties?.coord_quality,
      });
      if (isTruncatedAcehLongitude(lon)) {
        assert.equal(mode, "approx");
        assert.equal(Number.isInteger(lon), true);
        approx += 1;
      }
    }
    assert.ok(approx > 0);
    assert.equal(police.length, 254);
  });
});

describe("kejadian desa='-' centroid stacks", () => {
  it("stacks unknown-desa rows that share centroids without dropping ids", () => {
    assert.equal(isUnknownDesaLabel("-"), true);
    assert.equal(isUnknownDesaLabel("Suka Damai"), false);

    const markers = JSON.parse(
      readFileSync(path.join(process.cwd(), "public/fixtures/markers.geojson"), "utf8")
    ) as FeatureCollection;
    const kejadian = JSON.parse(
      readFileSync(path.join(process.cwd(), "public/fixtures/kejadian-bencana.json"), "utf8")
    ) as KejadianFixture;
    const desaById = desaByIdFromKejadian(kejadian.kejadian);
    const unknownIds = Array.from(desaById.entries())
      .filter(([, desa]) => isUnknownDesaLabel(desa))
      .map(([id]) => id);
    assert.equal(unknownIds.length, 274);

    const annotated = markers.features
      .filter((f): f is Feature<Point> => f.geometry.type === "Point")
      .filter((f) => f.properties?.layer === "disasterEvents")
      .map((f) => annotateDisasterDesa(f, desaById));

    const unknown = annotated.filter((f) => isUnknownDesaLabel(f.properties?.desa));
    assert.equal(unknown.length, 274);

    const stacked = stackSharedCentroidDisasterEvents(annotated);
    const renderedUnknown = stacked.filter((f) =>
      isUnknownDesaLabel(f.properties?.desa)
    );
    const uniqueCentroids = new Set(
      unknown.map((f) => `${f.geometry.coordinates[0]},${f.geometry.coordinates[1]}`)
    );
    assert.equal(renderedUnknown.length, uniqueCentroids.size);
    assert.ok(renderedUnknown.length < 274);

    const retained = new Set<string>();
    for (const feature of stacked) {
      const items = parseStackItems(feature.properties?.stackItems);
      if (items.length) {
        for (const item of items) retained.add(item.id);
      } else if (feature.id != null) {
        retained.add(String(feature.id));
      }
    }
    for (const id of unknownIds) {
      assert.ok(retained.has(id), `missing stacked member ${id}`);
    }

    const samePoint = [
      asPointFeature("a", 96.5, 4.3, { layer: "disasterEvents", desa: "-", title: "A" }),
      asPointFeature("b", 96.5, 4.3, { layer: "disasterEvents", desa: "-", title: "B" }),
    ];
    const one = stackSharedCentroidDisasterEvents(samePoint);
    assert.equal(one.length, 1);
    assert.equal(one[0]?.properties?.stackCount, 2);
    assert.deepEqual(one[0]?.geometry.coordinates, [96.5, 4.3]);
  });
});
