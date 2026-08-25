import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildProfilUpdate,
  joinByTenDigitKode,
  mapKondisi,
  mergePayload,
  parseCount,
  parseProfilSheet,
  parseSheetRecord,
  preserveExistingName,
  totalRumahRusak,
} from "./profil-sheet.mjs";

const HEADER = [
  "No",
  "kode_provinsi",
  "provinsi",
  "kode_kabupaten_kota",
  "kabupaten_kota",
  "kode_kecamatan",
  "kecamatan",
  "kode_desa_kelurahan",
  "desa_kelurahan",
  "Kondisi Kelurahan/Desa/Gampong",
  "Jumlah KK terdampak",
  "Populasi terdampak",
  "Korban Hilang",
  "Korban meninggal",
  "Rumah RR",
  "Rumah RS",
  "Rumah RB",
  "Jumlah KK",
  "Jumlah Populasi",
  "Kepala Keluarga (Laki-laki)",
  "Kepala Keluarga (Perempuan)",
  "Bayi (0 - 1 thn)",
  "Balita (1 - 4 thn)",
  "Anak (5 - 12 thn)",
  "Remaja (13 - 17 thn)",
  "Dewasa (18 - 59 thn)",
  "Lansia (>60 thn)",
  "Penyandang Disabilitas",
].join(",");

function rec(overrides = {}) {
  return {
    No: "1",
    kode_provinsi: "11",
    provinsi: "Aceh",
    kode_kabupaten_kota: "1101",
    kabupaten_kota: "Kabupaten Aceh Selatan",
    kode_kecamatan: "110101",
    kecamatan: "Bakongan",
    kode_desa_kelurahan: "1101012001",
    desa_kelurahan: "Keude Bakongan",
    "Kondisi Kelurahan/Desa/Gampong": "Tidak diketahui/Tidak terdampak",
    "Jumlah KK terdampak": "0",
    "Populasi terdampak": "0",
    "Korban Hilang": "0",
    "Korban meninggal": "0",
    "Rumah RR": "58",
    "Rumah RS": "01",
    "Rumah RB": "00",
    "Jumlah KK": "387",
    "Jumlah Populasi": "1611",
    "Kepala Keluarga (Laki-laki)": "281",
    "Kepala Keluarga (Perempuan)": "106",
    "Bayi (0 - 1 thn)": "7",
    "Balita (1 - 4 thn)": "71",
    "Anak (5 - 12 thn)": "165",
    "Remaja (13 - 17 thn)": "106",
    "Dewasa (18 - 59 thn)": "726",
    "Lansia (>60 thn)": "149",
    "Penyandang Disabilitas": "5",
    ...overrides,
  };
}

describe("parseCount", () => {
  it("maps '-' to null, empty to null, '00' to 0, and keeps literal 0", () => {
    assert.deepEqual(parseCount("-"), { value: null, kind: "dash" });
    assert.deepEqual(parseCount(""), { value: null, kind: "empty" });
    assert.deepEqual(parseCount("   "), { value: null, kind: "empty" });
    assert.deepEqual(parseCount("00"), { value: 0, kind: "zero_00" });
    assert.deepEqual(parseCount("0"), { value: 0, kind: "zero" });
    assert.deepEqual(parseCount("58"), { value: 58, kind: "number" });
    assert.deepEqual(parseCount("01"), { value: 1, kind: "number" });
    assert.deepEqual(parseCount(null), { value: null, kind: "empty" });
  });

  it("does not coerce dash to 0", () => {
    assert.notEqual(parseCount("-").value, 0);
    assert.equal(parseCount("-").value, null);
  });
});

describe("totalRumahRusak", () => {
  it("is null when all three are null (dash is already null)", () => {
    assert.equal(totalRumahRusak(null, null, null), null);
  });

  it("sums only non-null counts, including literal 0", () => {
    assert.equal(totalRumahRusak(58, 1, 0), 59);
    assert.equal(totalRumahRusak(58, null, null), 58);
    assert.equal(totalRumahRusak(0, 0, 0), 0);
  });
});

describe("mapKondisi", () => {
  it("keeps the existing live slugs", () => {
    assert.deepEqual(mapKondisi("Tidak diketahui/Tidak terdampak"), {
      label: "Tidak diketahui/Tidak terdampak",
      kode: "tidak_diketahui",
    });
    assert.deepEqual(mapKondisi("Sebagian terdampak/terkena banjir"), {
      label: "Sebagian terdampak/terkena banjir",
      kode: "sebagian_terdampak",
    });
    assert.deepEqual(mapKondisi("Terisolir"), {
      label: "Terisolir",
      kode: "terisolir",
    });
  });

  it("does not invent a slug for an unknown label", () => {
    assert.deepEqual(mapKondisi("Tidak terdampak"), {
      label: "Tidak terdampak",
      kode: null,
    });
  });
});

describe("preserveExistingName", () => {
  it("keeps the live name when it is already set", () => {
    assert.equal(
      preserveExistingName("Keude Bakongan", "Something Else"),
      "Keude Bakongan"
    );
  });

  it("fills only when the live field is truly empty", () => {
    assert.equal(preserveExistingName("", "Keude Bakongan"), "Keude Bakongan");
    assert.equal(preserveExistingName(null, "Keude Bakongan"), "Keude Bakongan");
    assert.equal(preserveExistingName("  ", "Keude Bakongan"), "Keude Bakongan");
  });
});

describe("parseSheetRecord", () => {
  it("accepts a 10-digit kode and parses padded zeros", () => {
    const row = parseSheetRecord(rec());
    assert.equal(row.kode, "1101012001");
    assert.equal(row.skipped_empty_kode, false);
    assert.equal(row.values.rumah_rr, 58);
    assert.equal(row.values.rumah_rs, 1);
    assert.equal(row.values.rumah_rb, 0);
    assert.equal(row.kinds.rumah_rb, "zero_00");
    assert.equal(row.values.kk_terdampak, 0);
    assert.equal(row.kinds.kk_terdampak, "zero");
    assert.equal(row.kondisi_kode, "tidak_diketahui");
  });

  it("skips empty kode and does not invent one", () => {
    const row = parseSheetRecord(
      rec({
        kode_desa_kelurahan: "",
        desa_kelurahan: "Lawe Sarap",
        kecamatan: "Lawe Alas",
        kabupaten_kota: "Kabupaten Aceh Tenggara",
      })
    );
    assert.equal(row.kode, null);
    assert.equal(row.skipped_empty_kode, true);
    assert.equal(row.nama, "Lawe Sarap");
  });

  it("rejects slug / short / long kodes instead of inventing a 10-digit kode", () => {
    assert.equal(parseSheetRecord(rec({ kode_desa_kelurahan: "desa-aceh" })).kode, null);
    assert.equal(parseSheetRecord(rec({ kode_desa_kelurahan: "110101200" })).kode, null);
    assert.equal(parseSheetRecord(rec({ kode_desa_kelurahan: "11010120011" })).kode, null);
  });

  it("treats dash rumah cells as null so total stays null", () => {
    const row = parseSheetRecord(
      rec({
        kode_desa_kelurahan: "1101012002",
        desa_kelurahan: "Ujong Mangki",
        "Rumah RR": "-",
        "Rumah RS": "-",
        "Rumah RB": "-",
      })
    );
    assert.equal(row.values.rumah_rr, null);
    assert.equal(row.kinds.rumah_rr, "dash");
    assert.equal(totalRumahRusak(row.values.rumah_rr, row.values.rumah_rs, row.values.rumah_rb), null);
  });
});

describe("joinByTenDigitKode", () => {
  const sheet = [
    parseSheetRecord(rec()),
    parseSheetRecord(
      rec({
        kode_desa_kelurahan: "",
        desa_kelurahan: "Lawe Sarap",
        kecamatan: "Lawe Alas",
        kabupaten_kota: "Kabupaten Aceh Tenggara",
      })
    ),
    parseSheetRecord(rec({ kode_desa_kelurahan: "1199999999", desa_kelurahan: "Only in sheet" })),
  ];
  const live = [
    { id: "PDESA-000001", kode_desa_kelurahan: "1101012001", nama: "Keude Bakongan" },
    { id: "PDESA-null", kode_desa_kelurahan: null, nama: "Lawe Sarap" },
    { id: "PDESA-orphan", kode_desa_kelurahan: "1101999999", nama: "Only in live" },
  ];

  it("joins only on 10-digit kode ∩ live, skips empty kode, never name-only", () => {
    const join = joinByTenDigitKode(sheet, live);
    assert.equal(join.matched.length, 1);
    assert.equal(join.matched[0].kode, "1101012001");
    assert.equal(join.skipped_empty_kode.length, 1);
    assert.equal(join.skipped_empty_kode[0].nama, "Lawe Sarap");
    assert.equal(join.unmatched_sheet.length, 1);
    assert.equal(join.unmatched_sheet[0].kode, "1199999999");
    assert.deepEqual(join.unmatched_live, ["1101999999"]);
    assert.equal(join.live_empty_kode, 1);
  });

  it("does not match Lawe Sarap by name onto another village", () => {
    const join = joinByTenDigitKode(sheet, live);
    const names = join.matched.map((m) => m.sheet.nama);
    assert.equal(names.includes("Lawe Sarap"), false);
    assert.equal(join.matched.some((m) => m.live.nama === "Lawe Sarap"), false);
  });
});

describe("buildProfilUpdate + mergePayload", () => {
  it("does not overwrite live names and does not invent payload ids", () => {
    const parsed = parseSheetRecord(rec({ desa_kelurahan: "Different Sheet Name" }));
    const live = {
      id: "PDESA-000001",
      kode_desa_kelurahan: "1101012001",
      nama: "Keude Bakongan",
      kabupaten: "Aceh Selatan",
      kecamatan: "Bakongan",
      payload: {
        id: "PDESA-000001",
        desa_kelurahan: "Keude Bakongan",
        kode_desa_kelurahan: "1101012001",
        lokasi: { kecamatan: "Bakongan" },
        kabupaten_kota: { nama_normalisasi: "Aceh Selatan" },
        extra_keep: true,
      },
    };
    const update = buildProfilUpdate(live, parsed);
    assert.ok(update);
    assert.equal(update.id, "PDESA-000001");
    assert.equal(update.patch.nama, undefined);
    assert.equal(update.patch.kabupaten, undefined);
    assert.equal(update.patch.kecamatan, undefined);
    assert.equal(update.patch.kode_desa_kelurahan, undefined);
    assert.equal(update.patch.payload.id, "PDESA-000001");
    assert.equal(update.patch.payload.desa_kelurahan, "Keude Bakongan");
    assert.equal(update.patch.payload.extra_keep, true);
    assert.equal(update.patch.payload.demografi.jumlah_kk, 387);
    assert.equal(update.patch.payload.dampak_bencana.rumah_rusak_berat, 0);
    assert.equal(update.patch.payload.dampak_bencana.total_rumah_rusak, 59);
    assert.equal(update.patch.payload.kondisi.kondisi_desa_kode, "tidak_diketahui");
    assert.equal(update.patch.rumah_rb, 0);
    assert.equal(update.patch.total_rumah_rusak, 59);
    assert.equal(update.patch.kk_laki_laki, 281);
  });

  it("returns null for empty kode (no invented kode, no name-only update)", () => {
    const parsed = parseSheetRecord(rec({ kode_desa_kelurahan: "", desa_kelurahan: "Lawe Sarap" }));
    const live = {
      id: "PDESA-null",
      kode_desa_kelurahan: null,
      nama: "Lawe Sarap",
    };
    assert.equal(buildProfilUpdate(live, parsed), null);
  });

  it("returns null when sheet and live kodes differ", () => {
    const parsed = parseSheetRecord(rec());
    const live = { id: "x", kode_desa_kelurahan: "1101012002", nama: "Ujong Mangki" };
    assert.equal(buildProfilUpdate(live, parsed), null);
  });

  it("fills a name only when the live field is empty", () => {
    const parsed = parseSheetRecord(rec());
    const live = { id: "PDESA-000001", kode_desa_kelurahan: "1101012001", nama: "" };
    const update = buildProfilUpdate(live, parsed);
    assert.equal(update.patch.nama, "Keude Bakongan");
  });
});

describe("parseProfilSheet", () => {
  it("parses a mini CSV and counts dash / 00 / empty kode", () => {
    const csv = [
      HEADER,
      [
        "1",
        "11",
        "Aceh",
        "1101",
        "Kabupaten Aceh Selatan",
        "110101",
        "Bakongan",
        "1101012001",
        "Keude Bakongan",
        "Tidak diketahui/Tidak terdampak",
        "0",
        "0",
        "0",
        "0",
        "58",
        "01",
        "00",
        "387",
        "1611",
        "281",
        "106",
        "7",
        "71",
        "165",
        "106",
        "726",
        "149",
        "5",
      ].join(","),
      [
        "2",
        "11",
        "Aceh",
        "1101",
        "Kabupaten Aceh Selatan",
        "110101",
        "Bakongan",
        "1101012002",
        "Ujong Mangki",
        "Tidak diketahui/Tidak terdampak",
        "0",
        "0",
        "0",
        "0",
        "-",
        "-",
        "-",
        "249",
        "1056",
        "14",
        "51",
        "5",
        "56",
        "116",
        "61",
        "495",
        "74",
        "2",
      ].join(","),
      [
        "3",
        "11",
        "Aceh",
        "1103",
        "Kabupaten Aceh Tenggara",
        "110301",
        "Lawe Alas",
        "",
        "Lawe Sarap",
        "Tidak diketahui/Tidak terdampak",
        "-",
        "-",
        "0",
        "0",
        "-",
        "-",
        "-",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ].join(","),
    ].join("\n");

    const { rows, stats } = parseProfilSheet(csv);
    assert.equal(stats.sheet_rows, 3);
    assert.equal(stats.sheet_coded, 2);
    assert.equal(stats.sheet_empty_kode, 1);
    assert.equal(stats.dash_null_by_column.rumah_rr, 2);
    assert.equal(stats.zero_00_by_column.rumah_rb, 1);
    assert.equal(rows[0].kode, "1101012001");
    assert.equal(rows[2].kode, null);
    assert.equal(rows[2].nama, "Lawe Sarap");
  });
});

describe("mergePayload", () => {
  it("does not invent a payload id when none exists", () => {
    const parsed = parseSheetRecord(rec());
    const payload = mergePayload({}, parsed);
    assert.equal(payload.id, undefined);
    assert.equal(payload.demografi.jumlah_kk, 387);
  });
});
