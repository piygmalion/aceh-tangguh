import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  ANALISIS_SAMPLE_LIMIT,
  buildKejadianAnalisis,
  countByKabupaten,
  parseAnalisisMetric,
  yearlyTrend,
} from "./kejadian-analisis";
import type { KejadianFixture, KejadianRow } from "./kejadian-types";

function row(partial: Partial<KejadianRow> & Pick<KejadianRow, "id" | "jenis_bencana" | "hari_tanggal">): KejadianRow {
  return {
    lokasi: {},
    ...partial,
  };
}

const FIXTURE: KejadianFixture = {
  metadata: { judul: "uji" },
  kejadian: [
    row({
      id: "a",
      jenis_bencana: "Banjir",
      hari_tanggal: "2024-01-10",
      lokasi: { kabupaten: "Aceh Besar" },
      jumlah_korban: { meninggal: 1, luka_ringan: 2, luka_berat: 0, hilang: 0 },
      kerusakan_dan_korban: { rumah: { rusak_ringan: 3, rusak_sedang: 1, rusak_berat: 0 } },
    }),
    row({
      id: "b",
      jenis_bencana: "Banjir",
      hari_tanggal: "2024-03-02",
      lokasi: { kabupaten: "Aceh Utara" },
      jumlah_korban: { meninggal: 0, luka_ringan: 1, luka_berat: 1, hilang: 0 },
      kerusakan_dan_korban: { rumah: { rusak_ringan: 0, rusak_sedang: 2, rusak_berat: 1 } },
    }),
    row({
      id: "c",
      jenis_bencana: "Longsor",
      hari_tanggal: "2025-06-15",
      lokasi: { kabupaten: "Aceh Besar" },
    }),
    row({
      id: "rekap",
      jenis_bencana: "Rekapitulasi Tahunan",
      hari_tanggal: "2024-01-01",
      lokasi: { kabupaten: "Aceh Besar" },
      jumlah_korban: { meninggal: 99 },
    }),
  ],
};

describe("kejadian-analisis G20", () => {
  it("parseAnalisisMetric only allows kejadian | rumah | korban", () => {
    assert.equal(parseAnalisisMetric("rumah"), "rumah");
    assert.equal(parseAnalisisMetric("korban"), "korban");
    assert.equal(parseAnalisisMetric("dibi"), "kejadian");
    assert.equal(parseAnalisisMetric(undefined), "kejadian");
  });

  it("countByKabupaten ignores yearly recap rows and sorts by count", () => {
    const filtered = FIXTURE.kejadian.filter((r) => r.jenis_bencana !== "Rekapitulasi Tahunan");
    const counts = countByKabupaten(filtered);
    assert.deepEqual(
      counts.map((row) => row.kabupaten),
      ["Aceh Besar", "Aceh Utara"]
    );
    assert.equal(counts[0].count, 2);
    assert.equal(counts[1].count, 1);
  });

  it("yearlyTrend counts events per start year", () => {
    const points = yearlyTrend(FIXTURE.kejadian.filter((r) => r.id !== "rekap"));
    assert.deepEqual(points, [
      { year: 2024, count: 2, value: 2 },
      { year: 2025, count: 1, value: 1 },
    ]);
  });

  it("buildKejadianAnalisis returns 200-shaped aggregates without recap or DIBI fields", () => {
    const payload = buildKejadianAnalisis(FIXTURE, { from: "2024-01-01", to: "2024-12-31" }, "fixture");
    assert.equal(payload.source, "fixture");
    assert.equal(payload.total, 2);
    assert.equal(payload.metric, "kejadian");
    assert.equal(payload.impact.meninggal, 1);
    assert.equal(payload.impact.rr, 3);
    assert.equal(payload.byJenis.every((row) => row.jenis !== "Rekapitulasi Tahunan"), true);
    assert.equal(payload.sample.length <= ANALISIS_SAMPLE_LIMIT, true);
    assert.equal(payload.sample[0]?.id, "b");
    assert.equal("dibi" in payload, false);
    assert.equal("totals" in payload, false);
    assert.equal(payload.rumahImpacts.length, 2);
    assert.equal(payload.latestDate, "2024-03-02");
  });

  it("rumah metric sums existing housing fields only", () => {
    const payload = buildKejadianAnalisis(
      FIXTURE,
      { from: "2024-01-01", to: "2024-12-31", metric: "rumah" },
      "fixture"
    );
    const banjir = payload.byJenis.find((row) => row.jenis === "Banjir");
    assert.equal(banjir?.count, 2);
    assert.equal(banjir?.value, 7);
  });

  it("empty filter is a valid zero payload, not an error shape", () => {
    const payload = buildKejadianAnalisis(FIXTURE, { jenis: "Tsunami" }, "fixture");
    assert.equal(payload.total, 0);
    assert.deepEqual(payload.byJenis, []);
    assert.deepEqual(payload.sample, []);
    assert.ok(payload.facets.kabupaten.includes("Aceh Besar"));
  });

  it("does not import or name DIBI inside the aggregator module", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/kejadian-analisis.ts"), "utf8");
    assert.equal(/dibi/i.test(src), false);
  });
});
