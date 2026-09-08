import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/auth/admin";
import {
  CMS_MEDIA_BUCKET,
  cmsMediaPublicUrl,
  prepareCmsCoverUpload,
} from "@/lib/cms/upload-media";
import { rejectCrossOrigin } from "@/lib/security/origin";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const cross = rejectCrossOrigin(req);
  if (cross) return cross;

  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Upload service not configured" }, { status: 503 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const original = Buffer.from(await file.arrayBuffer());
  const prepared = await prepareCmsCoverUpload(original);
  if (!prepared.ok) {
    return NextResponse.json({ error: prepared.error }, { status: prepared.status });
  }

  const { error } = await supabase.storage.from(CMS_MEDIA_BUCKET).upload(prepared.path, prepared.buffer, {
    contentType: prepared.mime,
    upsert: false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({
    path: prepared.path,
    bucket: CMS_MEDIA_BUCKET,
    publicUrl: cmsMediaPublicUrl(prepared.path),
    size: prepared.buffer.length,
    mime: prepared.mime,
  });
}
