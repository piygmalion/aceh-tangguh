import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { EMPTY_DIBI_METRICS, type DibiAcehPayload, type DibiMetrics } from "./dibi-types";
import { aggregateDibiBeranda, displayedBandMetrics, yearPick } from "./dibi-beranda";

function metrics(partial: Partial<DibiMetrics> & Pick<DibiMetrics, "kejadian">): DibiMetrics {
  return { ...EMPTY_DIBI_METRICS, ...partial };
}

function payload(): DibiAcehPayload {
  return {
    metadata: {
      judul: "Dampak kejadian bencana — Provinsi Aceh",
      provinsi: "Aceh",
      source_name: "BNPB DIBI — Data Informasi Bencana Indonesia",
      source_url: "https://dibi.bnpb.go.id/superset/dashboard/2/",
      dashboard_id: 2,
      dataset: "Dampak kejadian bencana",
      year_from: 2010,
      year_to: 2012,
      fetched_at: "2026-09-30T07:46:37.122Z",
      filters: {
        provinsi: ["Aceh"],
        is_bencana: [true],
        kategori_bencana: ["Banjir", "Longsor"],
      },
    },
    totals: metrics({ kejadian: 100, meninggal: 9, hilang: 1, luka_sakit: 4, menderita_mengungsi: 40 }),
    by_kategori: [
      {
        kategori_bencana: "Banjir",
        ...metrics({ kejadian: 70, meninggal: 8, menderita_mengungsi: 30, estimasi_kerugian_rumah: 11 }),
      },
      {
        kategori_bencana: "Longsor",
        ...metrics({ kejadian: 30, meninggal: 1, hilang: 1, luka_sakit: 4, menderita_mengungsi: 10 }),
      },
    ],
    by_kabupaten: [
      {
        kabupaten: "Aceh Besar",
        ...metrics({ kejadian: 60, meninggal: 5, menderita_mengungsi: 25 }),
      },
      {
        kabupaten: "Kota Banda Aceh",
        ...metrics({ kejadian: 42, meninggal: 4, hilang: 1, luka_sakit: 4, menderita_mengungsi: 15 }),
      },
    ],
    by_tahun: [
      { tahun: 2010, ...metrics({ kejadian: 10, meninggal: 1, estimasi_kerugian_rumah: 2 }) },
      { tahun: 2012, ...metrics({ kejadian: 30, meninggal: 3, hilang: 1, luka_sakit: 4, menderita_mengungsi: 20 }) },
    ],
  };
}

describe("agregasi filter DIBI beranda", () => {
  it("sums only the years inside an inclusive range", () => {
    const view = aggregateDibiBeranda(payload(), { yearFrom: 2010, yearTo: 2010 });
    assert.deepEqual(
      view.trend.map((row) => row.tahun),
      [2010],
    );
    assert.equal(view.counters.scope, "year-range");
    assert.equal(view.counters.metrics?.kejadian, 10);
    assert.equal(view.counters.metrics?.meninggal, 1);
    assert.equal(view.counters.metrics?.estimasi_kerugian_rumah, 2);
    assert.equal(view.counters.respectsYearFilter, true);
  });

  it("sums every metric field across the selected years and skips years that are absent", () => {
    const view = aggregateDibiBeranda(payload(), { yearFrom: 2010, yearTo: 2012 });
    assert.deepEqual(
      view.trend.map((row) => row.tahun),
      [2010, 2012],
    );
    assert.equal(view.counters.metrics?.kejadian, 40);
    assert.equal(view.counters.metrics?.meninggal, 4);
    assert.equal(view.counters.metrics?.hilang, 1);
    assert.equal(view.counters.metrics?.luka_sakit, 4);
    assert.equal(view.counters.metrics?.menderita_mengungsi, 20);
    assert.equal(view.trend.some((row) => row.tahun === 2011), false);
  });

  it("treats a reversed year range as the same window", () => {
    const forward = aggregateDibiBeranda(payload(), { yearFrom: 2010, yearTo: 2012 });
    const reversed = aggregateDibiBeranda(payload(), { yearFrom: 2012, yearTo: 2010 });
    assert.equal(reversed.counters.metrics?.kejadian, forward.counters.metrics?.kejadian);
    assert.deepEqual(
      reversed.trend.map((row) => row.tahun),
      forward.trend.map((row) => row.tahun),
    );
  });

  it("returns zero counters when the year window matches no rows", () => {
    const view = aggregateDibiBeranda(payload(), { yearFrom: 1990, yearTo: 1991 });
    assert.equal(view.trend.length, 0);
    assert.equal(view.counters.scope, "year-range");
    assert.equal(view.counters.metrics?.kejadian, 0);
    assert.equal(view.counters.metrics?.meninggal, 0);
    assert.equal(displayedBandMetrics(view), null);
  });

  it("ignores a blank or unknown year pick so the default span stays intact", () => {
    assert.equal(yearPick("", [2008, 2026]), null);
    assert.equal(yearPick("0", [2008, 2026]), null);
    assert.equal(yearPick("1990", [2008, 2026]), null);
    assert.equal(yearPick("2008", [2008, 2026]), 2008);
  });

  it("sums the shipped Aceh fixture across the default year span", () => {
    const file = path.join(process.cwd(), "public/fixtures/dibi-aceh.json");
    const fixture = JSON.parse(readFileSync(file, "utf8")) as DibiAcehPayload;
    const view = aggregateDibiBeranda(fixture, { yearFrom: null, yearTo: null });
    assert.equal(view.trend.length, fixture.by_tahun.length);
    assert.equal(view.counters.metrics?.kejadian, fixture.totals.kejadian);
    assert.ok((fixture.totals.kejadian ?? 0) > 0);
    assert.equal(displayedBandMetrics(view)?.kejadian, fixture.totals.kejadian);
  });

  it("uses one kabupaten row for all years and does not scale it by the year filter", () => {
    const view = aggregateDibiBeranda(payload(), {
      yearFrom: 2010,
      yearTo: 2010,
      kabupaten: "Kota Banda Aceh",
    });
    assert.equal(view.counters.scope, "kabupaten");
    assert.equal(view.counters.respectsYearFilter, false);
    assert.equal(view.counters.metrics?.kejadian, 42);
    assert.equal(view.counters.metrics?.meninggal, 4);
    assert.equal(view.counters.metrics?.hilang, 1);
    assert.equal(view.trendIgnoresKabupaten, true);
    assert.equal(view.trend[0]?.kejadian, 10);
  });

  it("does not treat a partial kabupaten name as a match", () => {
    const view = aggregateDibiBeranda(payload(), { kabupaten: "Aceh" });
    assert.equal(view.counters.scope, "unavailable");
    assert.equal(view.counters.metrics, null);
    const besar = aggregateDibiBeranda(payload(), { kabupaten: "Aceh Besar" });
    assert.equal(besar.counters.metrics?.kejadian, 60);
  });

  it("uses one jenis row for all years and all kabupaten", () => {
    const view = aggregateDibiBeranda(payload(), {
      yearFrom: 2012,
      yearTo: 2012,
      jenis: "Banjir",
    });
    assert.equal(view.counters.scope, "jenis");
    assert.equal(view.counters.respectsYearFilter, false);
    assert.equal(view.counters.metrics?.kejadian, 70);
    assert.equal(view.counters.metrics?.estimasi_kerugian_rumah, 11);
    assert.equal(view.trendIgnoresJenis, true);
  });

  it("rejects a jenis name that differs only by case", () => {
    const view = aggregateDibiBeranda(payload(), { jenis: "banjir" });
    assert.equal(view.counters.scope, "unavailable");
    assert.equal(view.counters.metrics, null);
  });

  it("refuses a kabupaten and jenis cross filter instead of inventing a split", () => {
    const view = aggregateDibiBeranda(payload(), {
      kabupaten: "Aceh Besar",
      jenis: "Banjir",
    });
    assert.equal(view.counters.scope, "unavailable");
    assert.equal(view.counters.metrics, null);
    assert.equal(view.crossTabAvailable, false);
    assert.equal("totalBencana" in view, false);
    assert.equal("totalKejadian" in view, false);
  });

  it("keeps kabupaten bars unstacked and unfiltered by year or jenis", () => {
    const view = aggregateDibiBeranda(payload(), {
      yearFrom: 2010,
      yearTo: 2010,
      jenis: "Longsor",
    });
    assert.equal(view.kabChart.stackedByJenis, false);
    assert.equal(view.kabChart.respectsYearFilter, false);
    assert.equal(view.kabChart.respectsJenisFilter, false);
    assert.deepEqual(
      view.kabChart.rows.map((row) => [row.kabupaten, row.kejadian]),
      [
        ["Aceh Besar", 60],
        ["Kota Banda Aceh", 42],
      ],
    );
    assert.equal(
      view.kabChart.rows.reduce((sum, row) => sum + row.kejadian, 0),
      102,
    );
  });

  it("has no incident-level rows to show as latest events", () => {
    const view = aggregateDibiBeranda(payload(), {});
    assert.deepEqual(view.kejadianTerbaru, []);
    assert.equal(view.incidentLevelAvailable, false);
  });

  it("treats blank filters as the full province year span", () => {
    const view = aggregateDibiBeranda(payload(), {
      yearFrom: null,
      yearTo: null,
      kabupaten: "  ",
      jenis: "",
    });
    assert.equal(view.counters.scope, "year-range");
    assert.equal(view.counters.metrics?.kejadian, 40);
    assert.deepEqual(view.kabupatenOptions, ["Aceh Besar", "Kota Banda Aceh"]);
    assert.deepEqual(view.jenisOptions, ["Banjir", "Longsor"]);
    assert.deepEqual(view.years, [2010, 2012]);
  });
});
