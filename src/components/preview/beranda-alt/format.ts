/**
 * Formatting for the alternative beranda preview.
 * Indonesian locale throughout: thousands use ".", decimals use ",".
 */
import type { PeringatanTone } from "@/lib/peringatan-dini-types";

const nf0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const nf2 = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function angka(n: number): string {
  return nf0.format(Math.round(n));
}

export function desimal(n: number, digits: 0 | 1 | 2 = 2): string {
  if (digits === 0) return nf0.format(n);
  return (digits === 1 ? nf1 : nf2).format(n);
}

/**
 * Scaled figure: the numeric value stays a number so a counter can animate it,
 * and the unit travels alongside so it can be typeset smaller.
 */
export type Ringkas = { n: number; unit: string; decimals: 0 | 1 | 2 };

/** Compact count for headline figures: 5.836.593 reads as "5,84 jt". */
export function angkaRingkas(n: number): Ringkas {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return { n: n / 1_000_000, unit: "jt", decimals: 2 };
  if (abs >= 10_000) return { n: n / 1_000, unit: "rb", decimals: 1 };
  return { n, unit: "", decimals: 0 };
}

/** Rupiah in trillions / billions / millions, split so the unit can be styled down. */
export function rupiahRingkas(rp: number): Ringkas {
  const abs = Math.abs(rp);
  if (abs >= 1_000_000_000_000)
    return { n: rp / 1_000_000_000_000, unit: "triliun", decimals: 1 };
  if (abs >= 1_000_000_000)
    return { n: rp / 1_000_000_000, unit: "miliar", decimals: 1 };
  if (abs >= 1_000_000) return { n: rp / 1_000_000, unit: "juta", decimals: 1 };
  return { n: rp, unit: "", decimals: 0 };
}

/** DIBI reports damage value already denominated in millions of rupiah. */
export function rupiahDariJuta(juta: number): Ringkas {
  return rupiahRingkas(juta * 1_000_000);
}

/** Inline form for running text, where a two-part figure would break the sentence. */
export function rupiahTeks(rp: number): string {
  const { n, unit, decimals } = rupiahRingkas(rp);
  return `Rp${desimal(n, decimals)}${unit ? ` ${unit}` : ""}`;
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
export function kapitalAwal(text: string): string {
  if (!text) return text;
  const lower = rapikanTanda(text).toLocaleLowerCase("id-ID");
  return lower.charAt(0).toLocaleUpperCase("id-ID") + lower.slice(1);
}

/** "kebakaran_hutan_lahan" reads as "Kebakaran hutan lahan". */
export function dariSlug(slug: string): string {
  return kapitalAwal(slug.replace(/_/g, " "));
}

export function tanggalPendek(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function jamPendek(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Status vocabulary. Colours come from the Aceh status tokens only:
 * neutral reads teal (--info), warn reads gold (--warn), danger reads burnt (--danger).
 */
export const TONE_LABEL: Record<PeringatanTone, string> = {
  neutral: "Normal",
  warn: "Waspada",
  danger: "Bahaya",
};

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
