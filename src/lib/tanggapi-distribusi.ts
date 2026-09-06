/**
 * FE-37 — Tanggapi CTA + optional location seed for Distribusi / AreaProfil.
 * Seed is identity-only. Never copy RR/RS/RB, korban, KK/populasi, Destana, or kondisi.
 */

export const KODE_DESA_10 = /^\d{10}$/;

export const TANGGAPI_SEED_WHITELIST = [
  "kode_desa_kelurahan",
  "nama",
  "kecamatan",
  "kabupaten",
  "kode_kecamatan",
  "kode_kabupaten",
] as const;

export const TANGGAPI_SEED_FORBIDDEN = [
  "rumah_rr",
  "rumah_rs",
  "rumah_rb",
  "korban_meninggal",
  "kk",
  "populasi",
  "destana_indeks",
  "kondisi_kode",
] as const;

export type TanggapiSeedField = (typeof TANGGAPI_SEED_WHITELIST)[number];

export type TanggapiSeedInput = {
  kode_desa_kelurahan?: string | null;
  /** Alias used by AreaProfil (IA #50 forbids the kelurahan query key in the panel). */
  kode_desa?: string | null;
  nama?: string | null;
  kecamatan?: string | null;
  kabupaten?: string | null;
  kode_kecamatan?: string | null;
  kode_kabupaten?: string | null;
};

export function isValidKodeDesa10(value: unknown): value is string {
  if (typeof value !== "string" && typeof value !== "number") return false;
  return KODE_DESA_10.test(String(value).trim());
}

function trimText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text || undefined;
}

export function readKodeDesa10(input: {
  kode_desa?: unknown;
  kode_desa_kelurahan?: unknown;
  kodeDesa?: unknown;
}): string | undefined {
  const candidates = [input.kode_desa_kelurahan, input.kode_desa, input.kodeDesa];
  for (const value of candidates) {
    if (isValidKodeDesa10(value)) return String(value).trim();
  }
  return undefined;
}

/** Desa view (or card with no view) + valid 10-digit kode. Nama-only never shows. */
export function shouldShowTanggapiCta(opts: {
  view?: string;
  kodeDesa?: string | null;
}): boolean {
  if (opts.view != null && opts.view !== "desa") return false;
  return isValidKodeDesa10(opts.kodeDesa);
}

/**
 * Optional GuideBot seed. Only whitelist identity fields.
 * Extra keys (RR/RS/RB, korban, KK, Destana, kondisi) are ignored.
 */
export function buildTanggapiSeedPrompt(
  input: TanggapiSeedInput & Record<string, unknown>,
): string | undefined {
  const kode = readKodeDesa10(input);
  if (!kode) return undefined;

  const nama = trimText(input.nama);
  const kecamatan = trimText(input.kecamatan);
  const kabupaten = trimText(input.kabupaten);
  const kodeKec = trimText(input.kode_kecamatan);
  const kodeKab = trimText(input.kode_kabupaten);

  const parts: string[] = [];
  parts.push(nama ? `Desa ${nama}` : "Desa");
  parts.push(`(kode_desa_kelurahan ${kode})`);
  if (kecamatan) {
    parts.push(kodeKec ? `kecamatan ${kecamatan} (${kodeKec})` : `kecamatan ${kecamatan}`);
  } else if (kodeKec) {
    parts.push(`kecamatan ${kodeKec}`);
  }
  if (kabupaten) {
    parts.push(kodeKab ? `kabupaten ${kabupaten} (${kodeKab})` : `kabupaten ${kabupaten}`);
  } else if (kodeKab) {
    parts.push(`kabupaten ${kodeKab}`);
  }
  return parts.join(", ");
}
