import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  VILLAGE_DISTRIBUTION_TERCILES,
  buildKecamatanProperties,
  groupVillageFeaturesByKodeKecamatan,
  sixDigitKode,
  villageDistributionBucket,
} from "./kecamatan-dissolve.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("sixDigitKode", () => {
  it("accepts a 6-digit BPS kode and rejects empty / name / wrong length", () => {
    assert.equal(sixDigitKode("110701"), "110701");
    assert.equal(sixDigitKode(110701), "110701");
    assert.equal(sixDigitKode(" 110701 "), "110701");
    assert.equal(sixDigitKode(null), null);
    assert.equal(sixDigitKode(""), null);
    assert.equal(sixDigitKode("Johan Pahlawan"), null);
    assert.equal(sixDigitKode("11070"), null);
    assert.equal(sixDigitKode("1107012"), null);
  });
});

describe("villageDistributionBucket", () => {
  it("uses locked desa terciles 106 / 1184, not kab R3P breaks", () => {
    assert.deepEqual(VILLAGE_DISTRIBUTION_TERCILES, { t1: 106, t2: 1184 });
    const legend = JSON.parse(
      readFileSync(resolve(root, "public/fixtures/areas/villageDistribution.legend.json"), "utf8")
    );
    assert.deepEqual(legend.terciles, VILLAGE_DISTRIBUTION_TERCILES);
    assert.equal(villageDistributionBucket(0), "rendah");
    assert.equal(villageDistributionBucket(106), "rendah");
    assert.equal(villageDistributionBucket(107), "sedang");
    assert.equal(villageDistributionBucket(1184), "sedang");
    assert.equal(villageDistributionBucket(1185), "tinggi");
    assert.notEqual(villageDistributionBucket(200), "tinggi");
  });
});

describe("groupVillageFeaturesByKodeKecamatan", () => {
  it("groups only by kode_kecamatan and leaves leftovers out", () => {
    const { groups, leftover_excluded, skipped_non_six_digit } =
      groupVillageFeaturesByKodeKecamatan([
        {
          properties: {
            name: "A",
            kecamatan: "Johan Pahlawan",
            kabupaten: "Aceh Barat",
            kode_kecamatan: "110701",
            kode_kabupaten: "1107",
            rumah_rr: 10,
            rumah_rs: 2,
            rumah_rb: 1,
            value: 13,
          },
          geometry: { type: "Polygon", coordinates: [] },
        },
        {
          properties: {
            name: "B",
            kecamatan: "Johan Pahlawan",
            kabupaten: "Aceh Barat",
            kode_kecamatan: "110701",
            kode_kabupaten: "1107",
            rumah_rr: 90,
            rumah_rs: 4,
            rumah_rb: 0,
            value: 94,
          },
          geometry: { type: "Polygon", coordinates: [] },
        },
        {
          properties: {
            name: "Same name other kab",
            kecamatan: "Johan Pahlawan",
            kabupaten: "Aceh Jaya",
            kode_kecamatan: "111602",
            kode_kabupaten: "1116",
            rumah_rr: 200,
            rumah_rs: 0,
            rumah_rb: 0,
            value: 200,
          },
          geometry: { type: "Polygon", coordinates: [] },
        },
        {
          properties: {
            name: "Gunung Pulo",
            kecamatan: "Johan Pahlawan",
            kabupaten: "Aceh Barat",
            kode_kecamatan: null,
          },
          geometry: { type: "Polygon", coordinates: [] },
        },
      ]);

    assert.equal(groups.size, 2);
    assert.equal(leftover_excluded, 1);
    assert.equal(skipped_non_six_digit, 0);
    assert.equal(groups.has("110701"), true);
    assert.equal(groups.has("111602"), true);

    const johan = buildKecamatanProperties(groups.get("110701"));
    assert.equal(johan.kode_kecamatan, "110701");
    assert.equal(johan.rumah_rr, 100);
    assert.equal(johan.rumah_rs, 6);
    assert.equal(johan.rumah_rb, 1);
    assert.equal(johan.value, 107);
    assert.equal(johan.bucket, "sedang");
    assert.equal(johan.kecamatan, "Johan Pahlawan");
    assert.equal(johan.kabupaten, "Aceh Barat");
    assert.equal(johan.level, "kecamatan");

    const other = buildKecamatanProperties(groups.get("111602"));
    assert.equal(other.kode_kecamatan, "111602");
    assert.equal(other.kabupaten, "Aceh Jaya");
    assert.equal(other.bucket, "sedang");
  });
});

describe("kecamatanDistribution fixture", () => {
  it("has one feature per existing 6-digit kode and invents none", () => {
    const village = JSON.parse(
      readFileSync(resolve(root, "public/fixtures/areas/villageDistribution.geojson"), "utf8")
    );
    const kec = JSON.parse(
      readFileSync(resolve(root, "public/fixtures/areas/kecamatanDistribution.geojson"), "utf8")
    );
    const { groups, leftover_excluded } = groupVillageFeaturesByKodeKecamatan(
      village.features
    );
    assert.equal(groups.size, 290);
    assert.equal(leftover_excluded, 9);
    assert.equal(kec.features.length, 290);
    assert.equal(kec.metadata?.group_key, "kode_kecamatan");
    assert.equal(kec.metadata?.leftover_excluded, 9);

    const kodes = new Set();
    for (const feature of kec.features) {
      const kode = sixDigitKode(feature.properties?.kode_kecamatan);
      assert.ok(kode, "dissolve output must keep a real 6-digit kode");
      assert.equal(kodes.has(kode), false);
      kodes.add(kode);
      assert.equal(groups.has(kode), true);
      const expected = buildKecamatanProperties(groups.get(kode));
      assert.equal(feature.properties.bucket, expected.bucket);
      assert.equal(feature.properties.rumah_rr, expected.rumah_rr);
      assert.equal(feature.properties.rumah_rs, expected.rumah_rs);
      assert.equal(feature.properties.rumah_rb, expected.rumah_rb);
      assert.equal(feature.properties.value, expected.value);
      assert.equal(feature.properties.level, "kecamatan");
    }
    assert.equal(kodes.size, 290);
  });
});
