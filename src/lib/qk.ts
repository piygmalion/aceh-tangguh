import type { AreaLayerKey, FeatureId, MarkerLayerKey } from "./types";

export const qk = {
  liveStats: ["stats", "live"] as const,
  hazards: ["hazards"] as const,
  markers: (keys: MarkerLayerKey[]) => ["layers", "markers", ...keys] as const,
  area: (key: AreaLayerKey) => ["layers", "area", key] as const,
  boundaries: (level: string, parent?: string) =>
    ["boundaries", level, parent ?? "root"] as const,
  feature: (id: FeatureId) => ["features", id] as const,
  reportTopics: ["reports", "topics"] as const,
  irbi: ["irbi", "2025"] as const,
  kejadian: (params: Record<string, string | number | undefined>) =>
    ["kejadian", params] as const,
  kejadianDetail: (id: string) => ["kejadian", "detail", id] as const,
  anggaran: ["anggaran", "2026"] as const,
  publikasi: ["publikasi", "btt"] as const,
  publikasiDetail: (slug: string) => ["publikasi", "detail", slug] as const,
  r3pSummary: ["r3p", "summary"] as const,
  profilKecamatan: (params: {
    kabupaten?: string;
    kecamatan?: string;
    kodeKecamatan?: string;
  }) => ["profil-desa", "kecamatan", params] as const,
  profilDesa: (params: { kode?: string; id?: string; nama?: string }) =>
    ["profil-desa", "desa", params] as const,
};
