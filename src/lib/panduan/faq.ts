import type { GuideFaqHit, GuideHref, GuideIntentId, GuideLocale } from "./types";
import { includesPattern, normalizeGuideQuery } from "./match-text";

export type GuideFaqEntry = {
  id: string;
  intent: Exclude<GuideIntentId, "unknown">;
  patterns: { id: string[]; en: string[] };
  bodyId: string;
  bodyEn: string;
  href: GuideHref;
  hash?: string;
  labelKey: string;
};

const GUIDE_HREFS = new Set<GuideHref>([
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

const GUIDE_INTENTS = new Set<Exclude<GuideIntentId, "unknown">>([
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
]);

/** Always-on curated answers. CMS rows are merged in front of this list. */
export const STATIC_GUIDE_FAQ: GuideFaqEntry[] = [
  {
    id: "apa-itu-analisis-data",
    intent: "analisisData",
    patterns: {
      id: ["analisis data bencana", "analisis data", "halaman analisis data"],
      en: ["disaster data analysis", "disaster analysis"],
    },
    bodyId:
      "Halaman Analisis data memotong katalog kejadian yang sama dengan Data bencana: jenis, kabupaten, dan waktu lewat URL yang bisa dibagikan. Bukan artikel publikasi. Angka DIBI nasional tidak dijumlahkan ke total halaman itu.",
    bodyEn:
      "The Data analysis page slices the same event catalogue as Disaster data: type, district, and time through a shareable URL. It is not a publication article. National DIBI figures are not added into that page’s totals.",
    href: "/analisis-data",
    labelKey: "linkAnalisisData",
  },
  {
    id: "apa-itu-tatonas",
    intent: "peringatan",
    patterns: {
      id: ["apa itu tatonas", "tatonas itu apa", "pos hidrologi", "muka air sungai"],
      en: ["what is tatonas", "hydrology station", "river water level"],
    },
    bodyId:
      "Tatonas adalah umpan hidrologi resmi di kartu peringatan dini: muka air dan pos sungai. Bukan perintah evakuasi. Jika umpan gagal, kartu berlabel data tertunda — angka tidak saya isi sendiri.",
    bodyEn:
      "Tatonas is the official hydrology feed on the early-warning cards: water level and river posts. It is not an evacuation order. If the feed fails, the card is marked delayed — I will not invent figures.",
    href: "/",
    hash: "status",
    labelKey: "linkPeringatan",
  },
  {
    id: "apa-itu-destana",
    intent: "destana",
    patterns: {
      id: ["apa itu destana", "destana itu apa", "arti destana"],
      en: ["what is destana", "what does destana mean"],
    },
    bodyId:
      "Destana adalah status ketangguhan desa (belum / pratama / madya / utama) dari katalog SIK publik. Ini bukan zona evakuasi dan bukan SK darurat.",
    bodyEn:
      "Destana is village-resilience status (not yet / pratama / madya / utama) from the public SIK catalogue. It is not an evacuation zone and not an emergency decree.",
    href: "/destana",
    labelKey: "linkDestana",
  },
  {
    id: "irbi-bukan-krb",
    intent: "krb",
    patterns: {
      id: ["beda irbi dan krb", "irbi atau krb", "irbi vs krb", "perbedaan irbi"],
      en: ["irbi vs krb", "difference between irbi and krb"],
    },
    bodyId:
      "IRBI adalah kelas indeks risiko BNPB. Situs ini tidak menggambar zona KRB I/II/III. Poligon resmi tetap di InaRISK/PVMBG.",
    bodyEn:
      "IRBI is BNPB’s risk-index class. This site does not draw KRB I/II/III zones. Official polygons stay on InaRISK/PVMBG.",
    href: "/metodologi",
    labelKey: "linkMetodologi",
  },
  {
    id: "data-tertunda",
    intent: "peringatan",
    patterns: {
      id: ["data tertunda", "kenapa kartu kosong", "mengapa data tertunda"],
      en: ["delayed data", "why is the card empty", "why data delayed"],
    },
    bodyId:
      "Kartu yang gagal mengambil umpan resmi ditandai data tertunda. Saya tidak mengisi angka korban, siaga, atau muka air dari ingatan.",
    bodyEn:
      "Cards that fail to fetch an official feed are marked delayed. I do not fill casualty, alert-level, or water-level figures from memory.",
    href: "/",
    hash: "status",
    labelKey: "linkPeringatan",
  },
  {
    id: "cara-lapor-warga",
    intent: "lapor",
    patterns: {
      id: ["bagaimana cara lapor", "cara mengirim laporan", "laporan warga ke mana"],
      en: ["how do i send a report", "where do i file a report"],
    },
    bodyId:
      "Pilih laporan kejadian atau penanganan, isi lokasi, lalu kirim. Laporan tampil di peta setelah dimoderasi Pusdalops BPBA. Identitas tidak ditampilkan di peta publik.",
    bodyEn:
      "Choose an incident or response report, add the location, then submit. Reports appear on the map after BPBA Pusdalops moderation. Identity is not shown on the public map.",
    href: "/lapor/kejadian",
    labelKey: "linkLaporKejadian",
  },
];

export function isGuideHref(value: string): value is GuideHref {
  return GUIDE_HREFS.has(value as GuideHref);
}

export function isGuideFaqIntent(value: string): value is Exclude<GuideIntentId, "unknown"> {
  return GUIDE_INTENTS.has(value as Exclude<GuideIntentId, "unknown">);
}

export function matchGuideFaq(
  query: string,
  locale: GuideLocale,
  catalog: GuideFaqEntry[] = STATIC_GUIDE_FAQ
): GuideFaqHit | undefined {
  const text = normalizeGuideQuery(query);
  if (!text) return undefined;
  for (const entry of catalog) {
    const patterns = locale === "en" ? [...entry.patterns.en, ...entry.patterns.id] : [...entry.patterns.id, ...entry.patterns.en];
    if (patterns.some((pattern) => includesPattern(text, pattern))) {
      return {
        id: entry.id,
        bodyId: entry.bodyId,
        bodyEn: entry.bodyEn,
        href: entry.href,
        hash: entry.hash,
        labelKey: entry.labelKey,
      };
    }
  }
  return undefined;
}

export function intentForFaq(id: string, catalog: GuideFaqEntry[] = STATIC_GUIDE_FAQ) {
  return catalog.find((entry) => entry.id === id)?.intent;
}

export function mergeFaqCatalog(cms: GuideFaqEntry[]): GuideFaqEntry[] {
  const seen = new Set(cms.map((entry) => entry.id));
  return [...cms, ...STATIC_GUIDE_FAQ.filter((entry) => !seen.has(entry.id))];
}

export function faqFromCmsRow(row: {
  id?: string;
  pola?: string;
  intent?: string;
  body_id?: string;
  body_en?: string;
  href?: string;
  hash?: string | null;
  label_key?: string | null;
}): GuideFaqEntry | null {
  if (!row.pola || !row.body_id || !row.body_en || !row.href || !row.intent) return null;
  if (!isGuideHref(row.href) || !isGuideFaqIntent(row.intent)) return null;
  const patterns = row.pola
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);
  if (patterns.length === 0) return null;
  const hash = row.hash?.trim();
  if (hash && !/^[a-z0-9-]{1,40}$/i.test(hash)) return null;
  return {
    id: row.id || `cms-${normalizeGuideQuery(patterns[0]).replace(/\s+/g, "-")}`,
    intent: row.intent,
    patterns: { id: patterns, en: patterns },
    bodyId: row.body_id,
    bodyEn: row.body_en,
    href: row.href,
    hash: hash || undefined,
    labelKey: row.label_key?.trim() || "linkSumber",
  };
}
