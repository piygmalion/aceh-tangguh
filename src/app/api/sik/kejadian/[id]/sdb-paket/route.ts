import { NextRequest, NextResponse } from "next/server";
import { requireOpsApi } from "@/lib/auth/admin";
import { matchesKabScope } from "@/lib/sik/roles";
import { bangunSdbPaket } from "@/lib/sik/sdb-paket";
import type { KejadianDampakRow, KejadianOperasiRow, PengungsianKajiRow } from "@/lib/sik/db-tables";

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

  const [{ data: dampak }, { data: kaji }, { data: tempat }] = await Promise.all([
    auth.supabase
      .from("kejadian_dampak")
      .select("*")
      .eq("kejadian_id", params.id)
      .order("tanggal", { ascending: true }),
    auth.supabase.from("pengungsian_kaji").select("*").eq("kejadian_id", params.id).order("tanggal"),
    auth.supabase
      .from("tempat_pengungsian")
      .select("id, nama, jenis_pos, tanggal_buka, tanggal_tutup, kota_terdekat, kabupaten, kecamatan, desa"),
  ]);

  const paket = bangunSdbPaket({
    kejadian: item,
    dampak: (dampak ?? []) as KejadianDampakRow[],
    kaji: (kaji ?? []) as PengungsianKajiRow[],
    tempat: ((tempat ?? []) as Array<Record<string, unknown>>).map((t) => ({
      id: String(t.id ?? ""),
      nama: String(t.nama ?? ""),
      jenis_pos: t.jenis_pos == null ? null : String(t.jenis_pos),
      tanggal_buka: t.tanggal_buka == null ? null : String(t.tanggal_buka),
      tanggal_tutup: t.tanggal_tutup == null ? null : String(t.tanggal_tutup),
      kota_terdekat: t.kota_terdekat == null ? null : String(t.kota_terdekat),
      kabupaten: t.kabupaten == null ? null : String(t.kabupaten),
      kecamatan: t.kecamatan == null ? null : String(t.kecamatan),
      desa: t.desa == null ? null : String(t.desa),
    })),
  });

  const filename = `sdb-${item.kib ?? item.nomor}.json`.replace(/[^\w.-]+/g, "_");
  return new NextResponse(JSON.stringify(paket, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
