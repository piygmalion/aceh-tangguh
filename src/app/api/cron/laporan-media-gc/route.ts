import { NextResponse } from "next/server";
import {
  MEDIA_GC_DELETE_BATCH,
  MEDIA_GC_MAX_AGE_MS,
  MEDIA_GC_PREFIXES,
  collectReferencedMediaPathsFromRows,
  findOrphanMediaPaths,
  type StorageListItem,
} from "@/lib/laporan/media-gc";
import { bearerMatches } from "@/lib/security/bearer";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function listPrefix(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  prefix: string
): Promise<StorageListItem[]> {
  const items: StorageListItem[] = [];
  let offset = 0;
  const pageSize = 100;
  for (;;) {
    const { data, error } = await supabase.storage
      .from("laporan-media")
      .list(prefix, { limit: pageSize, offset, sortBy: { column: "created_at", order: "asc" } });
    if (error) throw new Error(`${prefix}: ${error.message}`);
    if (!data?.length) break;
    items.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return items;
}

/**
 * Delete unreferenced laporan-media objects older than 48h.
 * Auth: Authorization Bearer LAPORAN_CRON_SECRET (same as WA cron).
 */
export async function POST(request: Request) {
  const secret = process.env.LAPORAN_CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "LAPORAN_CRON_SECRET not configured" }, { status: 503 });
  }
  if (!bearerMatches(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = new URL(request.url).searchParams.get("dry_run") === "1";
  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase service role missing" }, { status: 503 });
  }

  const [kejadianRes, penangananRes] = await Promise.all([
    supabase.from("laporan_kejadian").select("jawaban_json"),
    supabase.from("laporan_penanganan").select("jawaban_json"),
  ]);

  if (kejadianRes.error) {
    return NextResponse.json({ error: kejadianRes.error.message }, { status: 502 });
  }
  if (penangananRes.error) {
    return NextResponse.json({ error: penangananRes.error.message }, { status: 502 });
  }

  const referenced = collectReferencedMediaPathsFromRows([
    ...(kejadianRes.data ?? []),
    ...(penangananRes.data ?? []),
  ]);

  const listed: Array<{ prefix: string; items: StorageListItem[] }> = [];
  try {
    for (const prefix of MEDIA_GC_PREFIXES) {
      listed.push({ prefix, items: await listPrefix(supabase, prefix) });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const orphans = findOrphanMediaPaths(
    listed,
    referenced,
    Date.now(),
    MEDIA_GC_MAX_AGE_MS
  );

  let deleted = 0;
  const errors: string[] = [];

  if (!dryRun) {
    for (let i = 0; i < orphans.length; i += MEDIA_GC_DELETE_BATCH) {
      const batch = orphans.slice(i, i + MEDIA_GC_DELETE_BATCH).map((o) => o.path);
      const { error } = await supabase.storage.from("laporan-media").remove(batch);
      if (error) {
        errors.push(error.message);
      } else {
        deleted += batch.length;
      }
    }
  }

  return NextResponse.json({
    dryRun,
    referenced: referenced.size,
    listed: listed.reduce((n, g) => n + g.items.length, 0),
    orphans: orphans.length,
    deleted,
    sample: orphans.slice(0, 10).map((o) => o.path),
    errors: errors.slice(0, 10),
  });
}
