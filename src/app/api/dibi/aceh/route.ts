import { NextResponse } from "next/server";
import { getDibiAceh } from "@/lib/dibi";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getDibiAceh();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/dibi/aceh]", err);
    return NextResponse.json(
      { error: "Failed to load DIBI Aceh dashboard" },
      { status: 500 },
    );
  }
}
