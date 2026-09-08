"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { WeatherInovasiStrip } from "@/components/weather/WeatherInovasiStrip";
import type { WeatherForecastKab } from "@/lib/weather-types";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";
import { useCuaca } from "./data";
import { kapitalAwal } from "./format";
import { PanelSkeleton } from "./primitives";

const AUTOPLAY_MS = 5000;
const SKELETON_COUNT = 6;
const TRACK_COLS =
  "grid-flow-col gap-2 auto-cols-[calc((100%-0.5rem)_/_2)] sm:auto-cols-[calc((100%-1rem)_/_3)] lg:auto-cols-[calc((100%-2.5rem)_/_6)]";

function useVisibleCardCount() {
  const [count, setCount] = useState(2);

  useEffect(() => {
    const queries: { q: string; n: number }[] = [
      { q: "(min-width: 1024px)", n: 6 },
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
  const cards = scroller.querySelectorAll<HTMLElement>("[data-cuaca-card]");
  const target = cards[index];
  if (!target) return;
  const left =
    target.getBoundingClientRect().left -
    scroller.getBoundingClientRect().left +
    scroller.scrollLeft;
  scroller.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
}

function toneKelas(kelas?: string): string {
  if (!kelas) return "text-[var(--text-dim)]";
  const k = kelas.toUpperCase();
  if (k.includes("TINGGI")) return "text-[var(--danger)]";
  if (k.includes("SEDANG") || k.includes("MEDIUM")) return "text-[var(--warn)]";
  return "text-[var(--info)]";
}

function KartuCuaca({
  row,
  locale,
}: {
  row: WeatherForecastKab;
  locale: string;
}) {
  return (
    <li data-cuaca-card className="min-w-0 snap-start">
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-3">
        <p className="truncate text-[0.8125rem] font-medium">{row.kabupaten_kota}</p>
        <div className="mt-2 flex items-end justify-between gap-2">
          <span className="text-[1.5rem] font-semibold tabular-nums leading-none tracking-[-0.03em]">
            {Math.round(row.current.temperature_c)}
            <span className="text-[0.55em] font-medium opacity-65">°</span>
          </span>
          <WeatherIcon
            code={row.current.weather_code}
            className="h-5 w-5 shrink-0 text-[var(--info)]"
          />
        </div>
        <p className={cn("mt-2 truncate text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
          {locale === "en" ? row.current.weather_desc_en : row.current.weather_desc_id}
        </p>
        {row.kelas_cuaca_ekstrem ? (
          <p className={cn("mt-1 font-semibold", TYPE_FLOOR_CLASS, toneKelas(row.kelas_cuaca_ekstrem))}>
            {kapitalAwal(row.kelas_cuaca_ekstrem, locale)}
          </p>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Compact weather tape that cycles every 23 kabupaten/kota.
 * Autoplay is 5s; pause on hover, focus, or reduced motion.
 */
export function CuacaStrip() {
  const t = useTranslations("beranda");
  const locale = useLocale();
  const { data, isLoading, isError } = useCuaca();
  const visibleCount = useVisibleCardCount();
  const items = useMemo(() => {
    if (!data?.kabupaten_kota) return [];
    return [...data.kabupaten_kota].sort((a, b) =>
      a.kabupaten_kota.localeCompare(b.kabupaten_kota, "id"),
    );
  }, [data]);

  const total = items.length;
  const maxIndex = Math.max(0, total - visibleCount);
  const canCarousel = total > visibleCount;

  const scrollerRef = useRef<HTMLUListElement>(null);
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
    const cards = el.querySelectorAll<HTMLElement>("[data-cuaca-card]");
    const first = cards[0];
    if (!first) return;
    const cardWidth = first.offsetWidth;
    const gap = 8;
    const next = Math.round(el.scrollLeft / (cardWidth + gap));
    setIndex(Math.min(maxIndex, Math.max(0, next)));
  }, [maxIndex, total]);

  const windowFrom = total === 0 ? 0 : index + 1;
  const windowTo = total === 0 ? 0 : Math.min(total, index + visibleCount);
  const controlBtnClass =
    "inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-raised)] text-[var(--text)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]";

  return (
    <section
      id="cuaca"
      aria-label={t("cuaca.aria")}
      className="scroll-mt-24 border-b border-[var(--border)] px-4 py-6"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[0.9375rem] font-semibold">{t("cuaca.title")}</h2>
          <div className="flex shrink-0 items-center gap-3">
            {data ? (
              <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                {t("cuaca.meta", { count: data.metadata.total_kabupaten_kota })}
              </p>
            ) : null}
            <WeatherInovasiStrip />
            {canCarousel ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label={t("cuaca.prev")}
                  className={controlBtnClass}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  aria-label={playing ? t("cuaca.pause") : t("cuaca.play")}
                  title={t("cuaca.autoplay")}
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
                  aria-label={t("cuaca.next")}
                  className={controlBtnClass}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <div className={cn("grid overflow-hidden", TRACK_COLS)} aria-hidden>
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <PanelSkeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : null}

        {isError ? (
          <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
            {t("cuaca.error")}
          </p>
        ) : null}

        {!isLoading && !isError && total > 0 ? (
          <div
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            onFocusCapture={() => setHovering(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setHovering(false);
              }
            }}
          >
            <ul
              ref={scrollerRef}
              role="region"
              aria-roledescription="carousel"
              aria-label={t("cuaca.carouselAria")}
              onScroll={syncIndexFromScroll}
              className={cn(
                "grid overflow-x-auto scroll-smooth snap-x snap-mandatory overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                TRACK_COLS,
              )}
            >
              {items.map((row) => (
                <KartuCuaca key={row.slug} row={row} locale={locale} />
              ))}
            </ul>
            {canCarousel ? (
              <p
                className={cn("mt-2 tabular-nums text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}
                aria-live="polite"
              >
                {t("cuaca.pageIndicator", {
                  from: windowFrom,
                  to: windowTo,
                  total,
                })}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
