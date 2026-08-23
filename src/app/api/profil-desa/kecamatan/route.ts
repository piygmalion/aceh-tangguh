import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { fetchProfilDesaRows } from "@/lib/profil-desa-server";
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

  if (!kodeKecamatan && !(kabupaten && kecamatan) && !kecamatan) {
    return NextResponse.json(
      { error: "Provide kode_kecamatan or kabupaten+kecamatan" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let { rows, error } = kodeKecamatan
    ? await fetchProfilDesaRows(supabase, {
        kind: "kode_kecamatan",
        value: kodeKecamatan,
      })
    : await fetchProfilDesaRows(supabase, {
        kind: "kecamatan",
        kabupaten: kabupaten || undefined,
        kecamatan,
      });

  if (!error && rows.length === 0 && kodeKecamatan && (kabupaten || kecamatan)) {
    const fallback = await fetchProfilDesaRows(supabase, {
      kind: "kecamatan",
      kabupaten: kabupaten || undefined,
      kecamatan,
    });
    rows = fallback.rows;
    error = fallback.error;
  }

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
