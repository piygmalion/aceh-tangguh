import { NextResponse } from "next/server";
import { getPeringatanDini } from "@/lib/peringatan-dini/service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const data = await getPeringatanDini();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
