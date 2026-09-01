import { NextRequest, NextResponse } from "next/server";
import { requireOpsApi } from "@/lib/auth/admin";
import { matchesKabScope } from "@/lib/sik/roles";
import { dampakSchema } from "@/lib/sik/schemas";
import { rejectCrossOrigin } from "@/lib/security/origin";
import {
  normalizeKorbanTerpilah,
  rollupDampakFields,
} from "@/lib/sik/juklak";
import { refreshIsBencana } from "@/lib/sik/kejadian-write";
import type { KejadianDampakRow, KejadianOperasiRow } from "@/lib/sik/db-tables";
import type { Json } from "@/lib/supabase/json";

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

  const { data: headerRow } = await auth.supabase
    .from("kejadian_operasi")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!headerRow) return NextResponse.json({ error: "not found" }, { status: 404 });
  const header = headerRow as KejadianOperasiRow;
  if (!matchesKabScope(auth.profile, header)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (header.fase_data === "statis") {
    return NextResponse.json({ error: "Data statis terkunci" }, { status: 409 });
  }

  const body = parsed.data;
  const matrix = normalizeKorbanTerpilah(body.korban_terpilah);
  const rolled = rollupDampakFields({ ...body, korban_terpilah: matrix });

  const { data, error } = await auth.supabase
    .from("kejadian_dampak")
    .insert({
      ...body,
      ...rolled,
      korban_terpilah: matrix as unknown as Json,
      kejadian_id: params.id,
      created_by: auth.profile.userId,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const item = data as KejadianDampakRow;
  await refreshIsBencana(auth.supabase, header, item);

  await auth.supabase
    .from("kejadian_operasi")
    .update({
      kondisi_mutakhir: body.kondisi_mutakhir ?? header.kondisi_mutakhir,
      upaya_penanganan: body.upaya_penanganan ?? header.upaya_penanganan,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id);

  return NextResponse.json({ item }, { status: 201 });
}
