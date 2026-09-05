import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickCurrentSlot, waveCatFill } from "./maritime";
import { inariskExportImageUrl, webMercatorTileBbox } from "./inarisk-tiles";

describe("maritime slot picker", () => {
  it("picks the first upcoming hour and maps wave colors", () => {
    const slot = pickCurrentSlot(
      {
        code: "P.A.05",
        forecast_day1: [
          { time: "2099-01-01 00:00 UTC", wave_cat: "Tinggi", wave_height: 3 },
        ],
      },
      Date.parse("2026-09-03T00:00:00Z"),
    );
    assert.equal(slot?.wave_cat, "Tinggi");
    assert.equal(waveCatFill("Tinggi"), "#FF7722");
    assert.equal(waveCatFill(null), "#2F6B66");
  });
});

describe("InaRISK tile bbox", () => {
  it("builds an exportImage URL for gempa tiles", () => {
    const [xmin, ymin, xmax, ymax] = webMercatorTileBbox(7, 80, 52);
    assert.equal(xmin < xmax, true);
    assert.equal(ymin < ymax, true);
    const url = inariskExportImageUrl("inariskBahayaGempa", 7, 80, 52);
    assert.match(url ?? "", /layer_bahaya_gempabumi\/ImageServer\/exportImage/);
    assert.match(url ?? "", /bboxSR=3857/);
  });
});
