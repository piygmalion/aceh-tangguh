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

/** Copy fixture `sumber_data` onto the card input. Does not write the fixture or marker file. */
async function withFixtureSumber(feature: Feature): Promise<Feature> {
  const props = { ...((feature.properties ?? {}) as Record<string, unknown>) };
  if (String(props.layer ?? "") !== "disasterEvents") return feature;
  if (props.sumber_data != null) return feature;
  const id = featurePublicId(feature);
  if (!id) return feature;
  const fixture = await loadKejadianFixture();
  const row = fixture.kejadian.find((item) => item.id === id);
  if (!row?.sumber_data) return feature;
  return { ...feature, properties: { ...props, sumber_data: row.sumber_data } };
}

export async function resolveFeatureCard(
  id: string,
  layerHint?: string,
  stack?: FeatureCardStackItem[],
): Promise<FeatureCard | null> {
  const feature = await resolvePublicFeature(id, layerHint);
  if (!feature) return null;
  return toFeatureCard(await withFixtureSumber(feature), { stack });
}

