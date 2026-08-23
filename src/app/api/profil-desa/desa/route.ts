import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { resolveDesaRow } from "@/lib/profil-desa-server";
import { summarizeRows, type DesaProfilResponse } from "@/lib/profil-desa";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const kode = sp.get("kode")?.trim() || "";
  const id = sp.get("id")?.trim() || "";
  const nama = sp.get("nama")?.trim() || "";
  const kabupaten = sp.get("kabupaten")?.trim() || "";
  const kecamatan = sp.get("kecamatan")?.trim() || "";

  if (!kode && !id && !nama) {
    return NextResponse.json(
      { error: "Provide id, kode, or nama (+ kabupaten/kecamatan)" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { row, error } = await resolveDesaRow(supabase, {
    id,
    kode,
    nama,
    kabupaten,
    kecamatan,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 502 });
  }
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const summary = summarizeRows([row], "desa", row.nama);
  const body: DesaProfilResponse = {
    ...summary,
    id: String(row.id),
    kondisi_kode: row.kondisi_kode,
    desa_count: 1,
    source: "supabase",
  };
  return NextResponse.json(body);
}
