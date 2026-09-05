import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { destanaLevelFromIndex, hitungIndeksKetangguhan, nilaiRespon } from "./pkd";
import { toDisasterJenisLabel } from "./jenis-bencana";
import { canAccessModule, normalizedRole } from "./roles";
import {
  ACEH_KABUPATEN,
  dampakToAmbang,
  formatKib,
  kabKodeDuaDigit,
  kibPrefix,
  mapLaporanSlugToJenis,
  memenuhiAmbangBatas,
  nextKibIndex,
  rekapStatis,
  tarikhFromWaktu,
} from "./juklak";

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

describe("Juklak KIB", () => {
  it("uses last two digits of Kemendagri kab codes", () => {
    assert.equal(kabKodeDuaDigit("1101"), "01");
    assert.equal(kabKodeDuaDigit("1171"), "71");
    assert.equal(ACEH_KABUPATEN.length, 23);
  });

  it("builds 16-digit KIB for Aceh Selatan flood", () => {
    const prefix = kibPrefix({ kodeKabupaten: "1101", kodeJenis: 101, tarikh: "2026-08-31" });
    assert.equal(prefix, "110110120260831");
    assert.equal(formatKib(prefix, 1), "1101101202608311");
  });

  it("builds KIB for Banda Aceh earthquake", () => {
    const prefix = kibPrefix({ kodeKabupaten: "1171", kodeJenis: 107, tarikh: "2026-08-31" });
    assert.equal(formatKib(prefix, 1), "1171107202608311");
  });

  it("increments daily index", () => {
    assert.equal(nextKibIndex(["1101101202608311"]), 2);
  });
});

describe("Juklak ambang batas and rekap", () => {
  it("flags bencana on one fatality", () => {
    assert.equal(
      memenuhiAmbangBatas({
        statusDarurat: false,
        permintaanBantuanNasional: false,
        dampak: {
          meninggal: 1,
          luka: 0,
          mengungsi: 0,
          menderita: 0,
          rumahRusak: 0,
          faskes: 0,
          pendidikan: 0,
          ibadah: 0,
          kantor: 0,
          pasar: 0,
          lahanHa: 0,
        },
      }),
      true
    );
  });

  it("uses peak displaced and last deaths for static rekap", () => {
    const rekap = rekapStatis([
      {
        tanggal: "2026-08-30",
        meninggal: 1,
        hilang: 0,
        luka_berat: 2,
        luka_ringan: 3,
        mengungsi: 80,
        menderita: 10,
        rumah_rb: 1,
        rumah_rs: 0,
        rumah_rr: 0,
        rumah_terendam: 0,
        kerugian_rumah_rp: null,
        faskes: 0,
        pendidikan: 0,
        ibadah: 0,
        kantor: 0,
        pasar: 0,
        kerugian_pelayanan_rp: null,
        sapras: 0,
        kerugian_sapras_rp: null,
        lahan_ha: null,
        toko: 0,
        pabrik: 0,
        kerugian_ekonomi_rp: null,
      },
      {
        tanggal: "2026-08-31",
        meninggal: 2,
        hilang: 1,
        luka_berat: 1,
        luka_ringan: 1,
        mengungsi: 40,
        menderita: 4,
        rumah_rb: 3,
        rumah_rs: 1,
        rumah_rr: 0,
        rumah_terendam: 2,
        kerugian_rumah_rp: 10,
        faskes: 1,
        pendidikan: 0,
        ibadah: 0,
        kantor: 0,
        pasar: 0,
        kerugian_pelayanan_rp: null,
        sapras: 0,
        kerugian_sapras_rp: null,
        lahan_ha: 1.5,
        toko: 0,
        pabrik: 0,
        kerugian_ekonomi_rp: null,
      },
    ]);
    assert.ok(rekap);
    assert.equal(rekap.meninggal, 2);
    assert.equal(rekap.hilang, 1);
    assert.equal(rekap.mengungsi, 80);
    assert.equal(rekap.luka, 5);
    assert.equal(rekap.rumah_rb, 3);
  });

  it("maps citizen slugs to Juklak codes", () => {
    assert.equal(mapLaporanSlugToJenis("cuaca_ekstrem")?.kode, 104);
    assert.equal(mapLaporanSlugToJenis("karhutla")?.kode, 106);
    assert.equal(mapLaporanSlugToJenis("banjir")?.kode, 101);
  });

  it("treats 1 Ha lahan as threshold", () => {
    const snapshot = {
      tanggal: "2026-08-31",
      meninggal: 0,
      hilang: 0,
      luka_berat: 0,
      luka_ringan: 0,
      mengungsi: 0,
      menderita: 0,
      rumah_rb: 0,
      rumah_rs: 0,
      rumah_rr: 0,
      rumah_terendam: 0,
      kerugian_rumah_rp: null,
      faskes: 0,
      pendidikan: 0,
      ibadah: 0,
      kantor: 0,
      pasar: 0,
      kerugian_pelayanan_rp: null,
      sapras: 0,
      kerugian_sapras_rp: null,
      lahan_ha: 1,
      toko: 0,
      pabrik: 0,
      kerugian_ekonomi_rp: null,
    };
    assert.equal(
      memenuhiAmbangBatas({
        statusDarurat: false,
        permintaanBantuanNasional: false,
        dampak: dampakToAmbang(snapshot),
      }),
      true
    );
  });

  it("formats tarikh in Asia/Jakarta", () => {
    assert.equal(tarikhFromWaktu("2026-08-31T17:00:00.000Z"), "2026-09-01");
  });
});
