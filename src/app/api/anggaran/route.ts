import { NextResponse } from "next/server";
import { loadAnggaranFixtures } from "@/lib/anggaran";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await loadAnggaranFixtures();
  return NextResponse.json(data);
}
