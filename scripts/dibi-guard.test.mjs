import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { assessDibiLive } from "./dibi-guard.mjs";

describe("penjaga skrip refresh DIBI", () => {
  it("rejects a year-sum mismatch and a drop above 2%", () => {
    const mismatch = {
      totals: { kejadian: 2392 },
      by_tahun: [{ kejadian: 2000 }, { kejadian: 300 }],
    };
    assert.notEqual(
      mismatch.by_tahun.reduce((s, row) => s + row.kejadian, 0),
      mismatch.totals.kejadian,
    );
    assert.deepEqual(assessDibiLive(mismatch, 2568), {
      ok: false,
      reason: "year-sum-mismatch",
    });

    const truncated = {
      totals: { kejadian: 2392 },
      by_tahun: [{ kejadian: 2392 }],
      by_kabupaten: [{ kabupaten: "Aceh Besar" }],
    };
    assert.deepEqual(assessDibiLive(truncated, 2568), { ok: false, reason: "kejadian-drop" });
    assert.deepEqual(
      assessDibiLive(
        {
          totals: { kejadian: 2569 },
          by_tahun: [{ kejadian: 2569 }],
          by_kabupaten: [{ kabupaten: "Aceh Besar" }],
        },
        2568,
      ),
      { ok: true },
    );
    assert.deepEqual(
      assessDibiLive(
        {
          totals: { kejadian: 2569 },
          by_tahun: [{ kejadian: 2569 }],
          by_kabupaten: [],
        },
        2568,
      ),
      { ok: false, reason: "empty-kabupaten" },
    );
  });

  it("fails the refresh script before it writes the fixture", () => {
    const src = readFileSync(new URL("./fetch-dibi-aceh.mjs", import.meta.url), "utf8");
    const assessAt = src.indexOf("assessDibiLive(");
    const writeAt = src.indexOf("await writeFile(");
    assert.ok(assessAt > 0, "refresh script must call assessDibiLive");
    assert.ok(writeAt > assessAt, "guard must run before writeFile");
    assert.match(src, /process\.exit\(1\)/);
  });
});
