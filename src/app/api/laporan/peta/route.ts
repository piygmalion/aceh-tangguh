import { NextResponse } from "next/server";
import { getPetaKejadianPublik } from "@/lib/laporan/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await getPetaKejadianPublik();
  return NextResponse.json({
    layerId: "citizenReports",
    laporan_tipe: "kejadian",
    count: items.length,
    items,
  });
}
