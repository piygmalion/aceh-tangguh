import type { AreaLayerKey, MarkerLayerKey } from "./types";
import type { MapLayerKind, MapLayerSourceType } from "./supabase/types";
import { overlayPmtilesUrl } from "./tiles-url";

/**
 * Local registry aligned with the map toolbar.
 * `map_layers` in Supabase should match these live keys.
 * Retired keys stay disabled so old ?layers= URLs still parse without
 * reappearing as enabled catalog defaults.
 */
export const RETIRED_MARKER_LAYER_KEYS = [
  "poskos",
  "tendPoints",
  "missingPersons",
] as const satisfies readonly MarkerLayerKey[];

/**
 * Fully removed layers — drop from remote catalog merges and leftover `?layers=` tokens.
 * `citizenReports` is aliased to `laporanKejadian` first (see map-url-aliases),
 * then treated like helipad/starlink so it never stays in the toolbar or URL.
 */
export const REMOVED_MARKER_LAYER_KEYS = [
  "helipad",
  "starlink",
  "citizenReports",
] as const;

export type MapLayerCatalogEntry = {
  key: string;
  kind: MapLayerKind;
  title_id: string;
  title_en: string;
  description: string;
  source_path: string | null;
  source_type: MapLayerSourceType;
  pmtiles_path: string | null;
  enabled: boolean;
  sort_order: number;
  meta: Record<string, unknown>;
};

export type MarkerToolbarGroupKey =
  | "groupMain"
  | "groupInfra"
  | "groupParticipation";

export type MarkerToolbarGroup = {
  groupKey: MarkerToolbarGroupKey;
  options: { key: MarkerLayerKey; labelKey: MarkerLayerKey }[];
};

/**
 * Public-facility children under the Data utama “Fasilitas Umum” nest.
 * UI-only nest — not a MarkerLayerKey. Order matches the Lokasi toolbar.
 */
export const FASILITAS_UMUM_LAYER_KEYS = [
  "facHealth",
  "facEducation",
  "policeOffices",
  "facGov",
  "facReligious",
] as const satisfies readonly MarkerLayerKey[];

/** Same order / keys as MapToolbar Lokasi top-level groups (nests listed separately). */
export const MARKER_TOOLBAR_GROUPS: MarkerToolbarGroup[] = [
  {
    groupKey: "groupMain",
    options: [{ key: "disasterEvents", labelKey: "disasterEvents" }],
  },
  {
    groupKey: "groupInfra",
    options: [{ key: "infraRoadBridge", labelKey: "infraRoadBridge" }],
  },
  {
    groupKey: "groupParticipation",
    options: [
      { key: "laporanKejadian", labelKey: "laporanKejadian" },
      { key: "laporanPenanganan", labelKey: "laporanPenanganan" },
    ],
  },
];

/**
 * Visible distribusi radios. Hardcoded (not map_layers.enabled).
 * Retired keys stay in AREA_LAYER_KEYS / parseAreaLayerKey so old ?area=
 * URLs still resolve, but they must not appear here as selectable radios.
 */
export const AREA_TOOLBAR_OPTIONS: { key: AreaLayerKey; labelKey: string }[] = [
  { key: "villageDistribution", labelKey: "villageDistribution" },
  { key: "irbi2025", labelKey: "irbi2025" },
];

export const LIVE_MARKER_LAYER_KEYS: MarkerLayerKey[] = [
  ...MARKER_TOOLBAR_GROUPS.flatMap((g) =>
    g.groupKey === "groupMain"
      ? [...g.options.map((o) => o.key), ...FASILITAS_UMUM_LAYER_KEYS]
      : g.options.map((o) => o.key)
  ),
];

export const MAP_LAYERS_CATALOG: MapLayerCatalogEntry[] = [
  {
    key: "villageDistribution",
    kind: "area",
    title_id: "Distribusi desa",
    title_en: "Village distribution",
    description: "Choropleth desa / gampong (R3P rumah rusak) with kab → kecamatan → desa zoom LOD.",
    source_path: "/fixtures/areas/villageDistribution.geojson",
    source_type: "pmtiles",
    pmtiles_path: overlayPmtilesUrl("village-r3p.pmtiles"),
    enabled: true,
    sort_order: 10,
    meta: { toolbar: "distribusi" },
  },
  {
    key: "r3pDistribution",
    kind: "area",
    title_id: "Distribusi R3P",
    title_en: "R3P distribution",
    description: "Choropleth kab/kota R3P (RR+RS+RB).",
    source_path: "/fixtures/areas/r3pDistribution.geojson",
    source_type: "pmtiles",
    pmtiles_path: overlayPmtilesUrl("r3p-kab.pmtiles"),
    enabled: false,
    sort_order: 20,
    meta: { toolbar: "distribusi", retired: true },
  },
  {
    key: "irbi2025",
    kind: "area",
    title_id: "IRBI 2025 (risiko kab)",
    title_en: "IRBI 2025 (kab risk)",
    description: "Indeks Risiko Bencana Indonesia 2025 per kab/kota Aceh.",
    source_path: "/fixtures/areas/irbi2025.geojson",
    source_type: "pmtiles",
    pmtiles_path: overlayPmtilesUrl("irbi-2025.pmtiles"),
    enabled: true,
    sort_order: 30,
    meta: { toolbar: "distribusi" },
  },
  {
    key: "ngoDistribution",
    kind: "area",
    title_id: "Distribusi NGO",
    title_en: "NGO distribution",
    description: "Sebaran kegiatan NGO per kab/kota.",
    source_path: "/fixtures/areas/ngoDistribution.geojson",
    source_type: "geojson",
    pmtiles_path: null,
    enabled: false,
    sort_order: 40,
    meta: { toolbar: "distribusi", retired: true },
  },
  {
    key: "regencyFundAllocation",
    kind: "area",
    title_id: "Alokasi dana kab/kota",
    title_en: "Regency fund allocation",
    description: "Alokasi dana penanganan per kab/kota.",
    source_path: "/fixtures/areas/regencyFundAllocation.geojson",
    source_type: "geojson",
    pmtiles_path: null,
    enabled: false,
    sort_order: 50,
    meta: { toolbar: "distribusi", retired: true },
  },
  {
    key: "disasterEvents",
    kind: "marker",
    title_id: "Kejadian bencana",
    title_en: "Disaster events",
    description: "Titik kejadian BPBA/BNPB/BMKG (termasuk episenter lepas pantai berflag).",
    source_path: "/fixtures/markers.geojson",
    source_type: "geojson",
    pmtiles_path: null,
    enabled: true,
    sort_order: 100,
    meta: { toolbar: "groupMain" },
  },
  {
    key: "facHealth",
    kind: "marker",
    title_id: "Fasilitas kesehatan",
    title_en: "Health facilities",
    description: "Fasyankes terdampak; sebagian koordinat approx ke sentroid kab.",
    source_path: "/fixtures/markers.geojson",
    source_type: "geojson",
    pmtiles_path: null,
    enabled: true,
    sort_order: 110,
    meta: { toolbar: "groupMain" },
  },
  {
    key: "facEducation",
    kind: "marker",
    title_id: "Fasilitas pendidikan",
    title_en: "Education facilities",
    description: "Sekolah terdampak; GPS jika ada, else sentroid kab (approx).",
    source_path: "/fixtures/markers.geojson",
    source_type: "geojson",
    pmtiles_path: null,
    enabled: true,
    sort_order: 120,
    meta: { toolbar: "groupMain" },
  },
  {
    key: "policeOffices",
    kind: "marker",
    title_id: "Kantor polisi",
    title_en: "Police offices",
    description: "Kantor polisi terdampak. Banyak lon/lat integer (coord_quality=truncated_integer).",
    source_path: "/fixtures/markers.geojson",
    source_type: "geojson",
    pmtiles_path: null,
    enabled: true,
    sort_order: 130,
    meta: { toolbar: "groupMain" },
  },
  {
    key: "facGov",
    kind: "marker",
    title_id: "Fasilitas pemerintahan",
    title_en: "Government facilities",
    description:
      "Kantor pemerintahan terdampak. Cakupan kab tidak lengkap — jangan mengarang titik.",
    source_path: "/fixtures/markers.geojson",
    source_type: "geojson",
    pmtiles_path: null,
    enabled: true,
    sort_order: 200,
    meta: { toolbar: "groupMain" },
  },
  {
    key: "facReligious",
    kind: "marker",
    title_id: "Fasilitas keagamaan",
    title_en: "Religious facilities",
    description:
      "Tempat ibadah terdampak. Cakupan kab tidak lengkap — jangan mengarang titik.",
    source_path: "/fixtures/markers.geojson",
    source_type: "geojson",
    pmtiles_path: null,
    enabled: true,
    sort_order: 210,
    meta: { toolbar: "groupMain" },
  },
  {
    key: "infraRoadBridge",
    kind: "marker",
    title_id: "Jembatan",
    title_en: "Bridges",
    description:
      "Layer toolbar Jembatan. Titik dari markers.geojson / marker_features — jangan mengarang inventaris terpisah.",
    source_path: "/fixtures/markers.geojson",
    source_type: "geojson",
    pmtiles_path: null,
    enabled: true,
    sort_order: 300,
    meta: { toolbar: "groupInfra" },
  },
  {
    key: "laporanKejadian",
    kind: "marker",
    title_id: "Laporan Kejadian",
    title_en: "Incident reports",
    description:
      "Live overlay from laporan_kejadian: status=approved AND tampil_di_peta=true. Empty until moderators publish a point.",
    source_path: "/api/laporan/peta",
    source_type: "api",
    pmtiles_path: null,
    enabled: true,
    sort_order: 400,
    meta: { toolbar: "groupParticipation" },
  },
  {
    key: "laporanPenanganan",
    kind: "marker",
    title_id: "Laporan Penanganan",
    title_en: "Response reports",
    description:
      "Live overlay from laporan_penanganan: status=approved AND tampil_di_peta=true. Empty until moderators publish a point.",
    source_path: "/api/laporan/peta",
    source_type: "api",
    pmtiles_path: null,
    enabled: true,
    sort_order: 410,
    meta: { toolbar: "groupParticipation" },
  },
  {
    key: "poskos",
    kind: "marker",
    title_id: "Posko",
    title_en: "Posts",
    description: "Dihapus dari Data Utama; key dipertahankan untuk URL lama.",
    source_path: null,
    source_type: "geojson",
    pmtiles_path: null,
    enabled: false,
    sort_order: 900,
    meta: { retired: true },
  },
  {
    key: "tendPoints",
    kind: "marker",
    title_id: "Titik pengungsian",
    title_en: "Shelter points",
    description: "Dihapus dari Data Utama; key dipertahankan untuk URL lama.",
    source_path: null,
    source_type: "geojson",
    pmtiles_path: null,
    enabled: false,
    sort_order: 910,
    meta: { retired: true },
  },
  {
    key: "missingPersons",
    kind: "marker",
    title_id: "Orang hilang",
    title_en: "Missing persons",
    description: "Dihapus dari Data Utama; key dipertahankan untuk URL lama.",
    source_path: null,
    source_type: "geojson",
    pmtiles_path: null,
    enabled: false,
    sort_order: 920,
    meta: { retired: true },
  },
  {
    key: "tatonasStations",
    kind: "overlay",
    title_id: "Pos hidrologi Tatonas",
    title_en: "Tatonas hydrology posts",
    description: "Live overlay pos muka air Tatonas (Aceh). Bukan marker toolbar Lokasi.",
    source_path: "/api/overlay/tatonasStations",
    source_type: "api",
    pmtiles_path: null,
    enabled: true,
    sort_order: 610,
    meta: { toolbar: "geospasial" },
  },
];

const RETIRED_SET = new Set<string>(RETIRED_MARKER_LAYER_KEYS);
const REMOVED_SET = new Set<string>(REMOVED_MARKER_LAYER_KEYS);

export function enabledMapLayersCatalog(): MapLayerCatalogEntry[] {
  return MAP_LAYERS_CATALOG.filter(
    (row) => row.enabled && !RETIRED_SET.has(row.key) && !REMOVED_SET.has(row.key)
  );
}

export function mergeMapLayersCatalog<T extends { key: string; enabled?: boolean }>(
  remote: T[] | null | undefined
): Array<T | MapLayerCatalogEntry> {
  const localEnabled = enabledMapLayersCatalog();
  const remoteByKey = new Map((remote ?? []).map((row) => [row.key, row]));
  const merged: Array<T | MapLayerCatalogEntry> = localEnabled.map(
    (local) => remoteByKey.get(local.key) ?? local
  );
  for (const row of remote ?? []) {
    if (RETIRED_SET.has(row.key) || REMOVED_SET.has(row.key)) continue;
    if (!row.enabled) continue;
    if (localEnabled.some((l) => l.key === row.key)) continue;
    merged.push(row);
  }
  return merged;
}
