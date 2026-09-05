export function normalizeGuideQuery(raw: string): string {
  return raw
    .normalize("NFC")
    .toLowerCase()
    .replace(/[_./,;:!?()[\]"'`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function includesPattern(text: string, pattern: string): boolean {
  const p = normalizeGuideQuery(pattern);
  if (!p) return false;
  if (p.length <= 3) {
    return new RegExp(`(?:^|\\s)${escapeRegExp(p)}(?:$|\\s)`).test(text);
  }
  return text.includes(p);
}
