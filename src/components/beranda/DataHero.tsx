"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { heroBackgroundMode, HERO_PHOTO } from "@/lib/hero-photo";
import { HeroPhotoBackdrop } from "./HeroPhotoBackdrop";
import { Link } from "@/i18n/routing";
import {
  aggregateDibiBeranda,
  bandShowsSparklines,
  displayedBandMetrics,
  IMPACT_PEAK_YEAR,
  peakPoint,
  runningYear,
  seriesPerMetric,
  yearPick,
  type DibiBerandaView,
  type SparklineKey,
} from "@/lib/dibi-beranda";
import type { DibiMetrics, DibiTahunRow } from "@/lib/dibi-types";
import { TYPE_FLOOR_CLASS, TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";
import { useDibi } from "./data";
import { angka, angkaRingkas, rupiahDariJuta, tanggalCadangan } from "./format";
import { MetricSpark } from "./MetricSpark";
import { Bar, Figure, PanelError, PanelSkeleton, Sumber } from "./primitives";
import { YearBars } from "./YearBars";

const selectClass =
  "h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] px-3 text-[0.9375rem] text-[var(--text)] [color-scheme:inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

function labelClass() {
  return cn("mb-1.5 block font-medium text-[var(--text-dim)]", TYPE_FLOOR_CLASS);
}

function formatUpdated(iso: string, locale: string): string | null {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

function Counter({
  label,
  note,
  children,
  className,
}: {
  label: string;
  note?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex h-full flex-col bg-[var(--band-bg)] p-4 text-[var(--band-fg)]", className)}>
      <p className={cn("band-label text-[var(--band-dim)]", TYPE_FLOOR_CLASS)}>{label}</p>
      <div className="mt-1">{children}</div>
      <p className={cn("band-note text-[var(--band-dim)]", TYPE_FLOOR_CLASS)}>{note ?? "\u00a0"}</p>
    </div>
  );
}

function BandValue({
  value,
  locale,
  decimals = 0,
  unit,
  prefix,
  missing,
}: {
  value: number | null;
  locale: string;
  decimals?: 0 | 1 | 2;
  unit?: string;
  prefix?: string;
  missing: string;
}) {
  if (value == null) {
    return <p className="type-figure-xl text-[var(--band-fg)]">{missing}</p>;
  }
  return (
    <Figure
      value={value}
      decimals={decimals}
      unit={unit}
      prefix={prefix}
      size="xl"
      tone="band"
    />
  );
}

function impactPeakYear(trend: readonly DibiTahunRow[], key: SparklineKey): number | null {
  if (key === "kejadian") return null;
  const peak = peakPoint(seriesPerMetric(trend, key));
  return peak?.tahun === IMPACT_PEAK_YEAR ? IMPACT_PEAK_YEAR : null;
}

function SparkSlot({
  trend,
  metric,
  locale,
  yearHeader,
  countHeader,
  runningYear: openYear,
}: {
  trend: readonly DibiTahunRow[];
  metric: SparklineKey;
  locale: string;
  yearHeader: string;
  countHeader: string;
  runningYear: number | null;
}) {
  const points = seriesPerMetric(trend, metric);
  const peak = impactPeakYear(trend, metric);
  return (
    <>
      <MetricSpark
        points={points}
        peakYear={peak}
        peakLabel={peak == null ? "" : String(peak)}
        runningYear={openYear}
      />
      <table className="sr-only">
        <caption>{metric}</caption>
        <thead>
          <tr>
            <th>{yearHeader}</th>
            <th>{countHeader}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.tahun}>
              <td>{point.tahun}</td>
              <td>{angka(point.value, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Counters({
  metrics,
  locale,
  trend,
  showSparks,
  runningYear: openYear,
}: {
  metrics: DibiMetrics | null;
  locale: string;
  trend: readonly DibiTahunRow[];
  showSparks: boolean;
  runningYear: number | null;
}) {
  const t = useTranslations("beranda");
  const missing = t("statistik.belumAda");
  const menderita = metrics ? angkaRingkas(metrics.menderita_mengungsi, locale) : null;
  const kerugian = metrics ? rupiahDariJuta(metrics.estimasi_kerugian_rumah, locale) : null;
  const spark = (key: SparklineKey | null) =>
    showSparks ? (
      key == null ? (
        <div className="mt-2 h-12" data-hilang-slot="" aria-hidden />
      ) : (
        <SparkSlot
          trend={trend}
          metric={key}
          locale={locale}
          yearHeader={t("statistik.yearHeader")}
          countHeader={t("statistik.countHeader")}
          runningYear={openYear}
        />
      )
    ) : null;

  return (
    <div
      id="dibi"
      data-number-band
      className="relative z-40 mt-8 overflow-hidden rounded-2xl border border-[var(--band-rule)] border-t-[3px] bg-[var(--band-bg)] text-[var(--band-fg)]"
    >
      <div className="grid h-full grid-cols-2 gap-px bg-white/20 sm:grid-cols-3 lg:grid-cols-6">
        <Counter label={t("statistik.kejadian")}>
          <BandValue value={metrics ? metrics.kejadian : null} locale={locale} missing={missing} />
          {spark("kejadian")}
        </Counter>
        <Counter label={t("statistik.meninggal")}>
          <BandValue value={metrics ? metrics.meninggal : null} locale={locale} missing={missing} />
          {spark("meninggal")}
        </Counter>
        <Counter label={t("statistik.hilang")}>
          <BandValue value={metrics ? metrics.hilang : null} locale={locale} missing={missing} />
          {spark(null)}
        </Counter>
        <Counter label={t("statistik.luka")}>
          <BandValue value={metrics ? metrics.luka_sakit : null} locale={locale} missing={missing} />
          {spark("luka_sakit")}
        </Counter>
        <Counter className="col-span-2 sm:col-span-1" label={t("statistik.menderita")} note={t("statistik.menderitaNote")}>
          <BandValue
            value={menderita ? menderita.n : null}
            decimals={menderita?.decimals ?? 0}
            unit={menderita?.unit}
            locale={locale}
            missing={missing}
          />
          {spark("menderita_mengungsi")}
        </Counter>
        <Counter className="col-span-2 sm:col-span-1" label={t("dibi.kerugian")} note={t("dibi.kerugianNote")}>
          <BandValue
            value={kerugian ? kerugian.n : null}
            decimals={kerugian?.decimals ?? 0}
            unit={kerugian?.unit}
            prefix="Rp"
            locale={locale}
            missing={missing}
          />
          {spark("estimasi_kerugian_rumah")}
        </Counter>
      </div>
    </div>
  );
}

export function DataHero() {
  const t = useTranslations("beranda");
  const locale = useLocale();
  const { data, isLoading, isError } = useDibi();
  const [yearFrom, setYearFrom] = useState<number | null>(null);
  const [yearTo, setYearTo] = useState<number | null>(null);
  const [kabupaten, setKabupaten] = useState("");
  const [jenis, setJenis] = useState("");

  const view = useMemo<DibiBerandaView | null>(() => {
    if (!data) return null;
    return aggregateDibiBeranda(data, {
      yearFrom,
      yearTo,
      kabupaten: kabupaten || null,
      jenis: jenis || null,
    });
  }, [data, yearFrom, yearTo, kabupaten, jenis]);

  const updated = data ? formatUpdated(data.metadata.fetched_at, locale) : null;
  const standbyDate =
    data?.source === "fixture" ? tanggalCadangan(data.metadata.fetched_at, locale) : null;
  const metrics = view ? displayedBandMetrics(view) : null;
  const scopeNote =
    view?.counters.scope === "kabupaten"
      ? t("statistik.scopeKab")
      : view?.counters.scope === "jenis"
        ? t("statistik.scopeJenis")
        : view?.counters.scope === "unavailable"
          ? t("statistik.scopeUnavailable")
          : t("statistik.scopeYear");

  function pickYear(which: "from" | "to", raw: string) {
    const next = yearPick(raw, view?.years ?? []);
    if (next == null) return;
    if (which === "from") {
      setYearFrom(next);
      setYearTo((current) => (current != null && next > current ? next : current));
      return;
    }
    setYearTo(next);
    setYearFrom((current) => (current != null && next < current ? next : current));
  }

  const kabRows = useMemo(() => {
    const rows = [...(view?.kabChart.rows ?? [])];
    const max = rows.reduce((m, row) => Math.max(m, row.kejadian), 0);
    rows.sort((a, b) => b.kejadian - a.kejadian || a.kabupaten.localeCompare(b.kabupaten, locale));
    return { rows, max };
  }, [view, locale]);

  const showSparks = view ? bandShowsSparklines(view) : false;
  const openYear = data ? runningYear(data.metadata) : null;
  const [photoFailed, setPhotoFailed] = useState(false);
  const heroBg = heroBackgroundMode(HERO_PHOTO, photoFailed);
  const onPhoto = heroBg === "photo";

  return (
    <section
      id="hero"
      data-hero-bg={heroBg}
      data-section-density="spacious"
      className="section-y-spacious relative scroll-mt-24 overflow-hidden px-4 !pt-28 md:!pt-32"
    >
      {onPhoto ? null : (
        <div aria-hidden className="pointer-events-none absolute inset-0 text-[var(--ink)] opacity-[0.07]">
          <svg className="h-full w-full" viewBox="0 0 1200 480" preserveAspectRatio="xMidYMid slice">
            {[70, 130, 190, 250, 310, 370].map((y, index) => (
              <path
                key={y}
                d={`M-40 ${y} C 160 ${y - 28 - index * 3}, 380 ${y + 22}, 620 ${y - 6} S 960 ${y + 16}, 1260 ${y - 10}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.25"
              />
            ))}
          </svg>
        </div>
      )}
      <div className="relative mx-auto max-w-6xl">
        <div className="relative">
          <HeroPhotoBackdrop failed={photoFailed} onError={() => setPhotoFailed(true)} />
          <div className={cn("relative z-10", onPhoto && "text-white")}>
            <p className={cn(onPhoto ? "text-white" : "text-[var(--eyebrow)]", TYPE_KICKER_CLASS)}>
              {t("statistik.kicker")}
            </p>
            <div className="mt-3 grid items-end gap-6 lg:grid-cols-2">
              <div className="max-w-2xl">
                <h1 className="type-display">{t("statistik.title")}</h1>
                <p className={cn("type-lead mt-3", onPhoto ? "text-white" : "text-[var(--text-dim)]")}>
                  {t("statistik.lead")}
                </p>
                <Link
                  href="/data-bencana"
                  className={cn(
                    "mt-5 inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 font-semibold transition-colors",
                    onPhoto
                      ? "border-white/40 bg-white text-[#111111] hover:bg-white"
                      : "border-[var(--border)] bg-[var(--bg-raised)] hover:border-[var(--ink)] hover:bg-[var(--bg-muted)]",
                    TYPE_FLOOR_CLASS,
                  )}
                >
                  {t("dibi.cta")}
                  <ArrowUpRight size={14} aria-hidden />
                </Link>
              </div>
              {view && view.trend.length > 0 ? (
                <YearBars
                  rows={view.trend}
                  title={t("statistik.trendTitle")}
                  caption={t("statistik.trendCaption")}
                  berjalanLabel={t("statistik.berjalan")}
                  formatCount={(count) => angka(count, locale)}
                  runningYear={openYear}
                  onPhoto={onPhoto}
                />
              ) : null}
            </div>
          </div>
        </div>

        {isLoading ? <PanelSkeleton className="mt-8 h-80" /> : null}
        {isError ? (
          <div className="mt-8">
            <PanelError>{t("dibi.error")}</PanelError>
          </div>
        ) : null}

        {data && view ? (
          <>
            <fieldset className="relative z-40 mt-8" aria-describedby="dibi-catatan">
              <legend className="sr-only">{t("statistik.filtersAria")}</legend>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className={labelClass()} htmlFor="dibi-year-from">
                    {t("statistik.yearFrom")}
                  </label>
                  <select
                    id="dibi-year-from"
                    className={selectClass}
                    value={yearFrom ?? view.yearFrom ?? ""}
                    onChange={(event) => pickYear("from", event.target.value)}
                  >
                    {view.years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass()} htmlFor="dibi-year-to">
                    {t("statistik.yearTo")}
                  </label>
                  <select
                    id="dibi-year-to"
                    className={selectClass}
                    value={yearTo ?? view.yearTo ?? ""}
                    onChange={(event) => pickYear("to", event.target.value)}
                  >
                    {view.years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass()} htmlFor="dibi-kabupaten">
                    {t("statistik.kabupaten")}
                  </label>
                  <select
                    id="dibi-kabupaten"
                    className={selectClass}
                    value={kabupaten}
                    onChange={(event) => setKabupaten(event.target.value)}
                  >
                    <option value="">{t("statistik.allKab")}</option>
                    {view.kabupatenOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass()} htmlFor="dibi-jenis">
                    {t("statistik.jenis")}
                  </label>
                  <select
                    id="dibi-jenis"
                    className={selectClass}
                    value={jenis}
                    onChange={(event) => setJenis(event.target.value)}
                  >
                    <option value="">{t("statistik.allJenis")}</option>
                    {view.jenisOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </fieldset>

            <div id="dibi-catatan" className="mt-4 space-y-1" aria-live="polite">
              {showSparks ? (
                <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{scopeNote}</p>
              ) : null}
              {view.trendIgnoresKabupaten || view.trendIgnoresJenis ? (
                <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                  {t("statistik.trendScopeNote")}
                </p>
              ) : null}
            </div>

            {view.trend.length === 0 ? (
              <p className={cn("mt-6 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                {t("statistik.emptyRange")}
              </p>
            ) : (
              <table className="sr-only">
                <caption>{t("statistik.chartTrendAria")}</caption>
                <thead>
                  <tr>
                    <th>{t("statistik.yearHeader")}</th>
                    <th>{t("statistik.countHeader")}</th>
                  </tr>
                </thead>
                <tbody>
                  {view.trend.map((row) => (
                    <tr key={row.tahun}>
                      <td>{row.tahun}</td>
                      <td>{angka(row.kejadian, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="mt-8">
              <figure className="min-w-0 rounded-xl bg-[var(--chart-surface)] p-3">
                <figcaption className="mb-1 font-semibold">{t("statistik.kabTitle")}</figcaption>
                <p className={cn("mb-3 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                  {t("statistik.kabNote")}
                </p>
                <ul className="max-h-80 space-y-3 overflow-y-auto pr-1" aria-hidden>
                  {kabRows.rows.map((row) => {
                    const selected = kabupaten === row.kabupaten;
                    return (
                      <li key={row.kabupaten}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span
                            className={cn(
                              "truncate text-[0.9375rem]",
                              selected ? "font-semibold" : "font-medium",
                            )}
                          >
                            {row.kabupaten}
                          </span>
                          <span className="shrink-0 text-[0.9375rem] font-semibold tabular-nums">
                            {angka(row.kejadian, locale)}
                          </span>
                        </div>
                        <div className="mt-1.5">
                          <Bar
                            ratio={kabRows.max > 0 ? row.kejadian / kabRows.max : 0}
                            className="bg-[var(--chart-bar)]"
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <table className="sr-only">
                  <caption>{t("statistik.chartKabAria")}</caption>
                  <thead>
                    <tr>
                      <th>{t("statistik.kabupaten")}</th>
                      <th>{t("statistik.countHeader")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kabRows.rows.map((row) => (
                      <tr key={row.kabupaten}>
                        <td>{row.kabupaten}</td>
                        <td>{angka(row.kejadian, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </figure>
            </div>

            <div data-testid="number-band-block">
              <Counters
                metrics={metrics}
                locale={locale}
                trend={view.trend}
              showSparks={showSparks}
              runningYear={openYear}
            />
              <p className={cn("mt-3 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                {showSparks
                  ? openYear != null
                    ? t("statistik.scaleNote", { year: String(openYear) })
                    : t("statistik.scaleNotePlain")
                  : scopeNote}
              </p>
            </div>

            <p className={cn("mt-4 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
              {t("statistik.noIncidents")}
            </p>

            <Sumber href={data.metadata.source_url}>
              {standbyDate
                ? t("statistik.sumberCadangan", { date: standbyDate })
                : updated
                  ? t("statistik.sumber", { updated })
                  : t("statistik.sumberUndated")}
            </Sumber>
          </>
        ) : null}
      </div>
    </section>
  );
}
