"use client";

import { useState } from "react";
import { ChevronDown, Layers } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { qk } from "@/lib/qk";
import type { AreaLayerKey, LegendModel, MarkerLayerKey } from "@/lib/types";
import { LAYER_COLORS } from "@/lib/layer-colors";
import { MapLayerIcon } from "@/components/map/MapLayerIcon";
import {
  DISASTER_JENIS,
  DISASTER_JENIS_COLORS,
} from "@/lib/disaster-jenis";
import {
  getAreaLayerIconPath,
  getDisasterJenisIconPath,
  getLayerIconPath,
} from "@/lib/layer-icons";
import {
  AREA_TOOLBAR_OPTIONS,
  MARKER_TOOLBAR_GROUPS,
} from "@/lib/map-layers-catalog";

async function fetchAreaLegend(key: AreaLayerKey): Promise<LegendModel | null> {
  const res = await fetchPublicApi(`/api/layers/areas/${key}`);
  if (!res.ok) return null;
  const json = await res.json();
  return (json.legend as LegendModel) ?? null;
}

type TabKey = "distribusi" | "lokasi" | "legenda";

function activeDisasterJenisList(disasterJenis: string[]): string[] {
  if (disasterJenis.length === 0) return [...DISASTER_JENIS];
  return DISASTER_JENIS.filter((j) => disasterJenis.includes(j));
}

export function MapToolbar({
  areaLayer,
  onAreaLayerChange,
  markerLayers,
  onToggleMarker,
  disasterJenis,
  onToggleDisasterJenis,
}: {
  areaLayer: AreaLayerKey | null;
  onAreaLayerChange: (k: AreaLayerKey | null) => void;
  markerLayers: MarkerLayerKey[];
  onToggleMarker: (k: MarkerLayerKey) => void;
  disasterJenis: string[];
  onToggleDisasterJenis: (jenis: string) => void;
}) {
  const t = useTranslations("map");
  const [tab, setTab] = useState<TabKey>("lokasi");
  /** Mobile bottom-sheet open state. Desktop panel is always shown via md: classes. */
  const [expanded, setExpanded] = useState(false);
  const [jenisExpanded, setJenisExpanded] = useState(false);

  const { data: areaLegend } = useQuery({
    queryKey: [...qk.area(areaLayer ?? "villageDistribution"), "legend"],
    queryFn: () => fetchAreaLegend(areaLayer!),
    enabled: areaLayer != null && tab === "legenda",
  });

  const parentDisasterOn = markerLayers.includes("disasterEvents");
  const activeCount = markerLayers.length + (areaLayer ? 1 : 0);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "distribusi", label: t("distribusi") },
    { key: "lokasi", label: t("lokasi") },
    { key: "legenda", label: t("legenda") },
  ];

  return (
    <aside
      className={`map-chrome-elevated absolute z-30 flex flex-col overflow-hidden transition-[max-height] duration-300 ease-out max-md:inset-x-2 max-md:bottom-2 max-md:rounded-2xl md:bottom-3 md:right-3 md:top-24 md:w-[19.5rem] md:max-h-none md:rounded-2xl ${
        expanded
          ? "max-md:max-h-[min(52vh,28rem)]"
          : "max-md:max-h-[3.35rem]"
      }`}
      aria-label={t("toolbarHandle")}
    >
      {/* Mobile handle / collapse control */}
      <button
        type="button"
        className="flex w-full items-center gap-2 border-b border-[var(--border)] px-3 py-2.5 text-left md:hidden"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={expanded ? t("toolbarClose") : t("toolbarOpen")}
      >
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent-dim)] text-[var(--accent)]">
          <Layers size={15} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{t("toolbarHandle")}</span>
          <span className="block truncate text-[0.7rem] text-[var(--text-dim)]">
            {t("activeLayers", { count: activeCount })}
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-[var(--text-dim)] transition duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Desktop header */}
      <div className="hidden items-center gap-2 border-b border-[var(--border)] px-3 py-2.5 md:flex">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent-dim)] text-[var(--accent)]">
          <Layers size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{t("toolbarHandle")}</div>
          <div className="truncate text-[0.7rem] text-[var(--text-dim)]">
            {t("activeLayers", { count: activeCount })}
          </div>
        </div>
      </div>

      <div
        className={`flex min-h-0 flex-1 flex-col md:opacity-100 ${
          expanded
            ? "max-md:opacity-100"
            : "max-md:pointer-events-none max-md:invisible max-md:opacity-0"
        }`}
      >
        <div
          className="map-chrome-inset mx-2 mt-2 flex rounded-xl p-0.5 md:mx-3"
          role="tablist"
          aria-label={t("toolbarHandle")}
        >
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className="map-tab rounded-lg"
              onClick={() => {
                setTab(key);
                if (!expanded) setExpanded(true);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-3 py-3 text-sm">
          {tab === "distribusi" && (
            <fieldset className="space-y-1">
              <legend className="mb-2 px-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
                {t("distribusi")}
              </legend>
              <label
                className="map-option"
                data-active={areaLayer === null ? "true" : "false"}
              >
                <input
                  className="map-radio"
                  type="radio"
                  name="area"
                  checked={areaLayer === null}
                  onChange={() => onAreaLayerChange(null)}
                />
                <span className="font-medium">{t("areaOff")}</span>
              </label>
              {AREA_TOOLBAR_OPTIONS.map((opt) => (
                <label
                  key={opt.key}
                  className="map-option"
                  data-active={areaLayer === opt.key ? "true" : "false"}
                >
                  <input
                    className="map-radio"
                    type="radio"
                    name="area"
                    checked={areaLayer === opt.key}
                    onChange={() => onAreaLayerChange(opt.key)}
                  />
                  <MapLayerIcon
                    iconSrc={getAreaLayerIconPath(opt.key)}
                    fallbackColor="#2e9e4e"
                  />
                  <span>{t(opt.labelKey)}</span>
                </label>
              ))}
            </fieldset>
          )}

          {tab === "lokasi" && (
            <div className="space-y-3">
              {MARKER_TOOLBAR_GROUPS.map((group) => (
                <fieldset
                  key={group.groupKey}
                  className="map-chrome-inset space-y-0.5 rounded-xl p-2"
                >
                  <legend className="mb-1 px-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
                    {t(group.groupKey)}
                  </legend>
                  {group.options.map((opt) => {
                    const active = markerLayers.includes(opt.key);
                    const isDisasterEvents = opt.key === "disasterEvents";
                    return (
                      <div key={opt.key}>
                        {isDisasterEvents ? (
                          <div
                            className="map-option"
                            data-active={active ? "true" : "false"}
                            role="button"
                            tabIndex={0}
                            aria-expanded={jenisExpanded}
                            onClick={() => setJenisExpanded((v) => !v)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setJenisExpanded((v) => !v);
                              }
                            }}
                          >
                            <input
                              className="map-check"
                              type="checkbox"
                              checked={active}
                              onChange={() => onToggleMarker(opt.key)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                            <MapLayerIcon
                              iconSrc={getLayerIconPath(opt.key)}
                              fallbackColor={LAYER_COLORS[opt.key]}
                            />
                            <span className="min-w-0 flex-1 leading-snug">
                              {t(opt.labelKey)}
                            </span>
                            <ChevronDown
                              size={16}
                              className={`shrink-0 text-[var(--text-dim)] transition duration-200 ${
                                jenisExpanded ? "rotate-180" : ""
                              }`}
                              aria-hidden
                            />
                          </div>
                        ) : (
                          <label
                            className="map-option"
                            data-active={active ? "true" : "false"}
                          >
                            <input
                              className="map-check"
                              type="checkbox"
                              checked={active}
                              onChange={() => onToggleMarker(opt.key)}
                            />
                            <MapLayerIcon
                              iconSrc={getLayerIconPath(opt.key)}
                              fallbackColor={LAYER_COLORS[opt.key]}
                            />
                            <span className="leading-snug">{t(opt.labelKey)}</span>
                          </label>
                        )}
                        {isDisasterEvents && jenisExpanded && (
                          <div className="mt-0.5 space-y-0.5 pl-6">
                            {DISASTER_JENIS.map((jenis) => {
                              const childChecked =
                                parentDisasterOn &&
                                (disasterJenis.length === 0 ||
                                  disasterJenis.includes(jenis));
                              const color =
                                DISASTER_JENIS_COLORS[jenis] ??
                                LAYER_COLORS.disasterEvents;
                              return (
                                <label
                                  key={jenis}
                                  className={`map-option ${
                                    parentDisasterOn
                                      ? ""
                                      : "opacity-50"
                                  }`}
                                  data-active={childChecked ? "true" : "false"}
                                >
                                  <input
                                    className="map-check"
                                    type="checkbox"
                                    checked={childChecked}
                                    disabled={!parentDisasterOn}
                                    onChange={() => onToggleDisasterJenis(jenis)}
                                  />
                                  <MapLayerIcon
                                    iconSrc={getDisasterJenisIconPath(jenis)}
                                    fallbackColor={color}
                                    size="sm"
                                  />
                                  <span className="leading-snug text-[0.8rem]">
                                    {jenis}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </fieldset>
              ))}
            </div>
          )}

          {tab === "legenda" && (
            <div className="space-y-4">
              {markerLayers.length > 0 && (
                <div className="map-chrome-inset rounded-xl p-3">
                  <div className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
                    {t("lokasi")}
                  </div>
                  <ul className="space-y-2">
                    {markerLayers.map((key) => {
                      if (key === "disasterEvents") {
                        const activeJenis = activeDisasterJenisList(disasterJenis);
                        return activeJenis.map((jenis) => (
                          <li key={`de-${jenis}`} className="flex items-center gap-2.5">
                            <MapLayerIcon
                              iconSrc={getDisasterJenisIconPath(jenis)}
                              fallbackColor={
                                DISASTER_JENIS_COLORS[jenis] ??
                                LAYER_COLORS.disasterEvents
                              }
                              size="sm"
                            />
                            <span>{jenis}</span>
                          </li>
                        ));
                      }
                      return (
                        <li key={key} className="flex items-center gap-2.5">
                          <MapLayerIcon
                            iconSrc={getLayerIconPath(key)}
                            fallbackColor={LAYER_COLORS[key]}
                            size="sm"
                          />
                          <span>{t(key)}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-3 text-[0.7rem] leading-snug text-[var(--text-dim)]">
                    {t("coordApproxLegend")}
                  </p>
                </div>
              )}
              {areaLayer && areaLegend && (
                <div className="map-chrome-inset rounded-xl p-3">
                  <div className="mb-2 flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
                    <MapLayerIcon
                      iconSrc={getAreaLayerIconPath(areaLayer)}
                      fallbackColor="#2e9e4e"
                      size="sm"
                    />
                    <span>{areaLegend.title}</span>
                  </div>
                  <ul className="space-y-2">
                    {areaLegend.items.map((item) => (
                      <li key={item.label} className="flex items-center gap-2.5">
                        <span
                          className="map-swatch map-swatch-sq"
                          style={{ background: item.color }}
                        />
                        <span>{item.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {markerLayers.length === 0 && !areaLayer && (
                <p className="rounded-xl border border-dashed border-[var(--border)] px-3 py-4 text-center text-[var(--text-dim)]">
                  {t("legendEmpty")}
                </p>
              )}
              {areaLayer && !areaLegend && markerLayers.length === 0 && (
                <p className="text-[var(--text-dim)]">{t(areaLayer)}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
