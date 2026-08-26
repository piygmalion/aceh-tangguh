import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GONE = {
  error: "gone",
  message:
    "Legacy /api/reports is retired. Use POST /api/laporan/kejadian or /api/laporan/penanganan. Staff: GET/PATCH /api/admin/reports for archived rows.",
  replacements: {
    submitKejadian: "/api/laporan/kejadian",
    submitPenanganan: "/api/laporan/penanganan",
    adminLegacy: "/api/admin/reports",
  },
};

/** Legacy citizen reports API — permanently removed from the public contract. */
export async function GET() {
  return NextResponse.json(GONE, { status: 410 });
}

export async function POST() {
  return NextResponse.json(GONE, { status: 410 });
}
