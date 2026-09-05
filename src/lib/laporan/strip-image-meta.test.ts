import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import { detectMimeFromMagic } from "../security/magic-bytes";
import { isReencodableImageMime, reencodeImageWithoutMeta } from "./strip-image-meta";

const GPS_MARKER = "GPSLatitude 5.5483 N 95.3238 E";

/** Insert APP1 Exif after SOI so the JPEG is a non-byte-identical privacy risk. */
function jpegWithExifApp1(jpeg: Buffer, gpsAscii: string): Buffer {
  const soi = jpeg.subarray(0, 2);
  const rest = jpeg.subarray(2);
  const payload = Buffer.concat([Buffer.from("Exif\0\0"), Buffer.from(gpsAscii, "ascii")]);
  const len = payload.length + 2;
  const app1 = Buffer.concat([
    Buffer.from([0xff, 0xe1, (len >> 8) & 0xff, len & 0xff]),
    payload,
  ]);
  return Buffer.concat([soi, app1, rest]);
}

describe("reencodeImageWithoutMeta", () => {
  it("re-encodes a JPEG with EXIF so the upload buffer is not byte-identical and drops GPS", async () => {
    const clean = await sharp({
      create: { width: 8, height: 8, channels: 3, background: { r: 40, g: 80, b: 120 } },
    })
      .jpeg()
      .toBuffer();
    const withExif = jpegWithExifApp1(clean, GPS_MARKER);
    assert.equal(detectMimeFromMagic(withExif), "image/jpeg");
    assert.equal(withExif.includes(Buffer.from("Exif")), true);
    assert.equal(withExif.includes(Buffer.from(GPS_MARKER)), true);

    const out = await reencodeImageWithoutMeta(withExif, "image/jpeg");
    assert.ok(out);
    assert.equal(out.mime, "image/jpeg");
    assert.equal(out.buffer.equals(withExif), false);
    assert.equal(detectMimeFromMagic(out.buffer), "image/jpeg");
    assert.equal(out.buffer.includes(Buffer.from("Exif")), false);
    assert.equal(out.buffer.includes(Buffer.from(GPS_MARKER)), false);
    assert.equal(out.buffer.includes(Buffer.from("GPS")), false);
  });

  it("rejects non-image MIME instead of passing bytes through", async () => {
    const mp4ish = Buffer.from([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
    ]);
    assert.equal(isReencodableImageMime("video/mp4"), false);
    assert.equal(await reencodeImageWithoutMeta(mp4ish, "video/mp4"), null);
    assert.equal(await reencodeImageWithoutMeta(Buffer.from("not-an-image"), "image/jpeg"), null);
    assert.equal(detectMimeFromMagic(Buffer.from("%PDF-1.4 leftover")), null);
  });
});
