import { NextRequest, NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/admin";
import { canLockStatis } from "@/lib/sik/roles";
import { parseJadwalPost, tandaiJadwalTerlambat, todayJakarta } from "@/lib/sik/sdb";
import { rejectCrossOrigin } from "@/lib/security/origin";
import type { SdbJadwalKirimRow } from "@/lib/sik/db-tables";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStaffApi();
  if (!auth.ok) return auth.response;
  if (!canLockStatis(auth.profile)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data, error } = await auth.supabase
    .from("sdb_jadwal_kirim")
    .select("*")
    .order("jatuh_tempo");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = tandaiJadwalTerlambat((data ?? []) as SdbJadwalKirimRow[], todayJakarta());
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const originErr = rejectCrossOrigin(req);
  if (originErr) return originErr;
  const auth = await requireStaffApi();
  if (!auth.ok) return auth.response;
  if (!canLockStatis(auth.profile)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = parseJadwalPost(json);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const { data, error } = await auth.supabase
    .from("sdb_jadwal_kirim")
    .insert({
      kunci: parsed.value.kunci,
      periode_label: parsed.value.periode_label,
      jatuh_tempo: parsed.value.jatuh_tempo,
      status: "terbuka",
    })
    .select("*")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "duplicate" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ item: data as SdbJadwalKirimRow }, { status: 201 });
}
