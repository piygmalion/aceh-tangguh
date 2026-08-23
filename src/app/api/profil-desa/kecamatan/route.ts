import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { resolveKecamatanRows } from "@/lib/profil-desa-server";
import {
  sortDesaItems,
  summarizeRows,
  toDesaListItem,
  type KecamatanProfilResponse,
} from "@/lib/profil-desa";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const kodeKecamatan = sp.get("kode_kecamatan")?.trim() || "";
  const kabupaten = sp.get("kabupaten")?.trim() || "";
  const kecamatan = sp.get("kecamatan")?.trim() || "";

  if (!kodeKecamatan && !kecamatan) {
    return NextResponse.json(
      { error: "Provide kabupaten+kecamatan or kode_kecamatan" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { rows, error } = await resolveKecamatanRows(supabase, {
    kabupaten,
    kecamatan,
    kodeKecamatan,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 502 });
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const title =
    rows[0].kecamatan?.trim() || kecamatan || kodeKecamatan || "Kecamatan";
  const summary = summarizeRows(rows, "kecamatan", title);
  const body: KecamatanProfilResponse = {
    ...summary,
    desa: sortDesaItems(rows.map(toDesaListItem)),
    source: "supabase",
  };
  return NextResponse.json(body);
}
