import { ACEH_PERAIRAN_CODES } from "@/lib/overlay-layers";
import {
  emptyMaritimCard,
  MARITIM_MAP_HREF,
  PDGT_NASIONAL_URL,
  unavailableMaritimCard,
  type MaritimCard,
  type MaritimHighlight,
  type PeringatanSource,
  type PeringatanTone,
} from "@/lib/peringatan-dini-types";

export {
  emptyMaritimCard,
  MARITIM_MAP_HREF,
  MARITIME_WARNING_STATUS_ID,
  PDGT_NASIONAL_URL,
  unavailableMaritimCard,
} from "@/lib/peringatan-dini-types";

export type PdgtSection = "aceh" | "indonesia" | "other";

export type ParsedPdgtWater = {
  nama: string;
  wave_cat: string;
  wave_min_m: number | null;
  wave_max_m: number | null;
  section: PdgtSection;
  kode: string | null;
};

export type ParsedPdgt = {
  valid_from: string | null;
  valid_to: string | null;
  issued: string | null;
  no_surat: string | null;
  sinoptik: string | null;
  waters: ParsedPdgtWater[];
};

const MONTHS: Record<string, number> = {
  januari: 1,
  februari: 2,
  maret: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  agustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  desember: 12,
};

const WAVE_RANK: Record<string, number> = {
  tenang: 0,
  rendah: 1,
  sedang: 2,
  tinggi: 3,
  "sangat tinggi": 4,
  ekstrem: 5,
  "sangat ekstrem": 5,
};

const NAME_ALIASES: Record<(typeof ACEH_PERAIRAN_CODES)[number], string[]> = {
  "P.A.01": ["tamiang langsa", "aceh tamiang langsa"],
  "P.A.02": ["aceh utara aceh timur"],
  "P.A.03": ["utara pidie jaya aceh besar", "pidie jaya aceh besar"],
  "P.A.04": ["sabang banda aceh"],
  "P.A.05": ["aceh besar meulaboh"],
  "P.A.06": ["aceh barat daya simeulue", "abd simeulue"],
  "P.A.07": ["aceh singkil pulo banyak", "singkil pulo banyak"],
  "P.A.08": ["selatan simeulue"],
  "M.01": ["selat malaka bagian utara", "selat malaka utara"],
  "M.03": ["samudra hindia barat aceh", "hindia barat aceh"],
};

const CAT_RE =
  /\*{0,2}(sangat\s+ekstrem|sangat\s+tinggi|ekstrem|tinggi|sedang)\*{0,2}(?:\s*\(([^)]+)\))?/i;
const WIB_DATE_RE =
  /(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})(?:\s+(?:pukul\s+)?(\d{1,2})[.:](\d{2}))?/gi;

export function normalizePerairanName(name: string): string {
  return name
    .toLowerCase()
    .replace(/samudera/g, "samudra")
    .replace(/\bperairan\b/g, " ")
    .replace(/[–—−‐-]+/g, " ")
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchAcehPerairan(name: string): string | null {
  const normalized = normalizePerairanName(name);
  if (!normalized) return null;
  if (/\bmalaka\b/.test(normalized) && !/\butara\b/.test(normalized)) return null;
  for (const kode of ACEH_PERAIRAN_CODES) {
    for (const alias of NAME_ALIASES[kode]) {
      if (normalized === alias || normalized.includes(alias)) return kode;
    }
  }
  return null;
}

export function waveCatRank(cat: string): number {
  const key = canonWaveCat(cat).toLowerCase();
  return WAVE_RANK[key] ?? -1;
}

export function canonWaveCat(raw: string): string {
  const n = raw.toLowerCase().replace(/\s+/g, " ").trim();
  if (n.includes("sangat ekstrem")) return "Sangat ekstrem";
  if (n.includes("ekstrem")) return "Ekstrem";
  if (n.includes("sangat tinggi")) return "Sangat tinggi";
  if (n.includes("tinggi")) return "Tinggi";
  if (n.includes("sedang")) return "Sedang";
  if (n.includes("rendah")) return "Rendah";
  if (n.includes("tenang")) return "Tenang";
  return raw.trim();
}

export function toneFromWaveCat(cat: string): PeringatanTone {
  const rank = waveCatRank(cat);
  if (rank >= 3) return "siaga";
  if (rank === 2) return "warn";
  return "neutral";
}

export function worstWaveCat(cats: string[]): string | null {
  let best: string | null = null;
  let bestRank = -1;
  for (const cat of cats) {
    const canon = canonWaveCat(cat);
    const rank = waveCatRank(canon);
    if (rank > bestRank) {
      bestRank = rank;
      best = canon;
    }
  }
  return best;
}

function parseMeter(raw: string): number | null {
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseRange(blob: string | undefined): { min: number | null; max: number | null } {
  if (!blob) return { min: null, max: null };
  const match = blob.match(/(\d+(?:[.,]\d+)?)\s*[-–—]\s*(\d+(?:[.,]\d+)?)/);
  if (!match) return { min: null, max: null };
  return { min: parseMeter(match[1] ?? ""), max: parseMeter(match[2] ?? "") };
}

function wibToIso(
  day: string,
  monthName: string,
  year: string,
  hour = "7",
  minute = "0",
): string | null {
  const month = MONTHS[monthName.toLowerCase()];
  if (!month) return null;
  const hh = String(Number(hour)).padStart(2, "0");
  const mi = String(Number(minute)).padStart(2, "0");
  return `${year}-${String(month).padStart(2, "0")}-${String(Number(day)).padStart(2, "0")}T${hh}:${mi}:00+07:00`;
}

function extractWibDates(text: string): string[] {
  const out: string[] = [];
  const re = new RegExp(WIB_DATE_RE.source, WIB_DATE_RE.flags);
  let match: RegExpExecArray | null = re.exec(text);
  while (match) {
    const iso = wibToIso(match[1] ?? "", match[2] ?? "", match[3] ?? "", match[4] ?? "7", match[5] ?? "0");
    if (iso) out.push(iso);
    match = re.exec(text);
  }
  return out;
}

function htmlToMarkdownish(text: string): string {
  if (!/<[a-z][\s\S]*>/i.test(text)) return text;
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<h[12][^>]*>/gi, "\n## ")
    .replace(/<h[3-6][^>]*>/gi, "\n### ")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<p[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&amp;/gi, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

function classifyHeading(title: string): "sinoptik" | PdgtSection | "header" {
  const n = title.toLowerCase().replace(/[:.]/g, "").trim();
  if (/sinoptik/.test(n)) return "sinoptik";
  if (/^aceh$/.test(n) || n === "provinsi aceh") return "aceh";
  if (/indonesia|nasional/.test(n)) return "indonesia";
  if (/peringatan|berlaku|gelombang/.test(n)) return "header";
  return "other";
}

export function parsePdgtBulletin(text: string): ParsedPdgt {
  const body = htmlToMarkdownish(text);
  const dates = extractWibDates(body);
  const valid_from = dates[0] ?? null;
  const valid_to = dates[1] ?? null;
  const surat =
    body.match(/No\.?\s*((?:SHGB\.?\s*)?B\/[^\n<]+)/i)?.[1]?.trim() ??
    body.match(/No\.?\s*(SHGB\.[^\n<]+)/i)?.[1]?.trim() ??
    null;

  const waters: ParsedPdgtWater[] = [];
  const sinoptikParts: string[] = [];
  let mode: "header" | "sinoptik" | PdgtSection = "header";
  let currentCat: { cat: string; min: number | null; max: number | null } | null = null;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const heading = line.match(/^#{1,3}\s+(.+)/);
    if (heading) {
      const kind = classifyHeading(heading[1] ?? "");
      if (kind === "sinoptik") {
        mode = "sinoptik";
        currentCat = null;
        continue;
      }
      if (kind === "aceh" || kind === "indonesia" || kind === "other") {
        mode = kind;
        currentCat = null;
        continue;
      }
      continue;
    }

    if (mode === "sinoptik") {
      if (!/^berlaku:/i.test(line) && !/^no\./i.test(line)) sinoptikParts.push(line);
      continue;
    }

    if (/^kondisi\s+sinoptik/i.test(line)) {
      mode = "sinoptik";
      const rest = line.replace(/^kondisi\s+sinoptik\s*:?\s*/i, "").trim();
      if (rest) sinoptikParts.push(rest);
      continue;
    }

    const catMatch = line.match(CAT_RE);
    if (catMatch && (mode === "aceh" || mode === "indonesia" || mode === "other")) {
      const range = parseRange(catMatch[2]);
      currentCat = {
        cat: canonWaveCat(catMatch[1] ?? ""),
        min: range.min,
        max: range.max,
      };
      continue;
    }

    const item = line.match(/^[-*]\s+(.+)/);
    if (item && currentCat && (mode === "aceh" || mode === "indonesia" || mode === "other")) {
      const nama = item[1]?.trim() ?? "";
      if (!nama || /tidak ada/i.test(nama)) continue;
      waters.push({
        nama,
        wave_cat: currentCat.cat,
        wave_min_m: currentCat.min,
        wave_max_m: currentCat.max,
        section: mode,
        kode: matchAcehPerairan(nama),
      });
    }
  }

  return {
    valid_from,
    valid_to,
    issued: valid_from,
    no_surat: surat,
    sinoptik: sinoptikParts.join(" ").trim() || null,
    waters,
  };
}

export function filterAcehBulletinWaters(parsed: ParsedPdgt): ParsedPdgtWater[] {
  const seen = new Set<string>();
  const out: ParsedPdgtWater[] = [];
  for (const water of parsed.waters) {
    const kode = water.kode ?? matchAcehPerairan(water.nama);
    if (!kode) continue;
    if (water.section === "indonesia" && kode !== "M.01" && kode !== "M.03") continue;
    if (water.section === "other") continue;
    if (!(ACEH_PERAIRAN_CODES as readonly string[]).includes(kode)) continue;
    if (seen.has(kode)) {
      const existing = out.find((row) => row.kode === kode);
      if (existing && waveCatRank(water.wave_cat) > waveCatRank(existing.wave_cat)) {
        existing.wave_cat = water.wave_cat;
        existing.wave_min_m = water.wave_min_m;
        existing.wave_max_m = water.wave_max_m;
      }
      continue;
    }
    seen.add(kode);
    out.push({ ...water, kode });
  }
  return out;
}

export function buildMaritimCardFromWaters(
  waters: ParsedPdgtWater[],
  meta: {
    fetchedAt: string;
    source: PeringatanSource;
    valid_from?: string | null;
    valid_to?: string | null;
    issued?: string | null;
    no_surat?: string | null;
  },
): MaritimCard {
  if (meta.source === "unavailable") return unavailableMaritimCard(meta.fetchedAt);
  if (waters.length === 0) {
    return {
      ...emptyMaritimCard(meta.fetchedAt),
      valid_from: meta.valid_from ?? null,
      valid_to: meta.valid_to ?? null,
      issued: meta.issued ?? null,
      no_surat: meta.no_surat ?? null,
    };
  }

  const ranked = [...waters].sort((a, b) => waveCatRank(b.wave_cat) - waveCatRank(a.wave_cat));
  const worst = worstWaveCat(ranked.map((row) => row.wave_cat));
  const highlights: MaritimHighlight[] = ranked.map((row) => ({
    kode: row.kode,
    nama: row.nama,
    wave_cat: row.wave_cat,
    wave_min_m: row.wave_min_m,
    wave_max_m: row.wave_max_m,
  }));
  const shown = highlights.slice(0, 4);
  return {
    kind: "maritim",
    tone: worst ? toneFromWaveCat(worst) : "neutral",
    empty: false,
    highlights: shown,
    extra_count: Math.max(0, highlights.length - shown.length),
    valid_from: meta.valid_from ?? null,
    valid_to: meta.valid_to ?? null,
    issued: meta.issued ?? null,
    no_surat: meta.no_surat ?? null,
    fetched_at: meta.fetchedAt,
    href: PDGT_NASIONAL_URL,
    map_href: MARITIM_MAP_HREF,
    stale: false,
    source: meta.source,
  };
}
