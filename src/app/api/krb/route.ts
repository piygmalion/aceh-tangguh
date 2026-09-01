import { NextResponse } from "next/server";
import { filterKrb, loadKrb } from "@/lib/krb";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const data = await loadKrb();
  const filtered = filterKrb(data, {
    jenis: url.searchParams.get("jenis") ?? undefined,
    kabupaten: url.searchParams.get("kabupaten") ?? undefined,
    kelas: url.searchParams.get("kelas") ?? undefined,
  });
  return NextResponse.json(filtered);
}
