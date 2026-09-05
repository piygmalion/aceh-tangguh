import sharp from "sharp";

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isReencodableImageMime(mime: string): boolean {
  return IMAGE_MIME.has(mime);
}

/**
 * Decode then re-encode so EXIF/GPS/device tags are not stored.
 * `rotate()` applies orientation first; default sharp output strips metadata.
 */
export async function reencodeImageWithoutMeta(
  buffer: Buffer,
  mime: string,
): Promise<{ buffer: Buffer; mime: string } | null> {
  if (!IMAGE_MIME.has(mime)) return null;
  try {
    const pipeline = sharp(buffer, { failOn: "error", limitInputPixels: 40_000_000 }).rotate();
    if (mime === "image/png") {
      return { buffer: Buffer.from(await pipeline.png().toBuffer()), mime: "image/png" };
    }
    if (mime === "image/webp") {
      return { buffer: Buffer.from(await pipeline.webp({ quality: 80 }).toBuffer()), mime: "image/webp" };
    }
    return {
      buffer: Buffer.from(await pipeline.jpeg({ quality: 85 }).toBuffer()),
      mime: "image/jpeg",
    };
  } catch {
    return null;
  }
}
