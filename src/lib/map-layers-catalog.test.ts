import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AREA_TOOLBAR_LAYER_KEYS,
  RETIRED_AREA_LAYER_KEYS,
  parseAreaLayerKey,
} from "./area-layers";
import { AREA_TOOLBAR_OPTIONS } from "./map-layers-catalog";
import { resolveMapUrlAliases } from "./map-url-aliases";

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
