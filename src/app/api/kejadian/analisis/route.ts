import { NextRequest, NextResponse } from "next/server";
import {
  buildKejadianAnalisis,
  parseAnalisisMetric,
} from "@/lib/kejadian-analisis";
import { loadKejadian } from "@/lib/kejadian";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  try {
    const { data, source } = await loadKejadian();
    const payload = buildKejadianAnalisis(
      data,
      {
        q: sp.get("q") ?? undefined,
        jenis: sp.get("jenis") ?? undefined,
        kabupaten: sp.get("kabupaten") ?? undefined,
        kecamatan: sp.get("kecamatan") ?? undefined,
        status: sp.get("status") ?? undefined,
        from: sp.get("from") ?? undefined,
        to: sp.get("to") ?? undefined,
        metric: parseAnalisisMetric(sp.get("metric")),
      },
      source
    );
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[api/kejadian/analisis]", err);
    return NextResponse.json({ error: "upstream" }, { status: 503 });
  }
}
