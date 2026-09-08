import { randomUUID } from "crypto";
import {
  detectMimeFromMagic,
  extensionForMime,
} from "@/lib/security/magic-bytes";
import { reencodeImageWithoutMeta } from "@/lib/laporan/strip-image-meta";
import { supabaseUrl } from "@/lib/supabase/public-env";

export const CMS_MEDIA_BUCKET = "cms-media";
export const CMS_COVER_MAX_BYTES = 5 * 1024 * 1024;

const COVER_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export type PrepareCmsCoverOk = {
  ok: true;
  buffer: Buffer;
  mime: string;
  path: string;
};

export type PrepareCmsCoverErr = {
  ok: false;
  status: 400;
  error: string;
};

export async function prepareCmsCoverUpload(
  original: Buffer,
  objectId: string = randomUUID()
): Promise<PrepareCmsCoverOk | PrepareCmsCoverErr> {
  if (original.length > CMS_COVER_MAX_BYTES) {
    return { ok: false, status: 400, error: "File too large (max 5MB)" };
  }
  const sniffed = detectMimeFromMagic(original);
  if (!sniffed || !COVER_MIME.has(sniffed)) {
    return { ok: false, status: 400, error: "Unrecognized file type" };
  }
  const stripped = await reencodeImageWithoutMeta(original, sniffed);
  if (!stripped) {
    return { ok: false, status: 400, error: "Image could not be re-encoded" };
  }
  const ext = extensionForMime(stripped.mime);
  return {
    ok: true,
    buffer: Buffer.from(stripped.buffer),
    mime: stripped.mime,
    path: `sampul/${objectId}.${ext}`,
  };
}

export function cmsMediaPublicUrl(path: string): string {
  const base = supabaseUrl().replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${CMS_MEDIA_BUCKET}/${path}`;
}
