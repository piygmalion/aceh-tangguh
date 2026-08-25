/**
 * Read-path kabupaten join helper.
 *
 * Facility / marker rows may store `Kota Langsa` while the 23 profil_desa
 * names use `Langsa`. Strip admin prefixes on READ only — do not rewrite
 * marker rows, fixtures, or profil_desa.
 */

const ADMIN_PREFIX =
  /^(kota(\s+administratif)?|kabupaten|kab\.?|kotamadya)\s+/i;

const ADMIN_PREFIX_VARIANTS = [
  "Kota ",
  "Kota Administratif ",
  "Kabupaten ",
  "Kab. ",
  "Kab ",
  "Kotamadya ",
] as const;

/** Strip a leading Kota / Kabupaten (and common variants). Preserves remainder casing. */
export function stripKabupatenAdminPrefix(raw: string): string {
  return raw.trim().replace(ADMIN_PREFIX, "").trim();
}

/**
 * Fold NFC, case, punctuation, then strip admin prefixes.
 * `Kota Langsa`, `kota  langsa`, and `Langsa` share the same key.
 */
export function normalizeKabupatenKey(
  raw: string | undefined | null
): string {
  if (!raw) return "";
  const folded = raw
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/[_./-]+/g, " ")
    .replace(/\s+/g, " ");
  return folded.replace(ADMIN_PREFIX, "").trim();
}

export function kabupatenNamesMatch(
  a: string | undefined | null,
  b: string | undefined | null
): boolean {
  const left = normalizeKabupatenKey(a);
  const right = normalizeKabupatenKey(b);
  return Boolean(left) && left === right;
}

/**
 * Join a facility/marker kabupaten string to one of the 23 profil_desa names.
 * Returns the matching profil_desa name, or undefined when none match.
 */
export function joinKabupatenToProfilDesa(
  markerKabupaten: string | undefined | null,
  profilDesaNames: readonly string[]
): string | undefined {
  const key = normalizeKabupatenKey(markerKabupaten);
  if (!key) return undefined;
  return profilDesaNames.find((name) => normalizeKabupatenKey(name) === key);
}

/**
 * Candidate kabupaten strings for a read-path filter (original, stripped,
 * and common prefixed forms). Used so `Kota Langsa` matches `Langsa` in SQL
 * without rewriting stored rows.
 */
export function kabupatenQueryCandidates(
  raw: string | undefined | null
): string[] {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return [];
  const stripped = stripKabupatenAdminPrefix(trimmed);
  const out: string[] = [];
  const add = (value: string) => {
    if (value && !out.some((existing) => existing === value)) out.push(value);
  };
  add(trimmed);
  add(stripped);
  for (const prefix of ADMIN_PREFIX_VARIANTS) {
    add(`${prefix}${stripped}`);
  }
  return out;
}
