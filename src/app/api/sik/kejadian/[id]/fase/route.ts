import { NextRequest, NextResponse } from "next/server";
import { requireOpsApi } from "@/lib/auth/admin";
import { canLockStatis, matchesKabScope } from "@/lib/sik/roles";
import { faseDataSchema } from "@/lib/sik/schemas";
import { rejectCrossOrigin } from "@/lib/security/origin";
import { buildRekapStatis } from "@/lib/sik/kejadian-write";
import type { KejadianOperasiRow } from "@/lib/sik/db-tables";
import type { Json } from "@/lib/supabase/json";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const originErr = rejectCrossOrigin(req);
  if (originErr) return originErr;
  const auth = await requireOpsApi();
  if (!auth.ok) return auth.response;

  const json = await req.json().catch(() => null);
  const parsed = faseDataSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "fase_data required" }, { status: 400 });
  }

  const { data } = await auth.supabase
    .from("kejadian_operasi")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  const item = data as KejadianOperasiRow;
  if (!matchesKabScope(auth.profile, item)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const next = parsed.data.fase_data;
  if (next === "statis" && !canLockStatis(auth.profile)) {
    return NextResponse.json({ error: "Hanya walidata provinsi yang mengunci data statis" }, { status: 403 });
  }
  if (item.fase_data === "statis" && next !== "statis" && !canLockStatis(auth.profile)) {
    return NextResponse.json({ error: "Hanya walidata yang membuka kunci" }, { status: 403 });
  }

  const patch: Partial<KejadianOperasiRow> = {
    fase_data: next,
    updated_at: new Date().toISOString(),
  };
  if (next === "statis") {
    const rekap = await buildRekapStatis(auth.supabase, params.id);
    patch.rekap_statis = (rekap ?? {}) as Json;
  } else if (item.fase_data === "statis") {
    patch.rekap_statis = null;
  }

  const { data: updated, error } = await auth.supabase
    .from("kejadian_operasi")
    .update(patch)
    .eq("id", params.id)
    .select("*")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: updated });
}
