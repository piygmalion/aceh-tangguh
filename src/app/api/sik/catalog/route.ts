import { NextResponse } from "next/server";
import { JENIS_BENCANA_JUKLAK } from "@/lib/sik/jenis-bencana";
import { ACEH_KABUPATEN } from "@/lib/sik/juklak";
import { PKD_KATALOG } from "@/lib/sik/pkd";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    jenisBencana: JENIS_BENCANA_JUKLAK,
    kabupaten: ACEH_KABUPATEN,
    pkd: PKD_KATALOG,
  });
}
