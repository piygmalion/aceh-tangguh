import type { AreaLayerKey, MarkerLayerKey, OverlayLayerKey } from "./types";

export const qk = {
  liveStats: ["stats", "live"] as const,
  markers: (keys: MarkerLayerKey[]) => ["layers", "markers", ...keys] as const,
  area: (key: AreaLayerKey) => ["layers", "area", key] as const,
  irbi: ["irbi", "2025"] as const,
  krb: ["krb", "aceh"] as const,
  kejadian: (params: Record<string, string | number | undefined>) =>
    ["kejadian", params] as const,
  kejadianAnalisis: (params: Record<string, string | number | undefined>) =>
    ["kejadian", "analisis", params] as const,
  anggaran: ["anggaran", "2026"] as const,
  publikasi: ["publikasi", "btt"] as const,
  publikasiKegiatan: ["publikasi", "kegiatan"] as const,
  r3pSummary: ["r3p", "summary"] as const,
  prrpkaSummary: ["prrpka", "summary"] as const,
  profilKabupaten: (params: {
    kabupaten?: string;
    kodeKabupaten?: string;
  }) => ["profil-desa", "kabupaten", params] as const,
  profilKecamatan: (params: {
    kabupaten?: string;
    kecamatan?: string;
    kodeKecamatan?: string;
  }) => ["profil-desa", "kecamatan", params] as const,
  profilDesa: (params: { kode?: string; id?: string; nama?: string }) =>
    ["profil-desa", "desa", params] as const,
  weather: ["weather"] as const,
  weatherInovasi: ["weather", "inovasi"] as const,
  dibiAceh: ["dibi", "aceh"] as const,
  peringatanDini: ["peringatan-dini"] as const,
  sikStats: (year: string, kabupaten: string, jenis: string) =>
    ["sik", "stats", year, kabupaten, jenis] as const,
  overlay: (key: OverlayLayerKey) => ["overlay", key] as const,
  overlayPort: (kode: string) => ["overlay", "port", kode] as const,
};
