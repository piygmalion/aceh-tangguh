import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { destanaLevelFromIndex, hitungIndeksKetangguhan, nilaiRespon } from "./pkd";
import { toDisasterJenisLabel } from "./jenis-bencana";
import { canAccessModule, normalizedRole } from "./roles";

describe("PKD scoring", () => {
  it("maps Perka 1/2012 thresholds", () => {
    assert.equal(destanaLevelFromIndex(50), "pratama");
    assert.equal(destanaLevelFromIndex(68.33), "madya");
    assert.equal(destanaLevelFromIndex(90), "utama");
  });

  it("counts Ya + 1 as nilai respon", () => {
    assert.equal(nilaiRespon(0), 1);
    assert.equal(nilaiRespon(4), 5);
  });

  it("produces an index in 0–100 when all answers are Ya", () => {
    const ya = new Map<number, number>();
    for (let i = 1; i <= 32; i += 1) ya.set(i, 4);
    const scored = hitungIndeksKetangguhan(ya);
    assert.equal(scored.level, "utama");
    assert.ok(scored.indeks > 90);
  });
});

describe("Juklak jenis mapping", () => {
  it("maps flood bandang to the map legend label", () => {
    assert.equal(
      toDisasterJenisLabel({ kodeJenis: 101, namaKejadian: "Banjir bandang" }),
      "Banjir Bandang"
    );
    assert.equal(toDisasterJenisLabel({ kodeJenis: 107 }), "Gempa Bumi");
  });
});

describe("SIK roles", () => {
  it("treats legacy admin as provincial ops", () => {
    assert.equal(normalizedRole("admin"), "admin_provinsi");
  });

  it("scopes desa away from kejadian ops", () => {
    const desa = {
      userId: "x",
      email: null,
      role: "admin_desa" as const,
      displayName: null,
      createdAt: "",
      kodeKabupaten: null,
      kabupaten: null,
      kodeKecamatan: null,
      kecamatan: null,
      kodeDesaKelurahan: "1101010001",
      desa: "Tes",
    };
    assert.equal(canAccessModule(desa, "destana"), true);
    assert.equal(canAccessModule(desa, "kejadian"), false);
    assert.equal(canAccessModule(desa, "cms"), false);
  });
});
