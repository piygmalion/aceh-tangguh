import { NextResponse } from "next/server";
import { allowedPelabuhanKodes, getPelabuhanForecast } from "@/lib/maritime";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  _req: Request,
  { params }: { params: { kode: string } },
) {
  const kode = params.kode?.trim().toUpperCase();
  if (!kode || kode.length > 16) {
    return NextResponse.json({ error: "invalid_kode" }, { status: 400 });
  }
  const allowed = await allowedPelabuhanKodes();
  if (!allowed.has(kode)) {
    return NextResponse.json({ error: "unknown_kode" }, { status: 404 });
  }
  const data = await getPelabuhanForecast(kode);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
