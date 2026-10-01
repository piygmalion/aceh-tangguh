import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/admin";
import { loadPrrpkaSummary } from "@/lib/prrpka-summary";

export const dynamic = "force-dynamic";

/** Legacy path — same PRRPKA fixture payload as `/api/prrpka/summary`. Staff only. */
export async function GET() {
  const auth = await requireStaffApi();
  if (!auth.ok) return auth.response;
  try {
    // PRRPKA has no Supabase table: server-side data/staff fixture only.
    const data = await loadPrrpkaSummary();
    const res = NextResponse.json(data);
    res.headers.set("Cache-Control", "private, no-store");
    res.headers.set("X-Data-Source", "fixture");
    return res;
  } catch (err) {
    console.error("[api/r3p/summary]", err);
    return NextResponse.json(
      { error: "Failed to load PRRPKA summary" },
      { status: 500 }
    );
  }
}
