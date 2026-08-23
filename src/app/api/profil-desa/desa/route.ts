import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { fetchProfilDesaRows } from "@/lib/profil-desa-server";
import { summarizeRows, type DesaProfilResponse } from "@/lib/profil-desa";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const kode = sp.get("kode")?.trim() || "";
  const id = sp.get("id")?.trim() || "";

  if (!kode && !id) {
    return NextResponse.json(
      { error: "Provide kode or id" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { rows, error } = id
    ? await fetchProfilDesaRows(supabase, { kind: "id", value: id })
    : await fetchProfilDesaRows(supabase, { kind: "kode_desa", value: kode });

  if (error) {
    return NextResponse.json({ error }, { status: 502 });
  }

  const row = rows[0];
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
