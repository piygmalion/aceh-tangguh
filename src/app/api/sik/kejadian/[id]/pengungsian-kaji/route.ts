import { NextRequest, NextResponse } from "next/server";
import { requireOpsApi } from "@/lib/auth/admin";
import { matchesKabScope } from "@/lib/sik/roles";
import { pengungsianKajiSchema } from "@/lib/sik/schemas";
import { rejectCrossOrigin } from "@/lib/security/origin";
import {
  emptyKorbanTerpilah,
  normalizeKorbanTerpilah,
  normalizePengungsiJiwa,
  normalizeRentanPengungsi,
  rollupDampakFields,
  rollupPengungsiKeJuklak7,
  sumPengungsiJiwa,
  totalsFromKorbanTerpilah,
} from "@/lib/sik/juklak";
import { refreshIsBencana } from "@/lib/sik/kejadian-write";
import type { KejadianDampakRow, KejadianOperasiRow, PengungsianKajiRow } from "@/lib/sik/db-tables";
import type { Json } from "@/lib/supabase/json";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireOpsApi();
  if (!auth.ok) return auth.response;

  const { data: headerRow } = await auth.supabase
    .from("kejadian_operasi")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!headerRow) return NextResponse.json({ error: "not found" }, { status: 404 });
  const header = headerRow as KejadianOperasiRow;
  if (!matchesKabScope(auth.profile, header)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const [{ data: items }, { data: tempat }] = await Promise.all([
    auth.supabase
      .from("pengungsian_kaji")
      .select("*")
      .eq("kejadian_id", params.id)
      .order("tanggal", { ascending: false }),
    auth.supabase
      .from("tempat_pengungsian")
      .select("id, nama, jenis_pos, tanggal_buka, tanggal_tutup, kota_terdekat, kabupaten, kecamatan, desa")
      .order("nama"),
  ]);

  return NextResponse.json({
    items: (items ?? []) as PengungsianKajiRow[],
    tempat: tempat ?? [],
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const originErr = rejectCrossOrigin(req);
  if (originErr) return originErr;
  const auth = await requireOpsApi();
  if (!auth.ok) return auth.response;

  const json = await req.json().catch(() => null);
  const parsed = pengungsianKajiSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: headerRow } = await auth.supabase
    .from("kejadian_operasi")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!headerRow) return NextResponse.json({ error: "not found" }, { status: 404 });
  const header = headerRow as KejadianOperasiRow;
  if (!matchesKabScope(auth.profile, header)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (header.fase_data === "statis") {
    return NextResponse.json({ error: "Data statis terkunci" }, { status: 409 });
  }

  const body = parsed.data;
  const jiwa = normalizePengungsiJiwa(body.jiwa);
  const rentan = normalizeRentanPengungsi(body.rentan);
  const tanggal = body.tanggal.slice(0, 10);

  const { data, error } = await auth.supabase
    .from("pengungsian_kaji")
    .upsert(
      {
        kejadian_id: params.id,
        tempat_pengungsian_id: body.tempat_pengungsian_id,
        tanggal,
        jumlah_kk: body.jumlah_kk ?? 0,
        jiwa: jiwa as unknown as Json,
        rentan: rentan as unknown as Json,
        air_sanitasi: body.air_sanitasi ?? null,
        created_by: auth.profile.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "kejadian_id,tempat_pengungsian_id,tanggal" }
    )
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: allKaji } = await auth.supabase
    .from("pengungsian_kaji")
    .select("jiwa")
    .eq("kejadian_id", params.id)
    .eq("tanggal", tanggal);
  const summed = sumPengungsiJiwa(
    ((allKaji ?? []) as Array<{ jiwa: unknown }>).map((row) => normalizePengungsiJiwa(row.jiwa))
  );
  const mengungsiUmur = rollupPengungsiKeJuklak7(summed);

  const { data: existingDampak } = await auth.supabase
    .from("kejadian_dampak")
    .select("*")
    .eq("kejadian_id", params.id)
    .eq("tanggal", tanggal)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const current = (existingDampak as KejadianDampakRow | null) ?? null;
  const matrix = current ? normalizeKorbanTerpilah(current.korban_terpilah) : emptyKorbanTerpilah();
  matrix.mengungsi = mengungsiUmur;
  const rolled = rollupDampakFields({
    ...(current ?? {}),
    korban_terpilah: matrix,
  });
  const totals = totalsFromKorbanTerpilah(matrix);

  if (current) {
    await auth.supabase
      .from("kejadian_dampak")
      .update({
        korban_terpilah: matrix as unknown as Json,
        mengungsi: totals.mengungsi,
        meninggal: rolled.meninggal,
        hilang: rolled.hilang,
        menderita: rolled.menderita,
      })
      .eq("id", current.id);
  } else {
    await auth.supabase.from("kejadian_dampak").insert({
      kejadian_id: params.id,
      tanggal,
      korban_terpilah: matrix as unknown as Json,
      mengungsi: totals.mengungsi,
      created_by: auth.profile.userId,
    });
  }

  const { data: latest } = await auth.supabase
    .from("kejadian_dampak")
    .select("*")
    .eq("kejadian_id", params.id)
    .order("tanggal", { ascending: false })
    .limit(1)
    .maybeSingle();
  await refreshIsBencana(auth.supabase, header, (latest as KejadianDampakRow | null) ?? null);

  return NextResponse.json({ item: data }, { status: 201 });
}
