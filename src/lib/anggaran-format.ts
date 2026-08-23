/** Compact Rupiah: Rp 176,2 Miliar / Rp 45,3 Juta */
export function formatRpCompact(n: number, locale = "id-ID"): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e12) {
    return `${sign}Rp ${(abs / 1e12).toLocaleString(locale, {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    })} Triliun`;
  }
  if (abs >= 1e9) {
    return `${sign}Rp ${(abs / 1e9).toLocaleString(locale, {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    })} Miliar`;
  }
  if (abs >= 1e6) {
    return `${sign}Rp ${(abs / 1e6).toLocaleString(locale, {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    })} Juta`;
  }
  return `${sign}Rp ${abs.toLocaleString(locale)}`;
}

export function formatRpFull(n: number, locale = "id-ID"): string {
  return `Rp ${n.toLocaleString(locale)}`;
}

export function pctOf(part: number, total: number): number {
  if (!total) return 0;
  return (part / total) * 100;
}
