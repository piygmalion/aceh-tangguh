import { NextResponse } from "next/server";
import { loadAnggaran } from "@/lib/anggaran";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await loadAnggaran();
  return NextResponse.json(data);
}
