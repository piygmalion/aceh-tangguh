import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_MAP_BASEMAP, resolveMapBasemap } from "./map-basemap-default";

describe("resolveMapBasemap", () => {
  it("defaults to satellite when the URL omits basemap", () => {
    assert.equal(DEFAULT_MAP_BASEMAP, "satellite");
    assert.equal(resolveMapBasemap(null), "satellite");
    assert.equal(resolveMapBasemap(""), "satellite");
    assert.equal(resolveMapBasemap(undefined), "satellite");
  });

  it("keeps an explicit Carto positron choice", () => {
    assert.equal(resolveMapBasemap("positron"), "positron");
    assert.equal(resolveMapBasemap("dark"), "dark");
  });
});
