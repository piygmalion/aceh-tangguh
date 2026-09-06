"use client";

import { useState } from "react";
import { ChevronDown, Layers } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Chip } from "@/components/ui/Chip";
import { OverlayLiveStatus } from "@/components/map/OverlayLiveStatus";
import {
  isLiveOverlayStatusKey,
  useLiveOverlayStatus,
  type OverlayHealth,
} from "@/hooks/useOverlayGeojson";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { qk } from "@/lib/qk";
import type { AreaLayerKey, LegendModel, MarkerLayerKey, OverlayLayerKey } from "@/lib/types";
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
  getOverlayLayerIconPath,
} from "@/lib/layer-icons";
import {
  AREA_TOOLBAR_OPTIONS,
  FASILITAS_UMUM_LAYER_KEYS,
  MARKER_TOOLBAR_GROUPS,
} from "@/lib/map-layers-catalog";
import {
  MARITIME_WAVE_LEGEND,
  OVERLAY_TOOLBAR_GROUPS,
  overlayColor,
} from "@/lib/overlay-layers";
import { KRB_JENIS_KODE } from "@/lib/krb-by-kab";
import { STATUS_HEX } from "@/lib/chart-colors";
import { TYPE_FLOOR_CLASS, TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

async function fetchAreaLegend(key: AreaLayerKey): Promise<LegendModel | null> {
  const res = await fetchPublicApi(`/api/layers/areas/${key}`);
  if (!res.ok) return null;
  const json = await res.json();
  return (json.legend as LegendModel) ?? null;
}

type TabKey = "distribusi" | "lokasi" | "geospasial" | "legenda";

function activeDisasterJenisList(disasterJenis: string[]): string[] {
  if (disasterJenis.length === 0) return [...DISASTER_JENIS];
  return DISASTER_JENIS.filter((j) => disasterJenis.includes(j));
}

type OverlayLiveLabelFn = (
  key: "overlayLiveStale" | "overlayLiveUpstream" | "overlayLiveFailed",
) => string;

function overlayHealthLabel(
  health: OverlayHealth | undefined,
  t: OverlayLiveLabelFn,
): string | null {
  if (health === "stale") return t("overlayLiveStale");
  if (health === "upstream") return t("overlayLiveUpstream");
  if (health === "failed") return t("overlayLiveFailed");
  return null;
}

function OverlayHealthChip({
  health,
  t,
}: {
  health: OverlayHealth | undefined;
  t: OverlayLiveLabelFn;
}) {
  const label = overlayHealthLabel(health, t);
  if (!label || !health) return null;
  return (
    <Chip
      tone={health === "stale" ? "warn" : "danger"}
      className={cn("mt-0.5 px-2 py-0.5", TYPE_FLOOR_CLASS)}
    >
      {label}
    </Chip>
  );
}

export function MapToolbar({
  areaLayer,
  krbJenis = null,
  onKrbJenisChange,
  onAreaLayerChange,
  markerLayers,
  onToggleMarker,
  disasterJenis,
  onToggleDisasterJenis,
  onToggleFasilitasUmum,
  overlays = [],
  onToggleOverlay,
}: {
  areaLayer: AreaLayerKey | null;
  krbJenis?: string | null;
  onKrbJenisChange?: (jenis: string | null) => void;
  onAreaLayerChange: (k: AreaLayerKey | null) => void;
  markerLayers: MarkerLayerKey[];
  onToggleMarker: (k: MarkerLayerKey) => void;
  disasterJenis: string[];
  onToggleDisasterJenis: (jenis: string) => void;
  onToggleFasilitasUmum: () => void;
  overlays?: OverlayLayerKey[];
  onToggleOverlay?: (k: OverlayLayerKey) => void;
}) {
  const t = useTranslations("map");
  const {
    healthByKey: overlayHealth,
    alert: overlayAlert,
    pending: overlayPending,
    fetching: overlayFetching,
    refetch: refetchLiveOverlays,
  } = useLiveOverlayStatus(overlays);
  const [tab, setTab] = useState<TabKey>(overlays.length ? "geospasial" : "lokasi");
  /** Mobile bottom-sheet open state. Desktop panel is always shown via md: classes. */
  const [expanded, setExpanded] = useState(false);
  const [jenisExpanded, setJenisExpanded] = useState(false);
  const [fasilitasExpanded, setFasilitasExpanded] = useState(false);

  const { data: areaLegend } = useQuery({
    queryKey: [...qk.area(areaLayer ?? "villageDistribution"), "legend"],
    queryFn: () => fetchAreaLegend(areaLayer!),
    enabled: areaLayer != null && tab === "legenda",
  });

  const parentDisasterOn = markerLayers.includes("disasterEvents");
  const parentFasilitasOn = FASILITAS_UMUM_LAYER_KEYS.some((k) =>
    markerLayers.includes(k)
  );
  const activeCount = markerLayers.length + (areaLayer ? 1 : 0) + overlays.length;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "distribusi", label: t("distribusi") },
    { key: "lokasi", label: t("lokasi") },
    { key: "geospasial", label: t("geospasial") },
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
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--primary-dim)] text-[var(--primary)]">
          <Layers size={15} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{t("toolbarHandle")}</span>
          <span className={cn("block truncate text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
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
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--primary-dim)] text-[var(--primary)]">
          <Layers size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{t("toolbarHandle")}</div>
          <div className={cn("truncate text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
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
          className="map-chrome-inset map-tablist-4 mx-2 mt-2 flex rounded-xl p-0.5 md:mx-3"
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
              <legend className={cn("mb-2 px-1 text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
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
                    fallbackColor="#1F4C15"
                  />
                  <span>{t(opt.labelKey)}</span>
                </label>
              ))}
              {areaLayer === "irbi2025" && onKrbJenisChange ? (
                <label className="mt-3 flex flex-col gap-1 px-1 text-sm">
                  <span className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
                    {t("krbJenis")}
                  </span>
                  <select
                    value={krbJenis ?? ""}
                    onChange={(e) => onKrbJenisChange(e.target.value || null)}
                    className="rounded-xl border border-[var(--glass-border)] bg-[var(--bg)] px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  >
                    <option value="">{t("krbJenisAll")}</option>
                    {KRB_JENIS_KODE.map((kode) => (
                      <option key={kode} value={kode}>
                        {kode.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  <span className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                    {t("krbDisclaimer")}
                  </span>
                </label>
              ) : null}
            </fieldset>
          )}

          {tab === "lokasi" && (
            <div className="space-y-3">
              {MARKER_TOOLBAR_GROUPS.map((group) => (
                <fieldset
                  key={group.groupKey}
                  className="map-chrome-inset space-y-0.5 rounded-xl p-2"
                >
                  <legend className={cn("mb-1 px-1 text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
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
                  {group.groupKey === "groupMain" && (
                    <div>
                      <div
                        className="map-option"
                        data-active={parentFasilitasOn ? "true" : "false"}
                        role="button"
                        tabIndex={0}
                        aria-expanded={fasilitasExpanded}
                        onClick={() => setFasilitasExpanded((v) => !v)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setFasilitasExpanded((v) => !v);
                          }
                        }}
                      >
                        <input
                          className="map-check"
                          type="checkbox"
                          checked={parentFasilitasOn}
                          onChange={onToggleFasilitasUmum}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                        <MapLayerIcon
                          iconSrc={getLayerIconPath("facHealth")}
                          fallbackColor={LAYER_COLORS.facHealth}
                        />
                        <span className="min-w-0 flex-1 leading-snug">
                          {t("fasilitasUmum")}
                        </span>
                        <ChevronDown
                          size={16}
                          className={`shrink-0 text-[var(--text-dim)] transition duration-200 ${
                            fasilitasExpanded ? "rotate-180" : ""
                          }`}
                          aria-hidden
                        />
                      </div>
                      {fasilitasExpanded && (
                        <div className="mt-0.5 space-y-0.5 pl-6">
                          {FASILITAS_UMUM_LAYER_KEYS.map((key) => {
                            const childActive = markerLayers.includes(key);
                            return (
                              <label
                                key={key}
                                className="map-option"
                                data-active={childActive ? "true" : "false"}
                              >
                                <input
                                  className="map-check"
                                  type="checkbox"
                                  checked={childActive}
                                  onChange={() => onToggleMarker(key)}
                                />
                                <MapLayerIcon
                                  iconSrc={getLayerIconPath(key)}
                                  fallbackColor={LAYER_COLORS[key]}
                                  size="sm"
                                />
                                <span className="leading-snug text-[0.8rem]">
                                  {t(key)}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </fieldset>
              ))}
            </div>
          )}

          {tab === "geospasial" && (
            <div className="flex flex-col gap-3">
              <OverlayLiveStatus
                alert={overlayAlert}
                pending={overlayPending}
                fetching={overlayFetching}
                onRetry={refetchLiveOverlays}
              />
              {OVERLAY_TOOLBAR_GROUPS.map((group) => (
                <fieldset
                  key={group.group}
                  className="map-chrome-inset space-y-0.5 rounded-xl p-2"
                >
                  <legend className={cn("mb-1 px-1 text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
                    {t(group.labelKey)}
                  </legend>
                  {group.options.map((key) => {
                    const active = overlays.includes(key);
                    const health = isLiveOverlayStatusKey(key)
                      ? overlayHealth[key]
                      : undefined;
                    return (
                      <label
                        key={key}
                        className="map-option"
                        data-active={active ? "true" : "false"}
                      >
                        <input
                          className="map-check"
                          type="checkbox"
                          checked={active}
                          onChange={() => onToggleOverlay?.(key)}
                        />
                        <MapLayerIcon
                          iconSrc={getOverlayLayerIconPath(key)}
                          fallbackColor={overlayColor(key)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="leading-snug">{t(key)}</span>
                          <OverlayHealthChip health={health} t={t} />
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
              ))}
              <p className={cn("px-1 leading-snug text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                {t("overlayAttribution")}
              </p>
            </div>
          )}

          {tab === "legenda" && (
            <div className="space-y-4">
              {markerLayers.length > 0 && (
                <div className="map-chrome-inset rounded-xl p-3">
                  <div className={cn("mb-2 text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
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
                  <p className={cn("mt-3 leading-snug text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                    {t("coordApproxLegend")}
                  </p>
                </div>
              )}
              {overlays.length > 0 && (
                <div className="map-chrome-inset rounded-xl p-3">
                  <div className={cn("mb-2 text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
                    {t("geospasial")}
                  </div>
                  <ul className="space-y-2">
                    {overlays.map((key) => {
                      const health = isLiveOverlayStatusKey(key)
                        ? overlayHealth[key]
                        : undefined;
                      return (
                        <li key={key} className="flex items-center gap-2.5">
                          <MapLayerIcon
                            iconSrc={getOverlayLayerIconPath(key)}
                            fallbackColor={overlayColor(key)}
                            size="sm"
                          />
                          <span className="min-w-0 flex-1">
                            <span>{t(key)}</span>
                            <OverlayHealthChip health={health} t={t} />
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {overlays.includes("maritimeWaters") ? (
                    <ul className="mt-3 space-y-2">
                      {MARITIME_WAVE_LEGEND.map((item) => (
                        <li key={item.labelKey} className="flex items-center gap-2.5">
                          <span
                            className="map-swatch map-swatch-sq"
                            style={{ background: item.color }}
                          />
                          <span>{t(item.labelKey)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <p className={cn("mt-3 leading-snug text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                    {t("overlayAttribution")}
                  </p>
                </div>
              )}
              {areaLayer === "irbi2025" && krbJenis ? (
                <div className="map-chrome-inset rounded-xl p-3">
                  <div className={cn("mb-2 text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
                    {t("krbLegendTitle")}
                  </div>
                  <ul className="space-y-2">
                    {[
                      { color: STATUS_HEX.RENDAH, label: t("krbRendah") },
                      { color: STATUS_HEX.SEDANG, label: t("krbSedang") },
                      { color: STATUS_HEX.TINGGI, label: t("krbTinggi") },
                    ].map((item) => (
                      <li key={item.label} className="flex items-center gap-2.5">
                        <span
                          className="map-swatch map-swatch-sq"
                          style={{ background: item.color }}
                        />
                        <span>{item.label}</span>
                      </li>
                    ))}
                  </ul>
                  <p className={cn("mt-2 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                    {t("krbDisclaimer")}
                  </p>
                </div>
              ) : null}
              {areaLayer && areaLegend && !krbJenis && (
                <div className="map-chrome-inset rounded-xl p-3">
                  <div className={cn("mb-2 flex items-center gap-2 text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
                    <MapLayerIcon
                      iconSrc={getAreaLayerIconPath(areaLayer)}
                      fallbackColor="#1F4C15"
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
              {markerLayers.length === 0 && !areaLayer && overlays.length === 0 && (
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
