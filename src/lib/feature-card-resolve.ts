import type { Feature, FeatureCollection } from "geojson";
import { mergeLaporanOverlays } from "@/lib/laporan/peta-features";
import { getPelabuhanForecast, getPerairanOverlay, loadPelabuhanGeojson } from "@/lib/maritime";
import { loadMarkers } from "@/lib/markers";
import { mergeOperasiDisasterEvents, mergePengungsianOverlays } from "@/lib/sik/public";
import { isOverlayLayerKey, OVERLAY_LAYER_KEYS } from "@/lib/overlay-layers";
import {
  isOverlayLiveRefreshKey,
  loadOverlayLive,
  loadOverlayVector,
} from "@/lib/overlay-live";
import type { OverlayLayerKey } from "@/lib/types";
import { loadKejadianFixture } from "@/lib/kejadian";
import { createServerClient, type TypedSupabaseClient } from "@/lib/supabase/server";
import { SIK_OPERASIONAL_SOURCE } from "@/lib/sumber-label";
import {
  featurePublicId,
  findFeatureByPublicId,
  toFeatureCard,
  type FeatureCard,
  type FeatureCardStackItem,
} from "@/lib/feature-card";

export type { FeatureCard };
export { findFeatureByPublicId };

function asFeatureCollection(value: unknown): FeatureCollection | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as { type?: unknown; features?: unknown };
  if (rec.type !== "FeatureCollection" || !Array.isArray(rec.features)) return null;
  return rec as FeatureCollection;
}

async function loadOverlayCollection(key: OverlayLayerKey): Promise<FeatureCollection | null> {
  if (isOverlayLiveRefreshKey(key)) {
    const live = await loadOverlayLive(key);
    return asFeatureCollection(live.body);
  }
  if (key === "maritimePorts") {
    return loadPelabuhanGeojson();
  }
  if (key === "maritimeWaters") {
    return getPerairanOverlay();
  }
  return loadOverlayVector(key);
}

async function withPortForecast(feature: Feature): Promise<Feature> {
  const props = (feature.properties ?? {}) as Record<string, unknown>;
  const kode = String(props.kode_bmkg ?? props.code ?? props.kode ?? "").trim();
  if (!kode) return feature;
  try {
    const forecast = await getPelabuhanForecast(kode);
    const slot = forecast.slot;
    return {
      ...feature,
      properties: {
        ...props,
        title: forecast.name || props.title || props.name,
        weather: slot?.weather ?? props.weather,
        wave_cat: slot?.wave_cat ?? props.wave_cat,
        wave_height: slot?.wave_height ?? props.wave_height,
        wind_from: slot?.wind_from ?? props.wind_from,
        wind_speed: slot?.wind_speed ?? props.wind_speed,
        wind_gust: slot?.wind_gust ?? props.wind_gust,
        visibility: slot?.visibility ?? props.visibility,
        tides: slot?.tides ?? props.tides,
        wind:
          slot?.wind_from || typeof slot?.wind_speed === "number"
            ? `${slot?.wind_from ?? "—"} ${typeof slot?.wind_speed === "number" ? slot.wind_speed : "—"} kn`
            : props.wind,
        stale: forecast.stale,
        issued: forecast.issued ?? props.issued,
      },
    };
  } catch {
    return feature;
  }
}

export async function resolvePublicFeature(
  id: string,
  layerHint?: string,
): Promise<Feature | null> {
  const want = id.trim();
  if (!want) return null;

  const overlayHint = layerHint && isOverlayLayerKey(layerHint) ? layerHint : null;
  if (overlayHint) {
    const fc = await loadOverlayCollection(overlayHint);
    const hit = findFeatureByPublicId(fc, want);
    if (!hit) return null;
    if (overlayHint === "maritimePorts") return withPortForecast(hit);
    return {
      ...hit,
      properties: { ...(hit.properties ?? {}), layer: overlayHint },
    };
  }

  const withLaporan = await mergeLaporanOverlays(await loadMarkers());
  const withOps = await mergeOperasiDisasterEvents(withLaporan);
  const markers = await mergePengungsianOverlays(withOps);
  const markerHit = findFeatureByPublicId(markers, want);
  if (markerHit) return markerHit;

  const searchKeys = layerHint
    ? []
    : OVERLAY_LAYER_KEYS.filter((key) => !key.startsWith("inariskBahaya"));
  for (const key of searchKeys) {
    const fc = await loadOverlayCollection(key);
    const hit = findFeatureByPublicId(fc, want);
    if (hit) {
      if (key === "maritimePorts") return withPortForecast(hit);
      return { ...hit, properties: { ...(hit.properties ?? {}), layer: key } };
    }
  }
  return null;
}

/** One jsonb field. `kejadian_bencana` has no top-level `sumber_data` column. */
const KEJADIAN_SUMBER_SELECT = "sumber_data:payload->sumber_data";
const OPS_ID_PREFIX = "ops-";
const OPS_PUBLIC_STATUS = ["aktif", "selesai"] as const;

type SumberResult = {
  data: { sumber_data?: unknown; id?: string } | null;
  error: { message: string } | null;
};

type SumberChain = {
  select: (columns: string) => SumberChain;
  eq: (column: string, value: string) => SumberChain;
  in: (column: string, values: readonly string[]) => SumberChain;
  maybeSingle: () => PromiseLike<SumberResult>;
};

type SumberClient = {
  from: (table: string) => SumberChain;
};

export type EventSumberOptions = {
  /**
   * Supabase client to read with. Pass `null` when unconfigured.
   * Omit the key to use the anon server client.
   */
  client?: TypedSupabaseClient | null;
  /** Fixture lookup for one id. Default reads `loadKejadianFixture()`. */
  readFixtureSumber?: (id: string) => Promise<unknown>;
};

function hasSumber(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (!Array.isArray(value)) return false;
  return value.some((item) => typeof item === "string" && item.trim().length > 0);
}

async function fixtureSumberById(id: string): Promise<unknown | null> {
  try {
    const fixture = await loadKejadianFixture();
    const row = fixture.kejadian.find((item) => item.id === id);
    const sumber = row?.sumber_data;
    return hasSumber(sumber) ? sumber : null;
  } catch {
    return null;
  }
}

function asSumberClient(client: TypedSupabaseClient): SumberClient {
  return client as unknown as SumberClient;
}

/**
 * One public id.
 * `ACEH-*` (and any non-ops id) reads `kejadian_bencana.payload->sumber_data`.
 * `ops-<uuid>` reads that one `kejadian_operasi` row. A public row carries the
 * same stored token `loadKejadian()` attaches: `SIK operasional`.
 */
async function readLiveSumber(client: TypedSupabaseClient, id: string): Promise<unknown | null> {
  const db = asSumberClient(client);
  if (id.startsWith(OPS_ID_PREFIX)) {
    const opsId = id.slice(OPS_ID_PREFIX.length).trim();
    if (!opsId) return null;
    const { data, error } = await db
      .from("kejadian_operasi")
      .select("id")
      .eq("id", opsId)
      .in("status", OPS_PUBLIC_STATUS)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data?.id) return null;
    return [SIK_OPERASIONAL_SOURCE];
  }

  const { data, error } = await db
    .from("kejadian_bencana")
    .select(KEJADIAN_SUMBER_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return hasSumber(data.sumber_data) ? data.sumber_data : null;
}

/**
 * Copy one event's stored `sumber_data` onto the card input.
 * Live row first; fixture when Supabase is unconfigured, errors, or has no row.
 * Does not write the fixture, the marker file, or any stored token.
 */
export async function withEventSumber(
  feature: Feature,
  options?: EventSumberOptions,
): Promise<Feature> {
  const props = (feature.properties ?? {}) as Record<string, unknown>;
  if (String(props.layer ?? "") !== "disasterEvents") return feature;
  if (props.sumber_data != null) return feature;
  const id = featurePublicId(feature);
  if (!id) return feature;

  const readFixture = options?.readFixtureSumber ?? fixtureSumberById;
  const explicitClient = options !== undefined && "client" in options;
  const client = explicitClient ? (options.client ?? null) : createServerClient();

  let live: unknown | null = null;
  if (client) {
    try {
      live = await readLiveSumber(client, id);
    } catch {
      live = null;
    }
  }

  let chosen: unknown = null;
  if (hasSumber(live)) {
    chosen = live;
  } else {
    try {
      chosen = await readFixture(id);
    } catch {
      chosen = null;
    }
  }
  if (!hasSumber(chosen)) return feature;
  return { ...feature, properties: { ...props, sumber_data: chosen } };
}

export async function resolveFeatureCard(
  id: string,
  layerHint?: string,
  stack?: FeatureCardStackItem[],
): Promise<FeatureCard | null> {
  const feature = await resolvePublicFeature(id, layerHint);
  if (!feature) return null;
  return toFeatureCard(await withEventSumber(feature), { stack });
}

