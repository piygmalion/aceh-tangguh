import { parseAnalisisMetric, type AnalisisMetric } from "./kejadian-analisis";

export type AnalisisView = "jenis" | "kab" | "waktu";

export type AnalisisUrlState = {
  jenis: string;
  kab: string;
  kec: string;
  from: string;
  to: string;
  metric: AnalisisMetric;
  compareKab: string;
  compareYear: string;
  view: AnalisisView | "";
};

export const EMPTY_ANALISIS_STATE: AnalisisUrlState = {
  jenis: "",
  kab: "",
  kec: "",
  from: "",
  to: "",
  metric: "kejadian",
  compareKab: "",
  compareYear: "",
  view: "",
};

function isoDay(value: string | null): string {
  if (!value) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? value.trim() : "";
}

function parseView(raw: string | null): AnalisisView | "" {
  if (raw === "jenis" || raw === "kab" || raw === "waktu") return raw;
  return "";
}

function parseYear(raw: string | null): string {
  if (!raw) return "";
  return /^\d{4}$/.test(raw.trim()) ? raw.trim() : "";
}

export function parseAnalisisSearchParams(
  params: URLSearchParams
): AnalisisUrlState {
  return {
    jenis: params.get("jenis")?.trim() ?? "",
    kab: params.get("kab")?.trim() ?? "",
    kec: params.get("kec")?.trim() ?? "",
    from: isoDay(params.get("from")),
    to: isoDay(params.get("to")),
    metric: parseAnalisisMetric(params.get("metric")),
    compareKab: params.get("compareKab")?.trim() ?? "",
    compareYear: parseYear(params.get("compareYear")),
    view: parseView(params.get("view")),
  };
}

export function analisisStateToParams(state: AnalisisUrlState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.jenis) params.set("jenis", state.jenis);
  if (state.kab) params.set("kab", state.kab);
  if (state.kec) params.set("kec", state.kec);
  if (state.from) params.set("from", state.from);
  if (state.to) params.set("to", state.to);
  if (state.metric !== "kejadian") params.set("metric", state.metric);
  if (state.compareKab) params.set("compareKab", state.compareKab);
  if (state.compareYear) params.set("compareYear", state.compareYear);
  if (state.view) params.set("view", state.view);
  return params;
}

export type AnalisisPreset = "thisYear" | "last12" | "last5" | "all";

function utcIso(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export function presetRange(
  preset: AnalisisPreset,
  now = new Date()
): { from: string; to: string } {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  if (preset === "thisYear") {
    return { from: `${year}-01-01`, to: `${year}-12-31` };
  }
  if (preset === "last12") {
    const from = new Date(Date.UTC(year, month - 11, 1));
    return {
      from: utcIso(from.getUTCFullYear(), from.getUTCMonth(), 1),
      to: utcIso(year, month, day),
    };
  }
  if (preset === "last5") {
    return { from: `${year - 4}-01-01`, to: utcIso(year, month, day) };
  }
  return { from: "", to: "" };
}

export function normalizeKabLabel(name: string): string {
  return name
    .trim()
    .replace(/^(kota|kabupaten|kab\.?)\s+/i, "")
    .toLowerCase();
}
