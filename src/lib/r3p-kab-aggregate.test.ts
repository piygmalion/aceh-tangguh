import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FOUR_DIGIT_KODE,
  R3P_KAB_TERCILES,
  buildR3pKabProperties,
  fourDigitKode,
  groupKecamatanFeaturesByKabupaten,
  r3pKabBucket,
  rumahTotalFromGroups,
} from "./r3p-kab-aggregate";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("r3p kab aggregate", () => {
  it("uses legend terciles and never invents a 4-digit kode", () => {
    assert.equal(R3P_KAB_TERCILES.t1, 1362);
    assert.equal(R3P_KAB_TERCILES.t2, 10795);
    assert.equal(r3pKabBucket(1362), "rendah");
    assert.equal(r3pKabBucket(1363), "sedang");
    assert.equal(r3pKabBucket(10795), "sedang");
    assert.equal(r3pKabBucket(10796), "tinggi");
    assert.equal(fourDigitKode("1107"), "1107");
    assert.equal(fourDigitKode("110701"), null);
    assert.equal(fourDigitKode(""), null);
    assert.equal(FOUR_DIGIT_KODE.test("11"), false);
  });

  it("groups by kode_kabupaten and prefixes kode_kecamatan; leftovers stay out", () => {
    const { groups, leftover_excluded } = groupKecamatanFeaturesByKabupaten([
      {
        properties: {
          kode_kabupaten: "1107",
          kabupaten: "Aceh Barat",
          rumah_rr: 2,
          rumah_rs: 3,
          rumah_rb: 1,
          value: 6,
        },
        geometry: { type: "Polygon", coordinates: [] },
      },
      {
        properties: {
          kode_kecamatan: "110801",
          kabupaten: "Aceh Besar",
          rumah_rr: 4,
          rumah_rs: 0,
          rumah_rb: 0,
        },
        geometry: { type: "Polygon", coordinates: [] },
      },
      {
        properties: { kabupaten: "Tanpa kode", rumah_rr: 9 },
        geometry: { type: "Polygon", coordinates: [] },
      },
    ]);
    assert.equal(leftover_excluded, 1);
    assert.equal(groups.size, 2);
    const barat = groups.get("1107");
    assert.ok(barat);
    assert.equal(barat.rumah_rr + barat.rumah_rs + barat.rumah_rb, 6);
    const props = buildR3pKabProperties(barat);
    assert.equal(props.kode_kab, "1107");
    assert.equal(props.level, "kab");
    assert.equal(props.source, "dissolve:kode_kabupaten");
    assert.equal(props.bucket, "rendah");
  });

  it("aggregates kecamatan fixture to 23 kab and preserves RR+RS+RB totals", () => {
    const raw = JSON.parse(
      readFileSync(join(ROOT, "public/fixtures/areas/kecamatanDistribution.geojson"), "utf8"),
    ) as {
      features: Array<{
        properties?: Record<string, unknown> | null;
        geometry?: object | null;
      }>;
    };
    const { groups, leftover_excluded } = groupKecamatanFeaturesByKabupaten(
      raw.features,
    );
    assert.equal(leftover_excluded, 0);
    assert.equal(groups.size, 23);
    const fromKec = raw.features.reduce((sum, f) => {
      const p = f.properties ?? {};
      return (
        sum +
        Number(p.rumah_rr ?? 0) +
        Number(p.rumah_rs ?? 0) +
        Number(p.rumah_rb ?? 0)
      );
    }, 0);
    assert.equal(rumahTotalFromGroups(groups), fromKec);
  });

  it("keeps the written kab fixture at 23 features with the same RR+RS+RB total", () => {
    const raw = JSON.parse(
      readFileSync(join(ROOT, "public/fixtures/areas/r3pDistribution.geojson"), "utf8"),
    ) as {
      features: Array<{ properties?: Record<string, unknown> | null }>;
    };
    const kec = JSON.parse(
      readFileSync(join(ROOT, "public/fixtures/areas/kecamatanDistribution.geojson"), "utf8"),
    ) as {
      features: Array<{ properties?: Record<string, unknown> | null }>;
    };
    assert.equal(raw.features.length, 23);
    const kabTotal = raw.features.reduce((sum, f) => {
      const p = f.properties ?? {};
      return (
        sum +
        Number(p.rumah_rr ?? 0) +
        Number(p.rumah_rs ?? 0) +
        Number(p.rumah_rb ?? 0)
      );
    }, 0);
    const kecTotal = kec.features.reduce((sum, f) => {
      const p = f.properties ?? {};
      return (
        sum +
        Number(p.rumah_rr ?? 0) +
        Number(p.rumah_rs ?? 0) +
        Number(p.rumah_rb ?? 0)
      );
    }, 0);
    assert.equal(kabTotal, kecTotal);
    for (const feature of raw.features) {
      const kode = String(feature.properties?.kode_kab ?? "");
      assert.equal(FOUR_DIGIT_KODE.test(kode), true);
      assert.equal(feature.properties?.level, "kab");
      assert.equal(feature.properties?.source, "dissolve:kode_kabupaten");
    }
  });
});
