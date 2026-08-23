import { NextRequest, NextResponse } from "next/server";
import { findKejadianById, loadKejadianFixture } from "@/lib/kejadian";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  const id = decodeURIComponent(context.params.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const data = await loadKejadianFixture();
  const item = findKejadianById(data, id);
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ item, meta: data.metadata ?? {} });
}
