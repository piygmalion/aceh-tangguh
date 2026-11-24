import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import { describe, it } from "node:test";
import {
  ACEH_OSM_MAX_BYTES,
  ACEH_OSM_PATH,
  assessAcehOsmBudget,
} from "./check-aceh-osm-budget.mjs";

describe("anggaran aceh-osm", () => {
  it("menolak arsip yang melewati 50 MiB atau zoom selain 0–14", () => {
    assert.deepEqual(assessAcehOsmBudget({ fileBytes: 10, minZoom: 0, maxZoom: 14 }), []);
    assert.match(
      assessAcehOsmBudget({
        fileBytes: ACEH_OSM_MAX_BYTES,
        minZoom: 0,
        maxZoom: 14,
      }).join("\n"),
      /50 MiB/,
    );
    assert.match(
      assessAcehOsmBudget({ fileBytes: 10, minZoom: 1, maxZoom: 14 }).join("\n"),
      /zoom/,
    );
  });

  it("arsip yang di-commit masih di bawah anggaran", async () => {
    const fileBytes = (await stat(ACEH_OSM_PATH)).size;
    assert.ok(fileBytes > 0);
    assert.ok(fileBytes < ACEH_OSM_MAX_BYTES);
  });
});
