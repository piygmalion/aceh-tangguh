import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DibiAcehPayload, DibiMetrics } from "./dibi-types";
import { EMPTY_DIBI_METRICS } from "./dibi-types";
import { assessDibiLive, chooseDibiDelivery, sumTahunKejadian } from "./dibi-guard";

function metrics(kejadian: number): DibiMetrics {
  return { ...EMPTY_DIBI_METRICS, kejadian };
}

function payload(years: number[], total = years.reduce((s, n) => s + n, 0)): DibiAcehPayload {
  return {
    metadata: {
      judul: "Dampak kejadian bencana — Provinsi Aceh",
      provinsi: "Aceh",
      source_name: "BNPB DIBI — Data Informasi Bencana Indonesia",
      source_url: "https://dibi.bnpb.go.id/superset/dashboard/2/",
      dashboard_id: 2,
      dataset: "Dampak kejadian bencana",
      year_from: 2008,
      year_to: 2026,
      fetched_at: "2026-09-30T07:46:37.122Z",
      filters: { provinsi: ["Aceh"], is_bencana: [true], kategori_bencana: ["Banjir"] },
    },
    totals: metrics(total),
    by_kategori: [],
    by_kabupaten: [{ kabupaten: "Aceh Besar", ...metrics(total) }],
    by_tahun: years.map((kejadian, index) => ({ tahun: 2008 + index, ...metrics(kejadian) })),
  };
}

describe("penjaga payload DIBI", () => {
  it("accepts a live payload whose year rows add up to the total", () => {
    const live = payload([100, 50, 25]);
    assert.equal(sumTahunKejadian(live.by_tahun), 175);
    assert.deepEqual(assessDibiLive(live, 175), { ok: true });
    assert.deepEqual(assessDibiLive(live, null), { ok: true });
  });

  it("rejects a live payload when totals.kejadian is not the year sum", () => {
    const live = payload([100, 50], 175);
    assert.deepEqual(assessDibiLive(live, 175), { ok: false, reason: "year-sum-mismatch" });
  });

  it("rejects a non-finite year row instead of skipping it", () => {
    const live = payload([100]);
    live.by_tahun[0] = { ...live.by_tahun[0], kejadian: Number.NaN };
    assert.equal(sumTahunKejadian(live.by_tahun), null);
    assert.equal(assessDibiLive(live, 100).ok, false);
  });

  it("allows a drop of exactly 2% and rejects a larger drop against the fixture", () => {
    const exact = payload([98]);
    const over = payload([97]);
    assert.deepEqual(assessDibiLive(exact, 100), { ok: true });
    assert.deepEqual(assessDibiLive(over, 100), { ok: false, reason: "kejadian-drop" });
  });

  it("allows kejadian to rise above the fixture", () => {
    assert.deepEqual(assessDibiLive(payload([110]), 100), { ok: true });
  });

  it("keeps the last accepted live payload when the new one fails, else asks for the fixture", () => {
    const good = payload([100, 75]);
    const partial = payload([80], 100);
    const kept = chooseDibiDelivery(partial, 175, good);
    assert.equal(kept?.source, "dibi");
    assert.equal(kept?.payload.totals.kejadian, 175);

    const none = chooseDibiDelivery(partial, 175, null);
    assert.equal(none, null);

    const fresh = chooseDibiDelivery(good, 170, null);
    assert.equal(fresh?.payload, good);
  });
});
