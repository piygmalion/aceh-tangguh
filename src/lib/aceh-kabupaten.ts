/**
 * Canonical 23 kab/kota: SIK 4-digit and Kemendagri adm2 are different systems.
 * Do not treat toDottedKabKode as identity.
 */

export type AcehKabupatenRow = {
  nama: string;
  kode_sik: string;
  adm2: string;
  slug: string;
  is_kota: boolean;
};

export const ACEH_KABUPATEN_REGISTRY: readonly AcehKabupatenRow[] = [
  { nama: "Aceh Selatan", kode_sik: "1101", adm2: "11.01", slug: "aceh-selatan", is_kota: false },
  { nama: "Aceh Tenggara", kode_sik: "1102", adm2: "11.02", slug: "aceh-tenggara", is_kota: false },
  { nama: "Aceh Timur", kode_sik: "1103", adm2: "11.03", slug: "aceh-timur", is_kota: false },
  { nama: "Aceh Tengah", kode_sik: "1104", adm2: "11.04", slug: "aceh-tengah", is_kota: false },
  { nama: "Aceh Barat", kode_sik: "1105", adm2: "11.05", slug: "aceh-barat", is_kota: false },
  { nama: "Aceh Besar", kode_sik: "1106", adm2: "11.06", slug: "aceh-besar", is_kota: false },
  { nama: "Pidie", kode_sik: "1107", adm2: "11.07", slug: "pidie", is_kota: false },
  { nama: "Aceh Utara", kode_sik: "1108", adm2: "11.08", slug: "aceh-utara", is_kota: false },
  { nama: "Simeulue", kode_sik: "1109", adm2: "11.09", slug: "simeulue", is_kota: false },
  { nama: "Aceh Singkil", kode_sik: "1110", adm2: "11.10", slug: "aceh-singkil", is_kota: false },
  { nama: "Bireuen", kode_sik: "1111", adm2: "11.11", slug: "bireuen", is_kota: false },
  { nama: "Aceh Barat Daya", kode_sik: "1112", adm2: "11.12", slug: "aceh-barat-daya", is_kota: false },
  { nama: "Gayo Lues", kode_sik: "1113", adm2: "11.13", slug: "gayo-lues", is_kota: false },
  { nama: "Aceh Tamiang", kode_sik: "1114", adm2: "11.16", slug: "aceh-tamiang", is_kota: false },
  { nama: "Nagan Raya", kode_sik: "1115", adm2: "11.15", slug: "nagan-raya", is_kota: false },
  { nama: "Aceh Jaya", kode_sik: "1116", adm2: "11.14", slug: "aceh-jaya", is_kota: false },
  { nama: "Bener Meriah", kode_sik: "1117", adm2: "11.17", slug: "bener-meriah", is_kota: false },
  { nama: "Pidie Jaya", kode_sik: "1118", adm2: "11.18", slug: "pidie-jaya", is_kota: false },
  { nama: "Banda Aceh", kode_sik: "1171", adm2: "11.71", slug: "banda-aceh", is_kota: true },
  { nama: "Sabang", kode_sik: "1172", adm2: "11.72", slug: "sabang", is_kota: true },
  { nama: "Langsa", kode_sik: "1173", adm2: "11.74", slug: "langsa", is_kota: true },
  { nama: "Lhokseumawe", kode_sik: "1174", adm2: "11.73", slug: "lhokseumawe", is_kota: true },
  { nama: "Subulussalam", kode_sik: "1175", adm2: "11.75", slug: "subulussalam", is_kota: true },
] as const;

const BY_SIK = new Map(ACEH_KABUPATEN_REGISTRY.map((row) => [row.kode_sik, row]));
const BY_ADM2 = new Map(ACEH_KABUPATEN_REGISTRY.map((row) => [row.adm2, row]));

export function sikKodeToAdm2(kodeSik: string | null | undefined): string | null {
  if (!kodeSik) return null;
  return BY_SIK.get(kodeSik.trim())?.adm2 ?? null;
}

export function adm2ToSikKode(adm2: string | null | undefined): string | null {
  if (!adm2) return null;
  return BY_ADM2.get(adm2.trim())?.kode_sik ?? null;
}

/** Resolve any stored kab code onto KRB/weather adm2. Do not invent. */
export function resolveAdm2(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (BY_ADM2.has(trimmed)) return trimmed;
  return sikKodeToAdm2(trimmed);
}

export function findKabupatenRegistry(
  kodeOrNama: string | null | undefined
): AcehKabupatenRow | undefined {
  if (!kodeOrNama) return undefined;
  const raw = kodeOrNama.trim();
  return (
    BY_SIK.get(raw) ??
    BY_ADM2.get(raw) ??
    ACEH_KABUPATEN_REGISTRY.find((row) => row.nama.toLowerCase() === raw.toLowerCase())
  );
}
