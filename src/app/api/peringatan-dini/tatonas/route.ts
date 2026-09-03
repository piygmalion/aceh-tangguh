import { NextResponse } from "next/server";
import { getTatonasPeringatan } from "@/lib/tatonas/service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const data = await getTatonasPeringatan();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
