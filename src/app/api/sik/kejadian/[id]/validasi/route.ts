import { NextRequest, NextResponse } from "next/server";
import { requireOpsApi } from "@/lib/auth/admin";
import { canLockStatis, matchesKabScope } from "@/lib/sik/roles";
import { parseValidasiPost } from "@/lib/sik/sdb";
import { rejectCrossOrigin } from "@/lib/security/origin";
import type { KejadianOperasiRow, SdbValidasiRow } from "@/lib/sik/db-tables";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireOpsApi();
  if (!auth.ok) return auth.response;

  const { data: headerRow, error: headerError } = await auth.supabase
    .from("kejadian_operasi")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (headerError) return NextResponse.json({ error: headerError.message }, { status: 500 });
  if (!headerRow) return NextResponse.json({ error: "not found" }, { status: 404 });
  const header = headerRow as KejadianOperasiRow;
  if (!matchesKabScope(auth.profile, header)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data, error } = await auth.supabase
    .from("sdb_validasi")
    .select("*")
    .eq("kejadian_id", params.id)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: (data ?? []) as SdbValidasiRow[] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const originErr = rejectCrossOrigin(req);
  if (originErr) return originErr;
  const auth = await requireOpsApi();
  if (!auth.ok) return auth.response;

  const json = await req.json().catch(() => null);
  const parsed = parseValidasiPost(json);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const { data: headerRow, error: headerError } = await auth.supabase
    .from("kejadian_operasi")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (headerError) return NextResponse.json({ error: headerError.message }, { status: 500 });
  if (!headerRow) return NextResponse.json({ error: "not found" }, { status: 404 });
  const header = headerRow as KejadianOperasiRow;
  if (!matchesKabScope(auth.profile, header)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (parsed.value.status === "diajukan" && header.fase_data !== "diajukan") {
    return NextResponse.json({ error: "fase_data" }, { status: 400 });
  }
  if (parsed.value.status === "dikembalikan" && !canLockStatis(auth.profile)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data, error } = await auth.supabase
    .from("sdb_validasi")
    .insert({
      kejadian_id: params.id,
      status: parsed.value.status,
      catatan: parsed.value.catatan,
      created_by: auth.profile.userId,
    })
    .select("*")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data as SdbValidasiRow }, { status: 201 });
}
