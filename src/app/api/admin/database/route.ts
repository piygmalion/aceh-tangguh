import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminApi, sanitizeSearch } from "@/lib/auth/admin";
import {
  ADMIN_TABLES,
  isAdminTableKey,
  pickEditablePatch,
  pickInsertRow,
} from "@/lib/auth/tables";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  table: z.string(),
  id: z.string().min(1),
  patch: z.record(z.unknown()),
});

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const tableKey = req.nextUrl.searchParams.get("table")?.trim() ?? "";
  if (!isAdminTableKey(tableKey)) {
    return NextResponse.json(
      {
        tables: Object.values(ADMIN_TABLES).map((t) => ({
          key: t.key,
          label: t.label,
          note: t.note ?? null,
        })),
      }
    );
  }

  const config = ADMIN_TABLES[tableKey];
  const q = sanitizeSearch(req.nextUrl.searchParams.get("q") ?? "");
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(
    50,
    Math.max(1, Number(req.nextUrl.searchParams.get("pageSize") ?? "20") || 20)
  );

  const selectCols = config.columns.map((c) => c.key).join(",");
  type QueryBuilder = {
    order: (col: string, opts: { ascending: boolean }) => QueryBuilder;
    or: (filter: string) => QueryBuilder;
    range: (
      from: number,
      to: number
    ) => Promise<{
      data: Record<string, unknown>[] | null;
      error: { message: string } | null;
      count: number | null;
    }>;
  };
  const fromTable = auth.supabase.from(tableKey) as unknown as {
    select: (cols: string, opts: { count: "exact" }) => QueryBuilder;
  };

  let query = fromTable
    .select(selectCols, { count: "exact" })
    .order(config.defaultSort.column, {
      ascending: config.defaultSort.ascending,
    });

  if (q && config.searchable.length) {
    const or = config.searchable.map((col) => `${col}.ilike.%${q}%`).join(",");
    query = query.or(or);
  }

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query.range(from, from + pageSize - 1);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({
    table: config,
    items: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success || !isAdminTableKey(parsed.data.table)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const config = ADMIN_TABLES[parsed.data.table];
  const patch = pickEditablePatch(config, parsed.data.patch);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No editable fields" }, { status: 400 });
  }

  if ("updated_at" in Object.fromEntries(config.columns.map((c) => [c.key, true]))) {
    patch.updated_at = new Date().toISOString();
  }

  const { data, error } = await (
    auth.supabase.from(parsed.data.table) as unknown as {
      update: (values: Record<string, unknown>) => {
        eq: (col: string, value: string) => {
          select: (cols: string) => {
            single: () => Promise<{
              data: Record<string, unknown> | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    }
  )
    .update(patch)
    .eq(config.pk, parsed.data.id)
    .select(config.columns.map((c) => c.key).join(","))
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Update failed" },
      { status: 502 }
    );
  }
  return NextResponse.json({ item: data });
}

const writeSchema = z.object({
  table: z.string(),
  id: z.string().min(1).optional(),
  row: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = writeSchema.safeParse(json);
  if (!parsed.success || !isAdminTableKey(parsed.data.table) || !parsed.data.row) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const config = ADMIN_TABLES[parsed.data.table];
  if (!config.allowInsert) {
    return NextResponse.json({ error: "Insert not allowed" }, { status: 403 });
  }

  const row = pickInsertRow(config, parsed.data.row);
  if (!row[config.pk]) {
    return NextResponse.json({ error: "Missing primary key" }, { status: 400 });
  }

  const { data, error } = await (
    auth.supabase.from(parsed.data.table) as unknown as {
      insert: (values: Record<string, unknown>) => {
        select: (cols: string) => {
          single: () => Promise<{
            data: Record<string, unknown> | null;
            error: { message: string } | null;
          }>;
        };
      };
    }
  )
    .insert(row)
    .select(config.columns.map((c) => c.key).join(","))
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Insert failed" },
      { status: 502 }
    );
  }
  return NextResponse.json({ item: data });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = writeSchema.safeParse(json);
  if (!parsed.success || !isAdminTableKey(parsed.data.table) || !parsed.data.id) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const config = ADMIN_TABLES[parsed.data.table];
  if (!config.allowDelete) {
    return NextResponse.json({ error: "Delete not allowed" }, { status: 403 });
  }

  const { error } = await (
    auth.supabase.from(parsed.data.table) as unknown as {
      delete: () => {
        eq: (col: string, value: string) => Promise<{
          error: { message: string } | null;
        }>;
      };
    }
  )
    .delete()
    .eq(config.pk, parsed.data.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
