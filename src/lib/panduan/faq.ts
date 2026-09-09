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
    id: "beda-analisis-data-sumber",
    intent: "analisisData",
    patterns: {
      id: [
        "beda analisis data",
        "analisis data vs",
        "analisis vs data bencana",
        "bukan dibi",
        "bukan publikasi tanggapi",
      ],
      en: [
        "disaster analysis vs",
        "difference between disaster analysis",
        "not dibi",
        "not a publication",
      ],
    },
    bodyId:
      "Analisis data memotong katalog kejadian Aceh yang sama dengan tabel Data bencana. DIBI BNPB adalah agregat historis di laci terpisah — tidak dijumlahkan ke KPI halaman itu. Publikasi Tanggapi Aceh di tanggapi.acehprov.go.id adalah artikel kebijakan BTT, bukan ruang kerja grafik ini.",
    bodyEn:
      "Data analysis slices the same Aceh event catalogue as the Disaster data table. BNPB DIBI is a separate historical drawer — not added into that page’s KPIs. Tanggapi Aceh publications at tanggapi.acehprov.go.id are BTT policy articles, not this chart workspace.",
    href: "/analisis-data",
    labelKey: "linkAnalisisData",
  },
  {
    id: "filter-url-analisis-data",
    intent: "analisisData",
    patterns: {
      id: [
        "filter analisis",
        "cara memakai analisis",
        "cara pakai analisis",
        "url analisis",
        "tautan analisis",
      ],
      en: [
        "analysis filters",
        "how to use disaster analysis",
        "shareable url",
        "filter disaster analysis",
      ],
    },
    bodyId:
      "Di Analisis data, ubah jenis, kabupaten/kota, kecamatan, dari/sampai, atau metrik. Perubahan menulis query URL (jenis, kab, kec, from, to, metric) tanpa menggulir halaman. Salin tautan untuk membagikan irisan yang sama. Katalognya sama dengan Data bencana, bukan DIBI nasional.",
    bodyEn:
      "On Data analysis, change type, district/city, subdistrict, from/to, or metric. Changes write the URL query (jenis, kab, kec, from, to, metric) without scrolling the page. Copy the link to share the same slice. It is the Disaster data catalogue, not national DIBI.",
    href: "/analisis-data",
    labelKey: "linkAnalisisData",
  },
  {
    id: "grafik-analisis-data",
    intent: "analisisData",
    patterns: {
      id: [
        "grafik analisis",
        "membaca grafik analisis",
        "tren waktu analisis",
        "cara membaca grafik analisis",
      ],
      en: ["analysis charts", "how to read disaster analysis", "read the charts"],
    },
    bodyId:
      "Batang menurut jenis dan kabupaten memotong filter yang sama; klik batang mengubah irisan. Tren waktu adalah garis jumlah per periode pada filter. Banding kabupaten atau tahun menumpuk irisan kedua. Panel ancaman IRBI/KRB adalah analogi histori, bukan prakiraan resmi. Saya tidak mengarang angka di grafik.",
    bodyEn:
      "Bars by type and district follow the same filter; clicking a bar changes the slice. The time trend is a line of counts per period on that filter. Compare district or year stacks a second slice. The IRBI/KRB threat panel is a historical analog, not an official forecast. I do not invent chart figures.",
    href: "/analisis-data",
    labelKey: "linkAnalisisData",
  },
  {
    id: "apa-itu-analisis-data",
    intent: "analisisData",
    patterns: {
      id: ["analisis data bencana", "analisis data", "halaman analisis data"],
      en: ["disaster data analysis", "disaster analysis"],
    },
    bodyId:
      "Halaman Analisis data memotong katalog kejadian yang sama dengan Data bencana. Filter jenis, kabupaten/kota, waktu, dan metrik tersimpan di URL yang bisa dibagikan; grafik mengikuti filter itu. Bukan artikel publikasi Tanggapi Aceh (BTT) di tanggapi.acehprov.go.id. Angka DIBI nasional tidak dijumlahkan ke total halaman itu. Jika umpan gagal, halaman menandai data tertunda — angka korban tidak saya isi sendiri.",
    bodyEn:
      "The Data analysis page slices the same event catalogue as Disaster data. Type, district/city, time, and metric filters live in a shareable URL; the charts follow that filter. It is not a Tanggapi Aceh (BTT) publication article at tanggapi.acehprov.go.id. National DIBI figures are not added into that page’s totals. If the feed fails, the page marks data delayed — I will not invent casualty figures.",
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

export function isGuideFaqEntry(value: unknown): value is GuideFaqEntry {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<GuideFaqEntry>;
  if (typeof row.id !== "string" || !row.id.trim()) return false;
  if (typeof row.intent !== "string" || !isGuideFaqIntent(row.intent)) return false;
  if (!row.patterns || !Array.isArray(row.patterns.id) || !Array.isArray(row.patterns.en)) {
    return false;
  }
  if (typeof row.bodyId !== "string" || typeof row.bodyEn !== "string") return false;
  if (typeof row.href !== "string" || !isGuideHref(row.href)) return false;
  if (typeof row.labelKey !== "string" || !row.labelKey.trim()) return false;
  return true;
}

/** Accept curated entries or CMS rows; drop kejadian/stats payloads. */
export function parseFaqCatalogItems(items: unknown[]): GuideFaqEntry[] {
  const out: GuideFaqEntry[] = [];
  for (const item of items) {
    if (isGuideFaqEntry(item)) {
      out.push(item);
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const mapped = faqFromCmsRow(item as Parameters<typeof faqFromCmsRow>[0]);
    if (mapped) out.push(mapped);
  }
  return out;
}

export function matchGuideFaq(
  query: string,
  locale: GuideLocale,
  catalog: GuideFaqEntry[] = STATIC_GUIDE_FAQ
): GuideFaqHit | undefined {
  const text = normalizeGuideQuery(query);
  if (!text) return undefined;
  for (const entry of catalog) {
    if (!isGuideFaqEntry(entry)) continue;
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

export function mergeFaqCatalog(cms: unknown[]): GuideFaqEntry[] {
  const valid = parseFaqCatalogItems(cms);
  const seen = new Set(valid.map((entry) => entry.id));
  return [...valid, ...STATIC_GUIDE_FAQ.filter((entry) => !seen.has(entry.id))];
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
