import type { AreaLayerKey, MarkerLayerKey } from "./types";
import type { MapLayerKind, MapLayerSourceType } from "./supabase/types";

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
  | "groupFacilities"
  | "groupInfra"
  | "groupParticipation";

export type MarkerToolbarGroup = {
  groupKey: MarkerToolbarGroupKey;
  options: { key: MarkerLayerKey; labelKey: MarkerLayerKey }[];
};

/** Same order / keys as MapToolbar Lokasi — source of truth for live marker layers. */
export const MARKER_TOOLBAR_GROUPS: MarkerToolbarGroup[] = [
  {
    groupKey: "groupMain",
    options: [
      { key: "disasterEvents", labelKey: "disasterEvents" },
      { key: "facHealth", labelKey: "facHealth" },
      { key: "facEducation", labelKey: "facEducation" },
      { key: "policeOffices", labelKey: "policeOffices" },
    ],
  },
  {
    groupKey: "groupFacilities",
    options: [
      { key: "facGov", labelKey: "facGov" },
      { key: "facReligious", labelKey: "facReligious" },
    ],
  },
  {
    groupKey: "groupInfra",
    options: [
      { key: "infraRoadBridge", labelKey: "infraRoadBridge" },
      { key: "helipad", labelKey: "helipad" },
      { key: "starlink", labelKey: "starlink" },
    ],
  },
  {
    groupKey: "groupParticipation",
    options: [{ key: "citizenReports", labelKey: "citizenReports" }],
  },
];

export const AREA_TOOLBAR_OPTIONS: { key: AreaLayerKey; labelKey: string }[] = [
  { key: "villageDistribution", labelKey: "villageDistribution" },
  { key: "r3pDistribution", labelKey: "r3pDistribution" },
  { key: "irbi2025", labelKey: "irbi2025" },
  { key: "ngoDistribution", labelKey: "ngoDistribution" },
  { key: "regencyFundAllocation", labelKey: "regencyFundAllocation" },
];

export const LIVE_MARKER_LAYER_KEYS: MarkerLayerKey[] =
  MARKER_TOOLBAR_GROUPS.flatMap((g) => g.options.map((o) => o.key));

export const MAP_LAYERS_CATALOG: MapLayerCatalogEntry[] = [
  {
    key: "villageDistribution",
    kind: "area",
    title_id: "Distribusi desa",
    title_en: "Village distribution",
    description: "Choropleth desa / gampong (R3P rumah rusak).",
    source_path: "/fixtures/areas/villageDistribution.geojson",
    source_type: "pmtiles",
    pmtiles_path: "/tiles/village-r3p.pmtiles",
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
    pmtiles_path: "/tiles/r3p-kab.pmtiles",
    enabled: true,
    sort_order: 20,
    meta: { toolbar: "distribusi" },
  },
  {
    key: "irbi2025",
    kind: "area",
    title_id: "IRBI 2025 (risiko kab)",
    title_en: "IRBI 2025 (kab risk)",
    description: "Indeks Risiko Bencana Indonesia 2025 per kab/kota Aceh.",
    source_path: "/fixtures/areas/irbi2025.geojson",
    source_type: "pmtiles",
    pmtiles_path: "/tiles/irbi-2025.pmtiles",
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
    enabled: true,
    sort_order: 40,
    meta: { toolbar: "distribusi" },
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
    enabled: true,
    sort_order: 50,
    meta: { toolbar: "distribusi" },
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
    meta: { toolbar: "groupFacilities" },
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
    meta: { toolbar: "groupFacilities" },
  },
  {
    key: "infraRoadBridge",
    kind: "marker",
    title_id: "Jalan & jembatan",
    title_en: "Roads & bridges",
    description: "Titik infrastruktur jalan/jembatan terdampak.",
    source_path: "/fixtures/markers.geojson",
    source_type: "geojson",
    pmtiles_path: null,
    enabled: true,
    sort_order: 300,
    meta: { toolbar: "groupInfra" },
  },
  {
    key: "helipad",
    kind: "marker",
    title_id: "Helipad",
    title_en: "Helipads",
    description: "Titik helipad operasional.",
    source_path: "/fixtures/markers.geojson",
    source_type: "geojson",
    pmtiles_path: null,
    enabled: true,
    sort_order: 310,
    meta: { toolbar: "groupInfra" },
  },
  {
    key: "starlink",
    kind: "marker",
    title_id: "Starlink",
    title_en: "Starlink",
    description: "Titik terminal Starlink.",
    source_path: "/fixtures/markers.geojson",
    source_type: "geojson",
    pmtiles_path: null,
    enabled: true,
    sort_order: 320,
    meta: { toolbar: "groupInfra" },
  },
  {
    key: "citizenReports",
    kind: "marker",
    title_id: "Laporan warga",
    title_en: "Citizen reports",
    description: "Laporan partisipasi publik (fixture + laporan masyarakat).",
    source_path: "/fixtures/markers.geojson",
    source_type: "mixed",
    pmtiles_path: null,
    enabled: true,
    sort_order: 400,
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
];

const RETIRED_SET = new Set<string>(RETIRED_MARKER_LAYER_KEYS);

export function enabledMapLayersCatalog(): MapLayerCatalogEntry[] {
  return MAP_LAYERS_CATALOG.filter((row) => row.enabled && !RETIRED_SET.has(row.key));
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
    if (RETIRED_SET.has(row.key)) continue;
    if (!row.enabled) continue;
    if (localEnabled.some((l) => l.key === row.key)) continue;
    merged.push(row);
  }
  return merged;
}
