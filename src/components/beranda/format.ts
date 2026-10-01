/**
 * Locale-aware formatting for the production beranda.
 * Indonesian: thousands ".", decimals ",". English: thousands ",", decimals ".".
 */
import type { PeringatanTone } from "@/lib/peringatan-dini-types";

function numberTag(locale?: string): string {
  return locale === "en" ? "en-US" : "id-ID";
}

function dateTag(locale?: string): string {
  return locale === "en" ? "en-GB" : "id-ID";
}

export function angka(n: number, locale = "id"): string {
  return new Intl.NumberFormat(numberTag(locale), {
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export function desimal(n: number, digits: 0 | 1 | 2 = 2, locale = "id"): string {
  const tag = numberTag(locale);
  if (digits === 0) {
    return new Intl.NumberFormat(tag, { maximumFractionDigits: 0 }).format(n);
  }
  return new Intl.NumberFormat(tag, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

/**
 * Scaled figure: the numeric value stays a number so a counter can animate it,
 * and the unit travels alongside so it can be typeset smaller.
 */
export type Ringkas = { n: number; unit: string; decimals: 0 | 1 | 2 };

/** Compact count for headline figures: 5.836.593 reads as "5,84 jt" / "5.84 m". */
export function angkaRingkas(n: number, locale = "id"): Ringkas {
  const abs = Math.abs(n);
  const en = locale === "en";
  if (abs >= 1_000_000) return { n: n / 1_000_000, unit: en ? "m" : "jt", decimals: 2 };
  if (abs >= 10_000) return { n: n / 1_000, unit: en ? "k" : "rb", decimals: 1 };
  return { n, unit: "", decimals: 0 };
}

/** Rupiah in trillions / billions / millions, split so the unit can be styled down. */
export function rupiahRingkas(rp: number, locale = "id"): Ringkas {
  const abs = Math.abs(rp);
  const en = locale === "en";
  if (abs >= 1_000_000_000_000) {
    return {
      n: rp / 1_000_000_000_000,
      unit: en ? "trillion" : "triliun",
      decimals: 1,
    };
  }
  if (abs >= 1_000_000_000) {
    return {
      n: rp / 1_000_000_000,
      unit: en ? "billion" : "miliar",
      decimals: 1,
    };
  }
  if (abs >= 1_000_000) {
    return { n: rp / 1_000_000, unit: en ? "million" : "juta", decimals: 1 };
  }
  return { n: rp, unit: "", decimals: 0 };
}

/** DIBI reports damage value already denominated in millions of rupiah. */
export function rupiahDariJuta(juta: number, locale = "id"): Ringkas {
  return rupiahRingkas(juta * 1_000_000, locale);
}

/** Inline form for running text, where a two-part figure would break the sentence. */
export function rupiahTeks(rp: number, locale = "id"): string {
  const { n, unit, decimals } = rupiahRingkas(rp, locale);
  return `Rp${desimal(n, decimals, locale)}${unit ? ` ${unit}` : ""}`;
}

/**
 * Upstream feeds (DIBI, BMKG, MAGMA) ship em and en dashes inside labels.
 * The page sets everything with plain hyphens, so normalise on the way in.
 */
export function rapikanTanda(text: string): string {
  return (
    text
      // A dash between numbers is a range, so it keeps that meaning as a hyphen.
      .replace(/(\d)\s*[\u2013\u2014]\s*(\d)/g, "$1-$2")
      // Anywhere else the dash breaks a clause, which reads as a comma here.
      .replace(/\s*[\u2013\u2014]\s*/g, ", ")
  );
}

/** "TINGGI" reads better as "Tinggi" outside a table. */
export function kapitalAwal(text: string, locale = "id"): string {
  if (!text) return text;
  const tag = numberTag(locale);
  const lower = rapikanTanda(text).toLocaleLowerCase(tag);
  return lower.charAt(0).toLocaleUpperCase(tag) + lower.slice(1);
}

/** "kebakaran_hutan_lahan" reads as "Kebakaran hutan lahan". */
export function dariSlug(slug: string, locale = "id"): string {
  return kapitalAwal(slug.replace(/_/g, " "), locale);
}

/** Date only, from a payload timestamp. Never the clock at render time. */
export function tanggalCadangan(iso: string | null | undefined, locale = "id"): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return new Intl.DateTimeFormat(dateTag(locale), {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(ms));
}

export function tanggalPendek(iso: string | null | undefined, locale = "id"): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toLocaleDateString(dateTag(locale), {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function jamPendek(iso: string | null | undefined, locale = "id"): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toLocaleString(dateTag(locale), {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Status colours come from the Aceh status tokens only:
 * neutral reads teal (--info), warn reads gold (--warn), danger reads burnt (--danger).
 * Labels live in peringatanDini.tone.{neutral,warn,danger}.
 */
export const TONE_DOT: Record<PeringatanTone, string> = {
  neutral: "bg-[var(--info)]",
  warn: "bg-[var(--warn)]",
  danger: "bg-[var(--danger)]",
};

export const TONE_CHIP: Record<PeringatanTone, string> = {
  neutral: "bg-[var(--info-dim)] text-[var(--info)]",
  warn: "bg-[var(--warn-dim)] text-[var(--warn)]",
  danger: "bg-[var(--danger-dim)] text-[var(--danger)]",
};

export const TONE_EDGE: Record<PeringatanTone, string> = {
  neutral: "before:bg-[var(--info)]",
  warn: "before:bg-[var(--warn)]",
  danger: "before:bg-[var(--danger)]",
};

/** IRBI risk classes carry their own scale, separate from live warning tones. */
export function kelasRisikoChip(kelas: string): string {
  const k = kelas.toUpperCase();
  if (k === "TINGGI") return "bg-[var(--danger-dim)] text-[var(--danger)]";
  if (k === "SEDANG") return "bg-[var(--warn-dim)] text-[var(--warn)]";
  return "bg-[var(--primary-dim)] text-[var(--primary)]";
}

export function kelasRisikoBar(kelas: string): string {
  const k = kelas.toUpperCase();
  if (k === "TINGGI") return "bg-[var(--danger)]";
  if (k === "SEDANG") return "bg-[var(--warn)]";
  return "bg-[var(--primary)]";
}
