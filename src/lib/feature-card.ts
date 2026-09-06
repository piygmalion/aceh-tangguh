/**
 * FeatureCard DTO — one template, many point sources.
 *
 * Column inventory (ETL, not invented):
 * - public/fixtures/markers.geojson: facHealth (jenis, skala_kerusakan, alamat),
 *   facReligious/facGov (jenis_fasilitas_nama, skala_kerusakan, telepon, alamat),
 *   policeOffices (jenis_kantor, telepon, skala_kerusakan, alamat),
 *   facEducation (jenjang, alamat, status), disasterEvents (jenis_bencana, hari_tanggal, dampak),
 *   infraRoadBridge (status, notes)
 * - laporan public columns: KEJADIAN_PUBLIC_COLUMNS / PENANGANAN_PUBLIC_COLUMNS
 * - overlay fixtures: code/kode_bmkg, Segment, stakeholder, magnitude, …
 *
 * Quarantined drive-clean faskes/polsek/pengungsian are not a source.
 * Kontak only if already on a public allowlisted property.
 */

import type { Feature, FeatureCollection } from "geojson";
import {
  COORD_QUALITY_OFFSHORE,
  COORD_QUALITY_TRUNCATED,
  readCoordQuality,
  type CoordQuality,
} from "./coord-quality";
import { formatStatusLabel, normalizeStatus, statusTone } from "./status-vocab";
import { isOverlayLayerKey } from "./overlay-layers";
import type { MarkerLayerKey, OverlayLayerKey } from "./types";

export const FEATURE_CARD_EMPTY = "Tidak ada informasi";
export const FEATURE_CARD_NO_DAMAGE = "Tidak ada kerusakan";

/** Never copied onto a public card — laporan PII / free-text dump. */
export const FEATURE_CARD_DENIED_KEYS = [
  "jawaban_json",
  "pelapor",
  "pelapor_id",
  "nik",
  "nama_pelapor",
  "email",
  "telepon_enc",
  "catatan_moderator",
  "kontak_internal",
] as const;

/**
 * Layers whose public GeoJSON already carries `telepon`.
 * Do not add facHealth — the public fixture has no phone column.
 */
export const FEATURE_CARD_PUBLIC_CONTACT_LAYERS = new Set<string>([
  "policeOffices",
  "facGov",
  "facReligious",
]);

export type FeatureCardTone = "default" | "ok" | "warn" | "danger";

export type FeatureCardMedia = { url: string; alt?: string };

export type FeatureCardDetail = {
  key: string;
  label: string;
  value: string;
  tone?: FeatureCardTone;
};

export type FeatureCardStackItem = { id: string; title: string };

export type FeatureCard = {
  id: string;
  layer: string;
  category: string;
  categoryKey: string;
  title: string;
  subtitle?: string;
  updatedAt?: string;
  address?: string;
  media: FeatureCardMedia[];
  details: FeatureCardDetail[];
  coordQuality?: "truncated" | "offshore" | null;
  stack?: FeatureCardStackItem[];
};

type FieldRole = "address" | "media" | "contact" | "detail" | "updated";

type CatalogField = {
  key: string;
  label: string;
  aliases: string[];
  presence: "required" | "optional";
  role: FieldRole;
  toneFrom?: "status" | "kerusakan";
};

type LayerCatalog = {
  category: string;
  categoryKey: string;
  layerLabel: string;
  fields: CatalogField[];
};

const EMPTY_SENTINELS = new Set([
  "",
  "-",
  "—",
  "n/a",
  "na",
  "null",
  "undefined",
  "tidak ada informasi",
  "tidak_diketahui",
  "alamat tidak ditemukan",
]);

const ADDRESS_ALIASES = ["alamat", "address", "lokasi"];
const TYPE_ALIASES = [
  "tipe",
  "jenis",
  "jenis_fasilitas",
  "jenis_fasilitas_nama",
  "jenis_kantor",
  "jenjang",
];
const DAMAGE_ALIASES = [
  "tingkat_kerusakan",
  "kerusakan",
  "skala_kerusakan",
  "skala_kerusakan_label",
];
const STATUS_ALIASES = ["status", "status_operasional", "status_label"];
const CONTACT_ALIASES = ["kontak", "telepon"];
const MEDIA_ALIASES = [
  "media",
  "foto",
  "photo",
  "gambar",
  "photos",
  "images",
  "url_foto",
];
const UPDATED_ALIASES = [
  "updated_at",
  "submitted_at",
  "waktu_kejadian",
  "tanggal_penanganan",
  "hari_tanggal",
  "issued",
  "occurred_at",
  "time_local",
];

const DAMAGE_LABELS: Record<string, string> = {
  tidak_rusak: FEATURE_CARD_NO_DAMAGE,
  rusak_ringan: "Rusak ringan",
  rusak_sedang: "Rusak sedang",
  rusak_berat: "Rusak berat",
  kerusakan_kecil: "Kerusakan kecil",
};

function field(
  key: string,
  label: string,
  aliases: string[],
  presence: "required" | "optional",
  role: FieldRole,
  toneFrom?: "status" | "kerusakan",
): CatalogField {
  return { key, label, aliases, presence, role, toneFrom };
}

function facilityFields(opts: {
  typeRequired?: boolean;
  damageRequired?: boolean;
  statusRequired?: boolean;
  contact?: boolean;
  typeAliases?: string[];
  extra?: CatalogField[];
}): CatalogField[] {
  const out: CatalogField[] = [
    field("tipe", "Tipe", opts.typeAliases ?? TYPE_ALIASES, opts.typeRequired === false ? "optional" : "required", "detail"),
    field(
      "tingkatKerusakan",
      "Tingkat kerusakan",
      DAMAGE_ALIASES,
      opts.damageRequired === false ? "optional" : "required",
      "detail",
      "kerusakan",
    ),
    field(
      "statusOperasional",
      "Status operasional",
      STATUS_ALIASES,
      opts.statusRequired ? "required" : "optional",
      "detail",
      "status",
    ),
    field("address", "Alamat", ADDRESS_ALIASES, "optional", "address"),
    field("updatedAt", "Diperbarui", UPDATED_ALIASES, "optional", "updated"),
    field("media", "Media", MEDIA_ALIASES, "optional", "media"),
  ];
  if (opts.contact) {
    out.push(field("kontak", "Kontak", CONTACT_ALIASES, "optional", "contact"));
  }
  if (opts.extra) out.push(...opts.extra);
  return out;
}

const DEFAULT_CATALOG: LayerCatalog = {
  category: "TITIK",
  categoryKey: "lokasi",
  layerLabel: "Titik",
  fields: [
    field("tipe", "Tipe", TYPE_ALIASES, "optional", "detail"),
    field("statusOperasional", "Status", STATUS_ALIASES, "optional", "detail", "status"),
    field("address", "Alamat", ADDRESS_ALIASES, "optional", "address"),
    field("updatedAt", "Diperbarui", UPDATED_ALIASES, "optional", "updated"),
    field("media", "Media", MEDIA_ALIASES, "optional", "media"),
  ],
};

const LAYER_CATALOG: Record<string, LayerCatalog> = {
  facHealth: {
    category: "FASILITAS KESEHATAN",
    categoryKey: "categoryFacHealth",
    layerLabel: "Fasilitas Kesehatan",
    fields: facilityFields({ typeRequired: true, damageRequired: true }),
  },
  facReligious: {
    category: "RUMAH IBADAH",
    categoryKey: "categoryFacReligious",
    layerLabel: "Rumah Ibadah",
    fields: facilityFields({ typeRequired: true, damageRequired: true, contact: true }),
  },
  policeOffices: {
    category: "KANTOR POLISI",
    categoryKey: "categoryPoliceOffices",
    layerLabel: "Kantor Polisi",
    fields: facilityFields({
      typeRequired: true,
      damageRequired: true,
      statusRequired: true,
      contact: true,
      typeAliases: ["jenis_kantor", "sub_jenis_kantor", ...TYPE_ALIASES],
    }),
  },
  facGov: {
    category: "FASILITAS PEMERINTAHAN",
    categoryKey: "categoryFacGov",
    layerLabel: "Fasilitas Pemerintahan",
    fields: facilityFields({ typeRequired: true, damageRequired: true, contact: true }),
  },
  facEducation: {
    category: "FASILITAS PENDIDIKAN",
    categoryKey: "categoryFacEducation",
    layerLabel: "Fasilitas Pendidikan",
    fields: [
      field("jenjang", "Jenjang", ["jenjang", ...TYPE_ALIASES], "required", "detail"),
      field("statusOperasional", "Status", STATUS_ALIASES, "optional", "detail", "status"),
      field("ruangKelasRusak", "Ruang kelas rusak", ["ruang_kelas_rusak"], "optional", "detail"),
      field("address", "Alamat", ADDRESS_ALIASES, "optional", "address"),
      field("updatedAt", "Diperbarui", UPDATED_ALIASES, "optional", "updated"),
      field("media", "Media", MEDIA_ALIASES, "optional", "media"),
    ],
  },
  disasterEvents: {
    category: "KEJADIAN BENCANA",
    categoryKey: "categoryDisasterEvents",
    layerLabel: "Kejadian Bencana",
    fields: [
      field("jenisBencana", "Jenis bencana", ["jenis_bencana", "jenisBencana"], "required", "detail"),
      field("statusOperasional", "Status", STATUS_ALIASES, "optional", "detail", "status"),
      field("jiwaTerdampak", "Jiwa terdampak", ["jiwa_terdampak"], "optional", "detail"),
      field("kkTerdampak", "KK terdampak", ["kk_terdampak"], "optional", "detail"),
      field("pengungsi", "Pengungsi", ["pengungsi"], "optional", "detail"),
      field("meninggal", "Meninggal", ["meninggal"], "optional", "detail"),
      field("kronologi", "Kronologi", ["kronologi"], "optional", "detail"),
      field("address", "Alamat", ADDRESS_ALIASES, "optional", "address"),
      field("updatedAt", "Diperbarui", UPDATED_ALIASES, "optional", "updated"),
      field("media", "Media", MEDIA_ALIASES, "optional", "media"),
    ],
  },
  infraRoadBridge: {
    category: "JEMBATAN",
    categoryKey: "categoryInfraRoadBridge",
    layerLabel: "Jembatan",
    fields: [
      field("statusOperasional", "Status", STATUS_ALIASES, "required", "detail", "status"),
      field("tingkatKerusakan", "Tingkat kerusakan", DAMAGE_ALIASES, "optional", "detail", "kerusakan"),
      field("address", "Alamat", ADDRESS_ALIASES, "optional", "address"),
      field("updatedAt", "Diperbarui", UPDATED_ALIASES, "optional", "updated"),
      field("media", "Media", MEDIA_ALIASES, "optional", "media"),
    ],
  },
  laporanKejadian: {
    category: "LAPORAN KEJADIAN",
    categoryKey: "categoryLaporanKejadian",
    layerLabel: "Laporan Kejadian",
    fields: [
      field("nomorLaporan", "Nomor laporan", ["nomor_laporan"], "optional", "detail"),
      field("jenisBencana", "Jenis bencana", ["jenis_bencana"], "required", "detail"),
      field("urgensi", "Skor urgensi", ["skor_urgensi"], "optional", "detail"),
      field("statusOperasional", "Status", STATUS_ALIASES, "optional", "detail", "status"),
      field("address", "Alamat", ADDRESS_ALIASES, "optional", "address"),
      field("updatedAt", "Diperbarui", UPDATED_ALIASES, "optional", "updated"),
      field("media", "Media", MEDIA_ALIASES, "optional", "media"),
    ],
  },
  laporanPenanganan: {
    category: "LAPORAN PENANGANAN",
    categoryKey: "categoryLaporanPenanganan",
    layerLabel: "Laporan Penanganan",
    fields: [
      field("nomorLaporan", "Nomor laporan", ["nomor_laporan"], "optional", "detail"),
      field("jenisBencana", "Jenis bencana", ["jenis_bencana"], "required", "detail"),
      field("fasePenanganan", "Fase penanganan", ["fase_penanganan"], "optional", "detail"),
      field("kebutuhanSisa", "Kebutuhan sisa", ["status_kebutuhan_sisa"], "optional", "detail"),
      field("tanggalPenanganan", "Tanggal penanganan", ["tanggal_penanganan"], "optional", "detail"),
      field("statusOperasional", "Status", STATUS_ALIASES, "optional", "detail", "status"),
      field("address", "Alamat", ADDRESS_ALIASES, "optional", "address"),
      field("updatedAt", "Diperbarui", UPDATED_ALIASES, "optional", "updated"),
      field("media", "Media", MEDIA_ALIASES, "optional", "media"),
    ],
  },
  tendPoints: {
    category: "TITIK PENGUNGSIAN",
    categoryKey: "categoryTendPoints",
    layerLabel: "Titik Pengungsian",
    fields: [
      field("kapasitas", "Kapasitas", ["kapasitas"], "optional", "detail"),
      field("address", "Alamat", ADDRESS_ALIASES, "optional", "address"),
      field("updatedAt", "Diperbarui", UPDATED_ALIASES, "optional", "updated"),
    ],
  },
  poskos: {
    category: "POSKO",
    categoryKey: "categoryPoskos",
    layerLabel: "Posko",
    fields: DEFAULT_CATALOG.fields,
  },
  missingPersons: {
    category: "ORANG HILANG",
    categoryKey: "categoryMissingPersons",
    layerLabel: "Orang Hilang",
    fields: DEFAULT_CATALOG.fields,
  },
  maritimePorts: {
    category: "PELABUHAN",
    categoryKey: "categoryMaritimePorts",
    layerLabel: "Pelabuhan",
    fields: [
      field("kode", "Kode", ["kode_bmkg", "code", "kode"], "optional", "detail"),
      field("cuaca", "Cuaca", ["weather"], "optional", "detail"),
      field("gelombang", "Gelombang", ["wave_cat"], "optional", "detail"),
      field("tinggiGelombang", "Tinggi gelombang", ["wave_height"], "optional", "detail"),
      field("angin", "Angin", ["wind_from", "wind"], "optional", "detail"),
      field("updatedAt", "Diperbarui", UPDATED_ALIASES, "optional", "updated"),
    ],
  },
  maritimeWaters: {
    category: "PERAIRAN",
    categoryKey: "categoryMaritimeWaters",
    layerLabel: "Perairan",
    fields: [
      field("kode", "Kode", ["kode", "ID_MAR"], "optional", "detail"),
      field("cuaca", "Cuaca", ["weather"], "optional", "detail"),
      field("gelombang", "Gelombang", ["wave_cat"], "optional", "detail"),
      field("updatedAt", "Diperbarui", UPDATED_ALIASES, "optional", "updated"),
    ],
  },
  bmkgQuakes: {
    category: "GEMPA BMKG",
    categoryKey: "categoryBmkgQuakes",
    layerLabel: "Gempa BMKG",
    fields: [
      field("magnitudo", "Magnitudo", ["magnitude", "status"], "optional", "detail"),
      field("kedalaman", "Kedalaman", ["kedalaman", "depth"], "optional", "detail"),
      field("potensi", "Potensi", ["potensi"], "optional", "detail"),
      field("updatedAt", "Diperbarui", ["waktu", ...UPDATED_ALIASES], "optional", "updated"),
    ],
  },
  magmaQuakes: {
    category: "GEMPA MAGMA",
    categoryKey: "categoryMagmaQuakes",
    layerLabel: "Gempa MAGMA",
    fields: [
      field("magnitudo", "Magnitudo", ["magnitude", "status"], "optional", "detail"),
      field("kedalaman", "Kedalaman", ["depth", "kedalaman"], "optional", "detail"),
      field("updatedAt", "Diperbarui", UPDATED_ALIASES, "optional", "updated"),
    ],
  },
  magmaVolcanoes: {
    category: "GUNUNG API",
    categoryKey: "categoryMagmaVolcanoes",
    layerLabel: "Gunung api",
    fields: [
      field("magnitudo", "Magnitudo", ["magnitude", "status"], "optional", "detail"),
      field("kedalaman", "Kedalaman", ["depth"], "optional", "detail"),
      field("updatedAt", "Diperbarui", UPDATED_ALIASES, "optional", "updated"),
    ],
  },
  sipongiHotspots: {
    category: "HOTSPOT",
    categoryKey: "categorySipongiHotspots",
    layerLabel: "Hotspot",
    fields: [
      field("statusOperasional", "Keyakinan", ["status"], "optional", "detail"),
      field("updatedAt", "Diperbarui", ["tanggal", ...UPDATED_ALIASES], "optional", "updated"),
    ],
  },
  tatonasStations: {
    category: "POS HIDROLOGI",
    categoryKey: "categoryTatonasStations",
    layerLabel: "Pos hidrologi",
    fields: [
      field("tipe", "Tipe", ["jenis"], "optional", "detail"),
      field("statusOperasional", "Status", ["level", "status"], "optional", "detail"),
      field("updatedAt", "Diperbarui", UPDATED_ALIASES, "optional", "updated"),
    ],
  },
  seismicSensors: {
    category: "SENSOR SEISMIK",
    categoryKey: "categorySeismicSensors",
    layerLabel: "Sensor seismik",
    fields: [
      field("stakeholder", "Pengelola", ["stakeholder"], "optional", "detail"),
      field("uptbmkg", "UPT BMKG", ["uptbmkg"], "optional", "detail"),
    ],
  },
  inariskSumateraFault: {
    category: "SESAR SUMATERA",
    categoryKey: "categoryInariskSumateraFault",
    layerLabel: "Sesar Sumatera",
    fields: [
      field("segmen", "Segmen", ["Segment", "segmen"], "optional", "detail"),
      field("tipeSesar", "Tipe sesar", ["Type"], "optional", "detail"),
      field("mmax", "Mmax", ["Mmax_d"], "optional", "detail"),
    ],
  },
  inariskMegathrust: {
    category: "MEGATHRUST",
    categoryKey: "categoryInariskMegathrust",
    layerLabel: "Megathrust",
    fields: [field("kode", "Nama", ["Name", "name", "title"], "optional", "detail")],
  },
  irbiKawasan: {
    category: "KAWASAN BERNAMA",
    categoryKey: "categoryKrbKawasan",
    layerLabel: "Kawasan bernama",
    fields: [
      field("jenisBencana", "Jenis bahaya", ["jenis_bahaya"], "optional", "detail"),
      field("statusOperasional", "Zona", ["zona", "status"], "optional", "detail"),
    ],
  },
};

export function layerCatalog(layer: string): LayerCatalog {
  return LAYER_CATALOG[layer] ?? DEFAULT_CATALOG;
}

export function isDeniedFeatureCardKey(key: string): boolean {
  const folded = key.trim().toLowerCase();
  return FEATURE_CARD_DENIED_KEYS.some((denied) => folded.includes(denied));
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function publicProperties(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (isDeniedFeatureCardKey(key)) continue;
    out[key] = value;
  }
  return out;
}

export function isEmptyCardValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "boolean") return false;
  if (typeof value === "number") return !Number.isFinite(value);
  if (Array.isArray(value)) return value.length === 0;
  const text = String(value).trim();
  if (!text) return true;
  return EMPTY_SENTINELS.has(text.toLowerCase());
}

function firstAliased(props: Record<string, unknown>, aliases: string[]): unknown {
  for (const alias of aliases) {
    if (isDeniedFeatureCardKey(alias)) continue;
    if (alias in props && !isEmptyCardValue(props[alias])) return props[alias];
  }
  return undefined;
}

function formatTypeValue(raw: unknown): string {
  const text = String(raw).trim();
  const pretty: Record<string, string> = {
    puskesmas: "Puskesmas",
    pustu: "Pustu",
    rsud: "RSUD",
    rumah_sakit: "Rumah sakit",
    masjid: "Masjid",
    mushola: "Mushola",
    musholla: "Mushola",
    polsek: "Polsek",
    polres: "Polres",
    polda: "Polda",
    kecamatan: "Kecamatan",
    kelurahan_kantor_desa: "Kelurahan / kantor desa",
    polsek_rural: "Polsek",
  };
  return pretty[text.toLowerCase()] ?? text;
}

function formatDamageValue(raw: unknown): string {
  const text = String(raw).trim();
  const folded = text.toLowerCase().replace(/\s+/g, "_");
  if (DAMAGE_LABELS[folded]) return DAMAGE_LABELS[folded];
  if (folded === "tidak_diketahui") return FEATURE_CARD_EMPTY;
  return text;
}

function toneFromStatus(raw: unknown, layer: string): FeatureCardTone {
  const n = normalizeStatus(raw, layer);
  const tone = statusTone(n);
  if (tone === "ok") return "ok";
  if (tone === "warn") return "warn";
  if (tone === "danger") return "danger";
  return "default";
}

function toneFromDamage(raw: unknown): FeatureCardTone {
  const folded = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (folded === "tidak_rusak" || folded.includes("tidak_ada_kerusakan")) return "ok";
  if (folded.includes("berat") || folded.includes("hancur") || folded.includes("terputus")) {
    return "danger";
  }
  if (folded.includes("ringan") || folded.includes("sedang") || folded.includes("kecil")) {
    return "warn";
  }
  return "default";
}

function formatDetailValue(field: CatalogField, raw: unknown, layer: string): string {
  if (field.toneFrom === "kerusakan") return formatDamageValue(raw);
  if (field.key === "tipe" || field.key === "jenjang") return formatTypeValue(raw);
  if (field.toneFrom === "status") {
    const n = normalizeStatus(raw, layer);
    if (n.empty) return FEATURE_CARD_EMPTY;
    return formatStatusLabel(n);
  }
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  return String(raw).trim();
}

function formatCardDate(raw: unknown): string | undefined {
  if (isEmptyCardValue(raw)) return undefined;
  const text = String(raw).trim();
  const ms = Date.parse(text);
  if (Number.isFinite(ms) && /^\d{4}-\d{2}-\d{2}/.test(text)) {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(ms));
  }
  return text;
}

function isPublicMediaUrl(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) {
    return value.startsWith("/uploads/") || value.startsWith("/fixtures/") || value.startsWith("/icons/");
  }
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function extractPublicMedia(raw: unknown): FeatureCardMedia[] {
  const items: unknown[] = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
  const out: FeatureCardMedia[] = [];
  for (const item of items) {
    if (typeof item === "string" && isPublicMediaUrl(item.trim())) {
      out.push({ url: item.trim() });
      continue;
    }
    if (item && typeof item === "object") {
      const rec = item as { url?: unknown; alt?: unknown };
      if (typeof rec.url === "string" && isPublicMediaUrl(rec.url.trim())) {
        out.push({
          url: rec.url.trim(),
          alt: typeof rec.alt === "string" ? rec.alt : undefined,
        });
      }
    }
  }
  return out;
}

function placeLine(props: Record<string, unknown>): string | undefined {
  const parts = [props.desa, props.kelurahan, props.kecamatan, props.kabupaten, props.kabupaten_kota]
    .map((v) => (isEmptyCardValue(v) ? "" : String(v).trim()))
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  return Array.from(new Set(parts)).join(", ");
}

function coordQualityOf(props: Record<string, unknown>): FeatureCard["coordQuality"] {
  const q = readCoordQuality(props);
  if (q === COORD_QUALITY_TRUNCATED) return "truncated";
  if (q === COORD_QUALITY_OFFSHORE) return "offshore";
  return q ? "truncated" : null;
}

export function featurePublicId(feature: Feature, fallback = ""): string {
  const props = asRecord(feature.properties);
  const candidates = [feature.id, props.id, props.featureId, props.code, props.kode_bmkg, props.kode];
  for (const value of candidates) {
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return fallback;
}

export function featureMatchesPublicId(feature: Feature, id: string): boolean {
  const want = id.trim();
  if (!want) return false;
  const props = asRecord(feature.properties);
  const candidates = [feature.id, props.id, props.featureId, props.code, props.kode_bmkg, props.kode];
  return candidates.some((value) => value != null && String(value).trim() === want);
}

export function toFeatureCard(
  feature: Feature,
  options: { stack?: FeatureCardStackItem[] } = {},
): FeatureCard {
  const rawProps = asRecord(feature.properties);
  const props = publicProperties(rawProps);
  const layer = String(props.layer ?? "disasterEvents");
  const catalog = layerCatalog(layer);
  const id = featurePublicId(feature);
  const title = String(props.title ?? props.name ?? props.perairan ?? "Titik").trim() || "Titik";

  let address: string | undefined;
  let updatedAt: string | undefined;
  const media: FeatureCardMedia[] = [];
  const details: FeatureCardDetail[] = [];
  let damageLabel: string | undefined;
  let statusLabel: string | undefined;

  for (const item of catalog.fields) {
    if (item.role === "contact" && !FEATURE_CARD_PUBLIC_CONTACT_LAYERS.has(layer)) {
      continue;
    }
    const raw = firstAliased(props, item.aliases);
    if (item.role === "address") {
      const fromAlias = isEmptyCardValue(raw) ? undefined : String(raw).trim();
      address = fromAlias ?? placeLine(props);
      continue;
    }
    if (item.role === "updated") {
      updatedAt = formatCardDate(raw);
      continue;
    }
    if (item.role === "media") {
      media.push(...extractPublicMedia(raw));
      continue;
    }
    if (item.role === "contact") {
      if (isEmptyCardValue(raw)) continue;
      details.push({
        key: item.key,
        label: item.label,
        value: String(raw).trim(),
      });
      continue;
    }
    if (isEmptyCardValue(raw)) {
      if (item.presence === "required") {
        details.push({
          key: item.key,
          label: item.label,
          value: FEATURE_CARD_EMPTY,
        });
      }
      continue;
    }
    const value = formatDetailValue(item, raw, layer);
    if (item.toneFrom === "kerusakan") damageLabel = value;
    if (item.toneFrom === "status" || item.key === "statusOperasional") statusLabel = value;
    const tone =
      item.toneFrom === "kerusakan"
        ? toneFromDamage(raw)
        : item.toneFrom === "status"
          ? toneFromStatus(raw, layer)
          : undefined;
    details.push({
      key: item.key,
      label: item.label,
      value,
      ...(tone && tone !== "default" ? { tone } : {}),
    });
  }

  const subtitleParts = [catalog.layerLabel, damageLabel ?? statusLabel].filter(
    (part) => part && part !== FEATURE_CARD_EMPTY,
  );
  const subtitle = subtitleParts.length ? subtitleParts.join(" • ") : undefined;

  return {
    id,
    layer,
    category: catalog.category,
    categoryKey: catalog.categoryKey,
    title,
    subtitle,
    updatedAt,
    address,
    media,
    details,
    coordQuality: coordQualityOf(props),
    stack: options.stack?.length ? options.stack : undefined,
  };
}

export type FeatureCardQuality = {
  n: number;
  addressEmptyPct: number;
  kerusakanEmptyPct: number;
  missingUpdatedAtPct: number;
};

/** Coverage only — does not invent values or fail ingest. */
export function featureCardQuality(features: Feature[]): FeatureCardQuality {
  let addressEmpty = 0;
  let kerusakanEmpty = 0;
  let missingUpdated = 0;
  const n = features.length;
  for (const feature of features) {
    const card = toFeatureCard(feature);
    if (!card.address) addressEmpty += 1;
    const damage = card.details.find((d) => d.key === "tingkatKerusakan");
    if (!damage || damage.value === FEATURE_CARD_EMPTY) kerusakanEmpty += 1;
    if (!card.updatedAt) missingUpdated += 1;
  }
  const pct = (count: number) => (n === 0 ? 0 : Math.round((count / n) * 1000) / 10);
  return {
    n,
    addressEmptyPct: pct(addressEmpty),
    kerusakanEmptyPct: pct(kerusakanEmpty),
    missingUpdatedAtPct: pct(missingUpdated),
  };
}

export function isMarkerOrOverlayLayer(value: string): value is MarkerLayerKey | OverlayLayerKey {
  return isOverlayLayerKey(value) || value in LAYER_CATALOG;
}

export function cardHasDeniedLeak(card: FeatureCard): boolean {
  const blob = JSON.stringify(card).toLowerCase();
  return FEATURE_CARD_DENIED_KEYS.some((key) => blob.includes(key));
}

export function findFeatureByPublicId(
  fc: FeatureCollection | null | undefined,
  id: string,
): Feature | null {
  if (!fc?.features?.length || !id.trim()) return null;
  return fc.features.find((feature) => featureMatchesPublicId(feature, id)) ?? null;
}

export function resolveFeatureCardFromCollection(
  fc: FeatureCollection,
  id: string,
  layerHint?: string,
  stack?: FeatureCardStackItem[],
): FeatureCard | null {
  const feature = findFeatureByPublicId(fc, id);
  if (!feature) return null;
  if (layerHint && !feature.properties?.layer) {
    return toFeatureCard(
      { ...feature, properties: { ...(feature.properties ?? {}), layer: layerHint } },
      { stack },
    );
  }
  return toFeatureCard(feature, { stack });
}

export type { CoordQuality };
