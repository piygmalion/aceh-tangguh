/** @deprecated Homepage slideshow now uses `prrpka-summary` + `/api/prrpka/summary`. */
import { readFile } from "fs/promises";
import path from "path";
import type { R3PSlideshow, R3PSummaryResponse } from "@/lib/r3p-types";
import { asRecord, trySupabaseThenFixture } from "./supabase/fallback";
import type { TypedSupabaseClient } from "./supabase/server";

export type { R3PKabRow, R3PSlideshow, R3PSummaryResponse } from "@/lib/r3p-types";
export { sumRecord, metersToKm } from "@/lib/r3p-types";

let cache: R3PSummaryResponse | null = null;

function asSlideshow(payload: unknown): R3PSlideshow | null {
  const rec = asRecord(payload);
  if (!rec.metadata || !rec.totals || !Array.isArray(rec.per_kabupaten)) {
    return null;
  }
  if (rec.per_kabupaten.length === 0) return null;
  return rec as unknown as R3PSlideshow;
}

async function loadR3PFromSupabase(
  client: TypedSupabaseClient
): Promise<R3PSummaryResponse | null> {
  const { data, error } = await client
    .from("r3p_summary")
    .select("payload")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const slideshow = asSlideshow(data?.payload);
  if (!slideshow) return null;
  return { ...slideshow, source: "supabase" };
}

export async function loadR3PSummaryFixture(): Promise<R3PSummaryResponse> {
  if (cache) return cache;

  const file = path.join(process.cwd(), "data/staff/r3p-slideshow.json");
  const raw = await readFile(file, "utf8");
  const data = JSON.parse(raw) as R3PSlideshow;

  cache = { ...data, source: "fixture" };
  return cache;
}

/**
 * Staff-only legacy loader for `r3p_summary`. Pass the session-bound client
 * from the staff guard; `null` serves the `data/staff` fixture (logged).
 */
export async function loadR3PSummary(
  client: TypedSupabaseClient | null
): Promise<R3PSummaryResponse> {
  const loaded = await trySupabaseThenFixture(
    loadR3PFromSupabase,
    loadR3PSummaryFixture,
    { label: "r3p-summary", client }
  );
  return { ...loaded.data, source: loaded.source };
}
