import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/admin";
import { loadPrrpkaSummary } from "@/lib/prrpka-summary";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStaffApi();
  if (!auth.ok) return auth.response;
  try {
    const data = await loadPrrpkaSummary();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/prrpka/summary]", err);
    return NextResponse.json(
      { error: "Failed to load PRRPKA summary" },
      { status: 500 }
    );
  }
}
