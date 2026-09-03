import { ACEH_KABUPATEN } from "@/lib/sik/juklak";
import { JENIS_BENCANA_JUKLAK } from "@/lib/sik/jenis-bencana";
import { GUIDE_INTENTS } from "./intents";
import type { GuideIntentId, GuideLocale, GuideMatch } from "./types";

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

export function normalizeGuideQuery(raw: string): string {
  return raw
    .normalize("NFC")
    .toLowerCase()
    .replace(/[_./,;:!?()[\]"'`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function includesPattern(text: string, pattern: string): boolean {
  const p = normalizeGuideQuery(pattern);
  if (!p) return false;
  if (p.length <= 3) {
    return new RegExp(`(?:^|\\s)${escapeRegExp(p)}(?:$|\\s)`).test(text);
  }
  return text.includes(p);
}

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

export function matchGuideIntent(query: string, locale: GuideLocale = "id"): GuideMatch {
  const normalized = normalizeGuideQuery(query);
  const kabupaten = extractKabupaten(normalized);
  const jenis = extractJenis(normalized);
  const year = extractYear(normalized);

  if (!normalized) {
    return { intent: "unknown", query: "", reason: "low_confidence" };
  }
  if (isEmergency(normalized)) {
    return { intent: "unknown", query: normalized, kabupaten, jenis, year, reason: "emergency" };
  }
  if (isOutOfAceh(normalized)) {
    return { intent: "unknown", query: normalized, reason: "out_of_scope" };
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

  if (!best) {
    if (kabupaten || jenis) {
      return { intent: "kejadian", query: normalized, kabupaten, jenis, year };
    }
    return { intent: "unknown", query: normalized, kabupaten, jenis, year, reason: "low_confidence" };
  }

  return {
    intent: best.id,
    query: normalized,
    kabupaten,
    jenis,
    year,
  };
}

export function shouldShowGuideBot(pathname: string): boolean {
  if (pathname === "/peta" || pathname.startsWith("/peta/")) return false;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return false;
  return true;
}
