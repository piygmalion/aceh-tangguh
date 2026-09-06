import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CHOROPLETH_DAMAGED_HOME,
  VILLAGE_DISTRIBUTION_BUCKETS,
  VILLAGE_DISTRIBUTION_QUINTILES,
  bucketFromVillageProps,
  isUnknownVillageBucket,
  quintileBreaks,
  rumahTotal,
  villageDistributionBucket,
  groupVillageTotalsByKabupatenName,
  normalizeKabupatenName,
} from "./village-distribution-buckets.mjs";

describe("villageDistribution quintile buckets", () => {
  it("locks positive-only breaks 20 / 191 / 731 / 2849", () => {
    assert.deepEqual(VILLAGE_DISTRIBUTION_QUINTILES, {
      q1: 20,
      q2: 191,
      q3: 731,
      q4: 2849,
    });
    assert.deepEqual(
      [...VILLAGE_DISTRIBUTION_BUCKETS],
      [
        "sangat_rendah",
        "rendah",
        "sedang",
        "tinggi",
        "sangat_tinggi",
        "belum_diketahui",
      ]
    );
  });

  it("classifies zero as sangat_rendah and unknown leftovers separately", () => {
    assert.equal(villageDistributionBucket(0), "sangat_rendah");
    assert.equal(villageDistributionBucket(20), "sangat_rendah");
    assert.equal(villageDistributionBucket(21), "rendah");
    assert.equal(villageDistributionBucket(191), "rendah");
    assert.equal(villageDistributionBucket(192), "sedang");
    assert.equal(villageDistributionBucket(731), "sedang");
    assert.equal(villageDistributionBucket(732), "tinggi");
    assert.equal(villageDistributionBucket(2849), "tinggi");
    assert.equal(villageDistributionBucket(2850), "sangat_tinggi");
    assert.equal(villageDistributionBucket(100, { unknown: true }), "belum_diketahui");
  });

  it("treats missing BPS kode or all-null rumah as unknown", () => {
    assert.equal(isUnknownVillageBucket({ kodeDesa: null, rumah_rr: 0 }), true);
    assert.equal(
      isUnknownVillageBucket({
        kodeDesa: "1101012001",
        rumah_rr: null,
        rumah_rs: null,
        rumah_rb: null,
      }),
      true
    );
    assert.equal(
      isUnknownVillageBucket({
        kodeDesa: "1101012001",
        rumah_rr: 0,
        rumah_rs: 0,
        rumah_rb: 0,
      }),
      false
    );
    assert.equal(rumahTotal(10, 2, 1), 13);
    assert.equal(
      bucketFromVillageProps({
        kode_desa_kelurahan: null,
        rumah_rr: 0,
        rumah_rs: 0,
        rumah_rb: 0,
      }),
      "belum_diketahui"
    );
  });

  it("recomputes the locked breaks from the same rank rule", () => {
    const sample = [1, 20, 21, 191, 192, 731, 732, 2849, 2850, 12842];
    const breaks = quintileBreaks(sample);
    assert.equal(typeof breaks.q1, "number");
    assert.ok(breaks.q1 <= breaks.q2);
    assert.ok(breaks.q2 <= breaks.q3);
    assert.ok(breaks.q3 <= breaks.q4);
  });

  it("sums kab dissolve by kabupaten name, not sliced BPS prefixes", () => {
    assert.equal(normalizeKabupatenName("Kota Langsa"), "Langsa");
    assert.equal(normalizeKabupatenName("Kota Sabang"), "Sabang");
    assert.equal(normalizeKabupatenName("Pidie"), "Pidie");
    const totals = groupVillageTotalsByKabupatenName([
      {
        properties: {
          kabupaten: "Pidie",
          kode_kabupaten: "1107",
          kode_desa_kelurahan: "1107192028",
          rumah_rr: 10,
          rumah_rs: 8,
          rumah_rb: 0,
        },
      },
      {
        properties: {
          kabupaten: "Aceh Barat",
          kode_kabupaten: "1105",
          kode_desa_kelurahan: "1105012001",
          rumah_rr: 1,
          rumah_rs: 0,
          rumah_rb: 0,
        },
      },
    ]);
    assert.equal(totals.get("Pidie").value, 18);
    assert.equal(totals.get("Aceh Barat").value, 1);
    assert.equal(totals.has("1107"), false);
  });

  it("uses brand sequential HEX, not a new rainbow", () => {
    assert.equal(CHOROPLETH_DAMAGED_HOME.sangat_rendah, "#C5D2B8");
    assert.equal(CHOROPLETH_DAMAGED_HOME.sangat_tinggi, "#B42318");
    assert.equal(CHOROPLETH_DAMAGED_HOME.belum_diketahui, "#52524B");
  });
});
