import { ACEH_KABUPATEN } from "@/lib/sik/juklak";
import { JENIS_BENCANA_JUKLAK } from "@/lib/sik/jenis-bencana";
import { intentForFaq, matchGuideFaq, type GuideFaqEntry } from "./faq";
import { GUIDE_INTENTS } from "./intents";
import { includesPattern, normalizeGuideQuery } from "./match-text";
import type { GuideIntentId, GuideLocale, GuideMatch, GuideSlots } from "./types";

export { normalizeGuideQuery } from "./match-text";

const OUT_OF_ACEH = [
  "jakarta",
  "jawa barat",
  "jawa timur",
  "jawa tengah",
  "bandung",
  "surabaya",
  "medan",
  "sumatera utara",
  "sumatera barat",
  "padang",
  "palembang",
  "makassar",
  "bali",
  "lombok",
];

const EMERGENCY = [
  "saya terluka",
  "orang terluka",
  "butuh ambulans",
  "panggil ambulans",
  "evakuasi sekarang",
  "tolong evakuasi",
  "i am injured",
  "need ambulance",
  "evacuate now",
];

const FOLLOW_UP = [
  "yang di",
  "yang itu",
  "di situ",
  "di sana",
  "tahun itu",
  "tahun tersebut",
  "yang sama",
  "kalau di",
  "bagaimana dengan",
  "how about",
  "what about",
  "and in",
  "for that year",
];

const JENIS_ALIASES: { pattern: string; jenis: string }[] = [
  { pattern: "banjir bandang", jenis: "Banjir" },
  { pattern: "banjir", jenis: "Banjir" },
  { pattern: "tanah longsor", jenis: "Tanah longsor" },
  { pattern: "longsor", jenis: "Tanah longsor" },
  { pattern: "abrasi", jenis: "Gelombang pasang dan abrasi" },
  { pattern: "gelombang pasang", jenis: "Gelombang pasang dan abrasi" },
  { pattern: "puting beliung", jenis: "Cuaca ekstrem" },
  { pattern: "angin kencang", jenis: "Cuaca ekstrem" },
  { pattern: "cuaca ekstrem", jenis: "Cuaca ekstrem" },
  { pattern: "kekeringan", jenis: "Kekeringan" },
  { pattern: "karhutla", jenis: "Kebakaran hutan dan lahan" },
  { pattern: "kebakaran hutan", jenis: "Kebakaran hutan dan lahan" },
  { pattern: "kebakaran lahan", jenis: "Kebakaran hutan dan lahan" },
  { pattern: "gempa bumi", jenis: "Gempa bumi" },
  { pattern: "gempabumi", jenis: "Gempa bumi" },
  { pattern: "gempa", jenis: "Gempa bumi" },
  { pattern: "tsunami", jenis: "Tsunami" },
  { pattern: "gunung api", jenis: "Erupsi gunung api" },
  { pattern: "erupsi", jenis: "Erupsi gunung api" },
  { pattern: "wabah", jenis: "Epidemi dan wabah penyakit" },
  { pattern: "epidemi", jenis: "Epidemi dan wabah penyakit" },
];

const KAB_SORTED = [...ACEH_KABUPATEN].sort((a, b) => b.nama.length - a.nama.length);

const SLOT_STOP = /\b(?:yang|di|pada|untuk|kalau|tahun|the|in|for|about|how|dengan|dari)\b/g;

export type GuideMatchOptions = GuideSlots & {
  faq?: GuideFaqEntry[];
};

export function extractKabupaten(text: string): string | undefined {
  const normalized = normalizeGuideQuery(text);
  for (const kab of KAB_SORTED) {
    if (includesPattern(normalized, kab.nama)) return kab.nama;
  }
  return undefined;
}

export function extractJenis(text: string): string | undefined {
  const normalized = normalizeGuideQuery(text);
  for (const alias of JENIS_ALIASES) {
    if (includesPattern(normalized, alias.pattern)) return alias.jenis;
  }
  for (const entry of JENIS_BENCANA_JUKLAK) {
    if (includesPattern(normalized, entry.jenis) || includesPattern(normalized, entry.labelPeta)) {
      return entry.jenis;
    }
  }
  return undefined;
}

export function extractYear(text: string): number | undefined {
  const match = text.match(/\b(20\d{2})\b/);
  if (!match) return undefined;
  const year = Number(match[1]);
  return year >= 2000 && year <= 2100 ? year : undefined;
}

export function extractDesa(text: string): string | undefined {
  const normalized = normalizeGuideQuery(text);
  const found = normalized.match(/\b(?:desa|gampong|gp)\s+([a-z0-9.'\-\s]{2,40})/);
  if (!found) return undefined;
  let name = found[1].trim();
  name = name.split(/\b(?:di|kabupaten|kota|kecamatan|tahun|yang|dan|untuk)\b/)[0]?.trim() ?? "";
  for (const kab of KAB_SORTED) {
    const idx = name.indexOf(normalizeGuideQuery(kab.nama));
    if (idx >= 0) name = name.slice(0, idx).trim();
  }
  if (name.length < 2 || name === "tangguh" || name.startsWith("tangguh ")) return undefined;
  return name.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function mentionsAceh(text: string): boolean {
  return includesPattern(text, "aceh") || Boolean(extractKabupaten(text));
}

function isOutOfAceh(text: string): boolean {
  if (mentionsAceh(text)) return false;
  return OUT_OF_ACEH.some((place) => includesPattern(text, place));
}

function isEmergency(text: string): boolean {
  return EMERGENCY.some((phrase) => includesPattern(text, phrase));
}

function scoreIntent(text: string, locale: GuideLocale, patterns: { id: string[]; en: string[] }): number {
  const list = locale === "en" ? [...patterns.en, ...patterns.id] : [...patterns.id, ...patterns.en];
  let score = 0;
  for (const pattern of list) {
    if (!includesPattern(text, pattern)) continue;
    const words = normalizeGuideQuery(pattern).split(" ").filter(Boolean).length;
    score += words * 2 + 1;
  }
  return score;
}

function hasFollowUpLanguage(text: string): boolean {
  return FOLLOW_UP.some((phrase) => includesPattern(text, phrase));
}

function isSlotOnlyQuery(
  text: string,
  kabupaten?: string,
  jenis?: string,
  year?: number,
  desa?: string
): boolean {
  if (!kabupaten && !jenis && !year && !desa) return false;
  let rest = text;
  if (kabupaten) rest = rest.replace(normalizeGuideQuery(kabupaten), " ");
  if (desa) rest = rest.replace(normalizeGuideQuery(desa), " ");
  if (year) rest = rest.replace(String(year), " ");
  if (jenis) {
    for (const alias of JENIS_ALIASES) {
      if (alias.jenis === jenis) rest = rest.replace(normalizeGuideQuery(alias.pattern), " ");
    }
    rest = rest.replace(normalizeGuideQuery(jenis), " ");
  }
  rest = rest.replace(/\b(?:desa|gampong|gp)\b/g, " ");
  rest = rest.replace(SLOT_STOP, " ").replace(/\s+/g, " ").trim();
  return rest.length === 0;
}

function mergeSlots(
  extracted: { kabupaten?: string; jenis?: string; year?: number },
  session?: GuideSlots
) {
  return {
    kabupaten: extracted.kabupaten ?? session?.kabupaten,
    jenis: extracted.jenis ?? session?.jenis,
    year: extracted.year ?? session?.year,
  };
}

export function matchGuideIntent(
  query: string,
  locale: GuideLocale = "id",
  session?: GuideMatchOptions
): GuideMatch {
  const normalized = normalizeGuideQuery(query);
  const extracted = {
    kabupaten: extractKabupaten(normalized),
    jenis: extractJenis(normalized),
    year: extractYear(normalized),
  };
  const desa = extractDesa(normalized);
  const slots = mergeSlots(extracted, session);
  const faq = matchGuideFaq(normalized, locale, session?.faq);

  if (!normalized) {
    return { intent: "unknown", query: "", reason: "low_confidence" };
  }
  if (isEmergency(normalized)) {
    return { intent: "unknown", query: normalized, ...slots, desa, reason: "emergency" };
  }
  if (isOutOfAceh(normalized)) {
    return { intent: "unknown", query: normalized, reason: "out_of_scope" };
  }

  if (faq) {
    const intent = intentForFaq(faq.id, session?.faq) ?? "tentang";
    return { intent, query: normalized, ...slots, desa, faq };
  }

  let best: { id: GuideIntentId; score: number; priority: number } | null = null;
  for (const intent of GUIDE_INTENTS) {
    const score = scoreIntent(normalized, locale, intent.patterns);
    if (score <= 0) continue;
    if (
      !best ||
      score > best.score ||
      (score === best.score && intent.priority < best.priority)
    ) {
      best = { id: intent.id, score, priority: intent.priority };
    }
  }

  const followUp =
    Boolean(session?.lastIntent) &&
    (hasFollowUpLanguage(normalized) ||
      isSlotOnlyQuery(normalized, extracted.kabupaten, extracted.jenis, extracted.year, desa));

  if (!best && followUp && session?.lastIntent) {
    return { intent: session.lastIntent, query: normalized, ...slots, desa };
  }

  if (!best) {
    if (desa) {
      return { intent: "destana", query: normalized, ...slots, desa };
    }
    if (slots.kabupaten || slots.jenis) {
      return { intent: "kejadian", query: normalized, ...slots, desa };
    }
    return { intent: "unknown", query: normalized, ...slots, desa, reason: "low_confidence" };
  }

  return {
    intent: best.id,
    query: normalized,
    ...slots,
    desa,
  };
}

export function shouldShowGuideBot(pathname: string): boolean {
  if (pathname === "/peta" || pathname.startsWith("/peta/")) return false;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return false;
  return true;
}
