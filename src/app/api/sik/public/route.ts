import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { loadKejadianOperasiPublik } from "@/lib/sik/public";
import { permintaanPelatihanSchema } from "@/lib/sik/schemas";
import { guardPublicPost } from "@/lib/security/public-post";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get("kind") ?? "stats";
  const client = createServerClient();

  if (kind === "nomor-penting") {
    if (!client) return NextResponse.json({ items: [] });
    const { data } = await client.from("nomor_penting").select("*").order("urutan");
    return NextResponse.json({ items: data ?? [] });
  }

  if (kind === "pelatihan") {
    if (!client) return NextResponse.json({ items: [] });
    const { data } = await client
      .from("pelatihan")
      .select("*")
      .order("tanggal", { ascending: false });
    return NextResponse.json({ items: data ?? [] });
  }

  if (kind === "mitra") {
    if (!client) return NextResponse.json({ items: [] });
    const { data } = await client.from("mitra_halaman").select("*");
    return NextResponse.json({ items: data ?? [] });
  }

  if (kind === "destana") {
    if (!client) return NextResponse.json({ items: [], counts: {} });
    const kab = req.nextUrl.searchParams.get("kabupaten")?.trim() ?? "";
    let q = client
      .from("profil_desa")
      .select("id, nama, kabupaten, kecamatan, kode_desa_kelurahan, destana_level, destana_indeks, destana_tahun")
      .order("nama")
      .limit(2000);
    if (kab) q = q.eq("kabupaten", kab);
    const { data } = await q;
    const items = data ?? [];
    const counts: Record<string, number> = { belum: 0, pratama: 0, madya: 0, utama: 0 };
    for (const row of items) {
      const level = (row.destana_level as string | null) ?? "belum";
      counts[level] = (counts[level] ?? 0) + 1;
    }
    return NextResponse.json({ items, counts });
  }

  if (kind === "disabilitas") {
    if (!client) return NextResponse.json({ items: [] });
    const { data } = await client.from("disabilitas_agregat").select("*");
    return NextResponse.json({ items: data ?? [] });
  }

  const ops = await loadKejadianOperasiPublik();
  const tahun = req.nextUrl.searchParams.get("tahun");
  const kabupaten = req.nextUrl.searchParams.get("kabupaten")?.trim() ?? "";
  const jenis = req.nextUrl.searchParams.get("jenis")?.trim() ?? "";
  const nowYear = new Date().getFullYear();
  const year = tahun ? Number(tahun) : nowYear;
  const filtered = ops.filter((row) => {
    const y = new Date(row.waktu_kejadian).getFullYear();
    if (Number.isFinite(year) && y !== year) return false;
    if (kabupaten && row.kabupaten !== kabupaten) return false;
    if (jenis && row.jenis_bencana !== jenis && String(row.kode_jenis) !== jenis) return false;
    return true;
  });
  const byJenis = new Map<string, number>();
  for (const row of filtered) {
    byJenis.set(row.jenis_bencana, (byJenis.get(row.jenis_bencana) ?? 0) + 1);
  }
  return NextResponse.json({
    total: filtered.length,
    byJenis: Array.from(byJenis.entries()).map(([jenisBencana, count]) => ({
      jenis: jenisBencana,
      count,
    })),
    items: filtered.slice(0, 12),
    year,
  });
}

export async function POST(req: NextRequest) {
  const blocked = await guardPublicPost(req, "sik-public-pelatihan", 8);
  if (blocked) return blocked;
  const json = await req.json().catch(() => null);
  const parsed = permintaanPelatihanSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const client = createServerClient();
  if (!client) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const { data, error } = await client
    .from("permintaan_pelatihan")
    .insert({
      judul: parsed.data.judul,
      desa: parsed.data.desa,
      tanggal_rencana: parsed.data.tanggal_rencana,
      kontak_nama: parsed.data.kontak_nama,
      kontak_email: parsed.data.kontak_email || null,
      kontak_telepon: parsed.data.kontak_telepon || null,
      alamat: parsed.data.alamat,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
