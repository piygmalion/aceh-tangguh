import { NextResponse } from "next/server";
import { getMaritimPeringatan } from "@/lib/peringatan-dini/maritim";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const data = await getMaritimPeringatan();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
