import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  ACEH_KABUPATEN_REGISTRY,
  adm2ToSikKode,
  resolveAdm2,
  sikKodeToAdm2,
} from "./aceh-kabupaten";
import { ACEH_KABUPATEN } from "./sik/juklak";
import { toDottedKabKode } from "./krb-by-kab";

const fixture = JSON.parse(
  readFileSync(
    path.join(process.cwd(), "public/fixtures/aceh-kabupaten-registry.json"),
    "utf8"
  )
) as { kabupaten_kota: typeof ACEH_KABUPATEN_REGISTRY };

describe("aceh kabupaten registry", () => {
  it("has 23 rows matching Juklak kode+nama and the JSON fixture", () => {
    assert.equal(ACEH_KABUPATEN_REGISTRY.length, 23);
    assert.equal(ACEH_KABUPATEN.length, 23);
    assert.deepEqual(
      ACEH_KABUPATEN_REGISTRY.map((row) => ({ kode: row.kode_sik, nama: row.nama })),
      ACEH_KABUPATEN.map((row) => ({ kode: row.kode, nama: row.nama }))
    );
    assert.deepEqual(fixture.kabupaten_kota, [...ACEH_KABUPATEN_REGISTRY]);
  });

  it("aligns kode_sik with Kemendagri for the four former swaps", () => {
    assert.equal(toDottedKabKode("1114"), "11.14");
    for (const row of ACEH_KABUPATEN_REGISTRY) {
      assert.equal(toDottedKabKode(row.kode_sik), row.adm2, row.nama);
      assert.equal(sikKodeToAdm2(row.kode_sik), row.adm2, row.nama);
      assert.equal(adm2ToSikKode(row.adm2), row.kode_sik, row.nama);
    }
    assert.equal(sikKodeToAdm2("1116"), "11.16");
    assert.equal(resolveAdm2("1116"), "11.16");
    assert.equal(adm2ToSikKode("11.16"), "1116");
    assert.equal(sikKodeToAdm2("1114"), "11.14");
    assert.equal(sikKodeToAdm2("1174"), "11.74");
    assert.equal(sikKodeToAdm2("1173"), "11.73");
    assert.equal(resolveAdm2("11.14"), "11.14");
    assert.equal(resolveAdm2("unknown"), null);
  });

  it("weather registry adm2 matches the canonical registry for every nama", () => {
    const weather = JSON.parse(
      readFileSync(
        path.join(process.cwd(), "public/fixtures/kab-weather-registry.json"),
        "utf8"
      )
    ) as { kabupaten_kota: Array<{ kabupaten_kota: string; adm2: string; slug: string }> };
    for (const row of ACEH_KABUPATEN_REGISTRY) {
      const hit = weather.kabupaten_kota.find(
        (w) => w.kabupaten_kota.toLowerCase() === row.nama.toLowerCase()
      );
      assert.ok(hit, row.nama);
      assert.equal(hit?.adm2, row.adm2, row.nama);
      assert.equal(hit?.slug, row.slug, row.nama);
    }
  });
});
