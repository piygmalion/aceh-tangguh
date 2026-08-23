"use client";

import { useState } from "react";
import { ChevronDown, Layers } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { qk } from "@/lib/qk";
import type { AreaLayerKey, LegendModel, MarkerLayerKey } from "@/lib/types";
import { LAYER_COLORS } from "@/components/map/MapViewport";
import { FacHealthIcon } from "@/components/icons/FacHealthIcon";

const AREA_OPTIONS: { key: AreaLayerKey; labelKey: string }[] = [
  { key: "villageDistribution", labelKey: "villageDistribution" },
  { key: "r3pDistribution", labelKey: "r3pDistribution" },
  { key: "irbi2025", labelKey: "irbi2025" },
  { key: "ngoDistribution", labelKey: "ngoDistribution" },
  { key: "regencyFundAllocation", labelKey: "regencyFundAllocation" },
];

type LocationGroup = {
  groupKey: "groupMain" | "groupFacilities" | "groupInfra" | "groupParticipation";
  options: { key: MarkerLayerKey; labelKey: MarkerLayerKey }[];
};

const LOCATION_GROUPS: LocationGroup[] = [
  {
    groupKey: "groupMain",
    options: [
      { key: "disasterEvents", labelKey: "disasterEvents" },
      { key: "facHealth", labelKey: "facHealth" },
      { key: "facEducation", labelKey: "facEducation" },
      { key: "policeOffices", labelKey: "policeOffices" },
    ],
  },
  {
    groupKey: "groupFacilities",
    options: [
      { key: "facGov", labelKey: "facGov" },
      { key: "facReligious", labelKey: "facReligious" },
    ],
  },
  {
    groupKey: "groupInfra",
    options: [
      { key: "infraRoadBridge", labelKey: "infraRoadBridge" },
      { key: "helipad", labelKey: "helipad" },
      { key: "starlink", labelKey: "starlink" },
    ],
  },
  {
    groupKey: "groupParticipation",
    options: [{ key: "citizenReports", labelKey: "citizenReports" }],
  },
];

async function fetchAreaLegend(key: AreaLayerKey): Promise<LegendModel | null> {
  const res = await fetch(`/api/layers/areas/${key}`);
  if (!res.ok) return null;
  const json = await res.json();
  return (json.legend as LegendModel) ?? null;
}

type TabKey = "distribusi" | "lokasi" | "legenda";

export function MapToolbar({
  areaLayer,
  onAreaLayerChange,
  markerLayers,
  onToggleMarker,
}: {
  areaLayer: AreaLayerKey | null;
  onAreaLayerChange: (k: AreaLayerKey | null) => void;
  markerLayers: MarkerLayerKey[];
  onToggleMarker: (k: MarkerLayerKey) => void;
}) {
  const t = useTranslations("map");
  const [tab, setTab] = useState<TabKey>("lokasi");
  /** Mobile bottom-sheet open state. Desktop panel is always shown via md: classes. */
  const [expanded, setExpanded] = useState(false);

  const { data: areaLegend } = useQuery({
    queryKey: [...qk.area(areaLayer ?? "villageDistribution"), "legend"],
    queryFn: () => fetchAreaLegend(areaLayer!),
    enabled: areaLayer != null && tab === "legenda",
  });

  const activeCount = markerLayers.length + (areaLayer ? 1 : 0);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "distribusi", label: t("distribusi") },
    { key: "lokasi", label: t("lokasi") },
    { key: "legenda", label: t("legenda") },
  ];

  return (
    <aside
      className={`map-chrome-elevated absolute z-30 flex flex-col overflow-hidden transition-[max-height] duration-300 ease-out max-md:inset-x-2 max-md:bottom-2 max-md:rounded-2xl md:bottom-3 md:right-3 md:top-[4.25rem] md:w-[19.5rem] md:max-h-none md:rounded-2xl ${
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
              {AREA_OPTIONS.map((opt) => (
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
                  <span>{t(opt.labelKey)}</span>
                </label>
              ))}
            </fieldset>
          )}

          {tab === "lokasi" && (
            <div className="space-y-3">
              {LOCATION_GROUPS.map((group) => (
                <fieldset
                  key={group.groupKey}
                  className="map-chrome-inset space-y-0.5 rounded-xl p-2"
                >
                  <legend className="mb-1 px-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
                    {t(group.groupKey)}
                  </legend>
                  {group.options.map((opt) => {
                    const active = markerLayers.includes(opt.key);
                    return (
                      <label
                        key={opt.key}
                        className="map-option"
                        data-active={active ? "true" : "false"}
                      >
                        <input
                          className="map-check"
                          type="checkbox"
                          checked={active}
                          onChange={() => onToggleMarker(opt.key)}
                        />
                        {opt.key === "facHealth" ? (
                          <span
                            className="map-layer-icon text-[var(--accent)]"
                            style={{ color: LAYER_COLORS.facHealth }}
                            aria-hidden
                          >
                            <FacHealthIcon className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <span
                            className="map-swatch"
                            style={{ background: LAYER_COLORS[opt.key] }}
                            aria-hidden
                          />
                        )}
                        <span className="leading-snug">{t(opt.labelKey)}</span>
                      </label>
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
                    {markerLayers.map((key) => (
                      <li key={key} className="flex items-center gap-2.5">
                        {key === "facHealth" ? (
                          <span
                            className="map-layer-icon"
                            style={{ color: LAYER_COLORS.facHealth }}
                            aria-hidden
                          >
                            <FacHealthIcon className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <span
                            className="map-swatch"
                            style={{ background: LAYER_COLORS[key] }}
                          />
                        )}
                        <span>{t(key)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {areaLayer && areaLegend && (
                <div className="map-chrome-inset rounded-xl p-3">
                  <div className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
                    {areaLegend.title}
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
