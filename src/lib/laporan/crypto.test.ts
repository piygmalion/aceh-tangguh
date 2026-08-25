import assert from "node:assert/strict";
import { test } from "node:test";
import { generateNomor } from "./crypto";
import {
  isLaporanStatus,
  KEJADIAN_PUBLIC_COLUMNS,
  PENANGANAN_PUBLIC_COLUMNS,
} from "./status";

test("generateNomor pads sequence", () => {
  const n = generateNomor("KJD", 7);
  assert.match(n, /^KJD-\d{8}-0007$/);
});

test("isLaporanStatus", () => {
  assert.equal(isLaporanStatus("submitted"), true);
  assert.equal(isLaporanStatus("published"), false);
});

test("public peta columns omit jawaban_json and pelapor fields", () => {
  for (const cols of [KEJADIAN_PUBLIC_COLUMNS, PENANGANAN_PUBLIC_COLUMNS]) {
    assert.equal(cols.includes("jawaban_json"), false);
    assert.equal(cols.includes("pelapor"), false);
    assert.equal(cols.includes("nik"), false);
    assert.equal(cols.includes("catatan_moderator"), false);
  }
});
