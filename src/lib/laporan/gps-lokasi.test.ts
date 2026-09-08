import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { applyLokasiCoords } from "./gps-lokasi";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("applyLokasiCoords", () => {
  it("accepts a point inside Aceh and rounds to six decimals", () => {
    const result = applyLokasiCoords(5.548312345, 95.323812345);
    assert.deepEqual(result, {
      ok: true,
      latitude: 5.548312,
      longitude: 95.323812,
    });
  });

  it("rejects a point outside Aceh", () => {
    const result = applyLokasiCoords(-6.2, 106.8);
    assert.deepEqual(result, { ok: false, reason: "outside_aceh" });
  });

  it("rejects non-finite coordinates", () => {
    assert.deepEqual(applyLokasiCoords(Number.NaN, 95.3), { ok: false, reason: "invalid" });
    assert.deepEqual(applyLokasiCoords(5.5, Number.POSITIVE_INFINITY), {
      ok: false,
      reason: "invalid",
    });
  });
});

describe("GpsCapture map picker", () => {
  it("embeds a MapLibre picker and applies shared coordinate rules", () => {
    const gps = read("src/components/laporan/GpsCapture.tsx");
    assert.match(gps, /LokasiMapPicker|react-map-gl\/maplibre/);
    assert.match(gps, /applyLokasiCoords/);
    assert.match(gps, /data-testid="lokasi-map"/);
    assert.match(gps, /GeolocateControl|getCurrentPosition/);
  });

  it("keeps map hint copy in id and en laporForm", () => {
    const id = JSON.parse(read("messages/id.json")) as {
      laporForm: Record<string, string>;
      laporKejadian: { step: Record<string, string> };
    };
    const en = JSON.parse(read("messages/en.json")) as {
      laporForm: Record<string, string>;
      laporKejadian: { step: Record<string, string> };
    };
    assert.equal(id.laporForm.gpsMapHint.length > 0, true);
    assert.equal(en.laporForm.gpsMapHint.length > 0, true);
    assert.equal(id.laporKejadian.step.lokasi, "Lokasi");
    assert.equal(en.laporKejadian.step.lokasi, "Location");
  });
});
