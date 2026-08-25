import { NextResponse } from "next/server";
import { getSipongiPeringatan } from "@/lib/peringatan-dini/sipongi";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getSipongiPeringatan();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
