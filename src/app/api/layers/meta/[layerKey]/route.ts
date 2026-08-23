import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: { layerKey: string } }
) {
  const layerKey = context.params.layerKey?.trim();
  if (!layerKey) {
    return NextResponse.json({ error: "Missing layerKey" }, { status: 400 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json(
      { items: [], layerKey, source: "fallback", error: "Supabase not configured" },
      { status: 200 }
    );
  }

  const { data, error } = await supabase
    .from("area_feature_meta")
    .select("*")
    .eq("layer_key", layerKey)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json(
      { items: [], layerKey, source: "fallback", error: error.message },
      { status: 200 }
    );
  }

  return NextResponse.json({
    items: data ?? [],
    layerKey,
    source: "supabase",
  });
}
