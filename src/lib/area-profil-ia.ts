import type { VillageClickSelection } from "@/lib/profil-desa";

export const AREA_PROFIL_VIEWS = ["kabupaten", "kecamatan", "desa"] as const;

export type AreaProfilView = (typeof AREA_PROFIL_VIEWS)[number];

/** Signed IA: kabupaten | kecamatan | desa. No desa-list screen. */
export const AREA_PROFIL_INITIAL_VIEW: AreaProfilView = "kabupaten";

export const AREA_PROFIL_CRUMBS = ["Kab", "Kec", "Desa"] as const;

export const AREA_PROFIL_ROUTES = {
  kabupaten: "/api/profil-desa/kabupaten",
  kecamatan: "/api/profil-desa/kecamatan",
  desa: "/api/profil-desa/desa",
} as const;

/**
 * Backend-confirmed query keys. Do not rename.
 * kabupaten: kabupaten | kode_kabupaten
 * kecamatan: kabupaten + kecamatan | kode_kecamatan
 * desa: ?kode= (never kode_desa_kelurahan)
 */
export const PROFIL_QUERY_KEYS = {
  kabupaten: ["kabupaten", "kode_kabupaten"],
  kecamatan: ["kabupaten", "kecamatan", "kode_kecamatan"],
  desa: ["kode", "id", "nama", "kabupaten", "kecamatan"],
} as const;

export const PROFIL_FORBIDDEN_QUERY_KEYS = [
  "kode_desa_kelurahan",
  "kode_desa",
] as const;

const KAB_POLYGON_LEVELS = new Set(["kab", "kabupaten"]);

const DESA_LEVELS = new Set(["desa", "village"]);
const KEC_LEVELS = new Set(["kecamatan"]);
const KAB_LEVELS = new Set(["kab", "kabupaten"]);

/** Open at the clicked LOD — desa click stays desa, not kabupaten. */
export function areaProfilViewOnOpen(
  selection?: VillageClickSelection | null
): AreaProfilView {
  const level = selection?.level?.trim().toLowerCase() ?? "";
  if (DESA_LEVELS.has(level) || selection?.kodeDesa?.trim()) return "desa";
  if (KEC_LEVELS.has(level) || selection?.kodeKecamatan?.trim()) return "kecamatan";
  if (KAB_LEVELS.has(level)) return "kabupaten";
  if (selection?.kecamatan?.trim()) return "kecamatan";
  return AREA_PROFIL_INITIAL_VIEW;
}

export function desaShowsCensus(metrics: {
  korban_meninggal: number | null;
  korban_hilang: number | null;
  rumah_rr: number | null;
  rumah_rs: number | null;
  rumah_rb: number | null;
}): boolean {
  return (
    metrics.korban_meninggal == null &&
    metrics.korban_hilang == null &&
    metrics.rumah_rr == null &&
    metrics.rumah_rs == null &&
    metrics.rumah_rb == null
  );
}

export function areaProfilBack(view: AreaProfilView): AreaProfilView | "close" {
  if (view === "desa") return "kecamatan";
  if (view === "kecamatan") return "kabupaten";
  return "close";
}

/** Visible crumbs only. Omit Kec/Desa until that level is on the trail. */
export function areaProfilBreadcrumbLevels(
  view: AreaProfilView
): AreaProfilView[] {
  if (view === "kabupaten") return ["kabupaten"];
  if (view === "kecamatan") return ["kabupaten", "kecamatan"];
  return ["kabupaten", "kecamatan", "desa"];
}

/** Ancestors are buttons; current level is text (returns null). */
export function areaProfilBreadcrumbTarget(
  view: AreaProfilView,
  crumb: AreaProfilView
): AreaProfilView | null {
  const levels = areaProfilBreadcrumbLevels(view);
  if (!levels.includes(crumb) || crumb === view) return null;
  if (crumb === "kabupaten" || crumb === "kecamatan") return crumb;
  return null;
}

/** Prefer the kabupaten field; kab polygons often only stamp `name`. */
export function kabupatenNameFromSelection(
  selection: VillageClickSelection
): string {
  const named = selection.kabupaten?.trim() ?? "";
  if (named) return named;
  const level = selection.level?.trim().toLowerCase() ?? "";
  if (KAB_POLYGON_LEVELS.has(level)) return selection.name?.trim() ?? "";
  return "";
}

function setAllowed(
  params: URLSearchParams,
  allowed: readonly string[],
  key: string,
  value?: string | null
) {
  if (!allowed.includes(key)) return;
  const trimmed = value?.trim() ?? "";
  if (trimmed) params.set(key, trimmed);
}

/** Kabupaten: `kabupaten` | `kode_kabupaten`. */
export function profilKabupatenSearchParams(
  selection: VillageClickSelection
): URLSearchParams {
  const params = new URLSearchParams();
  setAllowed(
    params,
    PROFIL_QUERY_KEYS.kabupaten,
    "kabupaten",
    kabupatenNameFromSelection(selection)
  );
  setAllowed(
    params,
    PROFIL_QUERY_KEYS.kabupaten,
    "kode_kabupaten",
    selection.kodeKabupaten
  );
  return params;
}

/** Kecamatan: `kabupaten` + `kecamatan` | `kode_kecamatan`. */
export function profilKecamatanSearchParams(opts: {
  kabupaten?: string | null;
  kecamatan?: string | null;
  kodeKecamatan?: string | null;
}): URLSearchParams {
  const params = new URLSearchParams();
  setAllowed(params, PROFIL_QUERY_KEYS.kecamatan, "kabupaten", opts.kabupaten);
  setAllowed(params, PROFIL_QUERY_KEYS.kecamatan, "kecamatan", opts.kecamatan);
  setAllowed(
    params,
    PROFIL_QUERY_KEYS.kecamatan,
    "kode_kecamatan",
    opts.kodeKecamatan
  );
  return params;
}

/** Desa village code is `kode`, never `kode_desa_kelurahan`. */
export function profilDesaSearchParams(opts: {
  id?: string | null;
  kode?: string | null;
  nama?: string | null;
  kabupaten?: string | null;
  kecamatan?: string | null;
}): URLSearchParams {
  const params = new URLSearchParams();
  setAllowed(params, PROFIL_QUERY_KEYS.desa, "kode", opts.kode);
  setAllowed(params, PROFIL_QUERY_KEYS.desa, "id", opts.id);
  setAllowed(params, PROFIL_QUERY_KEYS.desa, "nama", opts.nama);
  setAllowed(params, PROFIL_QUERY_KEYS.desa, "kabupaten", opts.kabupaten);
  setAllowed(params, PROFIL_QUERY_KEYS.desa, "kecamatan", opts.kecamatan);
  return params;
}

/**
 * Four profil_desa rows have null kode. Look them up by id.
 * Do not invent kodes.
 */
export const NULL_KODE_DESA_NAMES = [
  "Lawe Sarap",
  "Perapat Tinggi",
  "Ise-ise",
  "Meunasah Cut",
] as const;

/**
 * Exclusive desa lookup: ?kode= if present, else ?id= (null-kode rows),
 * else ?nama= (+ kabupaten/kecamatan). Never kode_desa_kelurahan.
 */
export function profilDesaLookupParams(opts: {
  id?: string | null;
  kode?: string | null;
  nama?: string | null;
  kabupaten?: string | null;
  kecamatan?: string | null;
}): URLSearchParams {
  const kode = opts.kode?.trim() || "";
  const id = opts.id?.trim() || "";
  const nama = opts.nama?.trim() || "";
  if (kode) return profilDesaSearchParams({ kode });
  if (id) return profilDesaSearchParams({ id });
  return profilDesaSearchParams({
    nama,
    kabupaten: opts.kabupaten,
    kecamatan: opts.kecamatan,
  });
}

export function hasKabupatenQuery(params: URLSearchParams): boolean {
  return params.has("kabupaten") || params.has("kode_kabupaten");
}

export function profilDesaApiPath(
  level: AreaProfilView,
  params: URLSearchParams
): string {
  const qs = params.toString();
  return qs ? `${AREA_PROFIL_ROUTES[level]}?${qs}` : AREA_PROFIL_ROUTES[level];
}
