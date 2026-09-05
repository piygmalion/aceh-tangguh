import { NextRequest, NextResponse } from "next/server";
import { isStaticExport } from "@/lib/preview/env";
import { guardPublicPost } from "@/lib/security/public-post";
import { createServerClient } from "@/lib/supabase/server";
import {
  asUnknownLocale,
  asUnknownReason,
  sanitizeUnknownPath,
  sanitizeUnknownQuery,
} from "@/lib/panduan/unknown";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (isStaticExport()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  const guard = await guardPublicPost(req, "panduan-unknown", 30);
  if (guard) return guard;

  const json = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const query = sanitizeUnknownQuery(typeof json?.query === "string" ? json.query : "");
  if (query.length < 2) {
    return NextResponse.json({ ok: true });
  }

  const client = createServerClient();
  if (!client) return NextResponse.json({ ok: false }, { status: 503 });

  const { error } = await client.from("panduan_unknown").insert({
    query_sanitized: query,
    locale: asUnknownLocale(typeof json?.locale === "string" ? json.locale : undefined),
    reason: asUnknownReason(typeof json?.reason === "string" ? json.reason : undefined),
    pathname: sanitizeUnknownPath(typeof json?.pathname === "string" ? json.pathname : "/"),
  });
  if (error) return NextResponse.json({ ok: false }, { status: 503 });
  return NextResponse.json({ ok: true });
}
