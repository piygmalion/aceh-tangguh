export type PeringatanTone = "neutral" | "warn" | "danger";
export type PeringatanSource = "live" | "fixture";

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

export type PeringatanDiniResponse = {
  cuaca: CuacaWarningCard;
  magma: MagmaCard;
  sipongi: SipongiCard;
};

export const MAGMA_HOME = "https://magma.esdm.go.id/";
export const MAGMA_VSI_HOME = "https://magma.vsi.esdm.go.id/";
export const SIPONGI_PETA = "https://sipongi.gakkum.kehutanan.go.id/peta";
export const SIPONGI_OPSROOM = "https://opsroom.sipongidata.my.id";
export const CUACA_HREF = "#cuaca";
