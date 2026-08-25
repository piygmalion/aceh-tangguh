"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { DISASTER_JENIS_COLORS } from "@/lib/disaster-jenis";
import {
  aggregateImpact,
  countByJenis,
  monthlyTrend,
  resolveTrendYear,
  rowsForJenis,
} from "@/lib/kejadian-analisis";
import type { KejadianRow } from "@/lib/kejadian-types";
import { LAYER_COLORS } from "@/lib/layer-colors";
import { getDisasterJenisIconPath } from "@/lib/layer-icons";

const LINE_COLOR = "var(--primary)";

type Props = {
  windowRows: KejadianRow[];
  selectedJenis: string;
  from: string;
  to: string;
  onSelectJenis: (jenis: string) => void;
  isLoading: boolean;
  isError: boolean;
};

type ChartTip = {
  name: string;
  value: number;
};

function formatCount(n: number, locale: string): string {
  return n.toLocaleString(locale === "id" ? "id-ID" : "en-US");
}

function formatIsoDay(iso: string, locale: string): string {
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function monthLabel(monthIndex: number, locale: string): string {
  return new Date(Date.UTC(2020, monthIndex, 1)).toLocaleDateString(
    locale === "id" ? "id-ID" : "en-US",
    { month: "short", timeZone: "UTC" }
  );
}

function ChartTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ChartTip }>;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--bg-raised)] px-3 py-2 text-xs shadow-[var(--shadow)]">
      <div className="font-semibold text-[var(--text)]">{row.name}</div>
      <div className="mt-0.5 text-[var(--text-dim)]">
        {row.value.toLocaleString("id-ID")} {unit}
      </div>
    </div>
  );
}

function ImpactCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "ok" | "warn" | "danger";
}) {
  const tones = {
    neutral: "border-[var(--glass-border)]",
    ok: "border-[var(--primary)]/35",
    warn: "border-[var(--warn)]/35",
    danger: "border-[var(--danger)]/35",
  } as const;
  const values = {
    neutral: "text-[var(--text)]",
    ok: "text-[var(--primary)]",
    warn: "text-[var(--warn)]",
    danger: "text-[var(--danger)]",
  } as const;
  return (
    <div
      className={`rounded-xl border bg-[var(--bg-muted)]/40 px-3 py-3 ${tones[tone]}`}
    >
      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-dim)]">
        {label}
      </div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${values[tone]}`}>
        {value}
      </div>
    </div>
  );
}

export function KejadianAnalisis({
  windowRows,
  selectedJenis,
  from,
  to,
  onSelectJenis,
  isLoading,
  isError,
}: Props) {
  const t = useTranslations("dataBencana.analisis");
  const locale = useLocale();

  const byJenis = useMemo(() => countByJenis(windowRows), [windowRows]);
  const scopedRows = useMemo(
    () => rowsForJenis(windowRows, selectedJenis),
    [windowRows, selectedJenis]
  );
  const impact = useMemo(() => aggregateImpact(scopedRows), [scopedRows]);
  const trendYear = useMemo(
    () => resolveTrendYear(scopedRows, from, to),
    [scopedRows, from, to]
  );
  const monthly = useMemo(
    () => monthlyTrend(scopedRows, trendYear),
    [scopedRows, trendYear]
  );

  const rangeLabel = useMemo(() => {
    if (from && to) {
      return t("rangeFromTo", {
        from: formatIsoDay(from, locale),
        to: formatIsoDay(to, locale),
      });
    }
    if (from) return t("rangeFrom", { from: formatIsoDay(from, locale) });
    if (to) return t("rangeTo", { to: formatIsoDay(to, locale) });
    return t("rangeAll");
  }, [from, to, locale, t]);

  const barData = useMemo(
    () =>
      byJenis.map((row) => ({
        name: row.jenis,
        value: row.count,
      })),
    [byJenis]
  );

  const lineData = useMemo(
    () =>
      monthly.map((row) => ({
        name: monthLabel(row.month, locale),
        value: row.count,
      })),
    [monthly, locale]
  );

  return (
    <GlassPanel className="p-4 md:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-dim)]">
            {t("kicker")}
          </div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">
            {t("title")}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-dim)]">
            {t("subtitle", { range: rangeLabel })}
            {selectedJenis ? ` · ${selectedJenis}` : ""}
          </p>
        </div>
      </div>

      {isError ? (
        <p className="mt-4 text-sm text-[var(--danger)]">{t("error")}</p>
      ) : isLoading && windowRows.length === 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-[var(--bg-muted)]"
            />
          ))}
        </div>
      ) : windowRows.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-dim)]">{t("empty")}</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onSelectJenis("")}
              aria-pressed={!selectedJenis}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                !selectedJenis
                  ? "border-[var(--primary)] bg-[var(--primary-dim)] text-[var(--primary)] ring-2 ring-[var(--primary)]/40"
                  : "border-[var(--glass-border)] bg-[var(--bg-muted)]/50 text-[var(--text)] hover:border-[var(--primary)]"
              }`}
            >
              <span>{t("total")}</span>
              <span className="tabular-nums">{formatCount(windowRows.length, locale)}</span>
            </button>
            {byJenis.map((row) => {
              const active = selectedJenis === row.jenis;
              const icon = getDisasterJenisIconPath(row.jenis);
              const color =
                DISASTER_JENIS_COLORS[row.jenis] ?? LAYER_COLORS.disasterEvents;
              return (
                <button
                  key={row.jenis}
                  type="button"
                  onClick={() => onSelectJenis(active ? "" : row.jenis)}
                  aria-pressed={active}
                  aria-label={t("selectJenis", { jenis: row.jenis })}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "border-[var(--primary)] bg-[var(--primary-dim)] text-[var(--text)] ring-2 ring-[var(--primary)]/40"
                      : "border-[var(--glass-border)] bg-[var(--bg-muted)]/50 text-[var(--text)] hover:border-[var(--primary)]"
                  }`}
                >
                  {icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={icon} alt="" className="h-5 w-5 object-contain" />
                  ) : (
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: color }}
                      aria-hidden
                    />
                  )}
                  <span className="max-w-[11rem] truncate sm:max-w-none">
                    {row.jenis}
                  </span>
                  <span className="tabular-nums text-[var(--text-dim)]">
                    {formatCount(row.count, locale)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--bg-muted)]/25 p-3">
              <div className="mb-2 text-sm font-medium">{t("byJenis")}</div>
              <div className="h-64 w-full sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barData}
                    layout="vertical"
                    margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
                  >
                    <CartesianGrid
                      stroke="var(--border)"
                      strokeDasharray="3 3"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fill: "var(--text-dim)", fontSize: 11 }}
                      axisLine={{ stroke: "var(--border)" }}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={118}
                      tick={{ fill: "var(--text)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--primary-dim)" }}
                      content={<ChartTooltip unit={t("unitKejadian")} />}
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
                      {barData.map((row) => (
                        <Cell
                          key={row.name}
                          fill={
                            !selectedJenis || selectedJenis === row.name
                              ? DISASTER_JENIS_COLORS[row.name] ?? LINE_COLOR
                              : "rgba(148, 163, 184, 0.35)"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--bg-muted)]/25 p-3">
              <div className="mb-2 text-sm font-medium">
                {t("monthlyYear", { year: trendYear })}
              </div>
              <div className="h-64 w-full sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={lineData}
                    margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid
                      stroke="var(--border)"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "var(--text-dim)", fontSize: 11 }}
                      axisLine={{ stroke: "var(--border)" }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "var(--text-dim)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={36}
                    />
                    <Tooltip
                      cursor={{ stroke: "var(--border)" }}
                      content={<ChartTooltip unit={t("unitKejadian")} />}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={LINE_COLOR}
                      strokeWidth={2.2}
                      dot={{ r: 3, fill: LINE_COLOR, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
              {t("impact")}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <ImpactCard
                label={t("rumahRr")}
                value={formatCount(impact.rr, locale)}
                tone="ok"
              />
              <ImpactCard
                label={t("rumahRs")}
                value={formatCount(impact.rs, locale)}
                tone="warn"
              />
              <ImpactCard
                label={t("rumahRb")}
                value={formatCount(impact.rb, locale)}
                tone="danger"
              />
              <ImpactCard
                label={t("luka")}
                value={formatCount(impact.lukaRingan + impact.lukaBerat, locale)}
                tone="warn"
              />
              <ImpactCard
                label={t("meninggal")}
                value={formatCount(impact.meninggal, locale)}
                tone="danger"
              />
            </div>
          </div>
        </>
      )}
    </GlassPanel>
  );
}
