"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, CloudRain, Droplets, Flame, Mountain, Waves } from "lucide-react";
import { StatusScaleChip, type StatusLevel } from "@/components/ui/StatusScaleChip";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { qk } from "@/lib/qk";
import type {
  CuacaWarningCard,
  MagmaCard,
  MaritimCard as MaritimWarningCard,
  PeringatanDiniResponse,
  PeringatanTone,
  SipongiCard,
  TatonasCard,
} from "@/lib/peringatan-dini-types";
import {
  TYPE_FLOOR_CLASS,
  TYPE_KICKER_CLASS,
  TYPE_STAMP_CLASS,
} from "@/lib/type-floor";
import { cn } from "@/lib/utils";

const AUTOPLAY_MS = 7000;

const controlBtnClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--bg-muted)] text-[var(--text)] hover:border-[var(--ink)]";

function scrollToPdCard(scroller: HTMLElement, index: number, smooth: boolean) {
  const cards = scroller.querySelectorAll<HTMLElement>("[data-pd-card]");
  const target = cards[index];
  if (!target) return;
  const left =
    target.getBoundingClientRect().left -
    scroller.getBoundingClientRect().left +
    scroller.scrollLeft;
  scroller.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
}

async function fetchPeringatanDini(): Promise<PeringatanDiniResponse> {
  const res = await fetchPublicApi("/api/peringatan-dini");
  if (!res.ok) throw new Error("Failed to load peringatan dini");
  return res.json();
}

function formatStamp(iso: string | null | undefined, locale: string): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toLocaleString(locale === "en" ? "en-GB" : "id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CardShell({
  href,
  external,
  tone,
  header,
  children,
  ariaLabel,
}: {
  href: string;
  external?: boolean;
  tone: PeringatanTone;
  header: ReactNode;
  children: ReactNode;
  ariaLabel: string;
}) {
  const ring =
    tone === "danger"
      ? "hover:ring-[var(--status-awas)]/50"
      : tone === "warn"
        ? "hover:ring-[var(--status-waspada)]/50"
        : "hover:ring-[var(--status-aman)]/40";
  const className = cn(
    "glass flex h-[20rem] flex-col gap-2 overflow-hidden rounded-2xl p-4 transition hover:ring-1",
    ring,
  );
  const body = (
    <>
      <div className="shrink-0">{header}</div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {children}
      </div>
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        className={className}
      >
        {body}
      </a>
    );
  }

  return (
    <a href={href} aria-label={ariaLabel} className={className}>
      {body}
    </a>
  );
}

function CardHeader({
  icon,
  source,
  tone,
  stamp,
  stale,
}: {
  icon: ReactNode;
  source: string;
  tone: PeringatanTone;
  stamp: string | null;
  stale: boolean;
}) {
  const t = useTranslations("peringatanDini");
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1.5">
        {icon}
        <span className={cn("truncate text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
          {source}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <StatusScaleChip level={pdToneLevel(tone)} label={t(`tone.${tone}`)} />
        {stamp ? (
          <span className={cn("text-[var(--text-dim)]", TYPE_STAMP_CLASS)}>{stamp}</span>
        ) : null}
        {stale ? (
          <span className={cn("font-medium text-[var(--warn)]", TYPE_FLOOR_CLASS)}>{t("stale")}</span>
        ) : null}
      </div>
    </div>
  );
}

function pdToneLevel(tone: PeringatanTone): StatusLevel {
  if (tone === "danger") return "awas";
  if (tone === "warn") return "waspada";
  return "aman";
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <p className={cn("leading-snug", TYPE_FLOOR_CLASS)}>
      <span className="text-[var(--text-dim)]">{label}</span>
      <span className="text-[var(--text-dim)]"> : </span>
      <span className="text-[var(--text)]">{value}</span>
    </p>
  );
}

function CuacaCard({ card }: { card: CuacaWarningCard }) {
  const t = useTranslations("peringatanDini");
  const locale = useLocale();
  const stamp = formatStamp(card.fetched_at, locale);

  return (
    <CardShell
      href={card.href}
      tone={card.tone}
      ariaLabel={t("cuaca.aria")}
      header={
        <CardHeader
          icon={<CloudRain className="h-3.5 w-3.5 shrink-0 text-[var(--info)]" />}
          source={t("cuaca.source")}
          tone={card.tone}
          stamp={stamp}
          stale={card.stale}
        />
      }
    >
      {card.empty ? (
        <Empty className="min-h-0 flex-1 items-start justify-start border-0 p-0 md:p-0">
          <EmptyDescription className="text-left text-foreground">
            {t("cuaca.empty")}
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="mt-1 flex flex-col gap-2">
          {card.highlights.map((h) => (
            <div key={h.kabupaten} className="flex flex-col gap-0.5">
              <Field label={t("cuaca.kabupaten")} value={h.kabupaten} />
              <Field label={t("cuaca.kondisi")} value={h.kondisi} />
              <Field
                label={t("cuaca.curahHujan")}
                value={
                  h.curah_hujan_mm === null
                    ? "—"
                    : t("cuaca.rainValue", { value: h.curah_hujan_mm.toFixed(1) })
                }
              />
              {h.periode ? <Field label={t("cuaca.periode")} value={h.periode} /> : null}
              <Field label={t("cuaca.sumber")} value={h.source_label} />
            </div>
          ))}
          {card.extra_count > 0 ? (
            <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
              {t("cuaca.more", { n: card.extra_count })}
            </p>
          ) : null}
        </div>
      )}
    </CardShell>
  );
}

function MagmaCardView({ card }: { card: MagmaCard }) {
  const t = useTranslations("peringatanDini");
  const locale = useLocale();
  const stamp = formatStamp(card.fetched_at, locale);
  const ev = card.event;

  return (
    <CardShell
      href={card.href}
      external
      tone={card.tone}
      ariaLabel={t("magma.aria")}
      header={
        <CardHeader
          icon={<Mountain className="h-3.5 w-3.5 shrink-0 text-[var(--warn)]" />}
          source={t("magma.source")}
          tone={card.tone}
          stamp={stamp}
          stale={card.stale}
        />
      }
    >
      {card.empty || !ev ? (
        <Empty className="min-h-0 flex-1 items-start justify-start border-0 p-0 md:p-0">
          <EmptyDescription className="text-left text-foreground">
            {t("magma.empty")}
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="mt-1 flex flex-col gap-0.5">
          <Field label={t("magma.magnitudo")} value={ev.magnitude_text} />
          <Field label={t("magma.waktu")} value={ev.waktu_kejadian} />
          <Field label={t("magma.koordinat")} value={ev.koordinat_kedalaman} />
          <Field label={t("magma.wilayah")} value={ev.wilayah} />
          {ev.intensitas_mmi ? (
            <Field label={t("magma.intensitas")} value={ev.intensitas_mmi} />
          ) : null}
          {ev.gunung_api_terdekat ? (
            <Field label={t("magma.gunung")} value={ev.gunung_api_terdekat} />
          ) : null}
        </div>
      )}
    </CardShell>
  );
}

function SipongiCardView({ card }: { card: SipongiCard }) {
  const t = useTranslations("peringatanDini");
  const locale = useLocale();
  const stamp = formatStamp(card.fetched_at, locale);

  return (
    <CardShell
      href={card.href}
      external
      tone={card.tone}
      ariaLabel={t("sipongi.aria")}
      header={
        <CardHeader
          icon={<Flame className="h-3.5 w-3.5 shrink-0 text-[var(--danger)]" />}
          source={t("sipongi.source")}
          tone={card.tone}
          stamp={stamp}
          stale={card.stale}
        />
      }
    >
      {card.empty ? (
        <Empty className="min-h-0 flex-1 items-start justify-start border-0 p-0 md:p-0">
          <EmptyDescription className="text-left text-foreground">
            {t("sipongi.empty")}
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="mt-1 flex flex-col gap-2">
          {card.points.map((p, i) => (
            <div key={`${p.tanggal}-${p.desa}-${i}`} className="flex flex-col gap-0.5">
              <Field label={t("sipongi.tanggal")} value={p.tanggal} />
              <Field label={t("sipongi.sumber")} value={p.sumber} />
              <Field label={t("sipongi.desa")} value={p.desa} />
              <Field label={t("sipongi.kecamatan")} value={p.kecamatan} />
              <Field label={t("sipongi.kabkota")} value={p.kabkota} />
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}

function MaritimCard({ card }: { card: MaritimWarningCard }) {
  const t = useTranslations("peringatanDini");
  const locale = useLocale();
  const stamp = formatStamp(card.fetched_at, locale);

  return (
    <CardShell
      href={card.href}
      external
      tone={card.tone}
      ariaLabel={t("maritim.aria")}
      header={
        <CardHeader
          icon={<Waves className="h-3.5 w-3.5 shrink-0 text-[var(--info)]" />}
          source={t("maritim.source")}
          tone={card.tone}
          stamp={stamp}
          stale={card.stale}
        />
      }
    >
      {card.empty ? (
        <Empty className="min-h-0 flex-1 items-start justify-start border-0 p-0 md:p-0">
          <EmptyDescription className="text-left text-foreground">
            {t("maritim.empty")}
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="mt-1 flex flex-col gap-2">
          {card.highlights.map((h) => (
            <div key={`${h.kode ?? h.nama}-${h.wave_cat}`} className="flex flex-col gap-0.5">
              <Field label={t("maritim.perairan")} value={h.nama} />
              <Field label={t("maritim.kategori")} value={h.wave_cat} />
              {h.wave_min_m != null || h.wave_max_m != null ? (
                <Field
                  label={t("maritim.tinggi")}
                  value={
                    h.wave_min_m != null && h.wave_max_m != null
                      ? `${h.wave_min_m}–${h.wave_max_m} m`
                      : `${h.wave_max_m ?? h.wave_min_m} m`
                  }
                />
              ) : null}
            </div>
          ))}
          {card.valid_from || card.valid_to ? (
            <Field
              label={t("maritim.berlaku")}
              value={[formatStamp(card.valid_from, locale), formatStamp(card.valid_to, locale)]
                .filter(Boolean)
                .join(" – ")}
            />
          ) : null}
          {card.extra_count > 0 ? (
            <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
              {t("maritim.more", { n: card.extra_count })}
            </p>
          ) : null}
        </div>
      )}
    </CardShell>
  );
}

function TatonasCardView({ card }: { card: TatonasCard }) {
  const t = useTranslations("peringatanDini");
  const locale = useLocale();
  const stamp = formatStamp(card.fetched_at, locale);

  return (
    <CardShell
      href={card.href}
      external
      tone={card.tone}
      ariaLabel={t("tatonas.aria")}
      header={
        <CardHeader
          icon={<Droplets className="h-3.5 w-3.5 shrink-0 text-[var(--info)]" />}
          source={t("tatonas.source")}
          tone={card.tone}
          stamp={stamp}
          stale={card.stale}
        />
      }
    >
      {card.empty ? (
        <Empty className="min-h-0 flex-1 items-start justify-start border-0 p-0 md:p-0">
          <EmptyDescription className="text-left text-foreground">
            {t("tatonas.empty")}
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="mt-1 flex flex-col gap-2">
          {card.highlights.map((h) => (
            <div key={`${h.uid}-${h.pos_name}`} className="flex flex-col gap-0.5">
              <Field label={t("tatonas.pos")} value={h.pos_name} />
              <Field label={t("tatonas.jenis")} value={h.logger_kind.toUpperCase()} />
              <Field
                label={t("tatonas.nilai")}
                value={
                  h.value == null
                    ? "—"
                    : `${h.value} ${h.satuan}`.trim()
                }
              />
              <Field label={t("tatonas.level")} value={h.level} />
              {h.time_local ? <Field label={t("tatonas.waktu")} value={h.time_local} /> : null}
            </div>
          ))}
          {card.extra_count > 0 ? (
            <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
              {t("tatonas.more", { n: card.extra_count })}
            </p>
          ) : null}
        </div>
      )}
    </CardShell>
  );
}

export function PeringatanDiniSection() {
  const t = useTranslations("peringatanDini");
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.peringatanDini,
    queryFn: fetchPeringatanDini,
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
  });

  const slides = data
    ? [
        { key: "cuaca", node: <CuacaCard card={data.cuaca} /> },
        { key: "magma", node: <MagmaCardView card={data.magma} /> },
        { key: "sipongi", node: <SipongiCardView card={data.sipongi} /> },
        ...(data.tatonas
          ? [{ key: "tatonas", node: <TatonasCardView card={data.tatonas} /> }]
          : []),
        ...(data.maritim
          ? [{ key: "maritim", node: <MaritimCard card={data.maritim} /> }]
          : []),
      ]
    : [];

  const total = slides.length;
  const canCycle = total > 1;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const programmaticRef = useRef(false);
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (total === 0) {
      setIndex(0);
      return;
    }
    setIndex((current) => Math.min(current, total - 1));
  }, [total]);

  const goTo = useCallback(
    (next: number, smooth = true) => {
      if (total === 0) return;
      const wrapped = ((next % total) + total) % total;
      setIndex(wrapped);
      const el = scrollerRef.current;
      if (el) {
        programmaticRef.current = true;
        scrollToPdCard(el, wrapped, smooth && !reducedMotion);
        window.setTimeout(() => {
          programmaticRef.current = false;
        }, 480);
      }
    },
    [reducedMotion, total],
  );

  useEffect(() => {
    if (reducedMotion || hovering || isLoading || isError || !canCycle) return;
    const id = window.setInterval(() => goTo(indexRef.current + 1), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [canCycle, goTo, hovering, isError, isLoading, reducedMotion]);

  const syncIndexFromScroll = useCallback(() => {
    if (programmaticRef.current) return;
    const el = scrollerRef.current;
    if (!el || total === 0) return;
    const cards = el.querySelectorAll<HTMLElement>("[data-pd-card]");
    const first = cards[0];
    if (!first) return;
    const next = Math.round(el.scrollLeft / Math.max(first.offsetWidth, 1));
    setIndex(Math.min(total - 1, Math.max(0, next)));
  }, [total]);

  return (
    <section id="status" className="relative z-[1] scroll-mt-28 px-4 py-12 md:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className={cn("mb-2 text-[var(--eyebrow)]", TYPE_KICKER_CLASS)}>
              {t("kicker")}
            </p>
            <h2 className="section-h2">{t("title")}</h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--text-dim)]">
              {t("subtitle")}
            </p>
          </div>
          <a
            href="#cuaca"
            className={cn(
              "inline-flex shrink-0 items-center gap-2 font-semibold text-[var(--text)] underline-offset-2 transition-colors hover:underline",
              TYPE_FLOOR_CLASS,
            )}
          >
            {t("archiveLink")}
            <span aria-hidden>→</span>
          </a>
        </div>

        {isLoading ? (
          <div aria-hidden>
            <Skeleton className="h-[20rem] rounded-2xl" />
          </div>
        ) : null}

        {isError ? (
          <Empty className="border border-dashed">
            <EmptyDescription>{t("error")}</EmptyDescription>
          </Empty>
        ) : null}

        {data && total > 0 ? (
          <div
            className="flex flex-col gap-4"
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
              ref={scrollerRef}
              role="region"
              aria-roledescription="carousel"
              aria-label={t("carouselAria")}
              onScroll={syncIndexFromScroll}
              className="grid auto-cols-[100%] grid-flow-col overflow-x-auto scroll-smooth snap-x snap-mandatory overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {slides.map((slide, i) => (
                <div
                  key={slide.key}
                  data-pd-card
                  className="min-w-0 snap-start"
                  aria-hidden={i !== index}
                  ref={(el) => {
                    if (el) el.inert = i !== index;
                  }}
                >
                  {slide.node}
                </div>
              ))}
            </div>

            {canCycle ? (
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => goTo(index - 1)}
                  aria-label={t("prev")}
                  className={controlBtnClass}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <p
                    className={cn("tabular-nums text-[var(--text-dim)]", TYPE_STAMP_CLASS)}
                    aria-live="polite"
                  >
                    {t("slideOf", { current: index + 1, total })}
                  </p>
                  <div
                    className="flex flex-wrap items-center justify-center gap-2"
                    role="tablist"
                    aria-label={t("carouselAria")}
                  >
                    {slides.map((slide, i) => (
                      <button
                        key={slide.key}
                        type="button"
                        role="tab"
                        aria-selected={i === index}
                        aria-label={t("slideOf", { current: i + 1, total })}
                        onClick={() => goTo(i)}
                        className={cn(
                          "h-2 rounded-full transition-all",
                          i === index
                            ? "w-6 bg-[var(--ink)]"
                            : "w-2 bg-[var(--text-dim)]/40 hover:bg-[var(--text-dim)]",
                        )}
                      />
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => goTo(index + 1)}
                  aria-label={t("next")}
                  className={controlBtnClass}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
