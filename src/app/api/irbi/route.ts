import { NextResponse } from "next/server";
import { loadIrbi } from "@/lib/irbi";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await loadIrbi();
  return NextResponse.json(data);
}
