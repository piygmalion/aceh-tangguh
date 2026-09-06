"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { FeatureCollection } from "geojson";
import MapGL, { Layer, Source } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTranslations } from "next-intl";
import { FOREST_SCALE } from "@/lib/chart-colors";
import { normalizeKabLabel } from "@/lib/analisis-url";
import type { KabupatenCount } from "@/lib/kejadian-analisis";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { DEFAULT_VIEW } from "@/lib/types";
import { getBasemapStyle } from "@/lib/basemap";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

async function fetchBoundaries(): Promise<FeatureCollection> {
  const res = await fetchPublicApi("/api/boundaries");
  if (!res.ok) throw new Error("boundaries");
  return res.json();
}

type Props = {
  rows: KabupatenCount[];
  selected: string;
  onSelect: (kabupaten: string) => void;
};

export function AnalisisKabMap({ rows, selected, onSelect }: Props) {
  const t = useTranslations("analisisData");
  const { data } = useQuery({
    queryKey: ["boundaries", "analisis"],
    queryFn: fetchBoundaries,
    staleTime: 60 * 60_000,
  });

  const joined = useMemo(() => {
    if (!data) return null;
    const byNorm = new Map(
      rows.map((row) => [normalizeKabLabel(row.kabupaten), row])
    );
    return {
      type: "FeatureCollection" as const,
      features: data.features.map((feature) => {
        const name = String(feature.properties?.name ?? "");
        const hit = byNorm.get(normalizeKabLabel(name));
        return {
          ...feature,
          properties: {
            ...feature.properties,
            name,
            value: hit?.value ?? 0,
            count: hit?.count ?? 0,
            matchedName: hit?.kabupaten ?? "",
          },
        };
      }),
    };
  }, [data, rows]);

  const max = Math.max(1, ...rows.map((row) => row.value));

  return (
    <div>
      <div className="h-64 overflow-hidden rounded-xl border border-[var(--glass-border)] sm:h-72">
        <MapGL
          initialViewState={DEFAULT_VIEW}
          mapStyle={getBasemapStyle("positron") as never}
          attributionControl={false}
          interactiveLayerIds={joined ? ["analisis-kab-fill"] : []}
          onClick={(event) => {
            const name = String(event.features?.[0]?.properties?.matchedName || "");
            if (name) onSelect(name === selected ? "" : name);
          }}
        >
          {joined ? (
            <Source id="analisis-kab" type="geojson" data={joined}>
              <Layer
                id="analisis-kab-fill"
                type="fill"
                paint={{
                  "fill-color": [
                    "interpolate",
                    ["linear"],
                    ["get", "value"],
                    0,
                    FOREST_SCALE[200],
                    max / 2,
                    FOREST_SCALE[400],
                    max,
                    FOREST_SCALE[700],
                  ],
                  "fill-opacity": 0.78,
                }}
              />
              <Layer
                id="analisis-kab-line"
                type="line"
                paint={{
                  "line-color": selected ? FOREST_SCALE[700] : "#1A1A17",
                  "line-width": 0.6,
                }}
              />
            </Source>
          ) : null}
        </MapGL>
      </div>
      <p className={cn("mt-2 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
        {t("mapCaption")}
      </p>
    </div>
  );
}
