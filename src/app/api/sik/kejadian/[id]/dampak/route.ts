import { NextRequest, NextResponse } from "next/server";
import { requireOpsApi } from "@/lib/auth/admin";
import { dampakSchema } from "@/lib/sik/schemas";
import { rejectCrossOrigin } from "@/lib/security/origin";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireOpsApi();
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.supabase
    .from("kejadian_dampak")
    .select("*")
    .eq("kejadian_id", params.id)
    .order("tanggal", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
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
  const parsed = dampakSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { data, error } = await auth.supabase
    .from("kejadian_dampak")
    .insert({
      ...parsed.data,
      kejadian_id: params.id,
      created_by: auth.profile.userId,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}
