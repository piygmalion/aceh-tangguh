import { NextResponse } from "next/server";
import { loadPrrpkaSummary } from "@/lib/prrpka-summary";

export const dynamic = "force-dynamic";

/** Legacy path — same PRRPKA fixture payload as `/api/prrpka/summary`. */
export async function GET() {
  try {
    const data = await loadPrrpkaSummary();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/r3p/summary]", err);
    return NextResponse.json(
      { error: "Failed to load PRRPKA summary" },
      { status: 500 }
    );
  }
}
