import { NextResponse } from "next/server";
import { requireOpsApi } from "@/lib/auth/admin";
import { matchesKabScope } from "@/lib/sik/roles";
import { lacksDampakPadaTanggal, todayJakartaYmd } from "@/lib/sik/kunci-statis";
import type { KejadianOperasiRow } from "@/lib/sik/db-tables";

export const dynamic = "force-dynamic";

type PeringatanItem = Pick<
  KejadianOperasiRow,
  "id" | "nama_kejadian" | "kabupaten" | "kode_kabupaten"
>;

export async function GET() {
  const auth = await requireOpsApi();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from("kejadian_operasi")
    .select("id, nama_kejadian, kabupaten, kode_kabupaten")
    .eq("status_darurat", true)
    .eq("fase_data", "dinamis");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const scoped = ((data ?? []) as PeringatanItem[]).filter((row) =>
    matchesKabScope(auth.profile, row)
  );
  if (scoped.length === 0) {
    return NextResponse.json({ count: 0, items: [] });
  }

  const today = todayJakartaYmd();
  const { data: dampak, error: dampakError } = await auth.supabase
    .from("kejadian_dampak")
    .select("kejadian_id, tanggal")
    .in(
      "kejadian_id",
      scoped.map((row) => row.id)
    );
  if (dampakError) {
    return NextResponse.json({ error: dampakError.message }, { status: 500 });
  }

  const tanggalById = new Map<string, string[]>();
  for (const row of (dampak ?? []) as { kejadian_id: string; tanggal: string }[]) {
    const list = tanggalById.get(row.kejadian_id) ?? [];
    list.push(row.tanggal);
    tanggalById.set(row.kejadian_id, list);
  }

  const items = scoped.filter((row) =>
    lacksDampakPadaTanggal(tanggalById.get(row.id) ?? [], today)
  );
  return NextResponse.json({ count: items.length, items });
}
