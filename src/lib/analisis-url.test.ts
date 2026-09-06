import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analisisStateToParams,
  parseAnalisisSearchParams,
  presetRange,
} from "./analisis-url";

describe("analisis URL state", () => {
  it("parses known keys and drops empty values", () => {
    const state = parseAnalisisSearchParams(
      new URLSearchParams(
        "jenis=Banjir&kab=Aceh%20Besar&from=2024-01-01&to=2025-12-31&metric=rumah&compareKab=Aceh%20Utara&view=jenis&noise=1"
      )
    );
    assert.deepEqual(state, {
      jenis: "Banjir",
      kab: "Aceh Besar",
      kec: "",
      from: "2024-01-01",
      to: "2025-12-31",
      metric: "rumah",
      compareKab: "Aceh Utara",
      compareYear: "",
      view: "jenis",
    });
  });

  it("rejects invented metric and view values", () => {
    const state = parseAnalisisSearchParams(
      new URLSearchParams("metric=dibi&view=peta&compareYear=19")
    );
    assert.equal(state.metric, "kejadian");
    assert.equal(state.view, "");
    assert.equal(state.compareYear, "");
  });

  it("serializes only set keys using kab not kabupaten", () => {
    const params = analisisStateToParams({
      jenis: "Longsor",
      kab: "Pidie",
      kec: "",
      from: "",
      to: "",
      metric: "kejadian",
      compareKab: "",
      compareYear: "2024",
      view: "",
    });
    assert.equal(params.get("jenis"), "Longsor");
    assert.equal(params.get("kab"), "Pidie");
    assert.equal(params.get("compareYear"), "2024");
    assert.equal(params.has("kec"), false);
    assert.equal(params.has("metric"), false);
  });

  it("presetRange tahun-ini returns the UTC calendar year", () => {
    const range = presetRange("thisYear", new Date(Date.UTC(2026, 8, 6)));
    assert.deepEqual(range, { from: "2026-01-01", to: "2026-12-31" });
  });
});
