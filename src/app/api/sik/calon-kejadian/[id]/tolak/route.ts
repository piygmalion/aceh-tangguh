import { NextRequest, NextResponse } from "next/server";
import { requireOpsApi } from "@/lib/auth/admin";
import { rejectCrossOrigin } from "@/lib/security/origin";
import { authorizeCalonTolak } from "@/lib/overlay-calon";
import type { OverlayCalonKejadianRow } from "@/lib/sik/db-tables";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const originErr = rejectCrossOrigin(req);
  if (originErr) return originErr;
  const auth = await requireOpsApi();
  if (!auth.ok) return auth.response;

  const json = (await req.json().catch(() => ({}))) as { ditolak_alasan?: unknown };

  const { data, error } = await auth.supabase
    .from("overlay_calon_kejadian")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });

  const calon = data as OverlayCalonKejadianRow;
  const allowed = authorizeCalonTolak(auth.profile, calon);
  if (!allowed.ok) {
    return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  }
  if (calon.status !== "draf") {
    return NextResponse.json({ error: "bukan draf" }, { status: 409 });
  }

  const decidedAt = new Date().toISOString();
  const { data: updated, error: updateError } = await auth.supabase
    .from("overlay_calon_kejadian")
    .update({
      status: "ditolak",
      decided_by: auth.profile.userId,
      decided_at: decidedAt,
      ditolak_alasan: typeof json.ditolak_alasan === "string" ? json.ditolak_alasan : null,
      updated_at: decidedAt,
    })
    .eq("id", calon.id)
    .eq("status", "draf")
    .select("*")
    .maybeSingle();
  if (updateError || !updated) {
    return NextResponse.json({ error: updateError?.message ?? "update failed" }, { status: 500 });
  }

  return NextResponse.json({ item: updated as OverlayCalonKejadianRow });
}
