import { NextResponse } from "next/server";
import { getMagmaPeringatan } from "@/lib/peringatan-dini/magma";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const data = await getMagmaPeringatan();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
