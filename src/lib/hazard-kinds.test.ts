import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import type { FeatureCollection } from "geojson";
import {
  countHazardKinds,
  ensureExistingHazardKindBuckets,
  mapJenisBencanaToHazardKind,
} from "./hazard-kinds";

function existingDisasterJenis(): string[] {
  const file = path.join(process.cwd(), "public/fixtures/markers.geojson");
  const fc = JSON.parse(readFileSync(file, "utf8")) as FeatureCollection;
  const jenis: string[] = [];
  for (const feature of fc.features) {
    if (String(feature.properties?.layer ?? "") !== "disasterEvents") continue;
    const raw = feature.properties?.jenis_bencana;
    if (typeof raw === "string" && raw.trim()) jenis.push(raw);
  }
  return jenis;
}

describe("hazard_status kinds", () => {
  it("maps existing jenis without collapsing karhutla into kebakaran", () => {
    assert.equal(mapJenisBencanaToHazardKind("Tanah Longsor"), "longsor");
    assert.equal(mapJenisBencanaToHazardKind("Kebakaran Pemukiman"), "kebakaran");
    assert.equal(
      mapJenisBencanaToHazardKind("Kebakaran Hutan dan Lahan"),
      "karhutla"
    );
    assert.equal(
      mapJenisBencanaToHazardKind("Angin Puting Beliung"),
      "puting_beliung"
    );
    assert.equal(mapJenisBencanaToHazardKind("Banjir Bandang"), "banjir");
  });

  it("adds karhutla and puting_beliung from existing counts without inventing rows", () => {
    const jenis = existingDisasterJenis();
    const beforeCount = jenis.length;
    const hutan = jenis.filter((j) => j === "Kebakaran Hutan dan Lahan");
    const puting = jenis.filter((j) => j === "Angin Puting Beliung");
    assert.equal(hutan.length, 85);
    assert.equal(puting.length, 44);

    const counted = countHazardKinds(jenis);
    assert.equal(counted.get("karhutla"), 85);
    assert.equal(counted.get("puting_beliung"), 44);

    const rows = ensureExistingHazardKindBuckets(
      [
        { kind: "banjir", label: "Banjir", count: 2, severity: "med" },
        { kind: "longsor", label: "Longsor", count: 1, severity: "high" },
        { kind: "gempa", label: "Gempa", count: 0, severity: "low" },
        { kind: "kebakaran", label: "Kebakaran", count: 0, severity: "low" },
      ],
      jenis
    );

    const karhutla = rows.find((r) => r.kind === "karhutla");
    const putingBeliung = rows.find((r) => r.kind === "puting_beliung");
    assert.ok(karhutla);
    assert.ok(putingBeliung);
    assert.equal(karhutla?.count, 85);
    assert.equal(putingBeliung?.count, 44);
    assert.equal(jenis.length, beforeCount);
    assert.equal(
      jenis.includes("Karhutla Invented"),
      false,
      "does not invent jenis_bencana rows"
    );
  });
});
