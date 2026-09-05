import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AREA_TOOLBAR_LAYER_KEYS,
  RETIRED_AREA_LAYER_KEYS,
  parseAreaLayerKey,
} from "./area-layers";
import { AREA_TOOLBAR_OPTIONS, MAP_LAYERS_CATALOG } from "./map-layers-catalog";
import { LAYER_ICON_FILES, OVERLAY_LAYER_ICON_FILES } from "./layer-icons";
import { parseMarkerLayers, resolveMapUrlAliases } from "./map-url-aliases";

describe("AREA toolbar radios", () => {
  it("shows only Desa + IRBI, not retired keys", () => {
    const keys = AREA_TOOLBAR_OPTIONS.map((opt) => opt.key);
    assert.deepEqual(keys, ["villageDistribution", "irbi2025"]);
    assert.deepEqual([...AREA_TOOLBAR_LAYER_KEYS], keys);
    for (const retired of RETIRED_AREA_LAYER_KEYS) {
      assert.equal(keys.includes(retired), false);
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
