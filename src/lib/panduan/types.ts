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

export type GuideMatch = {
  intent: GuideIntentId;
  query: string;
  kabupaten?: string;
  jenis?: string;
  year?: number;
  reason?: GuideMatchReason;
};

export type GuideAnswer = {
  intent: GuideIntentId;
  body: string;
  links: GuideLink[];
  source?: string;
  tour?: GuideTourAction;
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
  | "krb";

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
    magmaEmpty: boolean;
    magmaSummary?: string;
    sipongiEmpty: boolean;
    sipongiCount: number;
    sipongiPlace?: string;
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
