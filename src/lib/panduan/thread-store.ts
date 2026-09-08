import { sanitizeBotThreadBody, sanitizeUnknownQuery } from "./unknown";
import type {
  GuideHref,
  GuideIntentId,
  GuideLink,
  GuideSlots,
} from "./types";

export const TANGGAPI_THREAD_STORAGE = "aceh:tanggapi-thread";
export const TANGGAPI_THREAD_VERSION = 1;
export const TANGGAPI_THREAD_MAX_MESSAGES = 40;

const HREFS = new Set<GuideHref>([
  "/",
  "/peta",
  "/lapor",
  "/lapor/kejadian",
  "/lapor/penanganan",
  "/data-bencana",
  "/analisis-data",
  "/anggaran-bencana",
  "/publikasi",
  "/destana",
  "/nomor-penting",
  "/pelatihan",
  "/mitra",
  "/sumber-data",
  "/metodologi",
]);

const INTENTS = new Set<GuideIntentId>([
  "tour",
  "peringatan",
  "cuaca",
  "lapor",
  "peta",
  "destana",
  "nomor",
  "kejadian",
  "analisisData",
  "dibi",
  "anggaran",
  "irbi",
  "krb",
  "pelatihan",
  "mitra",
  "publikasi",
  "metodologi",
  "tentang",
  "unknown",
]);

const SLOT_INTENTS = new Set<Exclude<GuideIntentId, "unknown">>(
  [...INTENTS].filter((id): id is Exclude<GuideIntentId, "unknown"> => id !== "unknown")
);

export type StoredThreadMessage = {
  id: string;
  role: "user" | "bot";
  body: string;
  intent?: GuideIntentId;
  links?: GuideLink[];
  source?: string;
  lead?: string;
  clauses?: string[];
};

export type TanggapiThread = {
  version: typeof TANGGAPI_THREAD_VERSION;
  messages: StoredThreadMessage[];
  slots: GuideSlots;
};

function asHref(raw: unknown): GuideHref | null {
  return typeof raw === "string" && HREFS.has(raw as GuideHref) ? (raw as GuideHref) : null;
}

function asIntent(raw: unknown): GuideIntentId | undefined {
  return typeof raw === "string" && INTENTS.has(raw as GuideIntentId)
    ? (raw as GuideIntentId)
    : undefined;
}

function parseLinks(raw: unknown): GuideLink[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const links: GuideLink[] = [];
  for (const item of raw.slice(0, 6)) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const href = asHref(rec.href);
    if (!href || typeof rec.labelKey !== "string") continue;
    const hash =
      typeof rec.hash === "string" ? rec.hash.replace(/[^\w-]/g, "").slice(0, 40) : undefined;
    links.push({
      href,
      labelKey: rec.labelKey.slice(0, 40),
      hash: hash || undefined,
      accent: rec.accent === true ? true : undefined,
    });
  }
  return links.length ? links : undefined;
}

function parseMessage(raw: unknown): StoredThreadMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  if (typeof rec.id !== "string" || rec.id.length > 40) return null;
  if (rec.role !== "user" && rec.role !== "bot") return null;
  if (typeof rec.body !== "string") return null;
  const body =
    rec.role === "user" ? sanitizeUnknownQuery(rec.body) : sanitizeBotThreadBody(rec.body);
  if (!body) return null;
  const clauses = Array.isArray(rec.clauses)
    ? rec.clauses
        .filter((item): item is string => typeof item === "string")
        .slice(0, 4)
        .map(sanitizeBotThreadBody)
        .filter(Boolean)
    : undefined;
  const lead = typeof rec.lead === "string" ? sanitizeBotThreadBody(rec.lead) : undefined;
  const source = typeof rec.source === "string" ? sanitizeBotThreadBody(rec.source).slice(0, 80) : undefined;
  return {
    id: rec.id.replace(/[^\w-]/g, "").slice(0, 40),
    role: rec.role,
    body,
    intent: asIntent(rec.intent),
    links: parseLinks(rec.links),
    source: source || undefined,
    lead: lead || undefined,
    clauses: clauses?.length ? clauses : undefined,
  };
}

function parseSlots(raw: unknown): GuideSlots {
  if (!raw || typeof raw !== "object") return {};
  const rec = raw as Record<string, unknown>;
  const kabupaten =
    typeof rec.kabupaten === "string" ? sanitizeUnknownQuery(rec.kabupaten).slice(0, 80) : undefined;
  const jenis =
    typeof rec.jenis === "string" ? sanitizeUnknownQuery(rec.jenis).slice(0, 80) : undefined;
  const year =
    typeof rec.year === "number" && Number.isInteger(rec.year) && rec.year >= 1900 && rec.year <= 2100
      ? rec.year
      : undefined;
  const lastIntent =
    typeof rec.lastIntent === "string" && SLOT_INTENTS.has(rec.lastIntent as Exclude<GuideIntentId, "unknown">)
      ? (rec.lastIntent as Exclude<GuideIntentId, "unknown">)
      : undefined;
  return {
    kabupaten: kabupaten || undefined,
    jenis: jenis || undefined,
    year,
    lastIntent,
  };
}

export function parseTanggapiThread(raw: unknown): TanggapiThread | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  if (rec.version !== TANGGAPI_THREAD_VERSION) return null;
  if (!Array.isArray(rec.messages)) return null;
  const messages = rec.messages
    .slice(-TANGGAPI_THREAD_MAX_MESSAGES)
    .map(parseMessage)
    .filter((item): item is StoredThreadMessage => item != null);
  return { version: TANGGAPI_THREAD_VERSION, messages, slots: parseSlots(rec.slots) };
}

export function serializeTanggapiThread(input: {
  messages: StoredThreadMessage[];
  slots: GuideSlots;
}): TanggapiThread {
  const messages = input.messages
    .slice(-TANGGAPI_THREAD_MAX_MESSAGES)
    .map(parseMessage)
    .filter((item): item is StoredThreadMessage => item != null);
  return {
    version: TANGGAPI_THREAD_VERSION,
    messages,
    slots: parseSlots(input.slots),
  };
}

export function loadTanggapiThread(): TanggapiThread | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(TANGGAPI_THREAD_STORAGE);
    if (!raw) return null;
    return parseTanggapiThread(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveTanggapiThread(input: {
  messages: StoredThreadMessage[];
  slots: GuideSlots;
}): void {
  if (typeof window === "undefined") return;
  try {
    if (!input.messages.length) {
      sessionStorage.removeItem(TANGGAPI_THREAD_STORAGE);
      return;
    }
    const payload = serializeTanggapiThread(input);
    sessionStorage.setItem(TANGGAPI_THREAD_STORAGE, JSON.stringify(payload));
  } catch {
    // Private mode or quota — keep the in-memory thread only.
  }
}

export function clearTanggapiThread(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(TANGGAPI_THREAD_STORAGE);
  } catch {
    // Private mode.
  }
}
