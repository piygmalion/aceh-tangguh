import type { VillageClickSelection } from "@/lib/profil-desa";

export const AREA_PROFIL_VIEWS = ["kabupaten", "kecamatan", "desa"] as const;

export type AreaProfilView = (typeof AREA_PROFIL_VIEWS)[number];

/** Signed IA: the panel always lands on kabupaten, including desa / kab polygon clicks. */
export const AREA_PROFIL_INITIAL_VIEW: AreaProfilView = "kabupaten";

export const AREA_PROFIL_CRUMBS = ["Kab", "Kec", "Desa"] as const;

export const AREA_PROFIL_ROUTES = {
  kabupaten: "/api/profil-desa/kabupaten",
  kecamatan: "/api/profil-desa/kecamatan",
  desa: "/api/profil-desa/desa",
} as const;

const KAB_POLYGON_LEVELS = new Set(["kab", "kabupaten"]);

export function areaProfilViewOnOpen(
  _selection?: VillageClickSelection | null
): AreaProfilView {
  return AREA_PROFIL_INITIAL_VIEW;
}

export function areaProfilBack(view: AreaProfilView): AreaProfilView | "close" {
  if (view === "desa") return "kecamatan";
  if (view === "kecamatan") return "kabupaten";
  return "close";
}

export function areaProfilBreadcrumbEnabled(
  view: AreaProfilView,
  crumb: AreaProfilView,
  reached: { kecamatan: boolean; desa: boolean }
): boolean {
  if (crumb === "kabupaten") return true;
  if (crumb === "kecamatan") return reached.kecamatan || view === "kecamatan" || view === "desa";
  return reached.desa || view === "desa";
}

export function areaProfilBreadcrumbTarget(
  view: AreaProfilView,
  crumb: AreaProfilView,
  reached: { kecamatan: boolean; desa: boolean }
): AreaProfilView | null {
  if (!areaProfilBreadcrumbEnabled(view, crumb, reached)) return null;
  if (crumb === view) return null;
  return crumb;
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

function setExisting(params: URLSearchParams, key: string, value?: string | null) {
  const trimmed = value?.trim() ?? "";
  if (trimmed) params.set(key, trimmed);
}

/** Existing kabupaten query params only: `kabupaten`, `kode_kabupaten`. */
export function profilKabupatenSearchParams(
  selection: VillageClickSelection
): URLSearchParams {
  const params = new URLSearchParams();
  setExisting(params, "kabupaten", kabupatenNameFromSelection(selection));
  setExisting(params, "kode_kabupaten", selection.kodeKabupaten);
  return params;
}

/** Existing kecamatan query params only: `kabupaten`, `kecamatan`, `kode_kecamatan`. */
export function profilKecamatanSearchParams(opts: {
  kabupaten?: string | null;
  kecamatan?: string | null;
  kodeKecamatan?: string | null;
}): URLSearchParams {
  const params = new URLSearchParams();
  setExisting(params, "kabupaten", opts.kabupaten);
  setExisting(params, "kecamatan", opts.kecamatan);
  setExisting(params, "kode_kecamatan", opts.kodeKecamatan);
  return params;
}

/** Existing desa query params only: `id`, `kode`, `nama`, `kabupaten`, `kecamatan`. */
export function profilDesaSearchParams(opts: {
  id?: string | null;
  kode?: string | null;
  nama?: string | null;
  kabupaten?: string | null;
  kecamatan?: string | null;
}): URLSearchParams {
  const params = new URLSearchParams();
  setExisting(params, "id", opts.id);
  setExisting(params, "kode", opts.kode);
  setExisting(params, "nama", opts.nama);
  setExisting(params, "kabupaten", opts.kabupaten);
  setExisting(params, "kecamatan", opts.kecamatan);
  return params;
}

export function profilDesaApiPath(
  level: AreaProfilView,
  params: URLSearchParams
): string {
  const qs = params.toString();
  return qs ? `${AREA_PROFIL_ROUTES[level]}?${qs}` : AREA_PROFIL_ROUTES[level];
}
