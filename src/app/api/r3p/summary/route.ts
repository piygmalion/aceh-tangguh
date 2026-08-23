import { NextResponse } from "next/server";
import { loadR3PSummary } from "@/lib/r3p-summary";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await loadR3PSummary();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/r3p/summary]", err);
    return NextResponse.json(
      { error: "Failed to load R3P summary" },
      { status: 500 }
    );
  }
}
