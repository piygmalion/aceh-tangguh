/**
 * Canonical marker / kejadian `properties.status` vocabulary.
 *
 * Per-domain sets (not one mega-enum). Clear aliases fold at read;
 * semantically different values stay distinct.
 *
 * Scope: map popup display + optional fixture alias rewrite. There is no
 * marker-status filter enum in the map UI — the map only shows status.
 *
 * Leave these other status enums alone (different domains):
 * - Admin reports: all | queued | published | rejected
 * - Penanganan form: terpenuhi | parsial | belum_terpenuhi
 * - Desa impact badge: terdampak | tidak_terdampak | tidak_diketahui
 *
 * Health `operasional` / `tidak_operasional` is a binary scale and is NOT
 * merged with the 5-level ops family (`operasional_penuh`, …). Verified:
 * map/UI never treated those as the same.
 */

import type { MarkerLayerKey } from "@/lib/types";

export type StatusDomain =
  | "education"
  | "ops"
  | "health"
  | "disaster"
  | "infra"
  | "reports"
  | "generic";

export type StatusTone = "ok" | "warn" | "danger" | "neutral" | "info";

export type NormalizedStatus = {
  /** Canonical key, or the trimmed raw value when unknown. */
  key: string;
  /** i18n key under `statusVocab.*`. */
  slug: string;
  domain: StatusDomain;
  /** Default Indonesian / BPBA-ish label. */
  labelId: string;
  unknown: boolean;
  empty: boolean;
  raw: string | null;
};

type VocabEntry = {
  key: string;
  slug: string;
  labelId: string;
  tone: StatusTone;
  /** Extra folded aliases (fold(key) and fold(labelId) are added automatically). */
  aliases?: string[];
};

const LAYER_DOMAIN: Record<string, StatusDomain> = {
  facEducation: "education",
  facGov: "ops",
  facReligious: "ops",
  policeOffices: "ops",
  facHealth: "health",
  disasterEvents: "disaster",
  infraRoadBridge: "infra",
  citizenReports: "reports",
};

const EDUCATION: VocabEntry[] = [
  { key: "Terlaksana", slug: "terlaksana", labelId: "Terlaksana", tone: "ok", aliases: ["telaksana", "terlaksanakan"] },
  { key: "Belajar Darurat", slug: "belajar_darurat", labelId: "Belajar Darurat", tone: "warn" },
  { key: "Berjalan Normal", slug: "berjalan_normal", labelId: "Berjalan Normal", tone: "ok" },
  { key: "Libur", slug: "libur", labelId: "Libur", tone: "warn" },
  { key: "Aktif", slug: "aktif", labelId: "Aktif", tone: "ok" },
  { key: "Terganggu", slug: "terganggu", labelId: "Terganggu", tone: "warn" },
  { key: "Diliburkan Sementara", slug: "diliburkan_sementara", labelId: "Diliburkan Sementara", tone: "warn" },
  { key: "Dialihkan ke Lokasi Lain", slug: "dialihkan_ke_lokasi_lain", labelId: "Dialihkan ke Lokasi Lain", tone: "info" },
  { key: "Lancar", slug: "lancar", labelId: "Lancar", tone: "ok" },
  { key: "Berjalan", slug: "berjalan", labelId: "Berjalan", tone: "warn" },
  { key: "PJJ", slug: "pjj", labelId: "PJJ", tone: "warn", aliases: ["pembelajaran jarak jauh"] },
  { key: "Baik", slug: "baik", labelId: "Baik", tone: "ok" },
  { key: "Lainnya", slug: "lainnya", labelId: "Lainnya", tone: "neutral" },
];

/** 5-level facility ops — labels match existing fixture `status_label`. */
const OPS: VocabEntry[] = [
  { key: "operasional_penuh", slug: "operasional_penuh", labelId: "Beroperasi penuh", tone: "ok", aliases: ["beroperasi penuh"] },
  { key: "operasional_terbatas", slug: "operasional_terbatas", labelId: "Beroperasi terbatas", tone: "warn", aliases: ["beroperasi terbatas"] },
  { key: "tidak_beroperasi", slug: "tidak_beroperasi", labelId: "Tidak beroperasi", tone: "danger" },
  { key: "lumpuh_hancur", slug: "lumpuh_hancur", labelId: "Lumpuh, hancur", tone: "danger", aliases: ["lumpuh hancur"] },
  { key: "tidak_diketahui", slug: "tidak_diketahui", labelId: "Tidak ada informasi", tone: "neutral", aliases: ["tidak ada informasi"] },
];

/** Health stays binary — do not fold onto operasional_penuh. */
const HEALTH: VocabEntry[] = [
  { key: "operasional", slug: "operasional", labelId: "Operasional", tone: "ok" },
  { key: "tidak_operasional", slug: "tidak_operasional", labelId: "Tidak operasional", tone: "danger" },
  { key: "Lainnya", slug: "lainnya", labelId: "Lainnya", tone: "neutral" },
];

const DISASTER: VocabEntry[] = [
  { key: "Dalam Penanganan", slug: "dalam_penanganan", labelId: "Dalam Penanganan", tone: "warn" },
  { key: "Dalam Penanganan / Rehabilitasi", slug: "dalam_penanganan_rehabilitasi", labelId: "Dalam Penanganan / Rehabilitasi", tone: "warn" },
  { key: "Selesai", slug: "selesai", labelId: "Selesai", tone: "ok" },
  { key: "Lainnya", slug: "lainnya", labelId: "Lainnya", tone: "neutral" },
];

const INFRA: VocabEntry[] = [
  { key: "aman", slug: "aman", labelId: "Aman", tone: "ok" },
  { key: "rusak ringan", slug: "rusak_ringan", labelId: "Rusak ringan", tone: "warn" },
  { key: "tergenang", slug: "tergenang", labelId: "Tergenang", tone: "warn" },
  { key: "longsor", slug: "longsor", labelId: "Longsor", tone: "danger" },
  { key: "terputus", slug: "terputus", labelId: "Terputus", tone: "danger" },
  { key: "Lainnya", slug: "lainnya", labelId: "Lainnya", tone: "neutral" },
];

const REPORTS: VocabEntry[] = [
  { key: "queued", slug: "queued", labelId: "Antrean", tone: "warn" },
  { key: "published", slug: "published", labelId: "Terbit", tone: "ok" },
  { key: "rejected", slug: "rejected", labelId: "Ditolak", tone: "danger" },
  /** Live laporan overlay on the map (not in the fixture inventory). */
  { key: "approved", slug: "approved", labelId: "Disetujui", tone: "ok" },
  { key: "Lainnya", slug: "lainnya", labelId: "Lainnya", tone: "neutral" },
];

const GENERIC: VocabEntry[] = [
  { key: "Lainnya", slug: "lainnya", labelId: "Lainnya", tone: "neutral" },
];

const BY_DOMAIN: Record<StatusDomain, VocabEntry[]> = {
  education: EDUCATION,
  ops: OPS,
  health: HEALTH,
  disaster: DISASTER,
  infra: INFRA,
  reports: REPORTS,
  generic: GENERIC,
};

export function foldStatus(raw: string): string {
  return raw
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/[_/|,;:]+/g, " ")
    .replace(/-+/g, " ")
    .replace(/\s+/g, " ");
}

type Lookup = Map<string, VocabEntry>;

function buildLookup(entries: VocabEntry[]): Lookup {
  const map: Lookup = new Map();
  const add = (folded: string, entry: VocabEntry) => {
    if (!folded) return;
    if (!map.has(folded)) map.set(folded, entry);
  };
  for (const entry of entries) {
    add(foldStatus(entry.key), entry);
    add(foldStatus(entry.labelId), entry);
    add(foldStatus(entry.slug.replace(/_/g, " ")), entry);
    for (const alias of entry.aliases ?? []) {
      add(foldStatus(alias), entry);
    }
  }
  return map;
}

const LOOKUP: Record<StatusDomain, Lookup> = {
  education: buildLookup(EDUCATION),
  ops: buildLookup(OPS),
  health: buildLookup(HEALTH),
  disaster: buildLookup(DISASTER),
  infra: buildLookup(INFRA),
  reports: buildLookup(REPORTS),
  generic: buildLookup(GENERIC),
};

const EMPTY_KEY: Record<StatusDomain, string> = {
  education: "Lainnya",
  ops: "tidak_diketahui",
  health: "Lainnya",
  disaster: "Lainnya",
  infra: "Lainnya",
  reports: "Lainnya",
  generic: "Lainnya",
};

export function domainForLayer(layer?: string | null): StatusDomain {
  if (!layer) return "generic";
  return LAYER_DOMAIN[layer] ?? "generic";
}

function entryByKey(domain: StatusDomain, key: string): VocabEntry | undefined {
  return BY_DOMAIN[domain].find((e) => e.key === key);
}

function passthrough(raw: string, domain: StatusDomain): NormalizedStatus {
  return {
    key: raw,
    slug: "lainnya",
    domain,
    labelId: raw,
    unknown: true,
    empty: false,
    raw,
  };
}

function fromEntry(
  entry: VocabEntry,
  domain: StatusDomain,
  raw: string | null,
  empty: boolean
): NormalizedStatus {
  return {
    key: entry.key,
    slug: entry.slug,
    domain,
    labelId: entry.labelId,
    unknown: false,
    empty,
    raw,
  };
}

function lookupDomain(folded: string, domain: StatusDomain): VocabEntry | undefined {
  return LOOKUP[domain].get(folded);
}

function lookupAnyDomain(folded: string): { domain: StatusDomain; entry: VocabEntry } | null {
  const hits: { domain: StatusDomain; entry: VocabEntry }[] = [];
  for (const domain of Object.keys(LOOKUP) as StatusDomain[]) {
    if (domain === "generic") continue;
    const entry = LOOKUP[domain].get(folded);
    if (entry && entry.slug !== "lainnya") {
      hits.push({ domain, entry });
    }
  }
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) {
    const uniqueKeys = new Set(hits.map((h) => `${h.domain}:${h.entry.key}`));
    if (uniqueKeys.size === 1) return hits[0];
  }
  return null;
}

export function normalizeStatus(
  raw: unknown,
  layer?: string | MarkerLayerKey | null
): NormalizedStatus {
  const domain = domainForLayer(layer == null ? null : String(layer));
  if (raw == null) {
    const key = EMPTY_KEY[domain];
    return fromEntry(entryByKey(domain, key) ?? GENERIC[0], domain, null, true);
  }
  if (typeof raw !== "string" && typeof raw !== "number" && typeof raw !== "boolean") {
    const key = EMPTY_KEY[domain];
    return fromEntry(entryByKey(domain, key) ?? GENERIC[0], domain, null, true);
  }
  const text = String(raw).trim();
  if (!text) {
    const key = EMPTY_KEY[domain];
    return fromEntry(entryByKey(domain, key) ?? GENERIC[0], domain, "", true);
  }

  const folded = foldStatus(text);
  const scoped = lookupDomain(folded, domain);
  if (scoped) return fromEntry(scoped, domain, text, false);

  if (domain === "generic") {
    const any = lookupAnyDomain(folded);
    if (any) return fromEntry(any.entry, any.domain, text, false);
  }

  return passthrough(text, domain);
}

export function formatStatusLabel(
  n: NormalizedStatus,
  translate?: (slug: string) => string
): string {
  if (n.unknown && !n.empty) return n.raw ?? n.labelId;
  if (translate) {
    const translated = translate(n.slug);
    if (translated && translated !== n.slug) return translated;
  }
  return n.labelId;
}

export function statusTone(n: NormalizedStatus): StatusTone {
  if (n.unknown) return "neutral";
  const entry = entryByKey(n.domain, n.key);
  return entry?.tone ?? "neutral";
}

export function canonicalKeysForDomain(domain: StatusDomain): string[] {
  return BY_DOMAIN[domain].map((e) => e.key);
}

export function canonicalKeysForLayer(layer?: string | null): string[] {
  return canonicalKeysForDomain(domainForLayer(layer));
}

/** Filter-list keys in canonical order, intersected with values present in data. */
export function orderedPresentKeys(
  domain: StatusDomain,
  present: Iterable<string>
): string[] {
  const set = new Set(present);
  const ordered = BY_DOMAIN[domain]
    .map((e) => e.key)
    .filter((key) => set.has(key));
  Array.from(set).forEach((key) => {
    if (!ordered.includes(key)) ordered.push(key);
  });
  return ordered;
}

/**
 * Clear alias rewrite target (case / typo only).
 * Returns null for identity, empty, or unknown — never fills blanks.
 */
export function clearAliasRewrite(
  raw: unknown,
  layer?: string | null
): string | null {
  const n = normalizeStatus(raw, layer);
  if (n.empty || n.unknown) return null;
  if (n.raw == null || n.raw === n.key) return null;
  return n.key;
}

export function applyStatusVocabToProperties(
  properties: Record<string, unknown>
): Record<string, unknown> {
  const layer = properties.layer == null ? null : String(properties.layer);
  const n = normalizeStatus(properties.status, layer);
  const next = { ...properties };
  if (n.raw !== n.key && next.status_raw == null) {
    next.status_raw = n.raw;
  }
  next.status = n.key;
  return next;
}
