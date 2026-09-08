import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DISASTER_JENIS,
  encodeDisasterJenis,
  nextDisasterJenisToggle,
} from "./disaster-jenis";

describe("nextDisasterJenisToggle", () => {
  it("turns on a single jenis without first enabling every disaster type", () => {
    const next = nextDisasterJenisToggle(
      { markerLayers: ["facHealth"], disasterJenis: [] },
      "Banjir"
    );
    assert.deepEqual(next.markerLayers.sort(), ["disasterEvents", "facHealth"].sort());
    assert.equal(next.disasterJenisEncoded, encodeDisasterJenis(["Banjir"]));
    assert.equal(next.disasterJenisEncoded?.includes("Kebakaran"), false);
  });

  it("does not no-op when the parent layer is off", () => {
    const next = nextDisasterJenisToggle(
      { markerLayers: [], disasterJenis: [] },
      "Gempa Bumi"
    );
    assert.ok(next.markerLayers.includes("disasterEvents"));
    assert.equal(next.disasterJenisEncoded, encodeDisasterJenis(["Gempa Bumi"]));
  });

  it("turns the parent off when the last jenis is cleared", () => {
    const next = nextDisasterJenisToggle(
      {
        markerLayers: ["disasterEvents", "facHealth"],
        disasterJenis: ["Banjir"],
      },
      "Banjir"
    );
    assert.equal(next.markerLayers.includes("disasterEvents"), false);
    assert.deepEqual(next.markerLayers, ["facHealth"]);
    assert.equal(next.disasterJenisEncoded, null);
  });

  it("narrows from all jenis when unchecking one child while parent is on", () => {
    const next = nextDisasterJenisToggle(
      { markerLayers: ["disasterEvents"], disasterJenis: [] },
      "Banjir"
    );
    assert.ok(next.markerLayers.includes("disasterEvents"));
    assert.ok(next.disasterJenisEncoded);
    const parts = next.disasterJenisEncoded!.split(",").map((s) => decodeURIComponent(s));
    assert.equal(parts.includes("Banjir"), false);
    assert.equal(parts.length, DISASTER_JENIS.length - 1);
  });
});
