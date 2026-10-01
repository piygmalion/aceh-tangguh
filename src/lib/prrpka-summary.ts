import { readFile } from "fs/promises";
import path from "path";
import {
  asPrrpkaAcehFixture,
  asPrrpkaRingkasan,
  buildPrrpkaSummary,
  type PrrpkaSummaryResponse,
} from "@/lib/prrpka-types";

export type {
  PrrpkaAcehFixture,
  PrrpkaKabRow,
  PrrpkaRingkasan,
  PrrpkaSummaryResponse,
} from "@/lib/prrpka-types";
export { PRRPKA_DOC_PATH, buildPrrpkaSummary } from "@/lib/prrpka-types";

/**
 * Homepage PRRPKA section is fixture-driven.
 * There is no `r3p_summary` / PRRPKA seed table in Supabase for this view.
 * Staff routes `/api/prrpka/summary` and `/api/r3p/summary` read
 * `data/staff/prrpka_aceh.json` + `data/staff/prrpka_ringkasan.json`.
 */
let cache: PrrpkaSummaryResponse | null = null;

async function readJson(rel: string): Promise<unknown> {
  const file = path.join(process.cwd(), rel);
  const raw = await readFile(file, "utf8");
  return JSON.parse(raw) as unknown;
}

export async function loadPrrpkaSummary(): Promise<PrrpkaSummaryResponse> {
  if (cache) return cache;

  const [acehRaw, ringkasanRaw] = await Promise.all([
    readJson("data/staff/prrpka_aceh.json"),
    readJson("data/staff/prrpka_ringkasan.json"),
  ]);

  const aceh = asPrrpkaAcehFixture(acehRaw);
  const ringkasan = asPrrpkaRingkasan(ringkasanRaw);
  if (!aceh || !ringkasan) {
    throw new Error("Invalid PRRPKA fixtures");
  }

  cache = buildPrrpkaSummary(aceh, ringkasan);
  return cache;
}
