import type { AreaLayerKey, MarkerLayerKey } from "./types";

export const qk = {
  liveStats: ["stats", "live"] as const,
  hazards: ["hazards"] as const,
  markers: (keys: MarkerLayerKey[]) => ["layers", "markers", ...keys] as const,
  area: (key: AreaLayerKey) => ["layers", "area", key] as const,
  irbi: ["irbi", "2025"] as const,
  kejadian: (params: Record<string, string | number | undefined>) =>
    ["kejadian", params] as const,
  anggaran: ["anggaran", "2026"] as const,
  publikasi: ["publikasi", "btt"] as const,
  r3pSummary: ["r3p", "summary"] as const,
  profilKecamatan: (params: {
    kabupaten?: string;
    kecamatan?: string;
    kodeKecamatan?: string;
  }) => ["profil-desa", "kecamatan", params] as const,
  profilDesa: (params: { kode?: string; id?: string; nama?: string }) =>
    ["profil-desa", "desa", params] as const,
  weather: ["weather"] as const,
};
