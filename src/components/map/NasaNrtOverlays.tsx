"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Layer, Popup, Source } from "react-map-gl/maplibre";
import { useTranslations } from "next-intl";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { qk } from "@/lib/qk";
import { COLOR_TOKENS } from "@/lib/layer-colors";
import { MAP_DOT_RADIUS_PX, MAP_DOT_STROKE_PX } from "@/lib/map-marker-chrome";
import { TYPE_FLOOR_CLASS, TYPE_KICKER_CLASS } from "@/lib/type-floor";
import {
  gibsTileUrl,
  GIBS_ATTRIBUTION,
  GIBS_THERMAL,
  GIBS_TRUE_COLOR,
  worldviewHref,
} from "@/lib/nasa-nrt/layers";
import type { FirmsFeature, FirmsResponse } from "@/lib/nasa-nrt/types";
import { FIRMS_CATALOG_HREF, NASA_NRT_VALIDATION } from "@/lib/nasa-nrt/types";
import type { NasaNrtLayerKey } from "@/lib/nasa-nrt/types";
import { cn } from "@/lib/utils";

export const NASA_NRT_FIRMS_CIRCLE_ID = "nasa-nrt-firms-circle";
export const NASA_NRT_FIRMS_SOURCE_ID = "nasa-nrt-firms";

export function nasaNrtInteractiveLayerIds(layers: NasaNrtLayerKey[]): string[] {
  return layers.includes("firmsHotspots") ? [NASA_NRT_FIRMS_CIRCLE_ID] : [];
}

export function pickNasaFirmsHit(
  features:
    | Array<{
        layer?: { id?: string };
        geometry?: { type?: string; coordinates?: unknown };
        properties?: Record<string, unknown> | null;
        id?: string | number;
      }>
    | undefined,
): FirmsFeature | null {
  const feat = features?.find((f) => f.layer?.id === NASA_NRT_FIRMS_CIRCLE_ID);
  if (!feat || feat.geometry?.type !== "Point") return null;
  const coords = feat.geometry.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  const props = feat.properties ?? {};
  return {
    type: "Feature",
    id: String(feat.id ?? props.id ?? `${lat}:${lng}`),
    geometry: { type: "Point", coordinates: [lng, lat] },
    properties: {
      acq_date: typeof props.acq_date === "string" ? props.acq_date : null,
      acq_time: typeof props.acq_time === "string" ? props.acq_time : null,
      confidence: typeof props.confidence === "string" ? props.confidence : null,
      frp: typeof props.frp === "number" ? props.frp : null,
      satellite: typeof props.satellite === "string" ? props.satellite : null,
      daynight: typeof props.daynight === "string" ? props.daynight : null,
    },
  };
}

async function fetchFirms(): Promise<FirmsResponse> {
  const res = await fetchPublicApi("/api/nasa-nrt/firms");
  const json = (await res.json()) as FirmsResponse;
  return json;
}

function FirmsPopup({
  hit,
  nasaDate,
  onClose,
}: {
  hit: FirmsFeature;
  nasaDate: string;
  onClose: () => void;
}) {
  const t = useTranslations("map");
  const [lng, lat] = hit.geometry.coordinates;
  return (
    <Popup
      longitude={lng}
      latitude={lat}
      anchor="top"
      offset={14}
      maxWidth="22rem"
      className="map-feature-popup"
      closeButton={false}
      onClose={onClose}
      closeOnClick={false}
    >
      <div className="space-y-2 p-1">
        <p className={cn(TYPE_KICKER_CLASS, "text-[var(--text-dim)]")}>{t("nasaNrtPill")}</p>
        <p className="font-medium">{t("firmsHotspots")}</p>
        <p className={TYPE_FLOOR_CLASS}>
          {t("nasaNrtObserved")}: {hit.properties.acq_date ?? nasaDate}
          {hit.properties.acq_time ? ` ${hit.properties.acq_time}` : ""}
        </p>
        <p className={TYPE_FLOOR_CLASS}>
          {t("nasaNrtMetaSource")}: FIRMS VIIRS SNPP NRT
        </p>
        <p className={TYPE_FLOOR_CLASS}>
          {t("nasaNrtMetaValidation")}: {NASA_NRT_VALIDATION}
        </p>
        <p>
          <a className="underline" href={FIRMS_CATALOG_HREF} target="_blank" rel="noreferrer">
            {t("nasaNrtFirmsCatalog")}
          </a>
          {" · "}
          <a
            className="underline"
            href={worldviewHref(nasaDate, [GIBS_TRUE_COLOR.layer])}
            target="_blank"
            rel="noreferrer"
          >
            {t("nasaNrtWorldview")}
          </a>
        </p>
        <button type="button" className="text-sm underline" onClick={onClose}>
          {t("cardClose")}
        </button>
      </div>
    </Popup>
  );
}

export function NasaNrtOverlays({
  layers,
  nasaDate,
  beforeId,
  popup,
  onPopupClose,
}: {
  layers: NasaNrtLayerKey[];
  nasaDate: string;
  beforeId?: string;
  popup: FirmsFeature | null;
  onPopupClose: () => void;
}) {
  const t = useTranslations("map");
  const showTrueColor = layers.includes("gibsTrueColor");
  const showThermal = layers.includes("gibsThermal");
  const showFirms = layers.includes("firmsHotspots");
  const before = beforeId ? { beforeId } : {};

  const { data: firms } = useQuery({
    queryKey: qk.nasaNrtFirms,
    queryFn: fetchFirms,
    enabled: showFirms,
    staleTime: 5 * 60_000,
  });

  const firmsFc = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: firms?.features ?? [],
    }),
    [firms],
  );

  if (!layers.length) return null;

  return (
    <>
      {showTrueColor ? (
        <Source
          id="nasa-nrt-gibs-truecolor"
          type="raster"
          tiles={[gibsTileUrl(GIBS_TRUE_COLOR, nasaDate)]}
          tileSize={256}
          maxzoom={GIBS_TRUE_COLOR.maxzoom}
          attribution={GIBS_ATTRIBUTION}
        >
          <Layer
            id="nasa-nrt-gibs-truecolor-raster"
            type="raster"
            {...before}
            paint={{ "raster-opacity": 0.85 }}
          />
        </Source>
      ) : null}
      {showThermal ? (
        <Source
          id="nasa-nrt-gibs-thermal"
          type="raster"
          tiles={[gibsTileUrl(GIBS_THERMAL, nasaDate)]}
          tileSize={256}
          maxzoom={GIBS_THERMAL.maxzoom}
          attribution={GIBS_ATTRIBUTION}
        >
          <Layer
            id="nasa-nrt-gibs-thermal-raster"
            type="raster"
            {...before}
            paint={{ "raster-opacity": 0.55 }}
          />
        </Source>
      ) : null}
      {showFirms ? (
        <Source id={NASA_NRT_FIRMS_SOURCE_ID} type="geojson" data={firmsFc} generateId>
          <Layer
            id={NASA_NRT_FIRMS_CIRCLE_ID}
            type="circle"
            {...before}
            paint={{
              "circle-radius": MAP_DOT_RADIUS_PX,
              "circle-color": COLOR_TOKENS.awas,
              "circle-stroke-width": MAP_DOT_STROKE_PX,
              "circle-stroke-color": COLOR_TOKENS.paper,
            }}
          />
        </Source>
      ) : null}
      {popup ? <FirmsPopup hit={popup} nasaDate={nasaDate} onClose={onPopupClose} /> : null}
      {showFirms && firms?.metadata.status === "unconfigured" ? (
        <span className="sr-only">{t("nasaNrtFirmsUnconfigured")}</span>
      ) : null}
    </>
  );
}
