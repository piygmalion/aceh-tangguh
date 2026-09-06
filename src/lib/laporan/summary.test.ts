import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADUAN_STATUSES,
  DITANGGAPI_STATUSES,
  emptyLaporanStatusCounts,
  laporanPublicSummary,
} from "./summary";

describe("laporanPublicSummary", () => {
  it("counts aduan as submitted + in_review + needs_info and ditanggapi as approved", () => {
    assert.deepEqual([...ADUAN_STATUSES], ["submitted", "in_review", "needs_info"]);
    assert.deepEqual([...DITANGGAPI_STATUSES], ["approved"]);
    const kejadian = emptyLaporanStatusCounts();
    kejadian.submitted = 10;
    kejadian.in_review = 2;
    kejadian.needs_info = 1;
    kejadian.approved = 4;
    kejadian.rejected = 9;
    const penanganan = emptyLaporanStatusCounts();
    penanganan.submitted = 3;
    penanganan.approved = 5;
    assert.deepEqual(laporanPublicSummary(kejadian, penanganan), {
      aduan: 16,
      ditanggapi: 9,
    });
  });

  it("returns zeros when both tables are empty — never invents Tanggapi demo numbers", () => {
    assert.deepEqual(
      laporanPublicSummary(emptyLaporanStatusCounts(), emptyLaporanStatusCounts()),
      { aduan: 0, ditanggapi: 0 }
    );
  });
});
