"use client";

import { useQuery } from "@tanstack/react-query";
import type { FeatureCollection } from "geojson";
import { useMemo } from "react";
import { Layer, Popup, Source } from "react-map-gl/maplibre";
import { useTranslations } from "next-intl";
import { Chip } from "@/components/ui/Chip";
import { fetchOverlayGeojson } from "@/hooks/useOverlayGeojson";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { isStaticExport, withBasePath } from "@/lib/preview/env";
import { qk } from "@/lib/qk";
import { COLOR_TOKENS } from "@/lib/layer-colors";
import {
  overlayCatalogEntry,
  overlayCircleLayerId,
  overlayColor,
  overlayFillLayerId,
  overlayInteractiveLayerIds,
  overlayKeyFromLayerId,
  overlayLineLayerId,
  overlayRasterLayerId,
  overlaySourceId,
} from "@/lib/overlay-layers";
import type { OverlayLayerKey } from "@/lib/types";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] };

export type OverlayHit = {
  key: OverlayLayerKey;
  lng: number;
  lat: number;
  title: string;
  status?: string;
  subtitle?: string;
  href?: string;
  kode?: string | null;
  weather?: string | null;
  waveCat?: string | null;
  waveHeight?: number | null;
  windFrom?: string | null;
  windSpeed?: number | null;
  stale?: boolean;
};

type PortForecast = {
  kode: string;
  name: string;
  issued: string | null;
  stale: boolean;
  slot: {
    weather?: string;
    wave_cat?: string;
    wave_height?: number;
    wind_from?: string;
    wind_speed?: number;
  } | null;
};

function asText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asBool(value: unknown): boolean {
  return value === true || value === "true";
}

export { overlayInteractiveLayerIds };

export function pickOverlayHit(
  features: Array<{
    layer?: { id?: string };
    geometry?: { type?: string; coordinates?: unknown };
    properties?: Record<string, unknown> | null;
  }> | undefined,
  click: { lng: number; lat: number },
): OverlayHit | null {
  if (!features?.length) return null;
  for (const feature of features) {
    const key = overlayKeyFromLayerId(feature.layer?.id);
    if (!key) continue;
    const geom = feature.geometry;
    let lng = click.lng;
    let lat = click.lat;
    if (geom?.type === "Point" && Array.isArray(geom.coordinates)) {
      const lon = Number(geom.coordinates[0]);
      const la = Number(geom.coordinates[1]);
      if (Number.isFinite(lon) && Number.isFinite(la)) {
        lng = lon;
        lat = la;
      }
    }
    const props = feature.properties ?? {};
    const kode = asText(props.code) ?? asText(props.kode_bmkg) ?? asText(props.kode);
    return {
      key,
      lng,
      lat,
      title: asText(props.title) ?? asText(props.name) ?? asText(props.perairan) ?? key,
      status: asText(props.kelas) ?? asText(props.status) ?? asText(props.wave_cat) ?? asText(props.weather) ?? undefined,
      subtitle: asText(props.Segment) ?? asText(props.stakeholder) ?? asText(props.wilayah) ?? undefined,
      href: asText(props.href) ?? undefined,
      kode,
      weather: asText(props.weather),
      waveCat: asText(props.wave_cat),
      waveHeight: asNumber(props.wave_height),
      windFrom: asText(props.wind_from),
      windSpeed: asNumber(props.wind_speed),
      stale: asBool(props.stale),
    };
  }
  return null;
}

async function fetchPortForecast(kode: string): Promise<PortForecast> {
  const res = await fetchPublicApi(
    `/api/overlay/maritime/pelabuhan/${encodeURIComponent(kode)}`,
  );
  if (!res.ok) {
    return { kode, name: kode, issued: null, stale: true, slot: null };
  }
  return (await res.json()) as PortForecast;
}

function OverlayVector({
  overlayKey,
  beforeId,
}: {
  overlayKey: OverlayLayerKey;
  beforeId?: string;
}) {
  const kind = overlayCatalogEntry(overlayKey)?.kind ?? "point";
  const color = overlayColor(overlayKey);
  const { data } = useQuery({
    queryKey: qk.overlay(overlayKey),
    queryFn: () => fetchOverlayGeojson(overlayKey),
    staleTime: overlayKey === "maritimeWaters" ? 5 * 60_000 : 60_000,
  });

  const geojson = useMemo((): FeatureCollection => {
    const fc = data?.collection ?? EMPTY_FC;
    return {
      type: "FeatureCollection",
      features: fc.features.map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          layer: overlayKey,
          color: (f.properties as { fillColor?: string } | null)?.fillColor || color,
        },
      })),
    };
  }, [data, overlayKey, color]);

  const before = beforeId ? { beforeId } : {};

  if (kind === "point") {
    return (
      <Source id={overlaySourceId(overlayKey)} type="geojson" data={geojson} generateId>
        <Layer
          id={overlayCircleLayerId(overlayKey)}
          type="circle"
          paint={{
            "circle-color": ["coalesce", ["get", "color"], color],
            "circle-radius": overlayKey === "maritimePorts" ? 7 : 6,
            "circle-stroke-width": 1.5,
            "circle-stroke-color": COLOR_TOKENS.paper,
            "circle-opacity": 0.92,
          }}
        />
      </Source>
    );
  }

  if (kind === "line") {
    return (
      <Source id={overlaySourceId(overlayKey)} type="geojson" data={geojson}>
        <Layer
          id={overlayLineLayerId(overlayKey)}
          type="line"
          {...before}
          paint={{
            "line-color": color,
            "line-width": 2.2,
            "line-opacity": 0.9,
          }}
        />
      </Source>
    );
  }

  return (
    <Source
      id={overlaySourceId(overlayKey)}
      type="geojson"
      data={geojson}
      attribution={overlayKey === "maritimeWaters" ? "BMKG Maritim" : "InaRISK BNPB"}
    >
      <Layer
        id={overlayFillLayerId(overlayKey)}
        type="fill"
        {...before}
        paint={{
          "fill-color": ["coalesce", ["get", "fillColor"], ["get", "color"], color],
          "fill-opacity": overlayKey === "maritimeWaters" ? 0.42 : 0.16,
        }}
      />
      <Layer
        id={overlayLineLayerId(overlayKey)}
        type="line"
        {...before}
        paint={{
          "line-color": color,
          "line-width": overlayKey === "maritimeWaters" ? 1 : 1.6,
          "line-opacity": 0.85,
        }}
      />
    </Source>
  );
}

function OverlayRaster({
  overlayKey,
  beforeId,
}: {
  overlayKey: OverlayLayerKey;
  beforeId?: string;
}) {
  const tiles = [withBasePath(`/api/overlay/tiles/${overlayKey}/{z}/{x}/{y}`)];
  return (
    <Source
      id={overlaySourceId(overlayKey)}
      type="raster"
      tiles={tiles}
      tileSize={256}
      minzoom={5}
      maxzoom={14}
      attribution="InaRISK BNPB"
    >
      <Layer
        id={overlayRasterLayerId(overlayKey)}
        type="raster"
        {...(beforeId ? { beforeId } : {})}
        paint={{ "raster-opacity": 0.55 }}
      />
    </Source>
  );
}

function OverlayPopup({
  hit,
  onClose,
}: {
  hit: OverlayHit;
  onClose: () => void;
}) {
  const t = useTranslations("map");
  const needForecast = hit.key === "maritimePorts" && Boolean(hit.kode);
  const { data, isFetching } = useQuery({
    queryKey: qk.overlayPort(hit.kode ?? ""),
    queryFn: () => fetchPortForecast(hit.kode!),
    enabled: needForecast,
    staleTime: 5 * 60_000,
  });

  const slot = data?.slot;
  const name = data?.name || hit.title;
  const stale = data?.stale ?? hit.stale ?? false;
  const weather = slot?.weather ?? hit.weather;
  const waveCat = slot?.wave_cat ?? hit.waveCat;
  const waveHeight =
    typeof slot?.wave_height === "number" ? slot.wave_height : hit.waveHeight;
  const windFrom = slot?.wind_from ?? hit.windFrom;
  const windSpeed =
    typeof slot?.wind_speed === "number" ? slot.wind_speed : hit.windSpeed;

  const lng = Number.isFinite(hit.lng) ? hit.lng : 96.5;
  const lat = Number.isFinite(hit.lat) ? hit.lat : 4.3;

  return (
    <Popup
      longitude={lng}
      latitude={lat}
      anchor="top"
      onClose={onClose}
      closeOnClick={false}
    >
      <div className="max-w-[16rem] text-sm">
        <div className="font-semibold text-[var(--text)]">{name}</div>
        <div className={cn("mt-0.5 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
          {t(hit.key)}
        </div>
        {hit.status === "sedang" || hit.status === "tinggi" ? (
          <div className={cn("mt-1 text-[var(--text)]", TYPE_FLOOR_CLASS)}>
            {hit.status === "tinggi" ? t("krbTinggi") : t("krbSedang")}
          </div>
        ) : hit.status ? (
          <div className={cn("mt-1 text-[var(--text)]", TYPE_FLOOR_CLASS)}>
            {hit.status}
          </div>
        ) : null}
        {hit.subtitle ? (
          <div className={cn("mt-1 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
            {hit.subtitle}
          </div>
        ) : null}
        {needForecast && isFetching ? (
          <p className={cn("mt-2 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
            {t("overlayForecastLoading")}
          </p>
        ) : null}
        {weather ? (
          <p className="mt-2 text-[var(--text)]">{weather}</p>
        ) : null}
        {waveCat ? (
          <p className={cn("mt-1 text-[var(--text)]", TYPE_FLOOR_CLASS)}>
            {t("overlayWaveCat", { value: waveCat })}
          </p>
        ) : null}
        {typeof waveHeight === "number" ? (
          <p className={cn("text-[var(--text)]", TYPE_FLOOR_CLASS)}>
            {t("overlayWaveHeight", { value: waveHeight })}
          </p>
        ) : null}
        {windFrom || typeof windSpeed === "number" ? (
          <p className={cn("text-[var(--text)]", TYPE_FLOOR_CLASS)}>
            {t("overlayWind", {
              from: windFrom ?? "—",
              speed: typeof windSpeed === "number" ? String(windSpeed) : "—",
            })}
          </p>
        ) : null}
        {needForecast && !isFetching && !slot && !weather && !waveCat ? (
          <p className={cn("mt-2 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
            {t("overlayForecastMissing")}
          </p>
        ) : null}
        {stale ? (
          <Chip tone="warn" className={cn("mt-2 px-2 py-0.5", TYPE_FLOOR_CLASS)}>
            {t("overlayStale")}
          </Chip>
        ) : null}
        {hit.key === "maritimePorts" || hit.key === "maritimeWaters" ? (
          <p className={cn("mt-2 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
            {t("overlayBmkgCredit")}
          </p>
        ) : null}
        {hit.href ? (
          <a
            href={hit.href}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 inline-block text-xs text-[var(--primary)] underline"
          >
            {hit.href}
          </a>
        ) : null}
      </div>
    </Popup>
  );
}

export function MapOverlays({
  keys,
  beforeId,
  popup,
  onPopupClose,
}: {
  keys: OverlayLayerKey[];
  beforeId?: string;
  popup: OverlayHit | null;
  onPopupClose: () => void;
}) {
  const skipRaster = isStaticExport();
  return (
    <>
      {keys.map((key) => {
        const kind = overlayCatalogEntry(key)?.kind;
        if (!kind) return null;
        if (kind === "raster") {
          if (skipRaster) return null;
          return <OverlayRaster key={key} overlayKey={key} beforeId={beforeId} />;
        }
        return <OverlayVector key={key} overlayKey={key} beforeId={beforeId} />;
      })}
      {popup ? <OverlayPopup hit={popup} onClose={onPopupClose} /> : null}
    </>
  );
}
