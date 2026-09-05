import { NextRequest, NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/admin";
import { filterKatalogUntukStaf, parseKelasAksesQuery } from "@/lib/sik/sdb";
import type { SdbKatalogRow } from "@/lib/sik/db-tables";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireStaffApi();
  if (!auth.ok) return auth.response;

  const parsed = parseKelasAksesQuery(req.nextUrl.searchParams.get("kelas_akses"));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const { data, error } = await auth.supabase
    .from("sdb_katalog")
    .select("*")
    .neq("kelas_akses", "sangat_rahasia")
    .order("kunci");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = filterKatalogUntukStaf((data ?? []) as SdbKatalogRow[], parsed.value);
  return NextResponse.json({ items });
}
