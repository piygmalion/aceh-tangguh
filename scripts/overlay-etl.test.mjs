import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACEH_BBOX,
  INARISK_BAHAYA_MAX_PNG_BYTES,
  assessOverlayFeatureCounts,
  assertBahayaPngSize,
  bahayaCollectionFromGrid,
  bahayaEmptyLayerKeys,
  classifyInariskPixel,
  clipFeatureCollectionToBbox,
  clipGeometryToBbox,
  decodePngRgba,
  encodePngRgba,
  filterAcehPorts,
  filterAcehSensors,
  filterAcehWaters,
  inAcehBbox,
  inariskBahayaExportUrl,
  inariskFaultQueryUrl,
  overlayLayerChecksum,
  overlayLayerStats,
  parseDiscoveredUrls,
  portsToStaticRows,
  prepareBahayaLayer,
  previousOverlayCounts,
} from "./lib/overlay-etl.mjs";

describe("overlay-etl", () => {
  it("keeps Aceh bbox and drops Padang", () => {
    assert.equal(inAcehBbox(95.32, 5.55), true);
    assert.equal(inAcehBbox(100.35, -0.95), false);
  });

  it("parses Ruang Kita maritime + sensor URLs", () => {
    const js = `
      var API_BASE = 'https://maritim.bmkg.go.id/marine2026-data/';
      var PELABUHAN_GEOJSON = API_BASE + 'meta/pelabuhan.json';
      var SENSOR_SEISMIC_URL = 'https://bmkg-content-inatews.storage.googleapis.com/sensor_seismic.json';
      L.esri.dynamicMapLayer({ url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/Faults/MapServer' });
    `;
    const found = parseDiscoveredUrls(js);
    assert.equal(
      found.pelabuhan,
      "https://maritim.bmkg.go.id/marine2026-data/meta/pelabuhan.json",
    );
    assert.match(found.sensors, /sensor_seismic\.json$/);
    assert.match(found.faults, /Faults\/MapServer$/);
  });

  it("filters ports by province Aceh and joins BMKG code", () => {
    const fc = filterAcehPorts({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { code: "XA001", name: "Ulee Lheue", province: "Aceh" },
          geometry: { type: "Point", coordinates: [95.29, 5.56] },
        },
        {
          type: "Feature",
          properties: { code: "JB001", name: "Tanjung Priok", province: "DKI Jakarta" },
          geometry: { type: "Point", coordinates: [106.87, -6.1] },
        },
      ],
    });
    assert.equal(fc.features.length, 1);
    const rows = portsToStaticRows(fc, "https://example.test/pelabuhan.json");
    assert.equal(rows[0].kode_bmkg, "XA001");
    assert.equal(rows[0].layer_key, "maritimePorts");
  });

  it("rejects a Sumatera Utara port that sits inside the Aceh bbox", () => {
    // Pangkalan Susu (XB005) is at lon 98.213 / lat 4.123 — inside the Aceh
    // bbox envelope but administratively Sumatra Utara.
    const fc = filterAcehPorts({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            code: "XB005",
            name: "Pelabuhan Pangkalan Susu",
            province: "Sumatra Utara",
          },
          geometry: { type: "Point", coordinates: [98.213235, 4.123017] },
        },
      ],
    });
    assert.equal(fc.features.length, 0);
  });

  it("rejects Sumatera Utara sensors inside the Aceh bbox", () => {
    // SDSM / MTSI / LDSI are Stageof-DeliSerdang stations near the border.
    const fc = filterAcehSensors({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { id: "SDSM", stakeholder: "Sidikalang Sumatera Utara" },
          geometry: { type: "Point", coordinates: [98.295, 2.7545] },
        },
        {
          type: "Feature",
          properties: { id: "LHMI", stakeholder: "Lhokseumawe Aceh" },
          geometry: { type: "Point", coordinates: [96.9469, 5.2286] },
        },
      ],
    });
    assert.deepEqual(
      fc.features.map((f) => f.properties.id),
      ["LHMI"],
    );
  });

  it("drops ports without usable geometry instead of writing Null Island", () => {
    const rows = portsToStaticRows(
      {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { code: "XA001", name: "Ulee Lheue" },
            geometry: { type: "Point", coordinates: [95.29, 5.56] },
          },
          {
            type: "Feature",
            properties: { code: "XA999", name: "Tanpa geometri" },
            geometry: null,
          },
        ],
      },
      "https://example.test/pelabuhan.json",
    );
    assert.deepEqual(
      rows.map((r) => r.external_id),
      ["XA001"],
    );
  });

  it("keeps only Aceh water codes", () => {
    const fc = filterAcehWaters({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { ID_MAR: "P.A.05", perairan: "Aceh Besar - Meulaboh" },
          geometry: { type: "Polygon", coordinates: [] },
        },
        {
          type: "Feature",
          properties: { ID_MAR: "P.P.01", perairan: "Utara Bali" },
          geometry: { type: "Polygon", coordinates: [] },
        },
      ],
    });
    assert.equal(fc.features.length, 1);
    assert.equal(fc.features[0].properties.kode, "P.A.05");
  });

  it("coerces sensor string coordinates", () => {
    const fc = filterAcehSensors({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { id: "ACEH1", stakeholder: "Banda Aceh" },
          geometry: { type: "Point", coordinates: ["95.3", "5.5", 1] },
        },
      ],
    });
    assert.equal(fc.features.length, 1);
    assert.deepEqual(fc.features[0].geometry.coordinates, [95.3, 5.5]);
  });

  it("builds InaRISK fault query for layer 6", () => {
    const url = inariskFaultQueryUrl(
      "https://gis.bnpb.go.id/server/rest/services/inarisk/Faults/MapServer",
      6,
    );
    assert.match(url, /\/6\/query\?/);
    assert.match(url, /outSR=4326/);
    assert.match(url, /spatialRel=esriSpatialRelIntersects/);
    const decoded = decodeURIComponent(url);
    assert.match(decoded, /"xmin":95/);
    assert.match(decoded, /"ymin":2/);
    assert.match(decoded, /"xmax":98\.3/);
    assert.match(decoded, /"ymax":6\.15/);
    assert.deepEqual(ACEH_BBOX, [95.0, 2.0, 98.3, 6.15]);
  });

  function everyVertexInBbox(geometry, bbox = ACEH_BBOX) {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const walk = (pos) => {
      if (!Array.isArray(pos)) return;
      if (typeof pos[0] === "number") {
        assert.ok(pos[0] >= minLon && pos[0] <= maxLon, `lon ${pos[0]} outside bbox`);
        assert.ok(pos[1] >= minLat && pos[1] <= maxLat, `lat ${pos[1]} outside bbox`);
        return;
      }
      for (const child of pos) walk(child);
    };
    if (geometry.type === "GeometryCollection") {
      for (const member of geometry.geometries) walk(member.coordinates);
      return;
    }
    walk(geometry.coordinates);
  }

  it("clips a LineString that crosses the envelope and keeps the inside segment", () => {
    const original = {
      type: "LineString",
      coordinates: [
        [94.0, 4.0],
        [99.0, 4.0],
      ],
    };
    const clipped = clipGeometryToBbox(original);
    assert.ok(clipped, "crossing line must leave a remainder");
    assert.notDeepEqual(clipped.coordinates, original.coordinates);
    everyVertexInBbox(clipped);
    const xs = clipped.type === "LineString"
      ? clipped.coordinates.map((p) => p[0])
      : clipped.coordinates.flat().map((p) => p[0]);
    assert.ok(xs.some((x) => x === ACEH_BBOX[0] || x > ACEH_BBOX[0]));
    assert.ok(xs.some((x) => x === ACEH_BBOX[2] || x < ACEH_BBOX[2]));
    assert.ok(Math.max(...xs) - Math.min(...xs) > 0);
  });

  it("clips a megathrust-like Polygon and keeps properties", () => {
    const props = { Name: "M1", layer: "inariskMegathrust", title: "M1" };
    const collection = {
      type: "FeatureCollection",
      source: "https://example.test/faults/0",
      features: [
        {
          type: "Feature",
          id: 0,
          properties: props,
          geometry: {
            type: "Polygon",
            coordinates: [[
              [91.44, 12.1],
              [91.44, -0.58],
              [98.68, -0.58],
              [98.68, 12.1],
              [91.44, 12.1],
            ]],
          },
        },
      ],
    };
    const frozen = JSON.stringify(collection);
    const clipped = clipFeatureCollectionToBbox(collection);
    assert.equal(JSON.stringify(collection), frozen);
    assert.equal(clipped.type, "FeatureCollection");
    assert.equal(clipped.source, collection.source);
    assert.equal(clipped.features.length, 1);
    assert.equal(clipped.features[0].id, 0);
    assert.deepEqual(clipped.features[0].properties, props);
    assert.equal(clipped.features[0].geometry.type, "Polygon");
    everyVertexInBbox(clipped.features[0].geometry);
    const ring = clipped.features[0].geometry.coordinates[0];
    assert.ok(ring.length >= 4);
    assert.notDeepEqual(ring, collection.features[0].geometry.coordinates[0]);
  });

  it("drops features whose geometry lies entirely outside the envelope", () => {
    const collection = {
      type: "FeatureCollection",
      source: "keep-me",
      features: [
        {
          type: "Feature",
          id: "out",
          properties: { Name: "outside" },
          geometry: {
            type: "LineString",
            coordinates: [
              [90.0, 0.0],
              [91.0, 0.5],
            ],
          },
        },
        {
          type: "Feature",
          id: "in",
          properties: { Name: "inside" },
          geometry: { type: "Point", coordinates: [96.8, 4.6] },
        },
      ],
    };
    const clipped = clipFeatureCollectionToBbox(collection);
    assert.equal(clipped.source, "keep-me");
    assert.equal(clipped.features.length, 1);
    assert.equal(clipped.features[0].id, "in");
    assert.deepEqual(clipped.features[0].properties, { Name: "inside" });
  });

  it("checksums layer features stably", () => {
    const features = [{ type: "Feature", properties: { id: "XA001" } }];
    const a = overlayLayerChecksum(features);
    const b = overlayLayerChecksum(features);
    assert.equal(a, b);
    assert.match(a, /^[a-f0-9]{64}$/);
    assert.notEqual(a, overlayLayerChecksum([{ type: "Feature", properties: { id: "XA002" } }]));
    assert.equal(overlayLayerStats({ features }).featureCount, 1);
  });

  it("reads previous featureCount from layers, then legacy counts", () => {
    assert.deepEqual(
      previousOverlayCounts({
        layers: { maritimePorts: { featureCount: 15, checksum: "abc" } },
        counts: { maritimePorts: 99 },
      }),
      { maritimePorts: 15 },
    );
    assert.deepEqual(
      previousOverlayCounts({ counts: { maritimePorts: 15, maritimeWaters: 10 } }),
      { maritimePorts: 15, maritimeWaters: 10 },
    );
    assert.equal(previousOverlayCounts(null), null);
  });

  it("fails when a layer has zero features", () => {
    const zero = assessOverlayFeatureCounts(
      { maritimePorts: 0, maritimeWaters: 10, seismicSensors: 23 },
      { maritimePorts: 15, maritimeWaters: 10, seismicSensors: 23 },
    );
    assert.equal(zero.ok, false);
    assert.match(zero.errors.join("\n"), /maritimePorts/);

    const firstRunEmpty = assessOverlayFeatureCounts({ maritimePorts: 0 }, null);
    assert.equal(firstRunEmpty.ok, false);

    const forcedZero = assessOverlayFeatureCounts(
      { maritimePorts: 0 },
      { maritimePorts: 15 },
      { force: true },
    );
    assert.equal(forcedZero.ok, false);
  });

  it("fails when a layer drops by more than 40% unless forced", () => {
    const previous = { maritimePorts: 10, maritimeWaters: 10, seismicSensors: 10 };
    const dropHalf = assessOverlayFeatureCounts(
      { maritimePorts: 5, maritimeWaters: 10, seismicSensors: 10 },
      previous,
    );
    assert.equal(dropHalf.ok, false);
    assert.match(dropHalf.errors.join("\n"), /maritimePorts/);

    const exactlyForty = assessOverlayFeatureCounts(
      { maritimePorts: 6, maritimeWaters: 10, seismicSensors: 10 },
      previous,
    );
    assert.equal(exactlyForty.ok, true);

    const forcedDrop = assessOverlayFeatureCounts(
      { maritimePorts: 5, maritimeWaters: 10, seismicSensors: 10 },
      previous,
      { force: true },
    );
    assert.equal(forcedDrop.ok, true);

    const noBaseline = assessOverlayFeatureCounts(
      { maritimePorts: 15, maritimeWaters: 10, seismicSensors: 23 },
      null,
    );
    assert.equal(noBaseline.ok, true);
  });

  it("builds InaRISK bahaya export for the Aceh envelope without renderingRule", () => {
    const url = inariskBahayaExportUrl("layer_bahaya_gempabumi");
    assert.match(url, /layer_bahaya_gempabumi\/ImageServer\/exportImage/);
    assert.match(url, /bboxSR=4326/);
    assert.match(url, /size=660(,|%2C)830/);
    assert.match(decodeURIComponent(url), /bbox=95(\.0)?,2(\.0)?,98\.3,6\.15/);
    assert.doesNotMatch(url, /renderingRule/);
  });

  it("refuses oversized bahaya PNG bytes and IHDR before inflate", () => {
    const tiny = encodePngRgba(2, 2, Buffer.alloc(16, 0));
    assert.equal(assertBahayaPngSize(tiny), tiny);
    assert.throws(
      () => assertBahayaPngSize(Buffer.alloc(INARISK_BAHAYA_MAX_PNG_BYTES + 1)),
      /too large/,
    );
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(20_000, 0);
    ihdr.writeUInt32BE(20_000, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    const chunk = Buffer.alloc(12 + 13);
    chunk.writeUInt32BE(13, 0);
    chunk.write("IHDR", 4);
    ihdr.copy(chunk, 8);
    const iend = Buffer.alloc(12);
    iend.write("IEND", 4);
    const fake = Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk,
      iend,
    ]);
    assert.throws(() => decodePngRgba(fake), /IHDR exceeds/);
  });

  it("keeps class 2/3 and drops rendah or transparent", () => {
    assert.equal(classifyInariskPixel(2, 2, 2, 255), 2);
    assert.equal(classifyInariskPixel(3, 3, 3, 255), 3);
    assert.equal(classifyInariskPixel(1, 1, 1, 255), 0);
    assert.equal(classifyInariskPixel(0, 0, 0, 0), 0);
    assert.equal(classifyInariskPixel(220, 20, 20, 255), 3);
    assert.equal(classifyInariskPixel(220, 140, 20, 255), 2);
    assert.equal(classifyInariskPixel(220, 220, 40, 255), 0);
  });

  it("polygonizes a class-3 block and clips a crossing polygon", () => {
    const width = 6;
    const height = 6;
    const values = new Uint8Array(width * height);
    for (let y = 1; y <= 3; y++) {
      for (let x = 1; x <= 3; x++) values[y * width + x] = 3;
    }
    const fc = bahayaCollectionFromGrid(values, width, height, {
      layer: "inariskBahayaGempa",
      title: "Bahaya gempa",
    });
    assert.equal(fc.features.length, 1);
    assert.equal(fc.features[0].properties.kelas, "tinggi");
    assert.equal(fc.features[0].properties.fillColor, "#B42318");
    assert.equal(fc.features[0].properties.layer, "inariskBahayaGempa");
    const geom = fc.features[0].geometry;
    assert.ok(geom.type === "Polygon" || geom.type === "MultiPolygon");

    const crossing = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { layer: "inariskBahayaBanjir", title: "Bahaya banjir", kelas: "sedang" },
          geometry: {
            type: "Polygon",
            coordinates: [[
              [94.0, 4.0],
              [94.0, 5.0],
              [96.0, 5.0],
              [96.0, 4.0],
              [94.0, 4.0],
            ]],
          },
        },
      ],
    };
    const clipped = clipFeatureCollectionToBbox(crossing);
    assert.equal(clipped.features.length, 1);
    everyVertexInBbox(clipped.features[0].geometry);
  });

  it("prepareBahayaLayer reads PNG VALUE and refuses empty prepared layers", () => {
    const width = 4;
    const height = 4;
    const rgba = Buffer.alloc(width * height * 4, 0);
    for (let y = 1; y <= 2; y++) {
      for (let x = 1; x <= 2; x++) {
        const o = (y * width + x) * 4;
        rgba[o] = 2;
        rgba[o + 1] = 2;
        rgba[o + 2] = 2;
        rgba[o + 3] = 255;
      }
    }
    const png = encodePngRgba(width, height, rgba);
    const decoded = decodePngRgba(png);
    assert.equal(decoded.width, 4);
    const fc = prepareBahayaLayer(png, {
      key: "inariskBahayaLongsor",
      title: "Bahaya longsor",
    });
    assert.equal(fc.features.length, 1);
    assert.equal(fc.features[0].properties.kelas, "sedang");
    assert.equal(fc.features[0].properties.fillColor, "#C4A35A");

    const emptyPng = encodePngRgba(2, 2, Buffer.alloc(16, 0));
    const empty = prepareBahayaLayer(emptyPng, {
      key: "inariskBahayaKarhutla",
      title: "Bahaya karhutla",
    });
    assert.deepEqual(
      bahayaEmptyLayerKeys([
        { spec: { key: "inariskBahayaLongsor" }, clipped: fc },
        { spec: { key: "inariskBahayaKarhutla" }, clipped: empty },
      ]),
      ["inariskBahayaKarhutla"],
    );
  });
});
