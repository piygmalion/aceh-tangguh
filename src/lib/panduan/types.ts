export type GuideLocale = "id" | "en";

export type GuideIntentId =
  | "tour"
  | "peringatan"
  | "cuaca"
  | "lapor"
  | "peta"
  | "destana"
  | "nomor"
  | "kejadian"
  | "analisisData"
  | "dibi"
  | "anggaran"
  | "irbi"
  | "krb"
  | "pelatihan"
  | "mitra"
  | "publikasi"
  | "metodologi"
  | "tentang"
  | "unknown";

export type GuideHref =
  | "/"
  | "/peta"
  | "/lapor"
  | "/lapor/kejadian"
  | "/lapor/penanganan"
  | "/data-bencana"
  | "/analisis-data"
  | "/anggaran-bencana"
  | "/publikasi"
  | "/destana"
  | "/nomor-penting"
  | "/pelatihan"
  | "/mitra"
  | "/sumber-data"
  | "/metodologi";

export type GuideLink = {
  href: GuideHref;
  hash?: string;
  labelKey: string;
  accent?: boolean;
};

export type GuideTourAction = {
  href: GuideHref;
  hash?: string;
};

export type GuideMatchReason = "emergency" | "out_of_scope" | "low_confidence";

export type GuideFaqHit = {
  id: string;
  bodyId: string;
  bodyEn: string;
  href: GuideHref;
  hash?: string;
  labelKey: string;
};

export type GuideSlots = {
  kabupaten?: string;
  jenis?: string;
  year?: number;
  lastIntent?: Exclude<GuideIntentId, "unknown">;
};

export type GuideMatch = {
  intent: GuideIntentId;
  query: string;
  kabupaten?: string;
  jenis?: string;
  year?: number;
  desa?: string;
  faq?: GuideFaqHit;
  reason?: GuideMatchReason;
};

export type GuideAnswer = {
  intent: GuideIntentId;
  body: string;
  links: GuideLink[];
  source?: string;
  tour?: GuideTourAction;
  lead?: string;
  clauses?: string[];
};

export type GuideContextKey =
  | "peringatan"
  | "weather"
  | "liveStats"
  | "sikStats"
  | "nomor"
  | "destana"
  | "kejadian"
  | "dibi"
  | "anggaran"
  | "irbi"
  | "krb"
  | "pelatihan"
  | "mitra"
  | "publikasi";

export type GuideNomorItem = {
  nama: string;
  telepon: string;
  kategori?: string;
  kabupaten?: string | null;
};

export type GuideKejadianItem = {
  id: string;
  jenis: string;
  kabupaten?: string;
  tanggal?: string;
  nama?: string;
};

export type GuideContext = {
  peringatan?: {
    cuacaEmpty: boolean;
    cuacaTone: string;
    cuacaHighlight?: string;
    cuacaUnmatched?: string;
    magmaEmpty: boolean;
    magmaSummary?: string;
    magmaSource?: "live" | "fixture" | "unavailable";
    sipongiEmpty: boolean;
    sipongiCount: number;
    sipongiPlace?: string;
    sipongiUnmatched?: string;
    tatonasEmpty: boolean;
    tatonasHighlight?: string;
    tatonasLevel?: string;
    stale: boolean;
    fetchedAt?: string;
  } | null;
  weather?: {
    kabupaten: string;
    desc: string;
    tempC: number | null;
    fetchedAt?: string;
  } | null;
  liveStats?: {
    activeIncidents: number;
    reportsLast24h: number;
    updatedAt?: string;
  } | null;
  sikStats?: {
    total: number;
    year: number;
    byJenis: { jenis: string; count: number }[];
  } | null;
  nomor?: GuideNomorItem[] | null;
  destana?: {
    counts: Record<string, number>;
  } | null;
  destanaDesa?: {
    nama: string;
    kabupaten?: string;
    kecamatan?: string;
    destanaLevel?: string;
  } | null;
  pelatihan?: { judul: string; tanggal?: string; status?: string }[] | null;
  mitra?: { judul: string }[] | null;
  publikasi?: { title: string; channel: "analisis" | "kegiatan" }[] | null;
  kejadian?: {
    total: number;
    items: GuideKejadianItem[];
  } | null;
  dibi?: {
    kejadian: number;
    yearFrom: number;
    yearTo: number;
    topKategori?: string;
    meninggal?: number;
    fetchedAt?: string;
  } | null;
  anggaran?: {
    tahun: number;
    totalRp: number;
    kegiatan: number;
  } | null;
  irbi?: {
    kab?: string;
    kelas?: string;
    irb?: number;
    provinsiKelas?: string;
    provinsiIrb?: number;
  } | null;
  krb?: {
    kawasanCount?: number;
    kabupaten?: string;
  } | null;
  failed: GuideContextKey[];
};
