import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { identityMismatches, topologyFindings } from "./kab-boundary-topology.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fixturePath = resolve(root, "public/fixtures/boundaries-aceh-kab.geojson");

function loadFeatures() {
  const collection = JSON.parse(readFileSync(fixturePath, "utf8"));
  assert.equal(collection.type, "FeatureCollection");
  return collection.features;
}

describe("Aceh kabupaten boundary topology", () => {
  it("keeps 23 kabupaten with the GADM name and kode_kab", () => {
    const mismatches = identityMismatches(loadFeatures());
    assert.deepEqual(mismatches, []);
  });

  it("has valid polygons, no pairwise overlap over 0.01 km2, and no interior gap over 0.01 km2", () => {
    const findings = topologyFindings(loadFeatures());
    assert.deepEqual(findings.invalid, []);
    assert.deepEqual(findings.overlaps, []);
    assert.deepEqual(findings.gaps, []);
  });
});
