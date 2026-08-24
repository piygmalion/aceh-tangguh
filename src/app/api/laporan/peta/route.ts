import { NextRequest, NextResponse } from "next/server";
import {
  getPetaKejadianPublik,
  getPetaPenangananPublik,
} from "@/lib/laporan/service";

export const dynamic = "force-dynamic";

/**
 * Moderated laporan points for the public map.
 *
 * Moderated = `status = approved` AND `tampil_di_peta = true` AND lat/lon present.
 * Query `?tipe=kejadian|penanganan` to return one side only (the other is empty).
 * STATIC_EXPORT / no fixture: empty arrays.
 */
export async function GET(req: NextRequest) {
  const tipe = req.nextUrl.searchParams.get("tipe");
  const wantKejadian = tipe !== "penanganan";
  const wantPenanganan = tipe !== "kejadian";

  const [kejadian, penanganan] = await Promise.all([
    wantKejadian ? getPetaKejadianPublik() : Promise.resolve([]),
    wantPenanganan ? getPetaPenangananPublik() : Promise.resolve([]),
  ]);

  return NextResponse.json({
    kejadian: {
      layerId: "laporanKejadian",
      count: kejadian.length,
      items: kejadian,
    },
    penanganan: {
      layerId: "laporanPenanganan",
      count: penanganan.length,
      items: penanganan,
    },
  });
}
