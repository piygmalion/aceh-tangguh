import { NextRequest, NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/admin";
import { canLockStatis } from "@/lib/sik/roles";
import { parseJadwalPatch } from "@/lib/sik/sdb";
import { rejectCrossOrigin } from "@/lib/security/origin";
import type { SdbJadwalKirimRow } from "@/lib/sik/db-tables";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const originErr = rejectCrossOrigin(req);
  if (originErr) return originErr;
  const auth = await requireStaffApi();
  if (!auth.ok) return auth.response;
  if (!canLockStatis(auth.profile)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = parseJadwalPatch(json);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const { data, error } = await auth.supabase
    .from("sdb_jadwal_kirim")
    .update({ status: parsed.value.status, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select("*")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ item: data as SdbJadwalKirimRow });
}
