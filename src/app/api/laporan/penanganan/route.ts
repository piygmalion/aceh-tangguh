import { NextRequest, NextResponse } from "next/server";
import { penangananSubmitSchema } from "@/lib/laporan/schemas";
import { LaporanConfigError, submitPenanganan } from "@/lib/laporan/service";
import { guardPublicPost } from "@/lib/security/public-post";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const blocked = guardPublicPost(req, "laporan-penanganan", 8);
  if (blocked) return blocked;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = penangananSubmitSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await submitPenanganan(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof LaporanConfigError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : "Submit failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
