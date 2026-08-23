import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import type { ReportRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  topic: z.enum([
    "banjir",
    "longsor",
    "hunian",
    "perlindungan",
    "logistik",
    "kesehatan",
    "lainnya",
  ]),
  description: z.string().min(10).max(2000),
  longitude: z.number().min(94).max(99),
  latitude: z.number().min(2).max(6),
  placeName: z.string().optional(),
  consentMapDisplay: z.boolean(),
});

function toApiItem(row: ReportRow) {
  return {
    id: row.id,
    topic: row.topic,
    description: row.description,
    longitude: row.longitude,
    latitude: row.latitude,
    placeName: row.place_name ?? undefined,
    consentMapDisplay: row.consent_map_display,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function GET() {
  const supabase = createServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      return NextResponse.json({ items: data.map(toApiItem), source: "supabase" });
    }
  }

  // Graceful empty fallback when Supabase env/query fails (no /tmp store).
  return NextResponse.json({ items: [], source: "fallback" });
}

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (!parsed.data.consentMapDisplay) {
    return NextResponse.json({ error: "Consent required" }, { status: 400 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 }
    );
  }

  const { data, error } = await supabase
    .from("reports")
    .insert({
      topic: parsed.data.topic,
      description: parsed.data.description,
      longitude: parsed.data.longitude,
      latitude: parsed.data.latitude,
      place_name: parsed.data.placeName ?? null,
      consent_map_display: parsed.data.consentMapDisplay,
      status: "queued",
    })
    .select("id, status")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Insert failed" },
      { status: 502 }
    );
  }

  return NextResponse.json(
    { id: data.id, status: data.status },
    { status: 201 }
  );
}
