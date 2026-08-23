import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminApi, sanitizeSearch } from "@/lib/auth/admin";
import type { Json } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const upsertSchema = z.object({
  id: z.string().min(1).max(120),
  jenis_bencana: z.string().min(2).max(120),
  hari_tanggal: z.string().nullable().optional(),
  kabupaten: z.string().nullable().optional(),
  kecamatan: z.string().nullable().optional(),
  desa: z.string().nullable().optional(),
  longitude: z.number().min(94).max(99).nullable().optional(),
  latitude: z.number().min(2).max(6).nullable().optional(),
  payload: z.record(z.unknown()).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (id) {
    const { data, error } = await auth.supabase
      .from("kejadian_bencana")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    if (!data) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ item: data });
  }

  const q = sanitizeSearch(req.nextUrl.searchParams.get("q") ?? "");
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(req.nextUrl.searchParams.get("pageSize") ?? "20") || 20)
  );

  let query = auth.supabase
    .from("kejadian_bencana")
    .select("*", { count: "exact" })
    .order("hari_tanggal", { ascending: false });
  if (q) {
    query = query.or(
      `id.ilike.%${q}%,jenis_bencana.ilike.%${q}%,kabupaten.ilike.%${q}%,kecamatan.ilike.%${q}%,desa.ilike.%${q}%`
    );
  }
  const from = (page - 1) * pageSize;
  const { data, error, count } = await query.range(from, from + pageSize - 1);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
  return NextResponse.json({
    items: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const parsed = upsertSchema.safeParse(await readJson(req));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data, error } = await auth.supabase
    .from("kejadian_bencana")
    .insert({
      id: parsed.data.id,
      jenis_bencana: parsed.data.jenis_bencana,
      hari_tanggal: parsed.data.hari_tanggal ?? null,
      kabupaten: parsed.data.kabupaten ?? null,
      kecamatan: parsed.data.kecamatan ?? null,
      desa: parsed.data.desa ?? null,
      longitude: parsed.data.longitude ?? null,
      latitude: parsed.data.latitude ?? null,
      payload: (parsed.data.payload ?? {}) as Json,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Insert failed" },
      { status: 502 }
    );
  }
  return NextResponse.json({ item: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const parsed = upsertSchema.safeParse(await readJson(req));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id, ...rest } = parsed.data;
  const { data, error } = await auth.supabase
    .from("kejadian_bencana")
    .update({
      jenis_bencana: rest.jenis_bencana,
      hari_tanggal: rest.hari_tanggal ?? null,
      kabupaten: rest.kabupaten ?? null,
      kecamatan: rest.kecamatan ?? null,
      desa: rest.desa ?? null,
      longitude: rest.longitude ?? null,
      latitude: rest.latitude ?? null,
      payload: (rest.payload ?? {}) as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Update failed" },
      { status: 502 }
    );
  }
  return NextResponse.json({ item: data });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const { error } = await auth.supabase.from("kejadian_bencana").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
