import assert from "node:assert/strict";
import { test } from "node:test";
import { generateNomor } from "./crypto";
import { isLaporanStatus } from "./status";

test("generateNomor pads sequence", () => {
  const n = generateNomor("KJD", 7);
  assert.match(n, /^KJD-\d{8}-0007$/);
});

test("isLaporanStatus", () => {
  assert.equal(isLaporanStatus("submitted"), true);
  assert.equal(isLaporanStatus("published"), false);
});
