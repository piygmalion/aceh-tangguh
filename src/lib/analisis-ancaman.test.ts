import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { IrbiKab } from "@/lib/irbi";
import type { KrbPayload } from "@/lib/krb-filter";
import {
  buildAncamanRiwayat,
  disasterJenisToKrbJenis,
  krbJenisToDisasterJenis,
  projectAnalogDamage,
} from "./analisis-ancaman";
import type { RumahRusakCounts } from "./kejadian-analisis";

const ROOT = process.cwd();

function loadIrbiKab(): IrbiKab[] {
  const raw = JSON.parse(
    readFileSync(join(ROOT, "public/fixtures/irbi-2025.json"), "utf8")
  ) as { kabupaten_kota: IrbiKab[] };
  return raw.kabupaten_kota;
}

function loadKrb(): KrbPayload {
  return JSON.parse(
    readFileSync(join(ROOT, "public/fixtures/krb-aceh.json"), "utf8")
  ) as KrbPayload;
}

describe("disasterJenisToKrbJenis", () => {
  it("maps Gempa Bumi onto gempabumi", () => {
    assert.equal(disasterJenisToKrbJenis("Gempa Bumi"), "gempabumi");
  });

  it("hides pemukiman and Lainnya", () => {
    assert.equal(disasterJenisToKrbJenis("Kebakaran Pemukiman"), null);
    assert.equal(disasterJenisToKrbJenis("Lainnya"), null);
    assert.equal(disasterJenisToKrbJenis(""), null);
  });

  it("maps common catalogue labels", () => {
    assert.equal(disasterJenisToKrbJenis("Banjir"), "banjir");
    assert.equal(disasterJenisToKrbJenis("Banjir Bandang"), "banjir_bandang");
    assert.equal(disasterJenisToKrbJenis("Tanah Longsor"), "tanah_longsor");
    assert.equal(disasterJenisToKrbJenis("Longsor"), "tanah_longsor");
    assert.equal(disasterJenisToKrbJenis("Abrasi"), "gelombang_ekstrim_abrasi");
    assert.equal(disasterJenisToKrbJenis("Kekeringan"), "kekeringan");
    assert.equal(disasterJenisToKrbJenis("Kebakaran Hutan dan Lahan"), "kebakaran_hutan_lahan");
    assert.equal(disasterJenisToKrbJenis("Angin Puting Beliung"), "cuaca_ekstrem");
  });
});

describe("krbJenisToDisasterJenis", () => {
  it("maps gempabumi back to Gempa Bumi only", () => {
    assert.deepEqual(krbJenisToDisasterJenis("gempabumi"), ["Gempa Bumi"]);
  });

  it("returns an empty list when the catalogue has no matching label", () => {
    assert.deepEqual(krbJenisToDisasterJenis("likuefaksi"), []);
    assert.deepEqual(krbJenisToDisasterJenis("letusan_gunung_api"), []);
  });
});

describe("buildAncamanRiwayat", () => {
  const irbi = loadIrbiKab();
  const krb = loadKrb();

  it("returns the Pidie Jaya × gempabumi gold case from fixtures", () => {
    const result = buildAncamanRiwayat({
      kab: "Pidie Jaya",
      ancaman: "gempabumi",
      irbi,
      krb,
      history: {
        jumlahKejadian: 0,
        kejadianTerakhir: null,
        localImpacts: [],
        provincialImpacts: [],
      },
    });
    assert.equal(result.ready, true);
    assert.equal(result.kodeKabupaten, "11.18");
    assert.equal(result.irbi?.kelas, "TINGGI");
    assert.equal(result.irbi?.skor, 26.4);
    assert.equal(result.irbi?.irbKab, 256.13);
    assert.equal(result.irbi?.kelasKab, "TINGGI");
    assert.equal(result.krb?.kelas, "TINGGI");
    assert.equal(result.krb?.skor, 26.4);
    assert.equal(result.history.punyaRiwayat, false);
    assert.equal(result.history.jumlahKejadian, 0);
    assert.ok(result.kawasan.some((row) => row.id === "sesar-besar-sumatera"));
  });

  it("does not invent a class when the kabupaten is missing", () => {
    const result = buildAncamanRiwayat({
      kab: "Kabupaten Fiktif",
      ancaman: "gempabumi",
      irbi,
      krb,
      history: {
        jumlahKejadian: 0,
        kejadianTerakhir: null,
        localImpacts: [],
        provincialImpacts: [],
      },
    });
    assert.equal(result.ready, true);
    assert.equal(result.irbi, null);
    assert.equal(result.krb, null);
    assert.equal(result.kodeKabupaten, null);
  });

  it("stays unready until both variables are set", () => {
    const missingAncaman = buildAncamanRiwayat({
      kab: "Pidie Jaya",
      ancaman: "",
      irbi,
      krb,
      history: {
        jumlahKejadian: 2,
        kejadianTerakhir: "2023-01-20",
        localImpacts: [],
        provincialImpacts: [],
      },
    });
    assert.equal(missingAncaman.ready, false);
    assert.equal(missingAncaman.irbi, null);
  });
});

describe("projectAnalogDamage", () => {
  it("uses local rows with housing damage before the provincial analog", () => {
    const local: RumahRusakCounts[] = [
      { rr: 2, rs: 0, rb: 0 },
      { rr: 4, rs: 2, rb: 1 },
      { rr: 6, rs: 4, rb: 2 },
    ];
    const analog = projectAnalogDamage(local, [{ rr: 99, rs: 99, rb: 99 }]);
    assert.equal(analog.grain, "kabupaten");
    assert.equal(analog.n, 3);
    assert.deepEqual(analog.rr, { min: 2, median: 4, max: 6 });
    assert.deepEqual(analog.rs, { min: 0, median: 2, max: 4 });
    assert.deepEqual(analog.rb, { min: 0, median: 1, max: 2 });
  });

  it("falls back to provincial analog when local cards are empty", () => {
    const analog = projectAnalogDamage(
      [{ rr: 0, rs: 0, rb: 0 }],
      [
        { rr: 1, rs: 1, rb: 1 },
        { rr: 3, rs: 3, rb: 3 },
      ]
    );
    assert.equal(analog.grain, "provinsi");
    assert.equal(analog.n, 2);
    assert.deepEqual(analog.rr, { min: 1, median: 2, max: 3 });
  });

  it("returns none when no housing-damage cards exist", () => {
    const analog = projectAnalogDamage([], []);
    assert.equal(analog.grain, "none");
    assert.equal(analog.n, 0);
  });
});

describe("analisis-ancaman source bounds", () => {
  it("does not derive fatalities from an IRBI score", () => {
    const src = readFileSync(join(ROOT, "src/lib/analisis-ancaman.ts"), "utf8");
    assert.equal(/meninggal\s*\*|skor\s*\*.*meninggal|irbi.*meninggal/i.test(src), false);
    assert.equal(src.includes("KRB I"), false);
  });
});
