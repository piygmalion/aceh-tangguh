import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  encodeOverlayLayers,
  isOverlayLayerKey,
  overlayCircleLayerId,
  overlayFillLayerId,
  overlayInteractiveLayerIds,
  overlayKeyFromLayerId,
  overlayLineLayerId,
  overlaySymbolLayerId,
  parseOverlayLayers,
} from "./overlay-layers";

describe("overlay layer URL tokens", () => {
  it("defaults to none", () => {
    assert.deepEqual(parseOverlayLayers(null), []);
    assert.equal(encodeOverlayLayers([]), null);
  });

  it("parses known keys and drops junk", () => {
    const keys = parseOverlayLayers("maritimePorts,nope,maritimeWaters,maritimePorts");
    assert.deepEqual(keys, ["maritimePorts", "maritimeWaters"]);
    assert.equal(encodeOverlayLayers(keys), "maritimePorts,maritimeWaters");
    assert.equal(isOverlayLayerKey("bmkgQuakes"), true);
    assert.equal(isOverlayLayerKey("disasterEvents"), false);
    assert.deepEqual(parseOverlayLayers("tatonasStations"), ["tatonasStations"]);
    assert.equal(isOverlayLayerKey("tatonasStations"), true);
  });

  it("builds interactive layer ids and parses them back", () => {
    const ids = overlayInteractiveLayerIds(["maritimePorts", "maritimeWaters", "inariskBahayaGempa"]);
    assert.deepEqual(ids, [
      overlayCircleLayerId("maritimePorts"),
      overlaySymbolLayerId("maritimePorts"),
      overlayFillLayerId("maritimeWaters"),
      overlayLineLayerId("maritimeWaters"),
      overlayFillLayerId("inariskBahayaGempa"),
      overlayLineLayerId("inariskBahayaGempa"),
    ]);
    assert.equal(overlayKeyFromLayerId(ids[0]), "maritimePorts");
    assert.equal(overlayKeyFromLayerId("marker-dots"), null);
    const symbolIds = overlayInteractiveLayerIds(["maritimePorts"], {
      pointAsSymbol: true,
    });
    assert.deepEqual(symbolIds, [
      overlaySymbolLayerId("maritimePorts"),
      overlayCircleLayerId("maritimePorts"),
    ]);
    assert.equal(overlayKeyFromLayerId(symbolIds[0]), "maritimePorts");
  });
});
