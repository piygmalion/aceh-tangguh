"use client";

import { useQuery } from "@tanstack/react-query";
import type { FeatureCollection } from "geojson";
import { useMemo } from "react";
import { Layer, Popup, Source } from "react-map-gl/maplibre";
import { MapFeatureCard, fetchFeatureCard } from "@/components/map/MapFeatureCard";
import { toFeatureCard } from "@/lib/feature-card";
import { fetchOverlayGeojson } from "@/hooks/useOverlayGeojson";
import { isStaticExport, withBasePath } from "@/lib/preview/env";
import { qk } from "@/lib/qk";
import { COLOR_TOKENS } from "@/lib/layer-colors";
import { overlayIconImageId } from "@/lib/layer-icons";
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
  overlaySymbolLayerId,
} from "@/lib/overlay-layers";
import type { OverlayLayerKey } from "@/lib/types";

const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] };

export type OverlayHit = {
  key: OverlayLayerKey;
  id: string;
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
    id?: string | number;
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
    const id =
      asText(props.featureId) ??
      asText(props.id) ??
      kode ??
      asText(feature.id) ??
      asText(props.title) ??
      key;
    return {
      key,
      id,
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

function OverlayVector({
  overlayKey,
  beforeId,
  iconsReady,
}: {
  overlayKey: OverlayLayerKey;
  beforeId?: string;
  iconsReady: boolean;
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
          featureId: String(
            f.id ??
              (f.properties as { id?: unknown; code?: unknown; kode_bmkg?: unknown } | null)?.id ??
              (f.properties as { code?: unknown } | null)?.code ??
              (f.properties as { kode_bmkg?: unknown } | null)?.kode_bmkg ??
              "",
          ),
          color: (f.properties as { fillColor?: string } | null)?.fillColor || color,
        },
      })),
    };
  }, [data, overlayKey, color]);

  const before = beforeId ? { beforeId } : {};

  if (kind === "point") {
    return (
      <Source id={overlaySourceId(overlayKey)} type="geojson" data={geojson} generateId>
        {iconsReady ? (
          <Layer
            id={overlaySymbolLayerId(overlayKey)}
            type="symbol"
            layout={{
              "icon-image": overlayIconImageId(overlayKey),
              "icon-size": 1,
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
            }}
          />
        ) : (
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
        )}
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

function overlayFallbackCard(hit: OverlayHit) {
  return toFeatureCard({
    type: "Feature",
    id: hit.id,
    geometry: { type: "Point", coordinates: [hit.lng, hit.lat] },
    properties: {
      layer: hit.key,
      title: hit.title,
      status: hit.status,
      featureId: hit.id,
      code: hit.kode,
      kode_bmkg: hit.kode,
      weather: hit.weather,
      wave_cat: hit.waveCat,
      wave_height: hit.waveHeight,
      wind_from: hit.windFrom,
      wind_speed: hit.windSpeed,
      stale: hit.stale,
      href: hit.href,
    },
  });
}

function OverlayPopup({
  hit,
  onClose,
}: {
  hit: OverlayHit;
  onClose: () => void;
}) {
  const { data, isFetching, isError } = useQuery({
    queryKey: qk.featureCard(hit.id, hit.key),
    queryFn: () => fetchFeatureCard(hit.id, hit.key),
    staleTime: 60_000,
  });

  const lng = Number.isFinite(hit.lng) ? hit.lng : 96.5;
  const lat = Number.isFinite(hit.lat) ? hit.lat : 4.3;
  const card = data ?? (isError ? overlayFallbackCard(hit) : null);

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
      <MapFeatureCard
        card={card}
        loading={isFetching && !data}
        error={isError && !data}
        onClose={onClose}
      />
    </Popup>
  );
}

export function MapOverlays({
  keys,
  beforeId,
  popup,
  onPopupClose,
  iconsReady = false,
}: {
  keys: OverlayLayerKey[];
  beforeId?: string;
  popup: OverlayHit | null;
  onPopupClose: () => void;
  iconsReady?: boolean;
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
        return (
          <OverlayVector
            key={key}
            overlayKey={key}
            beforeId={beforeId}
            iconsReady={iconsReady}
          />
        );
      })}
      {popup ? <OverlayPopup hit={popup} onClose={onPopupClose} /> : null}
    </>
  );
}
