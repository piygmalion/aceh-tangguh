import { NextRequest, NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/admin";
import { canLockStatis } from "@/lib/sik/roles";
import { parseKatalogPatch } from "@/lib/sik/sdb";
import { rejectCrossOrigin } from "@/lib/security/origin";
import type { SdbKatalogRow } from "@/lib/sik/db-tables";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { kunci: string } }
) {
  const originErr = rejectCrossOrigin(req);
  if (originErr) return originErr;
  const auth = await requireStaffApi();
  if (!auth.ok) return auth.response;
  if (!canLockStatis(auth.profile)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = parseKatalogPatch(json);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const kunci = decodeURIComponent(params.kunci);
  const { data, error } = await auth.supabase
    .from("sdb_katalog")
    .update({ ...parsed.value, updated_at: new Date().toISOString() })
    .eq("kunci", kunci)
    .select("*")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ item: data as SdbKatalogRow });
}
