import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json(
      { items: [], source: "fallback", error: "Supabase not configured" },
      { status: 200 }
    );
  }

  const { data, error } = await supabase
    .from("map_layers")
    .select("*")
    .eq("enabled", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json(
      { items: [], source: "fallback", error: error.message },
      { status: 200 }
    );
  }

  return NextResponse.json({ items: data ?? [], source: "supabase" });
}
