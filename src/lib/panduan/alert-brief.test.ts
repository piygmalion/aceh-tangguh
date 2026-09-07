import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compileAlertBrief } from "./alert-brief";
import type { GuideContext } from "./types";

function liveEmpty(): NonNullable<GuideContext["peringatan"]> {
  return {
    cuacaEmpty: true,
    cuacaTone: "neutral",
    magmaEmpty: true,
    magmaSource: "live",
    sipongiEmpty: true,
    sipongiCount: 0,
    tatonasEmpty: true,
    stale: false,
  };
}

describe("compileAlertBrief", () => {
  it("uses one delayed sentence when the whole feed fails", () => {
    const brief = compileAlertBrief({ failed: ["peringatan"], peringatan: null }, "id");
    assert.equal(brief.clauses.length, 1);
    assert.match(brief.body, /tertunda/i);
    assert.doesNotMatch(brief.body, /Cuaca:|Sipongi:|WASPADA/);
  });

  it("emits four clauses in cuaca → MAGMA → Sipongi → Tatonas order", () => {
    const brief = compileAlertBrief({ failed: [], peringatan: liveEmpty() }, "id");
    assert.equal(brief.clauses.length, 4);
    assert.match(brief.clauses[0] ?? "", /^Cuaca:/);
    assert.match(brief.clauses[1] ?? "", /^Gempa MAGMA:/);
    assert.match(brief.clauses[2] ?? "", /^Sipongi:/);
    assert.match(brief.clauses[3] ?? "", /^Tatonas:/);
    assert.match(brief.lead, /bukan saluran darurat/);
    assert.match(brief.lead, /112/);
  });

  it("does not copy a leftover MAGMA event when the feed is unavailable", () => {
    const brief = compileAlertBrief(
      {
        failed: [],
        peringatan: {
          ...liveEmpty(),
          magmaEmpty: true,
          magmaSource: "unavailable",
          magmaSummary: "M 6.2 — Aceh Barat",
        },
      },
      "id"
    );
    assert.match(brief.body, /tertunda/);
    assert.doesNotMatch(brief.body, /M 6\.2|Aceh Barat/);
    assert.doesNotMatch(brief.body, /korban jiwa \d+/i);
  });

  it("says no matching row instead of borrowing another kabupaten", () => {
    const brief = compileAlertBrief(
      {
        failed: [],
        peringatan: {
          ...liveEmpty(),
          cuacaEmpty: true,
          cuacaUnmatched: "Aceh Utara",
          cuacaHighlight: "Banda Aceh: hujan lebat",
          sipongiEmpty: true,
          sipongiUnmatched: "Aceh Utara",
          sipongiCount: 0,
          sipongiPlace: "Banda Aceh",
        },
      },
      "id"
    );
    assert.match(brief.body, /tidak ada baris yang cocok untuk Aceh Utara/);
    assert.doesNotMatch(brief.body, /Banda Aceh: hujan lebat/);
    assert.doesNotMatch(brief.body, /Sipongi: 0 hotspot, antara lain Banda Aceh/);
  });
});
