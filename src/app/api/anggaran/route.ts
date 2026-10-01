import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/admin";
import { loadAnggaran } from "@/lib/anggaran";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStaffApi();
  if (!auth.ok) return auth.response;
  // Session-bound client: reads run as the signed-in staff user under RLS.
  const data = await loadAnggaran(auth.supabase);
  const res = NextResponse.json(data);
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("X-Data-Source", data.source);
  if (data.fallbackReason) res.headers.set("X-Data-Fallback", data.fallbackReason);
  return res;
}
