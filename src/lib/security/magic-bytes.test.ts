import assert from "node:assert/strict";
import { test } from "node:test";
import {
  detectMimeFromMagic,
  extensionForMime,
  isAllowedUploadField,
} from "./magic-bytes";

test("sniffs jpeg/png/webp/mp4 magic bytes", () => {
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(detectMimeFromMagic(jpeg), "image/jpeg");
  assert.equal(extensionForMime("image/jpeg"), "jpg");

  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(detectMimeFromMagic(png), "image/png");

  const webp = new Uint8Array(12);
  webp.set(Buffer.from("RIFF"), 0);
  webp.set(Buffer.from("WEBP"), 8);
  assert.equal(detectMimeFromMagic(webp), "image/webp");

  const mp4 = new Uint8Array(12);
  mp4.set(Buffer.from("ftyp"), 4);
  mp4.set(Buffer.from("isom"), 8);
  assert.equal(detectMimeFromMagic(mp4), "video/mp4");

  assert.equal(detectMimeFromMagic(new Uint8Array(12)), null);
});

test("upload field allowlist", () => {
  assert.equal(isAllowedUploadField("kejadian", "foto"), true);
  assert.equal(isAllowedUploadField("penanganan", "video"), true);
  assert.equal(isAllowedUploadField("kejadian", "avatar"), false);
  assert.equal(isAllowedUploadField("../x", "foto"), false);
});
