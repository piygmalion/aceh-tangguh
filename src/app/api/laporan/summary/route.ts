import { NextResponse } from "next/server";
import { LAPORAN_STATUSES, type LaporanStatus } from "@/lib/laporan/status";
import {
  emptyLaporanStatusCounts,
  laporanPublicSummary,
  type LaporanStatusCounts,
} from "@/lib/laporan/summary";
import { isStaticExport } from "@/lib/preview/env";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function countByStatus(
  table: "laporan_kejadian" | "laporan_penanganan"
): Promise<LaporanStatusCounts> {
  const client = createServiceClient();
  const counts = emptyLaporanStatusCounts();
  if (!client) return counts;
  for (const status of LAPORAN_STATUSES) {
    const { count } = await client
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("status", status as LaporanStatus);
    counts[status] = count ?? 0;
  }
  return counts;
}

export async function GET() {
  if (isStaticExport()) {
    return NextResponse.json({
      aduan: 0,
      ditanggapi: 0,
      source: "preview",
    });
  }
  const [kejadian, penanganan] = await Promise.all([
    countByStatus("laporan_kejadian"),
    countByStatus("laporan_penanganan"),
  ]);
  return NextResponse.json({
    ...laporanPublicSummary(kejadian, penanganan),
    source: createServiceClient() ? "supabase" : "empty",
  });
}
