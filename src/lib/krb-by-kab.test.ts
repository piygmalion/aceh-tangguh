import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import type { KrbPayload } from "./krb";
import {
  joinKelasOntoIrbiFeatures,
  kawasanOverlappingKab,
  lookupKrbKabupaten,
  lookupKrbWilayah,
  parseKrbJenis,
  toDottedKabKode,
} from "./krb-by-kab";

const fixture = JSON.parse(
  readFileSync(path.join(process.cwd(), "public/fixtures/krb-aceh.json"), "utf8")
) as KrbPayload;

describe("toDottedKabKode", () => {
  it("normalizes 4-digit SIK codes onto weather-registry dotted codes", () => {
    assert.equal(toDottedKabKode("1101"), "11.01");
    assert.equal(toDottedKabKode("11.71"), "11.71");
    assert.equal(toDottedKabKode("1171"), "11.71");
    assert.equal(toDottedKabKode("aceh"), null);
  });
});

describe("parseKrbJenis", () => {
  it("accepts catalog codes only", () => {
    assert.equal(parseKrbJenis("tsunami"), "tsunami");
    assert.equal(parseKrbJenis("gunung_es"), null);
  });
});

describe("lookupKrbWilayah", () => {
  it("joins Banda Aceh tsunami by 4-digit or dotted kode", () => {
    const byDotted = lookupKrbWilayah(fixture.wilayah, {
      kode: "11.71",
      jenis: "tsunami",
    });
    const byDigits = lookupKrbWilayah(fixture.wilayah, {
      kode: "1171",
      jenis: "tsunami",
    });
    assert.equal(byDotted?.kelas_ancaman, "TINGGI");
    assert.equal(byDigits?.id, byDotted?.id);
  });

  it("does not invent a missing jenis class", () => {
    const hit = lookupKrbWilayah(fixture.wilayah, {
      kode: "11.71",
      jenis: "gunung_es",
    });
    assert.equal(hit, undefined);
  });
});

describe("lookupKrbKabupaten", () => {
  it("finds Pidie Jaya by name or kode", () => {
    const byCode = lookupKrbKabupaten(fixture.kabupaten, { kode: "1118" });
    const byName = lookupKrbKabupaten(fixture.kabupaten, { nama: "Pidie Jaya" });
    assert.equal(byCode?.kode_kabupaten, "11.18");
    assert.equal(byName?.kode_kabupaten, "11.18");
  });

  it("joins corrected kode_sik onto Kemendagri KRB rows", () => {
    const tamiang = lookupKrbKabupaten(fixture.kabupaten, { kode: "1116" });
    const jaya = lookupKrbKabupaten(fixture.kabupaten, { kode: "1114" });
    const langsa = lookupKrbKabupaten(fixture.kabupaten, { kode: "1174" });
    const lhok = lookupKrbKabupaten(fixture.kabupaten, { kode: "1173" });
    assert.equal(tamiang?.kabupaten, "Aceh Tamiang");
    assert.equal(tamiang?.kode_kabupaten, "11.16");
    assert.equal(jaya?.kabupaten, "Aceh Jaya");
    assert.equal(jaya?.kode_kabupaten, "11.14");
    assert.equal(langsa?.kabupaten, "Langsa");
    assert.equal(langsa?.kode_kabupaten, "11.74");
    assert.equal(lhok?.kabupaten, "Lhokseumawe");
    assert.equal(lhok?.kode_kabupaten, "11.73");
  });
});

describe("joinKelasOntoIrbiFeatures", () => {
  it("paints kelas from wilayah and leaves unmatched features untouched", () => {
    const features = [
      { properties: { name: "Banda Aceh", kode_kabupaten: "11.71" } as Record<string, unknown> },
      { properties: { name: "Atlantis", kode_kabupaten: "99.99" } as Record<string, unknown> },
    ];
    const joined = joinKelasOntoIrbiFeatures(features, fixture.wilayah, "tsunami");
    assert.equal(joined[0]?.properties?.kelas_ancaman, "TINGGI");
    assert.equal(joined[0]?.properties?.bucket, "tinggi");
    assert.equal(joined[1]?.properties?.kelas_ancaman, undefined);
    assert.equal(joined[1]?.properties?.bucket, undefined);
  });
});

describe("kawasanOverlappingKab", () => {
  it("returns named kawasan whose kode_kabupaten overlaps", () => {
    const bener = kawasanOverlappingKab(fixture.kawasan, "1117");
    assert.equal(
      bener.some((row) => /telong/i.test(row.nama)),
      true
    );
    assert.deepEqual(kawasanOverlappingKab(fixture.kawasan, "9999"), []);
  });
});
