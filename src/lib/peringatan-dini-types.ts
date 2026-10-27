import type { TatonasCard } from "@/lib/tatonas/types";

/** neutral = no alert, warn = WASPADA, siaga = SIAGA (orange), danger = AWAS only. */
export type PeringatanTone = "neutral" | "warn" | "siaga" | "danger";
export type PeringatanSource = "live" | "fixture" | "unavailable";
export type { TatonasCard, TatonasHighlight } from "@/lib/tatonas/types";

export type CuacaHighlight = {
  kabupaten: string;
  kondisi: string;
  curah_hujan_mm: number | null;
  periode: string | null;
  source_label: string;
};

export type CuacaWarningCard = {
  kind: "cuaca";
  tone: PeringatanTone;
  empty: boolean;
  highlights: CuacaHighlight[];
  extra_count: number;
  fetched_at: string;
  providers: string[];
  href: string;
  stale: boolean;
  source: PeringatanSource;
};

export type MagmaEvent = {
  id: string;
  magnitude: number | null;
  magnitude_text: string;
  waktu_kejadian: string;
  koordinat_kedalaman: string;
  wilayah: string;
  intensitas_mmi: string | null;
  gunung_api_terdekat: string | null;
  href: string;
  occurred_at: string | null;
};

export type MagmaCard = {
  kind: "magma";
  tone: PeringatanTone;
  empty: boolean;
  event: MagmaEvent | null;
  fetched_at: string | null;
  href: string;
  stale: boolean;
  source: PeringatanSource;
  example?: boolean;
};

export type SipongiPoint = {
  tanggal: string;
  sumber: string;
  desa: string;
  kecamatan: string;
  kabkota: string;
  confidence_level: "medium" | "high";
  occurred_at: string | null;
};

export type SipongiCard = {
  kind: "sipongi";
  tone: PeringatanTone;
  empty: boolean;
  points: SipongiPoint[];
  fetched_at: string | null;
  href: string;
  stale: boolean;
  source: PeringatanSource;
  example?: boolean;
};

export type MaritimHighlight = {
  kode: string | null;
  nama: string;
  wave_cat: string;
  wave_min_m: number | null;
  wave_max_m: number | null;
};

export type MaritimCard = {
  kind: "maritim";
  tone: PeringatanTone;
  empty: boolean;
  highlights: MaritimHighlight[];
  extra_count: number;
  valid_from: string | null;
  valid_to: string | null;
  issued: string | null;
  no_surat: string | null;
  fetched_at: string;
  href: string;
  map_href: string;
  stale: boolean;
  source: PeringatanSource;
};

export type PeringatanDiniResponse = {
  cuaca: CuacaWarningCard;
  magma: MagmaCard;
  sipongi: SipongiCard;
  tatonas: TatonasCard;
  maritim: MaritimCard;
};

export const MAGMA_HOME = "https://magma.esdm.go.id/";
export const MAGMA_VSI_HOME = "https://magma.vsi.esdm.go.id/";
export const SIPONGI_PETA = "https://sipongi.gakkum.kehutanan.go.id/peta";
export const SIPONGI_OPSROOM = "https://opsroom.sipongidata.my.id";
export const CUACA_HREF = "#cuaca";
export const PDGT_NASIONAL_URL =
  "https://www.bmkg.go.id/cuaca/maritim/peringatan-gelombang-tinggi";
export const MARITIM_MAP_HREF = "/peta?overlays=maritimeWaters";
export const MARITIME_WARNING_STATUS_ID = "__status__";

/** Official MAGMA homepages that expose (or may expose) `var markersGempa`. */
export const MAGMA_HOMES = [MAGMA_HOME, MAGMA_VSI_HOME] as const;

/** Fail-closed gempa card when live MAGMA cannot be read. Never copies a last-known event. */
export function unavailableMagmaCard(fetchedAt = new Date().toISOString()): MagmaCard {
  return {
    kind: "magma",
    tone: "neutral",
    empty: true,
    event: null,
    fetched_at: fetchedAt,
    href: MAGMA_HOME,
    stale: true,
    source: "unavailable",
  };
}

function baseMaritimCard(
  fetchedAt: string,
  source: PeringatanSource,
  stale: boolean,
): MaritimCard {
  return {
    kind: "maritim",
    tone: "neutral",
    empty: true,
    highlights: [],
    extra_count: 0,
    valid_from: null,
    valid_to: null,
    issued: null,
    no_surat: null,
    fetched_at: fetchedAt,
    href: PDGT_NASIONAL_URL,
    map_href: MARITIM_MAP_HREF,
    stale,
    source,
  };
}

/** Live bulletin with no Aceh / M.01 / M.03 waters. */
export function emptyMaritimCard(fetchedAt = new Date().toISOString()): MaritimCard {
  return baseMaritimCard(fetchedAt, "live", false);
}

/** Fail-closed when cron/upstream cannot be read. Never copies leftover waters or forecast slots. */
export function unavailableMaritimCard(fetchedAt = new Date().toISOString()): MaritimCard {
  return baseMaritimCard(fetchedAt, "unavailable", true);
}
