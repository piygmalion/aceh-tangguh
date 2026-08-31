import { NextRequest, NextResponse } from "next/server";
import { requireOpsApi } from "@/lib/auth/admin";
import { matchesKabScope } from "@/lib/sik/roles";
import { kejadianWizardSchema } from "@/lib/sik/schemas";
import { rejectCrossOrigin } from "@/lib/security/origin";
import type { KejadianDampakRow, KejadianLokasiRow, KejadianOperasiRow } from "@/lib/sik/db-tables";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireOpsApi();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from("kejadian_operasi")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  const item = data as KejadianOperasiRow;
  if (!matchesKabScope(auth.profile, item)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const [{ data: lokasi }, { data: dampak }] = await Promise.all([
    auth.supabase.from("kejadian_lokasi").select("*").eq("kejadian_id", params.id),
    auth.supabase
      .from("kejadian_dampak")
      .select("*")
      .eq("kejadian_id", params.id)
      .order("tanggal", { ascending: false }),
  ]);

  return NextResponse.json({
    item,
    lokasi: (lokasi ?? []) as KejadianLokasiRow[],
    dampak: (dampak ?? []) as KejadianDampakRow[],
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const originErr = rejectCrossOrigin(req);
  if (originErr) return originErr;
  const auth = await requireOpsApi();
  if (!auth.ok) return auth.response;

  const json = await req.json().catch(() => null);
  const parsed = kejadianWizardSchema.partial().safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { lokasi, ...header } = parsed.data;
  const { data, error } = await auth.supabase
    .from("kejadian_operasi")
    .update({ ...header, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select("*")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (lokasi) {
    await auth.supabase.from("kejadian_lokasi").delete().eq("kejadian_id", params.id);
    if (lokasi.length > 0) {
      await auth.supabase.from("kejadian_lokasi").insert(
        lokasi.map((loc) => ({ kejadian_id: params.id, ...loc }))
      );
    }
  }

  return NextResponse.json({ item: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const originErr = rejectCrossOrigin(req);
  if (originErr) return originErr;
  const auth = await requireOpsApi();
  if (!auth.ok) return auth.response;
  const { error } = await auth.supabase.from("kejadian_operasi").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
