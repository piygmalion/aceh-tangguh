"use client";

import { Settings2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "@/components/providers/ThemeProvider";
import type { BasemapId } from "@/lib/types";
import { BASEMAP_OPTIONS, BASEMAP_VECTOR_URLS } from "@/lib/basemap";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { formatSceneDate, type SentinelStatus } from "@/lib/sentinel";

async function fetchSentinelStatusClient(): Promise<SentinelStatus | null> {
  const res = await fetchPublicApi("/api/sentinel/status");
  if (!res.ok) return null;
  return (await res.json()) as SentinelStatus;
}

export function MapSettings({
  basemap,
  onBasemapChange,
  preferVector = false,
  onPreferVectorChange,
}: {
  basemap: BasemapId;
  onBasemapChange: (b: BasemapId) => void;
  preferVector?: boolean;
  onPreferVectorChange?: (on: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const t = useTranslations("map");
  const locale = useLocale();
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: sentinel } = useQuery({
    queryKey: ["sentinel-status"],
    queryFn: fetchSentinelStatusClient,
    staleTime: 6 * 60 * 60 * 1000,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div
      ref={panelRef}
      className="absolute bottom-[5.75rem] left-3 z-30 sm:bottom-6 md:left-3"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="map-chrome-elevated inline-flex h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-medium transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
      >
        <Settings2 size={16} />
        <span className="hidden sm:inline">{t("settings")}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t("settings")}
          className="map-chrome-elevated absolute bottom-[calc(100%+0.5rem)] left-0 w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl p-3 text-sm"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="font-semibold">{t("settings")}</div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-dim)] transition hover:bg-[var(--bg-muted)] hover:text-[var(--text)]"
              aria-label={t("closeSettings")}
            >
              <X size={15} />
            </button>
          </div>

          <div className="mb-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
            {t("theme")}
          </div>
          <div className="mb-3 grid grid-cols-2 gap-1.5">
            {([
              ["light", t("themeLight")],
              ["dark", t("themeDark")],
            ] as const).map(([th, label]) => (
              <button
                key={th}
                type="button"
                onClick={() => setTheme(th)}
                className={`rounded-xl border px-2.5 py-2 text-sm font-medium transition ${
                  theme === th
                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-fg)] shadow-sm"
                    : "border-[var(--border)] bg-[var(--bg-muted)] text-[var(--text)] hover:border-[var(--primary)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mb-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
            {t("basemap")}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {BASEMAP_OPTIONS.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => onBasemapChange(b.id)}
                className={`rounded-xl border px-2.5 py-2 text-left text-sm font-medium transition ${
                  basemap === b.id
                    ? "border-[var(--primary)] bg-[var(--primary-dim)] text-[var(--primary)]"
                    : "border-[var(--border)] bg-[var(--bg-muted)] text-[var(--text)] hover:border-[var(--primary)]"
                }`}
              >
                <span className="block">{t(b.labelKey)}</span>
                <span className="mt-0.5 block text-[10px] font-normal text-[var(--text-dim)]">
                  {b.kind === "raster" ? t("basemapKindRaster") : t("basemapKindImagery")}
                </span>
              </button>
            ))}
          </div>
          {onPreferVectorChange && BASEMAP_VECTOR_URLS[basemap] ? (
            <label className="mt-2.5 flex cursor-pointer items-start gap-2 text-[10px] leading-snug text-[var(--text-dim)]">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={preferVector}
                onChange={(e) => onPreferVectorChange(e.target.checked)}
              />
              <span>{t("basemapVectorOptional")}</span>
            </label>
          ) : null}
          <p className="mt-2.5 text-[10px] leading-snug text-[var(--text-dim)]">
            {t("basemapHint")}
          </p>
          {basemap === "sentinel" && sentinel?.latestScene && (
            <p className="mt-1.5 text-[10px] leading-snug text-[var(--text-dim)]">
              {t("sentinelFreshness", {
                year: sentinel.mosaic.year,
                date: formatSceneDate(sentinel.latestScene.datetime, locale),
                cloud:
                  sentinel.latestScene.cloudCover == null
                    ? "—"
                    : String(sentinel.latestScene.cloudCover),
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
