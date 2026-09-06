import { NextRequest, NextResponse } from "next/server";
import { resolveFeatureCard } from "@/lib/feature-card-resolve";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: { id: string } },
) {
  const id = decodeURIComponent(context.params.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const layer = req.nextUrl.searchParams.get("layer")?.trim() || undefined;
  const card = await resolveFeatureCard(id, layer);
  if (!card) {
    return NextResponse.json({ error: "not_found", id }, { status: 404 });
  }
  return NextResponse.json(card, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}
