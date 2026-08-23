import { NextRequest, NextResponse } from "next/server";
import { getPublikasiBySlug, getPublikasiList } from "@/lib/publikasi";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")?.trim();

  if (slug) {
    const detail = await getPublikasiBySlug(slug);
    if (!detail) {
      return NextResponse.json({ error: "not_found", slug }, { status: 404 });
    }
    return NextResponse.json(detail);
  }

  const list = await getPublikasiList();
  return NextResponse.json(list);
}
