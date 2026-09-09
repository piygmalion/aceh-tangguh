import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { ACEH_KABUPATEN_REGISTRY } from "@/lib/aceh-kabupaten";
import { NULL_KODE_DESA_NAMES, PROFIL_FORBIDDEN_QUERY_KEYS } from "@/lib/area-profil-ia";
import type { DesaListItem, KecamatanListItem } from "@/lib/profil-desa";
import {
  applyKabupatenChange,
  applyKecamatanChange,
  applyDesaChange,
  clearKabupaten,
  desaOptionsForKecamatan,
  hydrateSelectionFromLokasi,
  isDesaEnabled,
  isKecamatanEnabled,
  kabupatenOptionsFromRegistry,
  kecamatanOptionsForKabupaten,
  resolveKabupatenOption,
  toLokasiNames,
  wilayahDesaApiPath,
  wilayahKecamatanApiPath,
} from "./wilayah-cascade";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

/** Coded profil_desa sample already used in profil-desa / area-profil tests. */
const BAKONGAN: KecamatanListItem = {
  kecamatan: "Bakongan",
  kode_kecamatan: "110101",
  desa_count: 1,
  badge: "tidak_diketahui",
  total_rumah_rusak: 59,
};

const KEUDE_BAKONGAN: DesaListItem = {
  id: "PDESA-000001",
  kode: "1101012001",
  nama: "Keude Bakongan",
  kabupaten: "Aceh Selatan",
  kecamatan: "Bakongan",
  badge: "tidak_diketahui",
  total_rumah_rusak: 59,
};

/** Second coded pair already present in village-distribution-lod tests (kode 1107 = Pidie). */
const PIDIE_KEC: KecamatanListItem = {
  kecamatan: "Pidie",
  kode_kecamatan: "110701",
  desa_count: 1,
  badge: "tidak_diketahui",
  total_rumah_rusak: 0,
};

const PIDIE_DESA: DesaListItem = {
  id: "PDESA-pidie",
  kode: "1107012001",
  nama: "Desa berkode 1107012001",
  kabupaten: "Pidie",
  kecamatan: "Pidie",
  badge: "tidak_diketahui",
  total_rumah_rusak: 0,
};

const NULL_KODE_DESA: DesaListItem = {
  id: "PDESA-null-kode",
  kode: null,
  nama: NULL_KODE_DESA_NAMES[0],
  kabupaten: "Aceh Selatan",
  kecamatan: "Bakongan",
  badge: "tidak_diketahui",
  total_rumah_rusak: null,
};

describe("wilayah cascade — kabupaten from existing registry", () => {
  it("lists only the 23 Aceh kab/kota with existing SIK codes", () => {
    const options = kabupatenOptionsFromRegistry();
    assert.equal(options.length, 23);
    assert.deepEqual(
      options.map((row) => ({ kode: row.kode, nama: row.nama })),
      ACEH_KABUPATEN_REGISTRY.map((row) => ({ kode: row.kode_sik, nama: row.nama }))
    );
    const banda = options.find((row) => row.nama === "Banda Aceh");
    assert.equal(banda?.kode, "1171");
    assert.equal(
      options.every((row) => row.kode != null && /^\d{4}$/.test(row.kode)),
      true
    );
  });

  it("resolves existing kab nama/kode and refuses unknown names", () => {
    assert.equal(resolveKabupatenOption("Banda Aceh")?.kode, "1171");
    assert.equal(resolveKabupatenOption("1171")?.nama, "Banda Aceh");
    assert.equal(resolveKabupatenOption("Kota Banda Aceh")?.kode, "1171");
    assert.equal(resolveKabupatenOption("Aceh Selatan")?.kode, "1101");
    assert.equal(resolveKabupatenOption(""), null);
    assert.equal(resolveKabupatenOption("Atlantis"), null);
    assert.equal(resolveKabupatenOption("110199"), null);
  });
});

describe("wilayah cascade — filter kecamatan by kabupaten", () => {
  const mixed = [BAKONGAN, PIDIE_KEC];

  it("keeps only kecamatan whose existing kode belongs to the selected kab", () => {
    const acehSelatan = kecamatanOptionsForKabupaten(mixed, "1101");
    assert.deepEqual(
      acehSelatan.map((row) => row.kode),
      ["110101"]
    );
    assert.equal(acehSelatan.every((row) => row.nama === "Bakongan"), true);

    const pidie = kecamatanOptionsForKabupaten(mixed, "1107");
    assert.deepEqual(
      pidie.map((row) => row.kode),
      ["110701"]
    );
    assert.equal(
      pidie.some((row) => row.kode === "110101"),
      false
    );
  });

  it("returns no kecamatan until a kabupaten is chosen", () => {
    assert.deepEqual(kecamatanOptionsForKabupaten(mixed, ""), []);
    assert.equal(isKecamatanEnabled(""), false);
    assert.equal(isKecamatanEnabled("1101"), true);
  });

  it("does not invent a kode when profil_desa left kode_kecamatan null", () => {
    const nameless: KecamatanListItem = {
      ...BAKONGAN,
      kode_kecamatan: null,
    };
    const options = kecamatanOptionsForKabupaten([nameless], "1101");
    assert.equal(options.length, 1);
    assert.equal(options[0]?.kode, null);
    assert.equal(options[0]?.nama, "Bakongan");
  });
});

describe("wilayah cascade — filter desa by kecamatan", () => {
  const mixed = [KEUDE_BAKONGAN, PIDIE_DESA, NULL_KODE_DESA];

  it("keeps only desa whose existing kode belongs to the selected kecamatan", () => {
    const bakongan = desaOptionsForKecamatan(mixed, {
      kode: "110101",
      nama: "Bakongan",
    });
    assert.deepEqual(
      bakongan.filter((row) => row.kode).map((row) => row.kode),
      ["1101012001"]
    );
    assert.equal(
      bakongan.some((row) => row.kode === "1107012001"),
      false
    );
  });

  it("includes the four null-kode desa by id when the kecamatan name matches", () => {
    const bakongan = desaOptionsForKecamatan(mixed, {
      kode: "110101",
      nama: "Bakongan",
    });
    const nullKode = bakongan.find((row) => row.nama === NULL_KODE_DESA_NAMES[0]);
    assert.ok(nullKode);
    assert.equal(nullKode.kode, null);
    assert.equal(nullKode.id, "PDESA-null-kode");
  });

  it("returns no desa until a kecamatan is chosen", () => {
    assert.deepEqual(desaOptionsForKecamatan(mixed, { kode: "", nama: "" }), []);
    assert.equal(isDesaEnabled({ kode: "", nama: "" }), false);
    assert.equal(isDesaEnabled({ kode: "110101", nama: "Bakongan" }), true);
  });
});

describe("wilayah cascade — clearing a parent clears children", () => {
  const seeded = {
    kabupaten: { kode: "1101", nama: "Aceh Selatan" },
    kecamatan: { kode: "110101", nama: "Bakongan" },
    desa: { kode: "1101012001", nama: "Keude Bakongan", id: "PDESA-000001" },
  };

  it("clears kecamatan and desa when kabupaten changes", () => {
    const next = applyKabupatenChange(seeded, { kode: "1171", nama: "Banda Aceh" });
    assert.equal(next.kabupaten?.kode, "1171");
    assert.equal(next.kabupaten?.nama, "Banda Aceh");
    assert.equal(next.kecamatan, null);
    assert.equal(next.desa, null);
    assert.deepEqual(toLokasiNames(next), {
      kabupaten_kota: "Banda Aceh",
      kecamatan: "",
      desa: "",
    });
  });

  it("clears desa when kecamatan changes", () => {
    const next = applyKecamatanChange(seeded, { kode: "110101", nama: "Bakongan" });
    assert.equal(next.kecamatan?.nama, "Bakongan");
    assert.equal(next.desa, null);
    assert.equal(toLokasiNames(next).desa, "");
    assert.equal(toLokasiNames(next).kecamatan, "Bakongan");
  });

  it("clears kab+kec+desa when kabupaten is cleared", () => {
    const next = clearKabupaten();
    assert.equal(next.kabupaten, null);
    assert.equal(next.kecamatan, null);
    assert.equal(next.desa, null);
    assert.deepEqual(toLokasiNames(next), {
      kabupaten_kota: "",
      kecamatan: "",
      desa: "",
    });
    assert.equal(isKecamatanEnabled(""), false);
    assert.equal(isDesaEnabled({ kode: "", nama: "" }), false);
  });

  it("writes desa nama without inventing a kode for null-kode rows", () => {
    const next = applyDesaChange(seeded, {
      kode: null,
      nama: NULL_KODE_DESA_NAMES[0],
      id: "PDESA-null-kode",
    });
    assert.equal(next.desa?.kode, null);
    assert.equal(toLokasiNames(next).desa, NULL_KODE_DESA_NAMES[0]);
  });
});

describe("wilayah cascade — hydrate existing lokasi names", () => {
  it("maps the kejadian default Banda Aceh onto the registry without inventing a kode", () => {
    const selection = hydrateSelectionFromLokasi({
      kabupaten_kota: "Banda Aceh",
      kecamatan: "",
      desa: "",
    });
    assert.equal(selection.kabupaten?.kode, "1171");
    assert.equal(selection.kabupaten?.nama, "Banda Aceh");
    assert.equal(selection.kecamatan, null);
    assert.equal(selection.desa, null);
  });

  it("leaves unknown kabupaten text unmatched instead of minting a kode", () => {
    const selection = hydrateSelectionFromLokasi({
      kabupaten_kota: "Wilayah fiktif",
      kecamatan: "Kec fiktif",
      desa: "Desa fiktif",
    });
    assert.equal(selection.kabupaten, null);
  });
});

describe("wilayah cascade — reuse profil_desa API paths", () => {
  it("asks kabupaten API by existing kode_kabupaten and kecamatan API by kode_kecamatan", () => {
    const kecPath = wilayahKecamatanApiPath("1101", "Aceh Selatan");
    assert.match(kecPath, /^\/api\/profil-desa\/kabupaten\?/);
    assert.match(kecPath, /kode_kabupaten=1101/);
    assert.equal(kecPath.includes("kode_desa"), false);

    const desaPath = wilayahDesaApiPath("110101", "Aceh Selatan", "Bakongan");
    assert.match(desaPath, /^\/api\/profil-desa\/kecamatan\?/);
    assert.match(desaPath, /kode_kecamatan=110101/);
    for (const forbidden of PROFIL_FORBIDDEN_QUERY_KEYS) {
      assert.equal(desaPath.includes(forbidden), false);
    }
  });
});

describe("wilayah cascade — laporan forms share GpsCapture selects", () => {
  it("replaces free-text kab/kec/desa inputs with cascade selects", () => {
    const gps = read("src/components/laporan/GpsCapture.tsx");
    assert.match(gps, /WilayahCascadeFields/);
    assert.equal(/id="gps-kabupaten"[\s\S]*<Input/.test(gps), false);
    const cascade = read("src/components/laporan/WilayahCascadeFields.tsx");
    assert.match(cascade, /id="gps-kabupaten"/);
    assert.match(cascade, /id="gps-kecamatan"/);
    assert.match(cascade, /id="gps-desa"/);
    assert.match(cascade, /<select/);
    assert.match(cascade, /disabled=\{!kabEnabled\}|disabled=\{!kecEnabled\}|isKecamatanEnabled|isDesaEnabled/);
  });

  it("keeps both laporan types on the shared GpsCapture", () => {
    const kejadian = read("src/components/laporan/ReportKejadianForm.tsx");
    const penanganan = read("src/components/laporan/ReportPenangananForm.tsx");
    assert.match(kejadian, /<GpsCapture/);
    assert.match(penanganan, /<GpsCapture/);
  });

  it("adds cascade copy in id and en laporForm", () => {
    const id = JSON.parse(read("messages/id.json")) as {
      laporForm: Record<string, string>;
    };
    const en = JSON.parse(read("messages/en.json")) as {
      laporForm: Record<string, string>;
    };
    for (const key of [
      "selectKabupaten",
      "selectKecamatan",
      "selectDesa",
      "kecamatanNeedKab",
      "desaNeedKec",
      "wilayahLoading",
    ] as const) {
      assert.equal(typeof id.laporForm[key], "string");
      assert.equal(id.laporForm[key].length > 0, true);
      assert.equal(typeof en.laporForm[key], "string");
      assert.equal(en.laporForm[key].length > 0, true);
    }
  });
});
