import { NextRequest, NextResponse } from "next/server";
import {
  filterAndPaginateKejadian,
  loadKejadian,
} from "@/lib/kejadian";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Number(sp.get("page") ?? "1");
  const pageSize = Number(sp.get("pageSize") ?? "10");

  const { data, source } = await loadKejadian();
  const result = filterAndPaginateKejadian(
    data,
    {
      q: sp.get("q") ?? undefined,
      jenis: sp.get("jenis") ?? undefined,
      kabupaten: sp.get("kabupaten") ?? undefined,
      kecamatan: sp.get("kecamatan") ?? undefined,
      status: sp.get("status") ?? undefined,
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 10,
    },
    source
  );

  return NextResponse.json(result);
}
