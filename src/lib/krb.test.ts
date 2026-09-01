import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { filterKrb, type KrbPayload } from "./krb";

const fixture = JSON.parse(
  readFileSync(path.join(process.cwd(), "public/fixtures/krb-aceh.json"), "utf8")
) as KrbPayload;

describe("KRB Aceh fixture", () => {
  it("covers 23 kab/kota × 11 jenis bahaya", () => {
    assert.equal(fixture.kabupaten.length, 23);
    assert.equal(fixture.jenis_bahaya.length, 11);
    assert.equal(fixture.wilayah.length, 253);
    assert.equal(fixture.kawasan.length, 7);
    assert.equal(fixture.dokumen.length, 11);
  });

  it("joins every wilayah row to a kabupaten and hazard code", () => {
    const kabCodes = new Set(fixture.kabupaten.map((k) => k.kode_kabupaten));
    const jenis = new Set(fixture.jenis_bahaya.map((j) => j.kode));
    for (const row of fixture.wilayah) {
      assert.equal(kabCodes.has(row.kode_kabupaten), true, row.id);
      assert.equal(jenis.has(row.jenis_bahaya), true, row.id);
      assert.match(row.kelas_ancaman, /^(RENDAH|SEDANG|TINGGI)$/);
    }
  });

  it("keeps provincial IRBI 2025 as TINGGI 192.75", () => {
    const irbi = fixture.metadata.irbi_2025 as {
      nilai_irb_provinsi: number;
      kelas_risiko_provinsi: string;
    };
    assert.equal(irbi.nilai_irb_provinsi, 192.75);
    assert.equal(irbi.kelas_risiko_provinsi, "TINGGI");
  });
});

describe("filterKrb", () => {
  it("filters tsunami rows for Banda Aceh", () => {
    const filtered = filterKrb(fixture, { jenis: "tsunami", kabupaten: "11.71" });
    assert.equal(filtered.wilayah.length, 1);
    assert.equal(filtered.wilayah[0]?.jenis_bahaya, "tsunami");
    assert.equal(filtered.wilayah[0]?.kabupaten, "Banda Aceh");
    assert.equal(filtered.kabupaten.length, 1);
  });

  it("does not invent a missing hazard class", () => {
    const filtered = filterKrb(fixture, { jenis: "gunung_es" });
    assert.equal(filtered.wilayah.length, 0);
  });
});
