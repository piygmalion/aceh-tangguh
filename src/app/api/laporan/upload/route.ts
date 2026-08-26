import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  detectMimeFromMagic,
  extensionForMime,
  isAllowedUploadField,
} from "@/lib/security/magic-bytes";
import { guardPublicPost } from "@/lib/security/public-post";

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const blocked = await guardPublicPost(req, "laporan-upload", 20);
  if (blocked) return blocked;

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Upload service not configured" }, { status: 503 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const laporanTipe = String(form.get("laporan_tipe") ?? "").trim();
  const fieldKey = String(form.get("field_key") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }
  if (!isAllowedUploadField(laporanTipe, fieldKey)) {
    return NextResponse.json({ error: "Invalid upload field" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = detectMimeFromMagic(buffer);
  if (!sniffed) {
    return NextResponse.json({ error: "Unrecognized file type" }, { status: 400 });
  }
  if (fieldKey === "foto" && !sniffed.startsWith("image/")) {
    return NextResponse.json({ error: "foto must be an image" }, { status: 400 });
  }
  if (fieldKey === "video" && !sniffed.startsWith("video/")) {
    return NextResponse.json({ error: "video must be a video" }, { status: 400 });
  }

  const ext = extensionForMime(sniffed);
  const path = `${laporanTipe}/${fieldKey}/${randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("laporan-media").upload(path, buffer, {
    contentType: sniffed,
    upsert: false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({
    path,
    bucket: "laporan-media",
    size: file.size,
    mime: sniffed,
  });
}
