import { readFile } from "fs/promises";
import path from "path";
import type { R3PSlideshow, R3PSummaryResponse } from "@/lib/r3p-types";

export type { R3PKabRow, R3PSlideshow, R3PSummaryResponse } from "@/lib/r3p-types";
export { sumRecord, metersToKm } from "@/lib/r3p-types";

let cache: R3PSummaryResponse | null = null;

export async function loadR3PSummary(): Promise<R3PSummaryResponse> {
  if (cache) return cache;

  const file = path.join(process.cwd(), "public/fixtures/r3p-slideshow.json");
  const raw = await readFile(file, "utf8");
  const data = JSON.parse(raw) as R3PSlideshow;

  cache = { ...data, source: "fixture" };
  return cache;
}
