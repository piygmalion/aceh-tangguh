import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AREA_TOOLBAR_LAYER_KEYS,
  RETIRED_AREA_LAYER_KEYS,
  isStubAreaLayer,
  parseAreaLayerKey,
} from "./area-layers";
import {
  AREA_TOOLBAR_OPTIONS,
  LIVE_MARKER_LAYER_KEYS,
  MAP_LAYERS_CATALOG,
  MARKER_TOOLBAR_GROUPS,
  RETIRED_MARKER_LAYER_KEYS,
} from "./map-layers-catalog";
import { LAYER_ICON_FILES, OVERLAY_LAYER_ICON_FILES } from "./layer-icons";
import {
  CLUSTER_TO_LAYERS,
  parseMarkerLayers,
  resolveMapUrlAliases,
} from "./map-url-aliases";

describe("AREA toolbar radios", () => {
  it("lists Tanggapi distribusi radios including R3P / NGO / dana plus IRBI", () => {
    const keys = AREA_TOOLBAR_OPTIONS.map((opt) => opt.key);
    assert.deepEqual(keys, [
      "villageDistribution",
      "r3pDistribution",
      "ngoDistribution",
      "regencyFundAllocation",
      "irbi2025",
    ]);
    assert.deepEqual([...AREA_TOOLBAR_LAYER_KEYS], keys);
    for (const retired of RETIRED_AREA_LAYER_KEYS) {
      assert.equal(keys.includes(retired), true);
    }
  });

  it("still parses retired ?area= URLs", () => {
    for (const key of RETIRED_AREA_LAYER_KEYS) {
      assert.equal(parseAreaLayerKey(key), key);
      const resolved = resolveMapUrlAliases({
        cluster: null,
        hazard: null,
        layersRaw: null,
        disasterJenisRaw: null,
        areaRaw: key,
      });
      assert.equal(resolved.areaLayer, key);
    }
    assert.equal(parseAreaLayerKey("villageDistribution"), "villageDistribution");
    assert.equal(parseAreaLayerKey("not-a-layer"), null);
    assert.equal(isStubAreaLayer("ngoDistribution"), true);
    assert.equal(isStubAreaLayer("regencyFundAllocation"), true);
    assert.equal(isStubAreaLayer("villageDistribution"), false);
    assert.equal(isStubAreaLayer("r3pDistribution"), false);
    assert.equal(isStubAreaLayer("irbi2025"), false);
  });
});

describe("retired marker layers stay off the toolbar", () => {
  it("locks tendPoints with poskos / missingPersons", () => {
    assert.deepEqual([...RETIRED_MARKER_LAYER_KEYS], [
      "poskos",
      "tendPoints",
      "missingPersons",
    ]);
    for (const key of RETIRED_MARKER_LAYER_KEYS) {
      const row = MAP_LAYERS_CATALOG.find((item) => item.key === key);
      assert.ok(row);
      assert.equal(row?.enabled, false);
      assert.equal(row?.meta.retired, true);
      assert.equal(LIVE_MARKER_LAYER_KEYS.includes(key), false);
    }
    const toolbarKeys = MARKER_TOOLBAR_GROUPS.flatMap((g) =>
      g.options.map((o) => o.key)
    );
    assert.equal(toolbarKeys.includes("tendPoints"), false);
    assert.deepEqual(CLUSTER_TO_LAYERS.pengungsian.markerLayers, [
      "disasterEvents",
      "laporanKejadian",
    ]);
  });

  it("still parses retired ?layers=tendPoints URLs", () => {
    assert.deepEqual(parseMarkerLayers("tendPoints"), ["tendPoints"]);
  });
});

describe("tatonasStations is overlay-only", () => {
  it("stays in the overlay catalog and overlay icons, not marker maps", () => {
    const row = MAP_LAYERS_CATALOG.find((item) => item.key === "tatonasStations");
    assert.ok(row);
    assert.equal(row?.kind, "overlay");
    assert.equal(row?.source_path, "/api/overlay/tatonasStations");
    assert.equal("tatonasStations" in LAYER_ICON_FILES, false);
    assert.equal("tatonasStations" in OVERLAY_LAYER_ICON_FILES, true);
  });

  it("ignores ?layers=tatonasStations and does not invent a marker", () => {
    assert.deepEqual(parseMarkerLayers("tatonasStations"), []);
    const resolved = resolveMapUrlAliases({
      cluster: null,
      hazard: null,
      layersRaw: "tatonasStations",
      disasterJenisRaw: null,
      areaRaw: null,
    });
    assert.deepEqual(resolved.markerLayers, []);
  });
});
