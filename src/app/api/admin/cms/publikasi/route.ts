import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminApi, sanitizeSearch } from "@/lib/auth/admin";
import type { Json, PublikasiRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const slugSchema = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase kebab-case");

const upsertSchema = z.object({
  slug: slugSchema,
  title: z.string().min(3).max(300),
  description: z.string().max(2000).nullable().optional(),
  published_at: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  payload: z.record(z.unknown()).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const slug = req.nextUrl.searchParams.get("slug")?.trim();
  if (slug) {
    const { data, error } = await auth.supabase
      .from("publikasi")
      .select("*")
      .eq("slug", slug)
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
  let query = auth.supabase
    .from("publikasi")
    .select("*")
    .order("published_at", { ascending: false });
  if (q) {
    query = query.or(`slug.ilike.%${q}%,title.ilike.%${q}%,description.ilike.%${q}%`);
  }
  const { data, error } = await query.limit(200);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const parsed = upsertSchema.safeParse(await readJson(req));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const row = toRow(parsed.data);
  const { data, error } = await auth.supabase
    .from("publikasi")
    .insert(row)
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

  const { slug, ...rest } = parsed.data;
  const { data, error } = await auth.supabase
    .from("publikasi")
    .update({
      title: rest.title,
      description: rest.description ?? null,
      published_at: rest.published_at ?? null,
      tags: rest.tags ?? [],
      payload: (rest.payload ?? {}) as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", slug)
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

  const slug = req.nextUrl.searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  const { error } = await auth.supabase.from("publikasi").delete().eq("slug", slug);
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

function toRow(data: z.infer<typeof upsertSchema>): PublikasiRow {
  const now = new Date().toISOString();
  return {
    slug: data.slug,
    title: data.title,
    description: data.description ?? null,
    published_at: data.published_at ?? null,
    tags: data.tags ?? [],
    payload: (data.payload ?? {}) as Json,
    updated_at: now,
  };
}
