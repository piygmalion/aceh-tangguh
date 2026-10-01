import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/admin";
import { loadAnggaran } from "@/lib/anggaran";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStaffApi();
  if (!auth.ok) return auth.response;
  const data = await loadAnggaran();
  return NextResponse.json(data);
}
