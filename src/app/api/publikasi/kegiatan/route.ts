import { NextResponse } from "next/server";
import { getPublikasiKegiatanList } from "@/lib/publikasi-kegiatan";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const list = await getPublikasiKegiatanList();
    return NextResponse.json(list);
  } catch (err) {
    console.error("[api/publikasi/kegiatan]", err);
    return NextResponse.json({ error: "Failed to load kegiatan" }, { status: 500 });
  }
}
