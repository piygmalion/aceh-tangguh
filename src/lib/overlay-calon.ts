import { findJenisByKode, JENIS_BENCANA_JUKLAK } from "@/lib/sik/jenis-bencana";
import { findKabupaten } from "@/lib/sik/juklak";
import { isKabScoped, matchesKabScope } from "@/lib/sik/roles";
import { parseTatonasLocalTime } from "@/lib/tatonas/parse";
import { createServiceClient } from "@/lib/supabase/server";
import type { AdminProfile } from "@/lib/auth/types";
import type { Json } from "@/lib/supabase/json";
import type {
  OverlayCalonAsal,
  OverlayCalonKejadianRow,
  OverlayCalonSource,
  OverlayCalonStatus,
} from "@/lib/sik/db-tables";

export const CALON_LAYER_KEYS = [
  "bmkgQuakes",
  "magmaQuakes",
  "sipongiHotspots",
  "tatonasStations",
] as const;

export type CalonLayerKey = (typeof CALON_LAYER_KEYS)[number];
export const CALON_SOURCES = ["bmkg", "magma", "sipongi", "tatonas"] as const;
export const TATONAS_CALON_LEVELS = ["AWAS", "WASPADA"] as const;

export type OverlayLiveSignal = {
  id: string;
  source: string;
  layer_key: string;
  external_id: string;
  longitude: number;
  latitude: number;
  occurred_at: string | null;
  properties: Record<string, unknown>;
  updated_at: string;
};

export type KelayakanResult =
  | { ok: true }
  | { ok: false; alasan: "source" | "layer_key" | "coords" | "tatonas_level" };

export type ExistingCalonRef = {
  id: string;
  status: OverlayCalonStatus;
  decided_at: string | null;
  kejadian_id: string | null;
};

export type DedupDecision =
  | { action: "insert" }
  | { action: "update_draf"; id: string }
  | { action: "diam" }
  | { action: "diam_diterima"; id: string; kejadian_id: string | null }
  | { action: "insert_after_tolak" };

export type CalonAuthz =
  | { ok: true }
  | { ok: false; status: 400 | 403; error: string };

export type OverlayCalonSyncResult = {
  layer_key: string;
  skipped: boolean;
  created: number;
  updated: number;
  putus: number;
  utuh: number;
};

export function isCalonLayerKey(key: string): key is CalonLayerKey {
  return (CALON_LAYER_KEYS as readonly string[]).includes(key);
}

export function isCalonSource(value: string): value is OverlayCalonSource {
  return (CALON_SOURCES as readonly string[]).includes(value);
}

/** Persist + refresh must both succeed. magmaVolcanoes and non-calon layers stay out. */
export function shouldSyncCalonAfterRefresh(
  layerKey: string,
  persistOk: boolean,
  refreshOk: boolean,
): boolean {
  return persistOk && refreshOk && isCalonLayerKey(layerKey);
}

/** Putus only after a successful layer fetch. 503 / upstream stale is not disappearance. */
export function shouldMarkTautanPutus(input: {
  layerRefreshOk: boolean;
  overlayHasExternalId: boolean;
}): boolean {
  if (!input.layerRefreshOk) return false;
  return !input.overlayHasExternalId;
}

export function asProperties(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asIso(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function asText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function joinParts(parts: Array<string | null | undefined>): string | null {
  const out = parts.filter((part): part is string => Boolean(part && part.trim())).join(" ");
  return out || null;
}

export function nilaiKelayakan(signal: OverlayLiveSignal): KelayakanResult {
  if (!isCalonSource(signal.source)) return { ok: false, alasan: "source" };
  if (!isCalonLayerKey(signal.layer_key)) return { ok: false, alasan: "layer_key" };
  if (!Number.isFinite(signal.longitude) || !Number.isFinite(signal.latitude)) {
    return { ok: false, alasan: "coords" };
  }
  if (signal.layer_key === "tatonasStations") {
    const level = asText(signal.properties.level);
    if (!level || !(TATONAS_CALON_LEVELS as readonly string[]).includes(level)) {
      return { ok: false, alasan: "tatonas_level" };
    }
  }
  return { ok: true };
}

export function resolveWaktuSinyal(signal: Pick<OverlayLiveSignal, "occurred_at" | "properties">): string | null {
  const fromColumn = asIso(signal.occurred_at);
  if (fromColumn) return fromColumn;
  const fromWaktu = asIso(signal.properties.waktu);
  if (fromWaktu) return fromWaktu;
  const fromTanggal = asIso(signal.properties.tanggal);
  if (fromTanggal) return fromTanggal;
  const local = signal.properties.time_local;
  if (typeof local === "string") return parseTatonasLocalTime(local);
  return null;
}

export function wilayahDariProperties(properties: Record<string, unknown>): {
  kabupaten: string | null;
  kode_kabupaten: string | null;
} {
  const raw =
    (typeof properties.kabkota === "string" && properties.kabkota) ||
    (typeof properties.kabupaten === "string" && properties.kabupaten) ||
    "";
  const kab = findKabupaten(raw);
  if (!kab) return { kabupaten: null, kode_kabupaten: null };
  return { kabupaten: kab.nama, kode_kabupaten: kab.kode };
}

export function usulanJenis(layerKey: string): { kode: number | null; jenis: string | null } {
  if (layerKey === "bmkgQuakes" || layerKey === "magmaQuakes") {
    return { kode: 107, jenis: "Gempa bumi" };
  }
  if (layerKey === "sipongiHotspots") {
    return { kode: 106, jenis: "Kebakaran hutan dan lahan" };
  }
  return { kode: null, jenis: null };
}

export function sumberLabel(layerKey: string): string {
  if (layerKey === "bmkgQuakes") return "BMKG TEWS";
  if (layerKey === "magmaQuakes") return "MAGMA PVMBG";
  if (layerKey === "sipongiHotspots") return "Sipongi";
  if (layerKey === "tatonasStations") return "Tatonas";
  return layerKey;
}

export function sumberInformasiKejadian(layerKey: string, properties: Record<string, unknown>): string {
  const label = sumberLabel(layerKey);
  const href = asText(properties.href);
  return href ? `${label} + ${href}` : label;
}

export function penyebabRingkas(layerKey: string, properties: Record<string, unknown>): string | null {
  if (layerKey === "bmkgQuakes") {
    return joinParts([
      asText(properties.magnitude),
      asText(properties.kedalaman),
      asText(properties.potensi),
    ]);
  }
  if (layerKey === "magmaQuakes") {
    return joinParts([
      asText(properties.magnitude),
      asText(properties.depth),
      asText(properties.nearest_volcano),
    ]);
  }
  if (layerKey === "sipongiHotspots") {
    return joinParts([
      asText(properties.status),
      asText(properties.tanggal),
      asText(properties.sumber),
    ]);
  }
  if (layerKey === "tatonasStations") {
    const level = asText(properties.level);
    const title = asText(properties.title);
    if (!level && !title) return null;
    return joinParts(["Level", level, title]);
  }
  return null;
}

export function namaSinyal(layerKey: string, properties: Record<string, unknown>): string {
  const title = asText(properties.title);
  if (title && title.length >= 2) return title;
  if (layerKey === "bmkgQuakes" || layerKey === "magmaQuakes") return "Gempa tektonik";
  if (layerKey === "sipongiHotspots") return "Kebakaran hutan dan lahan";
  if (layerKey === "tatonasStations") return "Pos hidrologi";
  return layerKey;
}

export function defaultNamaKejadian(
  layerKey: string,
  properties: Record<string, unknown>,
): { nama: string; fromTitle: boolean } {
  const title = asText(properties.title);
  if (title && title.length >= 2) return { nama: title.slice(0, 200), fromTitle: true };
  if (layerKey === "bmkgQuakes" || layerKey === "magmaQuakes") {
    return { nama: "Gempa tektonik", fromTitle: false };
  }
  if (layerKey === "sipongiHotspots") {
    return { nama: "Kebakaran hutan dan lahan", fromTitle: false };
  }
  return { nama: "Pos hidrologi", fromTitle: false };
}

export function slugUntukNama(nama: string): string | null {
  for (const jenis of JENIS_BENCANA_JUKLAK) {
    const hit = jenis.namaKejadian.find((entry) => entry.nama === nama);
    if (hit) return hit.slug;
  }
  return null;
}

export function buildCalonSnapshot(signal: OverlayLiveSignal): {
  source: OverlayCalonSource;
  layer_key: string;
  external_id: string;
  overlay_feature_id: string;
  nama_sinyal: string;
  waktu_sinyal: string | null;
  kabupaten: string | null;
  kode_kabupaten: string | null;
  latitude: number;
  longitude: number;
  usulan_kode_jenis: number | null;
  usulan_jenis_bencana: string | null;
  sumber_label: string;
  penyebab_ringkas: string | null;
  properties_snapshot: Json;
} {
  const source = isCalonSource(signal.source) ? signal.source : "bmkg";
  const wilayah = wilayahDariProperties(signal.properties);
  const usulan = usulanJenis(signal.layer_key);
  return {
    source,
    layer_key: signal.layer_key,
    external_id: signal.external_id,
    overlay_feature_id: signal.id,
    nama_sinyal: namaSinyal(signal.layer_key, signal.properties),
    waktu_sinyal: resolveWaktuSinyal(signal),
    kabupaten: wilayah.kabupaten,
    kode_kabupaten: wilayah.kode_kabupaten,
    latitude: signal.latitude,
    longitude: signal.longitude,
    usulan_kode_jenis: usulan.kode,
    usulan_jenis_bencana: usulan.jenis,
    sumber_label: sumberLabel(signal.layer_key),
    penyebab_ringkas: penyebabRingkas(signal.layer_key, signal.properties),
    properties_snapshot: signal.properties as Json,
  };
}

function isNewer(overlayUpdatedAt: string, decidedAt: string | null): boolean {
  if (!decidedAt) return true;
  const overlayMs = Date.parse(overlayUpdatedAt);
  const decidedMs = Date.parse(decidedAt);
  if (!Number.isFinite(overlayMs) || !Number.isFinite(decidedMs)) return false;
  return overlayMs > decidedMs;
}

export function decideDedup(existing: ExistingCalonRef[], overlayUpdatedAt: string): DedupDecision {
  const draf = existing.find((row) => row.status === "draf");
  if (draf) return { action: "update_draf", id: draf.id };

  const diterima = existing.find((row) => row.status === "diterima");
  if (diterima) {
    return { action: "diam_diterima", id: diterima.id, kejadian_id: diterima.kejadian_id };
  }

  const ditolak = existing
    .filter((row) => row.status === "ditolak")
    .slice()
    .sort((a, b) => Date.parse(b.decided_at ?? "") - Date.parse(a.decided_at ?? ""))[0];
  if (ditolak) {
    return isNewer(overlayUpdatedAt, ditolak.decided_at)
      ? { action: "insert_after_tolak" }
      : { action: "diam" };
  }

  return { action: "insert" };
}

export function calonBelumTerikat(row: {
  kode_kabupaten?: string | null;
  kabupaten?: string | null;
}): boolean {
  return !row.kode_kabupaten?.trim() && !row.kabupaten?.trim();
}

export function calonVisibleToOps(
  profile: AdminProfile,
  row: { kode_kabupaten?: string | null; kabupaten?: string | null },
): boolean {
  return matchesKabScope(profile, row);
}

export function authorizeCalonTolak(
  profile: AdminProfile,
  row: { kode_kabupaten?: string | null; kabupaten?: string | null },
): CalonAuthz {
  if (!calonVisibleToOps(profile, row)) {
    return { ok: false, status: 403, error: "forbidden" };
  }
  return { ok: true };
}

export function authorizeCalonTerima(
  profile: AdminProfile,
  calon: { kode_kabupaten?: string | null; kabupaten?: string | null },
  body: { kode_kabupaten?: string | null; kabupaten?: string | null },
): CalonAuthz & { kabupaten?: string | null; kode_kabupaten?: string | null } {
  const bodyRaw = body.kode_kabupaten?.trim() || body.kabupaten?.trim() || "";
  const bodyKab = bodyRaw ? findKabupaten(body.kode_kabupaten || body.kabupaten) : undefined;
  const bound = !calonBelumTerikat(calon);

  if (bound) {
    if (!matchesKabScope(profile, calon)) {
      return { ok: false, status: 403, error: "forbidden" };
    }
    if (bodyRaw) {
      if (!bodyKab) return { ok: false, status: 400, error: "kabupaten tidak dikenali" };
      if (!matchesKabScope(profile, { kode_kabupaten: bodyKab.kode, kabupaten: bodyKab.nama })) {
        return { ok: false, status: 403, error: "forbidden" };
      }
      return { ok: true, kabupaten: bodyKab.nama, kode_kabupaten: bodyKab.kode };
    }
    return {
      ok: true,
      kabupaten: calon.kabupaten ?? null,
      kode_kabupaten: calon.kode_kabupaten ?? null,
    };
  }

  if (isKabScoped(profile)) {
    if (!bodyRaw) return { ok: false, status: 400, error: "kabupaten wajib" };
    if (!bodyKab) return { ok: false, status: 400, error: "kabupaten tidak dikenali" };
    if (!matchesKabScope(profile, { kode_kabupaten: bodyKab.kode, kabupaten: bodyKab.nama })) {
      return { ok: false, status: 403, error: "forbidden" };
    }
    return { ok: true, kabupaten: bodyKab.nama, kode_kabupaten: bodyKab.kode };
  }

  if (bodyRaw) {
    if (!bodyKab) return { ok: false, status: 400, error: "kabupaten tidak dikenali" };
    return { ok: true, kabupaten: bodyKab.nama, kode_kabupaten: bodyKab.kode };
  }
  return { ok: true, kabupaten: null, kode_kabupaten: null };
}

export function resolveWaktuTerima(
  waktuSinyal: string | null,
  bodyWaktu?: string | null,
): string | null {
  const raw = bodyWaktu?.trim() || waktuSinyal?.trim() || "";
  if (raw.length < 8) return null;
  return raw;
}

export function resolveJenisTerima(
  calon: Pick<OverlayCalonKejadianRow, "layer_key" | "usulan_kode_jenis" | "usulan_jenis_bencana">,
  bodyKode?: number | null,
): { ok: true; kode: number | null; jenis: string } | { ok: false; error: string } {
  if (calon.layer_key === "tatonasStations") {
    if (bodyKode == null) return { ok: false, error: "kode_jenis wajib" };
    const found = findJenisByKode(bodyKode);
    if (!found) return { ok: false, error: "kode_jenis tidak dikenali" };
    return { ok: true, kode: found.kode, jenis: found.jenis };
  }
  if (bodyKode != null) {
    const found = findJenisByKode(bodyKode);
    if (!found) return { ok: false, error: "kode_jenis tidak dikenali" };
    return { ok: true, kode: found.kode, jenis: found.jenis };
  }
  const jenis = calon.usulan_jenis_bencana?.trim() ?? "";
  if (jenis.length < 2) return { ok: false, error: "jenis_bencana wajib" };
  return { ok: true, kode: calon.usulan_kode_jenis, jenis };
}

export function resolveNamaTerima(
  calon: Pick<OverlayCalonKejadianRow, "layer_key" | "properties_snapshot">,
  bodyNama?: string | null,
): { nama: string; slug_nama: string | null } {
  const props = asProperties(calon.properties_snapshot);
  if (bodyNama && bodyNama.trim().length >= 2) {
    const nama = bodyNama.trim().slice(0, 200);
    return { nama, slug_nama: slugUntukNama(nama) };
  }
  const fallback = defaultNamaKejadian(calon.layer_key, props);
  return {
    nama: fallback.nama.slice(0, 200),
    slug_nama: fallback.fromTitle ? null : slugUntukNama(fallback.nama),
  };
}

export function kibSumberDariLayer(layerKey: string): "episentrum" | "lokasi" {
  return layerKey === "bmkgQuakes" || layerKey === "magmaQuakes" ? "episentrum" : "lokasi";
}

export function lokasiDariSnapshot(
  properties: Record<string, unknown>,
  input: { kabupaten: string | null; latitude: number; longitude: number },
): {
  desa: string | null;
  kecamatan: string | null;
  kabupaten: string | null;
  latitude: number;
  longitude: number;
} | null {
  const desa = typeof properties.desa === "string" ? properties.desa : null;
  const kecamatan = typeof properties.kecamatan === "string" ? properties.kecamatan : null;
  if (!desa && !kecamatan) return null;
  return {
    desa,
    kecamatan,
    kabupaten: input.kabupaten,
    latitude: input.latitude,
    longitude: input.longitude,
  };
}

export function buildKejadianInsertFromCalon(input: {
  calon: OverlayCalonKejadianRow;
  jenis_bencana: string;
  kode_jenis: number | null;
  nama_kejadian: string;
  slug_nama: string | null;
  waktu_kejadian: string;
  tarikh: string;
  kabupaten: string | null;
  kode_kabupaten: string | null;
  created_by: string;
  kib: string | null;
  kib_index: number | null;
}): {
  jenis_bencana: string;
  kode_jenis: number | null;
  nama_kejadian: string;
  slug_nama: string | null;
  waktu_kejadian: string;
  tarikh: string;
  kabupaten: string | null;
  kode_kabupaten: string | null;
  kecamatan: string | null;
  desa_ringkas: string | null;
  latitude: number;
  longitude: number;
  sumber_informasi: string;
  penyebab: string | null;
  status: "draft";
  fase_data: "dinamis";
  is_bencana: false;
  status_darurat: false;
  nomor_sk: null;
  himbauan: null;
  permintaan_bantuan_nasional: false;
  kode_provinsi: "11";
  kib_sumber: "episentrum" | "lokasi";
  kib: string | null;
  kib_index: number | null;
  created_by: string;
} {
  const props = asProperties(input.calon.properties_snapshot);
  return {
    jenis_bencana: input.jenis_bencana,
    kode_jenis: input.kode_jenis,
    nama_kejadian: input.nama_kejadian,
    slug_nama: input.slug_nama,
    waktu_kejadian: input.waktu_kejadian,
    tarikh: input.tarikh,
    kabupaten: input.kabupaten,
    kode_kabupaten: input.kode_kabupaten,
    kecamatan: typeof props.kecamatan === "string" ? props.kecamatan : null,
    desa_ringkas: typeof props.desa === "string" ? props.desa : null,
    latitude: input.calon.latitude,
    longitude: input.calon.longitude,
    sumber_informasi: sumberInformasiKejadian(input.calon.layer_key, props),
    penyebab: input.calon.penyebab_ringkas,
    status: "draft",
    fase_data: "dinamis",
    is_bencana: false,
    status_darurat: false,
    nomor_sk: null,
    himbauan: null,
    permintaan_bantuan_nasional: false,
    kode_provinsi: "11",
    kib_sumber: kibSumberDariLayer(input.calon.layer_key),
    kib: input.kib,
    kib_index: input.kib_index,
    created_by: input.created_by,
  };
}

function pairKey(source: string, externalId: string): string {
  return `${source}::${externalId}`;
}

function signalFromOverlayRow(row: {
  id: string;
  source: string;
  layer_key: string;
  external_id: string;
  longitude: number;
  latitude: number;
  occurred_at: string | null;
  properties: unknown;
  updated_at: string;
}): OverlayLiveSignal {
  return {
    id: row.id,
    source: row.source,
    layer_key: row.layer_key,
    external_id: row.external_id,
    longitude: row.longitude,
    latitude: row.latitude,
    occurred_at: row.occurred_at,
    properties: asProperties(row.properties),
    updated_at: row.updated_at,
  };
}

export async function syncCalonDariOverlay(layerKey: string): Promise<OverlayCalonSyncResult> {
  const empty: OverlayCalonSyncResult = {
    layer_key: layerKey,
    skipped: true,
    created: 0,
    updated: 0,
    putus: 0,
    utuh: 0,
  };
  if (!isCalonLayerKey(layerKey)) return empty;

  const client = createServiceClient();
  if (!client) return empty;

  const features = await client
    .from("overlay_live_features")
    .select("id, source, layer_key, external_id, longitude, latitude, occurred_at, properties, updated_at")
    .eq("layer_key", layerKey);
  if (features.error) {
    console.error("[overlay-calon/sync-read]", layerKey, features.error.message);
    return empty;
  }

  const existing = await client
    .from("overlay_calon_kejadian")
    .select("id, source, external_id, status, decided_at, kejadian_id, tautan_status")
    .eq("layer_key", layerKey);
  if (existing.error) {
    console.error("[overlay-calon/sync-calon]", layerKey, existing.error.message);
    return empty;
  }

  const rows = features.data ?? [];
  const presentIds = new Set(rows.map((row) => row.external_id));
  const byPair = new Map<string, ExistingCalonRef[]>();
  for (const row of existing.data ?? []) {
    const key = pairKey(row.source, row.external_id);
    const list = byPair.get(key) ?? [];
    list.push({
      id: row.id,
      status: row.status,
      decided_at: row.decided_at,
      kejadian_id: row.kejadian_id,
    });
    byPair.set(key, list);
  }

  let created = 0;
  let updated = 0;
  const now = new Date().toISOString();

  for (const row of rows) {
    const signal = signalFromOverlayRow(row);
    if (!nilaiKelayakan(signal).ok) continue;
    const decision = decideDedup(byPair.get(pairKey(signal.source, signal.external_id)) ?? [], signal.updated_at);
    const snapshot = buildCalonSnapshot(signal);
    if (decision.action === "update_draf") {
      const { error } = await client
        .from("overlay_calon_kejadian")
        .update({ ...snapshot, tautan_status: "utuh", updated_at: now })
        .eq("id", decision.id);
      if (error) console.error("[overlay-calon/update]", error.message);
      else updated += 1;
    } else if (decision.action === "insert" || decision.action === "insert_after_tolak") {
      const { error } = await client.from("overlay_calon_kejadian").insert({
        ...snapshot,
        status: "draf",
        tautan_status: "utuh",
        asal_buat: "otomatis" satisfies OverlayCalonAsal,
        created_by: null,
      });
      if (error) console.error("[overlay-calon/insert]", error.message);
      else created += 1;
    }
  }

  let putus = 0;
  let utuh = 0;
  for (const row of existing.data ?? []) {
    const next = presentIds.has(row.external_id) ? "utuh" : "putus";
    if (row.tautan_status === next) continue;
    const { error } = await client
      .from("overlay_calon_kejadian")
      .update({ tautan_status: next, updated_at: now })
      .eq("id", row.id);
    if (error) {
      console.error("[overlay-calon/tautan]", error.message);
      continue;
    }
    if (next === "putus") putus += 1;
    else utuh += 1;
  }

  return { layer_key: layerKey, skipped: false, created, updated, putus, utuh };
}
