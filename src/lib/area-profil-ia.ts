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

/** Open at kabupaten when selection.kabupaten is set — even if the click was a desa. */
export function areaProfilViewOnOpen(
  selection?: VillageClickSelection | null
): AreaProfilView {
  if (selection?.kabupaten?.trim()) return "kabupaten";
  return AREA_PROFIL_INITIAL_VIEW;
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

export function profilDesaApiPath(
  level: AreaProfilView,
  params: URLSearchParams
): string {
  const qs = params.toString();
  return qs ? `${AREA_PROFIL_ROUTES[level]}?${qs}` : AREA_PROFIL_ROUTES[level];
}
