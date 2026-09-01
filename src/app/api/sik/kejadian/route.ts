import { NextRequest, NextResponse } from "next/server";
import { requireOpsApi } from "@/lib/auth/admin";
import { matchesKabScope, scopeKabupaten } from "@/lib/sik/roles";
import { kejadianWizardSchema } from "@/lib/sik/schemas";
import { rejectCrossOrigin } from "@/lib/security/origin";
import { allocateKib, resolveTarikh } from "@/lib/sik/kejadian-write";
import { findKabupaten, memenuhiAmbangBatas } from "@/lib/sik/juklak";
import type { KejadianDampakRow, KejadianOperasiRow } from "@/lib/sik/db-tables";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireOpsApi();
  if (!auth.ok) return auth.response;

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const status = sp.get("status")?.trim() ?? "";
  const kabupaten = sp.get("kabupaten")?.trim() ?? "";
  const tahun = sp.get("tahun")?.trim() ?? "";
  const page = Math.max(1, Number(sp.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(1, Number(sp.get("pageSize") ?? "20") || 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = auth.supabase
    .from("kejadian_operasi")
    .select("*", { count: "exact" })
    .order("waktu_kejadian", { ascending: false })
    .range(from, to);

  const kabScope = scopeKabupaten(auth.profile);
  if (kabScope) query = query.or(`kode_kabupaten.eq.${kabScope},kabupaten.eq.${kabScope}`);
  if (kabupaten) query = query.ilike("kabupaten", `%${kabupaten}%`);
  if (status) query = query.eq("status", status);
  if (tahun) query = query.gte("waktu_kejadian", `${tahun}-01-01`).lte("waktu_kejadian", `${tahun}-12-31`);
  if (q) {
    query = query.or(`nama_kejadian.ilike.%${q}%,nomor.ilike.%${q}%,jenis_bencana.ilike.%${q}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const items = ((data ?? []) as KejadianOperasiRow[]).filter((row) =>
    matchesKabScope(auth.profile, row)
  );
  return NextResponse.json({ items, total: count ?? items.length, page, pageSize });
}

export async function POST(req: NextRequest) {
  const originErr = rejectCrossOrigin(req);
  if (originErr) return originErr;
  const auth = await requireOpsApi();
  if (!auth.ok) return auth.response;

  const json = await req.json().catch(() => null);
  const parsed = kejadianWizardSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { lokasi, fase_data: _fase, is_bencana: _flag, ...header } = parsed.data;
  const kabScope = scopeKabupaten(auth.profile);
  if (kabScope && !header.kode_kabupaten) header.kode_kabupaten = kabScope;

  const kab = findKabupaten(header.kode_kabupaten ?? header.kabupaten ?? "");
  if (kab) {
    header.kode_kabupaten = kab.kode;
    header.kabupaten = kab.nama;
  }

  const tarikh = resolveTarikh(header.waktu_kejadian, header.tarikh);
  let kib: string | null = null;
  let kibIndex: number | null = null;
  try {
    const allocated = await allocateKib(auth.supabase, {
      kodeKabupaten: header.kode_kabupaten,
      kodeJenis: header.kode_jenis,
      tarikh,
    });
    if (allocated) {
      kib = allocated.kib;
      kibIndex = allocated.kib_index;
    }
  } catch {
    kib = null;
    kibIndex = null;
  }

  const isBencana = memenuhiAmbangBatas({
    statusDarurat: header.status_darurat ?? false,
    permintaanBantuanNasional: header.permintaan_bantuan_nasional ?? false,
    dampak: null,
  });

  const { data, error } = await auth.supabase
    .from("kejadian_operasi")
    .insert({
      ...header,
      tarikh,
      kib,
      kib_index: kibIndex,
      kode_provinsi: "11",
      fase_data: "dinamis",
      is_bencana: isBencana,
      created_by: auth.profile.userId,
      status: header.status ?? "aktif",
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 });
  }

  const kejadian = data as KejadianOperasiRow;
  if (lokasi && lokasi.length > 0) {
    await auth.supabase.from("kejadian_lokasi").insert(
      lokasi.map((loc) => ({
        kejadian_id: kejadian.id,
        ...loc,
      }))
    );
  }

  if (header.laporan_id) {
    await auth.supabase
      .from("laporan_kejadian")
      .update({
        kejadian_id: kejadian.id,
        status: "approved",
        tampil_di_peta: true,
      })
      .eq("id", header.laporan_id);
  }

  return NextResponse.json({ item: kejadian }, { status: 201 });
}

export type { KejadianDampakRow };
