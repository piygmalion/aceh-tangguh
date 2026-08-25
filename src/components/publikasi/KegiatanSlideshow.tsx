"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Calendar, ChevronLeft, ChevronRight, ExternalLink, MapPin } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { fetchPublicApi } from "@/lib/preview/public-api";
import {
  KEGIATAN_INTERVAL_DETIK,
  type PublikasiKegiatanItem,
  type PublikasiKegiatanListResponse,
} from "@/lib/publikasi-kegiatan-types";
import { qk } from "@/lib/qk";
import { TYPE_KICKER_CLASS, TYPE_STAMP_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

async function fetchKegiatanList(): Promise<PublikasiKegiatanListResponse> {
  const res = await fetchPublicApi("/api/publikasi/kegiatan");
  if (!res.ok) throw new Error("kegiatan fetch failed");
  return res.json();
}

function formatDate(iso: string, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale === "en" ? "en-GB" : "id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function coverUrl(item: PublikasiKegiatanItem): string | null {
  return item.foto_sampul_url || item.foto_sampul_thumbnail_url || item.photos[0]?.url || null;
}

export function KegiatanSlideshow() {
  const t = useTranslations("publikasi");
  const locale = useLocale();
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.publikasiKegiatan,
    queryFn: fetchKegiatanList,
    staleTime: 60_000,
  });

  const items = data?.kegiatan ?? [];
  const intervalMs = (data?.metadata.interval_detik || KEGIATAN_INTERVAL_DETIK) * 1000;
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (items.length === 0) {
      setIndex(0);
      return;
    }
    setIndex((current) => Math.min(current, items.length - 1));
  }, [items.length]);

  const goTo = useCallback(
    (next: number) => {
      if (items.length === 0) return;
      setIndex(((next % items.length) + items.length) % items.length);
    },
    [items.length],
  );

  useEffect(() => {
    if (reducedMotion || hovering || items.length < 2) return;
    const id = window.setInterval(() => goTo(index + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [goTo, hovering, index, intervalMs, items.length, reducedMotion]);

  const current = items[index] ?? null;
  const photo = current ? coverUrl(current) : null;

  const location = useMemo(() => {
    if (!current) return "";
    return current.lokasi_teks || current.kabupaten.join(", ");
  }, [current]);

  if (isLoading) {
    return (
      <GlassPanel className="p-6 text-sm text-[var(--text-dim)]">
        {t("kegiatanLoading")}
      </GlassPanel>
    );
  }

  if (isError) {
    return (
      <GlassPanel className="p-6 text-sm text-[var(--danger)]">
        {t("kegiatanError")}
      </GlassPanel>
    );
  }

  if (!current) {
    return (
      <GlassPanel className="p-8 text-center text-sm text-[var(--text-dim)]">
        {t("kegiatanEmpty")}
      </GlassPanel>
    );
  }

  const canCycle = items.length > 1;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-muted)] shadow-[var(--shadow-elevated)]"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocusCapture={() => setHovering(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setHovering(false);
        }
      }}
    >
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={t("kegiatanAria")}
        className="relative aspect-[4/5] min-h-[22rem] sm:aspect-[16/10] lg:aspect-[21/9]"
      >
        {items.map((item, i) => {
          const src = coverUrl(item);
          const active = i === index;
          return (
            <div
              key={item.id}
              className={cn(
                "absolute inset-0",
                !reducedMotion && "transition-opacity duration-700 ease-in-out",
                active ? "opacity-100" : "pointer-events-none opacity-0",
              )}
              aria-hidden={!active}
            >
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt=""
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-full w-full bg-[var(--bg-muted)]" />
              )}
            </div>
          );
        })}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/20" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/55 via-black/10 to-transparent" />

        <div className="absolute left-0 right-0 top-0 flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <p className={cn("text-white/75", TYPE_KICKER_CLASS)}>
            BPBA
            <span className="mx-2 text-white/35" aria-hidden>
              ·
            </span>
            {t("kegiatanLatest")}
          </p>
          <p className={cn("text-white/70", TYPE_STAMP_CLASS)} aria-live="polite">
            {t("kegiatanSlideOf", { current: index + 1, total: items.length })}
          </p>
        </div>

        <article className="absolute inset-x-0 bottom-0 z-10 space-y-3 p-4 sm:p-6 md:max-w-3xl md:p-8">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/75">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={12} aria-hidden />
              {formatDate(current.tanggal_publikasi, locale)}
            </span>
            {location ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={12} aria-hidden />
                {location}
              </span>
            ) : null}
          </p>
          <h3 className="text-2xl font-semibold leading-tight tracking-tight text-white md:text-4xl">
            {current.judul.trim()}
          </h3>
          {current.ringkasan ? (
            <p className="line-clamp-3 max-w-2xl text-sm leading-relaxed text-white/80 md:text-base">
              {current.ringkasan}
            </p>
          ) : null}
          {current.url ? (
            <a
              href={current.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-white/25"
            >
              {t("kegiatanOpen")}
              <ExternalLink size={12} aria-hidden />
            </a>
          ) : null}
        </article>

        {canCycle ? (
          <>
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              aria-label={t("kegiatanPrev")}
              className="absolute left-3 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/55"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              aria-label={t("kegiatanNext")}
              className="absolute right-3 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/55"
            >
              <ChevronRight size={18} />
            </button>
          </>
        ) : null}

        {canCycle && !reducedMotion && !hovering ? (
          <div className="absolute inset-x-0 bottom-0 z-10 h-0.5 overflow-hidden bg-white/15">
            <div
              key={index}
              className="h-full bg-[var(--primary)]"
              style={{
                animation: `publikasi-kegiatan-progress ${intervalMs}ms linear`,
              }}
            />
          </div>
        ) : null}
      </div>

      {canCycle ? (
        <div
          className="flex flex-wrap items-center justify-center gap-2 bg-[var(--bg-raised)]/80 px-4 py-3"
          role="tablist"
          aria-label={t("kegiatanAria")}
        >
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={item.judul.trim()}
              onClick={() => goTo(i)}
              className={cn(
                "h-2 rounded-full transition-all",
                i === index
                  ? "w-6 bg-[var(--primary)]"
                  : "w-2 bg-[var(--text-dim)]/40 hover:bg-[var(--text-dim)]",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
