import type { HazardKind, HazardStatus } from "@/lib/types";

/**
 * Canonical jenis_bencana → hazard_status kind map (code only).
 * Do not UPDATE/rewrite kejadian_bencana.jenis_bencana.
 *
 * - Tanah Longsor → longsor
 * - Kebakaran Pemukiman → kebakaran
 * - Kebakaran Hutan dan Lahan → karhutla (distinct from pemukiman fire)
 * - Banjir Bandang stays a banjir subtype (existing alias already treats it that way)
 */
export const JENIS_BENCANA_TO_HAZARD_KIND: Readonly<Record<string, HazardKind>> = {
  Banjir: "banjir",
  "Banjir Bandang": "banjir",
  "Banjir Bandang dan Tanah Longsor": "banjir",
  Longsor: "longsor",
  "Tanah Longsor": "longsor",
  "Gempa Bumi": "gempa",
  Kebakaran: "kebakaran",
  "Kebakaran Pemukiman": "kebakaran",
  "Kebakaran Hutan dan Lahan": "karhutla",
  "Angin Puting Beliung": "puting_beliung",
  Abrasi: "lainnya",
  Lainnya: "lainnya",
  Kekeringan: "lainnya",
};

/**
 * Existing disasterEvents counts for kinds the seed table does not store.
 * Source: markers.geojson jenis_bencana tallies (Data Specialist).
 * Do not invent event rows or substitute other numbers.
 */
export const EXISTING_HAZARD_KIND_COUNTS = {
  karhutla: { kind: "karhutla", label: "Karhutla", count: 85, severity: "med" },
  puting_beliung: {
    kind: "puting_beliung",
    label: "Puting Beliung",
    count: 44,
    severity: "med",
  },
} as const satisfies Record<string, HazardStatus>;

export function mapJenisBencanaToHazardKind(
  jenis: string | undefined | null
): HazardKind | undefined {
  if (!jenis) return undefined;
  const exact = JENIS_BENCANA_TO_HAZARD_KIND[jenis];
  if (exact) return exact;
  const folded = jenis.trim();
  return JENIS_BENCANA_TO_HAZARD_KIND[folded];
}

export function countHazardKinds(
  jenisList: readonly string[]
): Map<HazardKind, number> {
  const counts = new Map<HazardKind, number>();
  for (const jenis of jenisList) {
    const kind = mapJenisBencanaToHazardKind(jenis);
    if (!kind) continue;
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  return counts;
}

const EXTRA_KINDS = ["karhutla", "puting_beliung"] as const;

/**
 * Ensure karhutla / puting_beliung buckets exist, using counts from the
 * provided existing jenis list when present, otherwise the documented
 * existing tallies. Never invents kejadian rows.
 */
export function ensureExistingHazardKindBuckets(
  rows: readonly HazardStatus[],
  existingJenis?: readonly string[]
): HazardStatus[] {
  const out = rows.map((row) => ({ ...row }));
  const have = new Set(out.map((row) => row.kind));
  const counted = existingJenis ? countHazardKinds(existingJenis) : null;

  for (const kind of EXTRA_KINDS) {
    if (have.has(kind)) continue;
    const fallback = EXISTING_HAZARD_KIND_COUNTS[kind];
    const fromExisting = counted?.get(kind);
    out.push({
      kind,
      label: fallback.label,
      count: fromExisting ?? fallback.count,
      severity: fallback.severity,
    });
  }
  return out;
}
