import type { Json } from "@/lib/supabase/types";

const MEDIA_PATH_RE = /^(kejadian|penanganan)\/(foto|video)\/[A-Za-z0-9._-]+$/;

/** Collect storage object paths embedded in jawaban_json (foto/video uploads). */
export function collectReferencedMediaPaths(value: unknown, out = new Set<string>()): Set<string> {
  if (typeof value === "string") {
    if (MEDIA_PATH_RE.test(value)) out.add(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectReferencedMediaPaths(item, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectReferencedMediaPaths(item, out);
    }
  }
  return out;
}

export function collectReferencedMediaPathsFromRows(
  rows: Array<{ jawaban_json?: Json | null }>
): Set<string> {
  const out = new Set<string>();
  for (const row of rows) {
    collectReferencedMediaPaths(row.jawaban_json ?? null, out);
  }
  return out;
}

export type StorageListItem = {
  name: string;
  created_at?: string | null;
  id?: string | null;
};

export type OrphanCandidate = {
  path: string;
  createdAt: string;
};

/**
 * List objects under tipe/field prefixes that are older than maxAgeMs and
 * not referenced by any laporan jawaban_json.
 */
export function findOrphanMediaPaths(
  listed: Array<{ prefix: string; items: StorageListItem[] }>,
  referenced: Set<string>,
  nowMs: number,
  maxAgeMs: number
): OrphanCandidate[] {
  const orphans: OrphanCandidate[] = [];
  for (const { prefix, items } of listed) {
    for (const item of items) {
      if (!item.name || item.name.endsWith("/")) continue;
      const path = `${prefix}/${item.name}`;
      if (referenced.has(path)) continue;
      const createdAt = item.created_at;
      if (!createdAt) continue;
      const age = nowMs - Date.parse(createdAt);
      if (!Number.isFinite(age) || age < maxAgeMs) continue;
      orphans.push({ path, createdAt });
    }
  }
  return orphans;
}

export const MEDIA_GC_PREFIXES = [
  "kejadian/foto",
  "kejadian/video",
  "penanganan/foto",
  "penanganan/video",
] as const;

/** Default: keep unreferenced uploads for 48h (form abandon window). */
export const MEDIA_GC_MAX_AGE_MS = 48 * 60 * 60 * 1000;

export const MEDIA_GC_DELETE_BATCH = 50;
