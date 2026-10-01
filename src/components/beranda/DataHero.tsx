"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "@/i18n/routing";
import {
  aggregateDibiBeranda,
  displayedBandMetrics,
  yearPick,
  type DibiBerandaView,
} from "@/lib/dibi-beranda";
import type { DibiMetrics } from "@/lib/dibi-types";
import { TYPE_FLOOR_CLASS, TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";
import { useDibi } from "./data";
import { angka, angkaRingkas, rupiahDariJuta, tanggalCadangan } from "./format";
import { Bar, Figure, PanelError, PanelSkeleton, Sumber } from "./primitives";

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

function TrendTip({
  active,
  payload,
  locale,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { tahun: number; kejadian: number } }>;
  locale: string;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-2 text-[0.8125rem] text-[var(--text)] shadow-[var(--shadow)]">
      <p className="font-semibold tabular-nums">{row.tahun}</p>
      <p className="text-[var(--text-dim)]">{angka(row.kejadian, locale)}</p>
    </div>
  );
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
    <div className={cn("bg-[var(--band-bg)] px-4 py-4 text-[var(--band-fg)]", className)}>
      <p className={cn("text-[var(--band-dim)]", TYPE_FLOOR_CLASS)}>{label}</p>
      <div className="mt-1">{children}</div>
      {note ? (
        <p className={cn("mt-1 text-[var(--band-dim)]", TYPE_FLOOR_CLASS)}>{note}</p>
      ) : null}
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
    return <p className="text-[1.5rem] font-semibold leading-none text-[var(--band-fg)] sm:text-[1.75rem]">{missing}</p>;
  }
  return (
    <Figure
      value={value}
      decimals={decimals}
      unit={unit}
      prefix={prefix}
      size="sm"
      tone="band"
    />
  );
}

function Counters({
  metrics,
  locale,
}: {
  metrics: DibiMetrics | null;
  locale: string;
}) {
  const t = useTranslations("beranda");
  const missing = t("statistik.belumAda");
  const menderita = metrics ? angkaRingkas(metrics.menderita_mengungsi, locale) : null;
  const kerugian = metrics ? rupiahDariJuta(metrics.estimasi_kerugian_rumah, locale) : null;

  return (
    <div
      id="dibi"
      data-number-band
      className="relative z-40 mt-8 overflow-hidden rounded-2xl border border-[var(--band-bg)] border-t-[3px] border-t-[var(--band-rule)] bg-[var(--band-bg)]"
    >
      <div className="grid grid-cols-2 gap-px bg-white/15 sm:grid-cols-3 lg:grid-cols-6">
        <Counter label={t("statistik.kejadian")}>
          <BandValue value={metrics ? metrics.kejadian : null} locale={locale} missing={missing} />
        </Counter>
        <Counter label={t("statistik.meninggal")}>
          <BandValue value={metrics ? metrics.meninggal : null} locale={locale} missing={missing} />
        </Counter>
        <Counter label={t("statistik.hilang")}>
          <BandValue value={metrics ? metrics.hilang : null} locale={locale} missing={missing} />
        </Counter>
        <Counter label={t("statistik.luka")}>
          <BandValue value={metrics ? metrics.luka_sakit : null} locale={locale} missing={missing} />
        </Counter>
        <Counter className="col-span-2 sm:col-span-1" label={t("statistik.menderita")} note={t("statistik.menderitaNote")}>
          <BandValue
            value={menderita ? menderita.n : null}
            decimals={menderita?.decimals ?? 0}
            unit={menderita?.unit}
            locale={locale}
            missing={missing}
          />
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
        </Counter>
      </div>
    </div>
  );
}

export function DataHero() {
  const t = useTranslations("beranda");
  const locale = useLocale();
  const reduced = useReducedMotion();
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

  return (
    <section id="hero" className="scroll-mt-24 px-4 pb-16 pt-28 md:pb-20 md:pt-32">
      <div className="mx-auto max-w-6xl">
        <p className={cn("text-[var(--eyebrow)]", TYPE_KICKER_CLASS)}>{t("statistik.kicker")}</p>
        <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[2.25rem]">
              {t("statistik.title")}
            </h1>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--text-dim)]">
              {t("statistik.lead")}
            </p>
          </div>
          <Link
            href="/data-bencana"
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] px-4 font-semibold transition-colors hover:border-[var(--ink)] hover:bg-[var(--bg-muted)]",
              TYPE_FLOOR_CLASS,
            )}
          >
            {t("dibi.cta")}
            <ArrowUpRight size={14} aria-hidden />
          </Link>
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
              <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{scopeNote}</p>
              {view.trendIgnoresKabupaten || view.trendIgnoresJenis ? (
                <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                  {t("statistik.trendScopeNote")}
                </p>
              ) : null}
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-2">
              <figure className="min-w-0 rounded-xl bg-[var(--chart-surface)] p-3">
                <figcaption className="mb-1 font-semibold">{t("statistik.trendTitle")}</figcaption>
                <p className={cn("mb-3 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                  {t("statistik.trendCaption")}
                </p>
                {view.trend.length === 0 ? (
                  <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                    {t("statistik.emptyRange")}
                  </p>
                ) : (
                  <div className="h-64 w-full" aria-hidden>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={view.trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                        <XAxis
                          dataKey="tahun"
                          tick={{ fill: "var(--text-dim)", fontSize: 13 }}
                          tickLine={false}
                          axisLine={false}
                          minTickGap={24}
                        />
                        <YAxis
                          tick={{ fill: "var(--text-dim)", fontSize: 13 }}
                          tickLine={false}
                          axisLine={false}
                          width={48}
                          allowDecimals={false}
                        />
                        <Tooltip
                          content={(props) => {
                            const payload = props.payload as unknown as
                              | Array<{ payload?: { tahun: number; kejadian: number } }>
                              | undefined;
                            return (
                              <TrendTip active={props.active} payload={payload} locale={locale} />
                            );
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="kejadian"
                          stroke="var(--chart-1)"
                          fill="var(--chart-1)"
                          fillOpacity={0.18}
                          strokeWidth={2}
                          isAnimationActive={!reduced}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
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
              </figure>

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
                            className={selected ? "bg-[var(--chart-2)]" : "bg-[var(--chart-1)]"}
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

            <Counters metrics={metrics} locale={locale} />

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
