import type { GuideIntentId, GuideLocale } from "./types";

export const GUIDE_CHIP_KEYS = [
  "tour",
  "peringatan",
  "cuaca",
  "kejadian",
  "analisisData",
  "destana",
  "nomor",
  "lapor",
  "pelatihan",
  "mitra",
  "publikasi",
  "risetBanding",
  "risetDibi",
] as const;

export type GuideChipKey = (typeof GUIDE_CHIP_KEYS)[number];

const DEFAULT_CHIPS: GuideChipKey[] = [
  "tour",
  "peringatan",
  "cuaca",
  "kejadian",
  "destana",
  "nomor",
  "lapor",
];

function pageKey(pathname: string): string {
  const path = pathname.split("?")[0] || "/";
  if (path === "/") return "/";
  const first = path.split("/").filter(Boolean)[0];
  return first ? `/${first}` : "/";
}

export function pageIntentHint(pathname: string): Exclude<GuideIntentId, "unknown"> | undefined {
  switch (pageKey(pathname)) {
    case "/destana":
      return "destana";
    case "/nomor-penting":
      return "nomor";
    case "/pelatihan":
      return "pelatihan";
    case "/publikasi":
      return "publikasi";
    case "/mitra":
      return "mitra";
    case "/data-bencana":
      return "kejadian";
    case "/analisis-data":
      return "analisisData";
    case "/anggaran-bencana":
      return "anggaran";
    case "/lapor":
      return "lapor";
    case "/metodologi":
    case "/sumber-data":
      return "metodologi";
    default:
      return undefined;
  }
}

function withHomeResearch(chips: GuideChipKey[]): GuideChipKey[] {
  const withoutLapor = chips.filter((key) => key !== "lapor" && key !== "analisisData");
  return [...withoutLapor, "analisisData", "risetBanding", "risetDibi", "lapor"];
}

export function chipsForPathname(pathname: string): GuideChipKey[] {
  const hint = pageIntentHint(pathname);
  if (!hint) return withHomeResearch(DEFAULT_CHIPS);
  if (hint === "metodologi" || hint === "anggaran") {
    return DEFAULT_CHIPS;
  }
  if (hint === "kejadian") {
    const ordered: GuideChipKey[] = [
      "kejadian",
      "analisisData",
      ...DEFAULT_CHIPS.filter((key) => key !== "kejadian"),
    ];
    return ordered.slice(0, 7);
  }
  const lead = GUIDE_CHIP_KEYS.find((key) => key === hint);
  const rest = DEFAULT_CHIPS.filter((key) => key !== lead);
  const ordered: GuideChipKey[] = lead ? [lead, ...rest] : rest;
  return ordered.slice(0, 7);
}

export function welcomeQueryForPath(pathname: string, locale: GuideLocale): string {
  const hint = pageIntentHint(pathname);
  if (locale === "en") {
    switch (hint) {
      case "destana":
        return "destana";
      case "nomor":
        return "emergency contacts";
      case "pelatihan":
        return "training";
      case "publikasi":
        return "publications";
      case "mitra":
        return "partners";
      case "kejadian":
        return "active incidents";
      case "analisisData":
        return "disaster analysis";
      case "anggaran":
        return "disaster budget";
      case "lapor":
        return "how to report";
      case "metodologi":
        return "data sources";
      default:
        return "early warning";
    }
  }
  switch (hint) {
    case "destana":
      return "destana";
    case "nomor":
      return "nomor penting";
    case "pelatihan":
      return "pelatihan";
    case "publikasi":
      return "publikasi";
    case "mitra":
      return "mitra";
    case "kejadian":
      return "kejadian aktif";
    case "analisisData":
      return "analisis data";
    case "anggaran":
      return "anggaran bencana";
    case "lapor":
      return "cara lapor";
    case "metodologi":
      return "sumber data";
    default:
      return "peringatan dini";
  }
}
