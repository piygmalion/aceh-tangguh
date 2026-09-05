import { NextRequest, NextResponse } from "next/server";
import { isStaticExport } from "@/lib/preview/env";
import { guardPublicPost } from "@/lib/security/public-post";
import { loadGuideFaqCatalog } from "@/lib/panduan/faq-cms";
import { GUIDE_INTENTS } from "@/lib/panduan/intents";
import { composeGroundedAnswer } from "@/lib/panduan/llm";
import { isPanduanLlmEnabled, shouldUseGroundedLlm } from "@/lib/panduan/llm-gate";
import { extractJenis, extractKabupaten, extractYear, matchGuideIntent } from "@/lib/panduan/match";
import { hasRetrievableChunk, retrieveGuideChunks } from "@/lib/panduan/retrieve";
import type { GuideIntentId, GuideSlots } from "@/lib/panduan/types";
import {
  asUnknownLocale,
  sanitizeUnknownPath,
  sanitizeUnknownQuery,
} from "@/lib/panduan/unknown";

export const dynamic = "force-dynamic";

const ALLOWED_LAST = new Set<Exclude<GuideIntentId, "unknown">>(
  GUIDE_INTENTS.map((item) => item.id)
);

function sanitizeSlots(raw: Record<string, unknown> | null): GuideSlots {
  if (!raw) return {};
  const kabupaten =
    typeof raw.kabupaten === "string" ? extractKabupaten(raw.kabupaten) : undefined;
  const jenis = typeof raw.jenis === "string" ? extractJenis(raw.jenis) : undefined;
  const yearRaw =
    typeof raw.tahun === "number"
      ? raw.tahun
      : typeof raw.year === "number"
        ? raw.year
        : typeof raw.tahun === "string"
          ? Number(raw.tahun)
          : typeof raw.year === "string"
            ? Number(raw.year)
            : undefined;
  const year = yearRaw != null && Number.isFinite(yearRaw) ? extractYear(String(yearRaw)) : undefined;
  const last =
    typeof raw.lastIntent === "string" && ALLOWED_LAST.has(raw.lastIntent as Exclude<GuideIntentId, "unknown">)
      ? (raw.lastIntent as Exclude<GuideIntentId, "unknown">)
      : undefined;
  return { kabupaten, jenis, year, lastIntent: last };
}

export async function GET() {
  if (isStaticExport()) {
    return NextResponse.json({ enabled: false });
  }
  return NextResponse.json({ enabled: isPanduanLlmEnabled() });
}

export async function POST(req: NextRequest) {
  if (isStaticExport()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  if (!isPanduanLlmEnabled()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const guard = await guardPublicPost(req, "panduan-ask", 20);
  if (guard) return guard;

  const json = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const query = sanitizeUnknownQuery(typeof json?.query === "string" ? json.query : "");
  if (query.length < 2) {
    return NextResponse.json({ ok: false }, { status: 422 });
  }

  const pathname = sanitizeUnknownPath(typeof json?.pathname === "string" ? json.pathname : "/");
  if (pathname.startsWith("/admin")) {
    return NextResponse.json({ ok: false }, { status: 422 });
  }

  const locale = asUnknownLocale(typeof json?.locale === "string" ? json.locale : undefined);
  const slotsRaw =
    json?.slots && typeof json.slots === "object" && json.slots
      ? (json.slots as Record<string, unknown>)
      : json;
  const slots = sanitizeSlots(slotsRaw);

  const faq = await loadGuideFaqCatalog();
  const match = matchGuideIntent(query, locale, { ...slots, faq });
  if (!shouldUseGroundedLlm(match)) {
    return NextResponse.json({ ok: false }, { status: 422 });
  }

  const chunks = await retrieveGuideChunks(match, locale);
  if (!hasRetrievableChunk(chunks)) {
    return NextResponse.json({ ok: false }, { status: 422 });
  }

  const answer = await composeGroundedAnswer(match, chunks, locale);
  if (!answer) {
    return NextResponse.json({ ok: false }, { status: 422 });
  }

  return NextResponse.json({ ok: true, answer });
}
