"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { fetchPublicApi } from "@/lib/preview/public-api";
import {
  buildIrbiByKabMap,
  fetchIrbiSummary,
  lookupIrbiKab,
  type IrbiKabSummary,
} from "@/lib/irbi-by-kab";
import { qk } from "@/lib/qk";
import type {
  WeatherApiResponse,
  WeatherForecastKab,
  WeatherSource,
} from "@/lib/weather-types";
import { TYPE_FLOOR_CLASS, TYPE_KICKER_CLASS, TYPE_STAMP_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";
import { WeatherIcon } from "./WeatherIcon";

const AUTOPLAY_MS = 4500;
const SKELETON_COUNT = 5;
const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

async function fetchWeather(): Promise<WeatherApiResponse> {
  const res = await fetchPublicApi("/api/weather");
  if (!res.ok) throw new Error("Failed to load weather");
  return res.json();
}

function useVisibleCardCount() {
  const [count, setCount] = useState(2);

  useEffect(() => {
    const queries: { q: string; n: number }[] = [
      { q: "(min-width: 1024px)", n: 5 },
      { q: "(min-width: 768px)", n: 4 },
      { q: "(min-width: 640px)", n: 3 },
    ];

    const update = () => {
      for (const { q, n } of queries) {
        if (window.matchMedia(q).matches) {
          setCount(n);
          return;
        }
      }
      setCount(2);
    };

    update();
    const mqls = queries.map(({ q }) => window.matchMedia(q));
    mqls.forEach((mql) => mql.addEventListener("change", update));
    return () => mqls.forEach((mql) => mql.removeEventListener("change", update));
  }, []);

  return count;
}

function scrollToCard(scroller: HTMLElement, index: number, smooth: boolean) {
  const cards = scroller.querySelectorAll<HTMLElement>("[data-weather-card]");
  const target = cards[index];
  if (!target) return;
  const left =
    target.getBoundingClientRect().left -
    scroller.getBoundingClientRect().left +
    scroller.scrollLeft;
  scroller.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
}

const TRACK_COLS =
  "grid-flow-col gap-2 auto-cols-[calc((100%-0.5rem)_/_2)] sm:auto-cols-[calc((100%-1rem)_/_3)] md:auto-cols-[calc((100%-1.5rem)_/_4)] lg:auto-cols-[calc((100%-2rem)_/_5)]";

function compassFromDeg(deg: number): string | null {
  if (!Number.isFinite(deg)) return null;
  const idx = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return COMPASS[idx];
}

/** Same tones as WeatherKabCard IRBI chip. */
function riskTone(kelas?: string): "danger" | "warn" | "neutral" {
  if (!kelas) return "neutral";
  const k = kelas.toUpperCase();
  if (k === "TINGGI" || k === "SANGAT TINGGI") return "danger";
  if (k === "SEDANG" || k === "MEDIUM") return "warn";
  return "neutral";
}

const compactChipClass = cn("gap-1 px-1.5 py-0.5 leading-none", TYPE_FLOOR_CLASS);

/**
 * Label the provider honestly.
 * `bmkg` / live BMKG pipeline → BMKG.
 * `open-meteo` → Open-Meteo.
 * cached/fixture only claim BMKG when metadata.providers is BMKG-only.
 */
function resolveWeatherProvider(
  source: WeatherSource,
  providers: string[] | undefined,
): "bmkg" | "open-meteo" | null {
  if (source === "open-meteo") return "open-meteo";
  if (source === "bmkg") return "bmkg";
  const set = new Set((providers ?? []).map((p) => p.toLowerCase()));
  const hasBmkg = set.has("bmkg");
  const hasOm = set.has("open-meteo");
  if (hasBmkg && !hasOm) return "bmkg";
  if (hasOm && !hasBmkg) return "open-meteo";
  return null;
}

function WeatherThumb({
  kab,
  irbi,
  providers,
}: {
  kab: WeatherForecastKab;
  irbi?: IrbiKabSummary;
  providers?: string[];
}) {
  const t = useTranslations("weather");
  const tIrbi = useTranslations("irbi");
  const locale = useLocale();
  const today = kab.daily[0];
  const desc =
    locale === "en" ? kab.current.weather_desc_en : kab.current.weather_desc_id;
  const provider = resolveWeatherProvider(kab.source, providers);
  const windDir = compassFromDeg(kab.current.wind_direction_deg);
  const kelas = irbi?.kelas_risiko;
  const score =
    typeof irbi?.irb_2025 === "number" ? irbi.irb_2025.toFixed(1) : null;
  const cuacaKelas = kab.kelas_cuaca_ekstrem;
  const threatKey = irbi?.ancaman_tertinggi;
  const threatLabel = threatKey
    ? tIrbi.has(`hazard_${threatKey}`)
      ? tIrbi(`hazard_${threatKey}`)
      : threatKey.replace(/_/g, " ")
    : null;

  return (
    <div data-weather-card className="min-w-0 snap-start">
      <div
        className="glass flex h-full max-h-[33dvh] min-h-[8.5rem] flex-col gap-1 overflow-hidden rounded-2xl px-2.5 py-2"
        aria-label={t("thumbAria", {
          name: kab.kabupaten_kota,
          desc,
          temp: Math.round(kab.current.temperature_c),
          kelas: kelas ?? t("irbiMissing"),
          score: score ?? t("irbiMissing"),
        })}
      >
        <div className="flex items-start justify-between gap-1">
          <div className="flex min-w-0 items-center gap-1">
            <WeatherIcon
              code={kab.current.weather_code}
              className="h-4 w-4 shrink-0 text-[var(--info)]"
            />
            <span className="text-base font-semibold tabular-nums leading-none tracking-tight">
              {Math.round(kab.current.temperature_c)}°
            </span>
            {today ? (
              <span className={cn("truncate text-[var(--text-dim)]", TYPE_STAMP_CLASS)}>
                {t("tempMinMax", {
                  min: Math.round(today.temp_min_c),
                  max: Math.round(today.temp_max_c),
                })}
              </span>
            ) : null}
          </div>
          {provider ? (
            <span className={cn("shrink-0 text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
              {provider === "bmkg" ? t("sourceBmkg") : t("sourceOpenMeteo")}
            </span>
          ) : null}
        </div>

        <span className={cn("truncate leading-tight text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
          {desc}
        </span>
        <span className="truncate text-xs font-medium leading-tight text-[var(--text)]">
          {kab.kabupaten_kota}
        </span>

        <p className={cn("truncate leading-tight text-[var(--text-dim)]", TYPE_STAMP_CLASS)}>
          <span>{t("humidityValue", { value: Math.round(kab.current.humidity_pct) })}</span>
          <span aria-hidden> · </span>
          <span>
            {windDir
              ? t("windValueDir", {
                  speed: Math.round(kab.current.wind_speed_kmh),
                  dir: windDir,
                })
              : t("windValue", { speed: Math.round(kab.current.wind_speed_kmh) })}
          </span>
          <span aria-hidden> · </span>
          <span>
            {t("rainValue", { value: kab.current.precipitation_mm.toFixed(1) })}
          </span>
        </p>

        <div className="mt-auto flex min-w-0 flex-wrap items-center gap-1">
          {kelas ? (
            <Chip tone={riskTone(kelas)} className={compactChipClass}>
              {kelas}
            </Chip>
          ) : (
            <span className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
              {t("irbiMissing")}
            </span>
          )}
          <span
            className={cn("font-semibold leading-none", TYPE_STAMP_CLASS)}
            aria-label={t("irbiScoreAria", { score: score ?? t("irbiMissing") })}
          >
            {score ?? t("irbiMissing")}
          </span>
          {cuacaKelas ? (
            <Chip tone={riskTone(cuacaKelas)} className={`${compactChipClass} max-w-full truncate`}>
              {t("cuacaEkstremChip", { kelas: cuacaKelas })}
            </Chip>
          ) : null}
        </div>

        {threatLabel ? (
          <span className={cn("truncate capitalize leading-tight text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
            {threatLabel}
          </span>
        ) : null}

        <span className={cn("truncate text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
          {t("irbiAttr")}
        </span>
      </div>
    </div>
  );
}

const controlBtnClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--bg-muted)] text-[var(--text)] hover:border-[var(--primary)]";

export function WeatherStrip() {
  const t = useTranslations("weather");
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.weather,
    queryFn: fetchWeather,
    staleTime: 15 * 60_000,
    refetchInterval: 15 * 60_000,
  });
  const { data: irbiPayload } = useQuery({
    queryKey: qk.irbi,
    queryFn: fetchIrbiSummary,
    staleTime: 60 * 60_000,
  });

  const irbiMap = useMemo(
    () => buildIrbiByKabMap(irbiPayload?.kabupaten_kota ?? []),
    [irbiPayload],
  );

  const items = useMemo(() => {
    if (!data?.kabupaten_kota) return [];
    return [...data.kabupaten_kota].sort((a, b) =>
      a.kabupaten_kota.localeCompare(b.kabupaten_kota, "id"),
    );
  }, [data]);

  const total = items.length;
  const visibleCount = useVisibleCardCount();
  const maxIndex = Math.max(0, total - visibleCount);
  const canCarousel = total > visibleCount;

  const scrollerRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const programmaticRef = useRef(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) setPlaying(false);
  }, []);

  useEffect(() => {
    setIndex((i) => Math.min(i, maxIndex));
  }, [maxIndex]);

  const goTo = useCallback(
    (next: number, smooth = true) => {
      if (total === 0) return;
      const wrapped = ((next % (maxIndex + 1)) + (maxIndex + 1)) % (maxIndex + 1);
      setIndex(wrapped);
      const el = scrollerRef.current;
      if (el) {
        programmaticRef.current = true;
        scrollToCard(el, wrapped, smooth);
        window.setTimeout(() => {
          programmaticRef.current = false;
        }, 480);
      }
    },
    [maxIndex, total],
  );

  const go = useCallback(
    (dir: -1 | 1) => {
      goTo(indexRef.current + dir);
    },
    [goTo],
  );

  useEffect(() => {
    if (!playing || hovering || isLoading || isError || !canCarousel) return;
    const id = window.setInterval(() => go(1), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [playing, hovering, isLoading, isError, canCarousel, go]);

  const syncIndexFromScroll = useCallback(() => {
    if (programmaticRef.current) return;
    const el = scrollerRef.current;
    if (!el || total === 0) return;
    const cards = el.querySelectorAll<HTMLElement>("[data-weather-card]");
    const first = cards[0];
    if (!first) return;
    const cardWidth = first.offsetWidth;
    const gap = 8;
    const next = Math.round(el.scrollLeft / (cardWidth + gap));
    setIndex(Math.min(maxIndex, Math.max(0, next)));
  }, [maxIndex, total]);

  const windowFrom = total === 0 ? 0 : index + 1;
  const windowTo = total === 0 ? 0 : Math.min(total, index + visibleCount);
  const thumbLeftPct = total === 0 ? 0 : (index / total) * 100;
  const thumbWidthPct =
    total === 0 ? 100 : Math.max((visibleCount / total) * 100, 100 / Math.max(total, 1));

  return (
    <section
      id="cuaca"
      className="border-y border-[var(--glass-border)] bg-[var(--bg-raised)]/60 px-4 py-5 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
              {t("stripTitle")}
            </h2>
            <p className="mt-1 text-xs text-[var(--text-dim)]">
              {data?.metadata.fetched_at ? (
                <>
                  {t("updated", {
                    time: new Date(data.metadata.fetched_at).toLocaleString(),
                  })}
                  <span aria-hidden> · </span>
                </>
              ) : null}
              {t("stripSources")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {canCarousel ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label={t("prev")}
                  className={controlBtnClass}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  aria-label={playing ? t("pause") : t("play")}
                  title={t("autoplay")}
                  className={controlBtnClass}
                >
                  {playing ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label={t("next")}
                  className={controlBtnClass}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div
          className="mt-4"
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        >
          {isLoading ? (
            <div
              className={`grid overflow-hidden ${TRACK_COLS}`}
              aria-hidden
            >
              {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <span key={i} className="skeleton h-[8.5rem] rounded-2xl" />
              ))}
            </div>
          ) : null}

          {isError ? (
            <span className="text-sm text-[var(--text-dim)]">{t("error")}</span>
          ) : null}

          {!isLoading && !isError && total > 0 ? (
            <>
              <div
                ref={scrollerRef}
                role="region"
                aria-roledescription="carousel"
                aria-label={t("carouselAria")}
                onScroll={syncIndexFromScroll}
                className={`grid overflow-x-auto scroll-smooth snap-x snap-mandatory overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${TRACK_COLS}`}
              >
                {items.map((kab) => (
                  <WeatherThumb
                    key={kab.slug}
                    kab={kab}
                    irbi={lookupIrbiKab(irbiMap, kab)}
                    providers={data?.metadata.providers}
                  />
                ))}
              </div>

              {canCarousel ? (
                <div className="mt-3 flex items-center gap-3">
                  <p
                    className="shrink-0 text-xs tabular-nums text-[var(--text-dim)]"
                    aria-live="polite"
                  >
                    {t("pageIndicator", {
                      from: windowFrom,
                      to: windowTo,
                      total,
                    })}
                  </p>
                  <div
                    className="relative h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--border)]"
                    role="presentation"
                  >
                    <div
                      className="absolute inset-y-0 rounded-full bg-[var(--primary)] transition-[left,width] duration-300"
                      style={{
                        left: `${thumbLeftPct}%`,
                        width: `${thumbWidthPct}%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
