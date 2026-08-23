"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { qk } from "@/lib/qk";
import type { WeatherApiResponse, WeatherForecastKab } from "@/lib/weather-types";
import { WeatherIcon } from "./WeatherIcon";

const AUTOPLAY_MS = 4500;
const SKELETON_COUNT = 5;

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

function WeatherThumb({ kab }: { kab: WeatherForecastKab }) {
  const precip = kab.current.precipitation_mm;

  return (
    <div data-weather-card className="min-w-0 snap-start">
      <div className="flex h-full flex-col gap-1 rounded-2xl border border-[var(--glass-border)] bg-[var(--bg)]/80 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <WeatherIcon
            code={kab.current.weather_code}
            className="h-4 w-4 shrink-0 text-[var(--accent)]"
          />
          <span className="text-lg font-semibold tabular-nums leading-none tracking-tight">
            {Math.round(kab.current.temperature_c)}°C
          </span>
        </div>
        <span className="truncate text-xs font-medium text-[var(--text)]">
          {kab.kabupaten_kota}
        </span>
        {precip > 0 ? (
          <span className="truncate text-[0.65rem] tabular-nums text-[var(--text-dim)]">
            {precip.toFixed(1)} mm
          </span>
        ) : (
          <span className="h-3" aria-hidden />
        )}
      </div>
    </div>
  );
}

const controlBtnClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--bg-muted)] text-[var(--text)] hover:border-[var(--accent)]";

export function WeatherStrip() {
  const t = useTranslations("weather");
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.weather,
    queryFn: fetchWeather,
    staleTime: 15 * 60_000,
    refetchInterval: 15 * 60_000,
  });

  const items = useMemo(() => {
    if (!data?.kabupaten_kota) return [];
    return [...data.kabupaten_kota].sort((a, b) =>
      a.kabupaten_kota.localeCompare(b.kabupaten_kota, "id")
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
    [maxIndex, total]
  );

  const go = useCallback(
    (dir: -1 | 1) => {
      goTo(indexRef.current + dir);
    },
    [goTo]
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
            <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-dim)]">
              {t("stripTitle")}
            </h2>
            {data?.metadata.fetched_at && (
              <p className="mt-1 text-xs text-[var(--text-dim)]">
                {t("updated", {
                  time: new Date(data.metadata.fetched_at).toLocaleString(),
                })}
              </p>
            )}
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
                <span key={i} className="skeleton h-[4.5rem] rounded-2xl" />
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
                  <WeatherThumb key={kab.slug} kab={kab} />
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
                      className="absolute inset-y-0 rounded-full bg-[var(--accent)] transition-[left,width] duration-300"
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
