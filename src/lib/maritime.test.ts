import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { isMaritimeCacheStale, pickCurrentSlot, waveCatFill } from "./maritime";
import { inariskExportImageUrl, webMercatorTileBbox } from "./inarisk-tiles";

describe("BE-16 maritime cache read vs cron write", () => {
  it("marks stale only when expires_at is in the past", () => {
    const now = Date.parse("2026-09-05T07:00:00Z");
    assert.equal(isMaritimeCacheStale(null, now), false);
    assert.equal(isMaritimeCacheStale("2026-09-05T08:00:00.000Z", now), false);
    assert.equal(isMaritimeCacheStale("2026-09-05T06:00:00.000Z", now), true);
  });

  it("GET load path does not persist; cron refresh does", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/maritime.ts"), "utf8");
    const loadFn = src.slice(
      src.indexOf("export async function loadMaritimeForecast"),
      src.indexOf("export async function refreshMaritimeForecasts"),
    );
    assert.match(loadFn, /readCachedForecast/);
    assert.equal(loadFn.includes("persistForecast"), false);
    assert.equal(loadFn.includes("fetchForecastJson"), false);
    const refreshFn = src.slice(src.indexOf("export async function refreshMaritimeForecasts"));
    assert.match(refreshFn, /persistForecast/);
    assert.match(refreshFn, /fetchForecastJson/);
    const perairan = readFileSync(
      join(process.cwd(), "src/app/api/overlay/maritime/perairan/route.ts"),
      "utf8",
    );
    const pelabuhan = readFileSync(
      join(process.cwd(), "src/app/api/overlay/maritime/pelabuhan/[kode]/route.ts"),
      "utf8",
    );
    assert.equal(perairan.includes("refreshMaritimeForecasts"), false);
    assert.equal(pelabuhan.includes("refreshMaritimeForecasts"), false);
    assert.equal(perairan.includes("persistForecast"), false);
    assert.equal(pelabuhan.includes("persistForecast"), false);
  });
});

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

describe("DATA-11 dump upsert_marker_features", () => {
  it("migrasi baru memuat tubuh dump, bukan tebakan kosong", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20260922_upsert_marker_features_body.sql"),
      "utf8",
    );
    assert.match(sql, /upsert_marker_features\(rows jsonb\)/);
    assert.match(sql, /jsonb_array_elements/);
    assert.match(sql, /marker_features/);
    assert.match(sql, /Jangan apply/);
    assert.doesNotMatch(sql, /20260920_revoke/);
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
