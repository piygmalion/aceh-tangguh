import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  enabledMapLayersCatalog,
  mergeMapLayersCatalog,
} from "@/lib/map-layers-catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({
      items: enabledMapLayersCatalog(),
      source: "catalog",
    });
  }

  const { data, error } = await supabase
    .from("map_layers")
    .select("*")
    .eq("enabled", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({
      items: enabledMapLayersCatalog(),
      source: "catalog",
      error: error.message,
    });
  }

  return NextResponse.json({
    items: mergeMapLayersCatalog(data ?? []),
    source: data && data.length > 0 ? "supabase+catalog" : "catalog",
  });
}
