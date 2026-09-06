"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AnalisisKabMap } from "@/components/analisis/AnalisisKabMap";
import { Button } from "@/components/ui/Button";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { useAnalisisUrlState } from "@/hooks/useAnalisisUrlState";
import { presetRange, type AnalisisPreset } from "@/lib/analisis-url";
import { DISASTER_JENIS_COLORS } from "@/lib/disaster-jenis";
import { encodeDisasterJenis } from "@/lib/disaster-jenis";
import {
  parseAnalisisMetric,
  type KejadianAnalisisPayload,
} from "@/lib/kejadian-analisis";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { qk } from "@/lib/qk";
import { Link } from "@/i18n/routing";
import { TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";
import type { DibiAcehResponse } from "@/lib/dibi-types";

const inputClass =
  "w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg-raised)] px-3 py-2 text-sm text-[var(--text)] outline-none [color-scheme:inherit] focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20";

function analisisSearch(params: {
  jenis?: string;
  kabupaten?: string;
  kecamatan?: string;
  from?: string;
  to?: string;
  metric?: string;
}): string {
  const sp = new URLSearchParams();
  if (params.jenis) sp.set("jenis", params.jenis);
  if (params.kabupaten) sp.set("kabupaten", params.kabupaten);
  if (params.kecamatan) sp.set("kecamatan", params.kecamatan);
  if (params.from) sp.set("from", params.from);
  if (params.to) sp.set("to", params.to);
  if (params.metric && params.metric !== "kejadian") sp.set("metric", params.metric);
  return sp.toString();
}

async function fetchAnalisis(qs: string): Promise<KejadianAnalisisPayload> {
  const res = await fetchPublicApi(`/api/kejadian/analisis${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("analisis");
  return res.json();
}

async function fetchDibi(): Promise<DibiAcehResponse> {
  const res = await fetchPublicApi("/api/dibi/aceh");
  if (!res.ok) throw new Error("dibi");
  return res.json();
}

function monthEndIso(year: number, month: number): string {
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

export function AnalisisWorkspace() {
  const t = useTranslations("analisisData");
  const locale = useLocale();
  const { state, replace, reset } = useAnalisisUrlState();
  const [copied, setCopied] = useState(false);
  const [dibiOpen, setDibiOpen] = useState(false);

  const qs = useMemo(
    () =>
      analisisSearch({
        jenis: state.jenis,
        kabupaten: state.kab,
        kecamatan: state.kec,
        from: state.from,
        to: state.to,
        metric: state.metric,
      }),
    [state]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: qk.kejadianAnalisis({
      jenis: state.jenis,
      kabupaten: state.kab,
      kecamatan: state.kec,
      from: state.from,
      to: state.to,
      metric: state.metric,
    }),
    queryFn: () => fetchAnalisis(qs),
    staleTime: 30_000,
  });

  const compareQs = useMemo(() => {
    if (state.compareKab) {
      return analisisSearch({
        jenis: state.jenis,
        kabupaten: state.compareKab,
        from: state.from,
        to: state.to,
        metric: state.metric,
      });
    }
    if (state.compareYear) {
      return analisisSearch({
        jenis: state.jenis,
        kabupaten: state.kab,
        from: `${state.compareYear}-01-01`,
        to: `${state.compareYear}-12-31`,
        metric: state.metric,
      });
    }
    return "";
  }, [state]);

  const { data: compare } = useQuery({
    queryKey: qk.kejadianAnalisis({
      compare: state.compareKab || state.compareYear,
      jenis: state.jenis,
      kabupaten: state.compareKab || state.kab,
      from: state.compareYear ? `${state.compareYear}-01-01` : state.from,
      to: state.compareYear ? `${state.compareYear}-12-31` : state.to,
      metric: state.metric,
    }),
    queryFn: () => fetchAnalisis(compareQs),
    enabled: Boolean(compareQs),
    staleTime: 30_000,
  });

  const { data: dibi } = useQuery({
    queryKey: qk.dibiAceh,
    queryFn: fetchDibi,
    enabled: dibiOpen,
    staleTime: 10 * 60_000,
  });

  const fmt = (n: number) => n.toLocaleString(locale === "id" ? "id-ID" : "en-US");
  const unit =
    state.metric === "rumah"
      ? t("unitRumah")
      : state.metric === "korban"
        ? t("unitKorban")
        : t("unitKejadian");

  const jenisData = useMemo(
    () =>
      (data?.byJenis ?? []).map((row) => ({
        name: row.jenis,
        value: row.value,
        count: row.count,
      })),
    [data]
  );

  const kabData = useMemo(
    () =>
      (data?.byKabupaten ?? []).map((row) => ({
        name: row.kabupaten,
        value: row.value,
        count: row.count,
      })),
    [data]
  );

  const timeData = useMemo(
    () =>
      (data?.byMonth ?? []).map((row) => ({
        key: `${row.year}-${row.month}`,
        name: new Date(Date.UTC(row.year, row.month, 1)).toLocaleDateString(
          locale === "id" ? "id-ID" : "en-US",
          { month: "short", year: "2-digit", timeZone: "UTC" }
        ),
        value: row.value,
        year: row.year,
        month: row.month,
      })),
    [data, locale]
  );

  const kecamatanOptions = state.kab
    ? (data?.facets.kecamatanByKabupaten?.[state.kab] ?? [])
    : (data?.facets.kecamatan ?? []);

  const applyPreset = (preset: AnalisisPreset) => {
    const range = presetRange(preset);
    replace({ from: range.from, to: range.to });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const tableQuery = {
    ...(state.jenis ? { jenis: state.jenis } : {}),
    ...(state.kab ? { kabupaten: state.kab } : {}),
    ...(state.kec ? { kecamatan: state.kec } : {}),
    ...(state.from ? { from: state.from } : {}),
    ...(state.to ? { to: state.to } : {}),
  };

  return (
    <div className="space-y-4">
      <GlassPanel className="sticky top-20 z-30 p-4 md:p-5">
        <details className="lg:hidden" open>
          <summary className={cn("cursor-pointer text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
            {t("filters")}
          </summary>
          <FilterFields
            state={state}
            data={data}
            kecamatanOptions={kecamatanOptions}
            replace={replace}
            reset={reset}
            applyPreset={applyPreset}
            copyLink={copyLink}
            copied={copied}
          />
        </details>
        <div className="hidden lg:block">
          <div className={cn("mb-3 text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
            {t("filters")}
          </div>
          <FilterFields
            state={state}
            data={data}
            kecamatanOptions={kecamatanOptions}
            replace={replace}
            reset={reset}
            applyPreset={applyPreset}
            copyLink={copyLink}
            copied={copied}
          />
        </div>
      </GlassPanel>

      {isError ? (
        <p className="text-sm text-[var(--danger)]">{t("error")}</p>
      ) : isLoading && !data ? (
        <p className="text-sm text-[var(--text-dim)]">{t("loading")}</p>
      ) : data && data.total === 0 ? (
        <p className="text-sm text-[var(--text-dim)]">{t("empty")}</p>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Kpi label={t("kpiKejadian")} value={fmt(data.total)} />
            <Kpi label={t("kpiRr")} value={fmt(data.impact.rr)} />
            <Kpi label={t("kpiRs")} value={fmt(data.impact.rs)} />
            <Kpi label={t("kpiRb")} value={fmt(data.impact.rb)} />
            <Kpi
              label={t("kpiLuka")}
              value={fmt(data.impact.lukaRingan + data.impact.lukaBerat)}
            />
            <Kpi
              label={t("kpiMeninggal")}
              value={fmt(data.impact.meninggal + data.impact.hilang)}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <GlassPanel className="p-4">
              <div className="mb-2 text-sm font-medium">{t("byKab")}</div>
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={kabData}
                    layout="vertical"
                    margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
                  >
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: "var(--text-dim)", fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={118}
                      tick={{ fill: "var(--text)", fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value) => [`${Number(value ?? 0).toLocaleString()} ${unit}`, ""]}
                    />
                    <Bar
                      dataKey="value"
                      fill="var(--chart-1)"
                      radius={[0, 6, 6, 0]}
                      maxBarSize={18}
                      onClick={(entry) => {
                        const name = String((entry as { name?: string }).name ?? "");
                        if (name) replace({ kab: state.kab === name ? "" : name, view: "kab" });
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4">
                <AnalisisKabMap
                  rows={data.byKabupaten}
                  selected={state.kab}
                  onSelect={(kabupaten) =>
                    replace({ kab: kabupaten, view: "kab" })
                  }
                />
              </div>
            </GlassPanel>

            <GlassPanel className="p-4">
              <div className="mb-2 text-sm font-medium">{t("byJenis")}</div>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={jenisData}
                    layout="vertical"
                    margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
                  >
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: "var(--text-dim)", fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={118}
                      tick={{ fill: "var(--text)", fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value) => [`${Number(value ?? 0).toLocaleString()} ${unit}`, ""]}
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
                      {jenisData.map((row) => (
                        <Cell
                          key={row.name}
                          cursor="pointer"
                          fill={
                            !state.jenis || state.jenis === row.name
                              ? DISASTER_JENIS_COLORS[row.name] ?? "var(--chart-1)"
                              : "rgba(148, 163, 184, 0.35)"
                          }
                          onClick={() =>
                            replace({
                              jenis: state.jenis === row.name ? "" : row.name,
                              view: "jenis",
                            })
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassPanel>
          </div>

          <GlassPanel className="p-4">
            <div className="mb-2 text-sm font-medium">{t("byTime")}</div>
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "var(--text-dim)", fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "var(--text-dim)", fontSize: 11 }} width={36} />
                  <Tooltip
                    formatter={(value) => [`${Number(value ?? 0).toLocaleString()} ${unit}`, ""]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--chart-1)"
                    strokeWidth={2.2}
                    dot={{ r: 2 }}
                  />
                  {timeData.length > 4 ? (
                    <Brush
                      dataKey="name"
                      height={22}
                      stroke="var(--primary)"
                      onChange={(range) => {
                        if (!range || timeData.length === 0) return;
                        const start = timeData[range.startIndex ?? 0];
                        const end = timeData[range.endIndex ?? timeData.length - 1];
                        if (!start || !end) return;
                        replace({
                          from: `${start.year}-${String(start.month + 1).padStart(2, "0")}-01`,
                          to: monthEndIso(end.year, end.month),
                          view: "waktu",
                        });
                      }}
                    />
                  ) : null}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </GlassPanel>

          {compare ? (
            <GlassPanel className="p-4">
              <div className={cn("mb-3 text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
                {t("compare")}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <CompareCard
                  title={state.kab || t("all")}
                  total={fmt(data.total)}
                  top={data.byJenis[0]?.jenis}
                />
                <CompareCard
                  title={state.compareKab || state.compareYear || t("compareNone")}
                  total={fmt(compare.total)}
                  top={compare.byJenis[0]?.jenis}
                />
              </div>
            </GlassPanel>
          ) : null}

          <GlassPanel className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium">{t("sample")}</div>
              <div className="flex flex-wrap gap-3 text-sm">
                <Link
                  href={{ pathname: "/data-bencana", query: tableQuery }}
                  className="text-[var(--primary)] hover:underline"
                >
                  {t("openTable")}
                </Link>
                <Link
                  href={{
                    pathname: "/peta",
                    query: state.jenis
                      ? { disasterJenis: encodeDisasterJenis([state.jenis]) ?? state.jenis }
                      : {},
                  }}
                  className="text-[var(--primary)] hover:underline"
                >
                  {t("openMap")}
                </Link>
              </div>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {data.sample.map((row) => (
                <li key={row.id} className="border-t border-[var(--glass-border)] py-2">
                  <Link
                    href={{ pathname: "/data-bencana", query: { q: row.id, ...tableQuery } }}
                    className="hover:text-[var(--primary)]"
                  >
                    {row.jenis} · {row.hari_tanggal}
                    {row.kabupaten ? ` · ${row.kabupaten}` : ""}
                  </Link>
                </li>
              ))}
            </ul>
          </GlassPanel>
        </>
      ) : null}

      <GlassPanel className="p-4">
        <button
          type="button"
          className="text-sm font-medium text-[var(--primary)] hover:underline"
          onClick={() => setDibiOpen((open) => !open)}
        >
          {dibiOpen ? t("dibiClose") : t("dibiOpen")}
        </button>
        {dibiOpen ? (
          <div className="mt-3">
            <h3 className="text-lg font-semibold">{t("dibiTitle")}</h3>
            <p className="mt-1 text-sm text-[var(--text-dim)]">{t("dibiNote")}</p>
            {dibi ? (
              <p className="mt-3 text-sm tabular-nums">
                {fmt(dibi.totals.kejadian)} · {dibi.metadata.source_name}
              </p>
            ) : null}
          </div>
        ) : null}
      </GlassPanel>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--bg-muted)]/40 px-3 py-3">
      <div className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function CompareCard({
  title,
  total,
  top,
}: {
  title: string;
  total: string;
  top?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--glass-border)] px-3 py-3">
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{total}</div>
      {top ? <div className="mt-1 text-sm text-[var(--text-dim)]">{top}</div> : null}
    </div>
  );
}

function FilterFields({
  state,
  data,
  kecamatanOptions,
  replace,
  reset,
  applyPreset,
  copyLink,
  copied,
}: {
  state: ReturnType<typeof useAnalisisUrlState>["state"];
  data: KejadianAnalisisPayload | undefined;
  kecamatanOptions: string[];
  replace: ReturnType<typeof useAnalisisUrlState>["replace"];
  reset: () => void;
  applyPreset: (preset: AnalisisPreset) => void;
  copyLink: () => void;
  copied: boolean;
}) {
  const t = useTranslations("analisisData");
  return (
    <div className="mt-3 space-y-3 lg:mt-0">
      <div className="flex flex-wrap gap-2">
        {(["thisYear", "last12", "last5", "all"] as const).map((preset) => (
          <Button
            key={preset}
            type="button"
            size="sm"
            variant="outline"
            onClick={() => applyPreset(preset)}
          >
            {preset === "thisYear"
              ? t("presetThisYear")
              : preset === "last12"
                ? t("preset12")
                : preset === "last5"
                  ? t("preset5")
                  : t("presetAll")}
          </Button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--text-dim)]">{t("from")}</span>
          <input
            type="date"
            className={inputClass}
            value={state.from}
            onChange={(e) => replace({ from: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--text-dim)]">{t("to")}</span>
          <input
            type="date"
            className={inputClass}
            value={state.to}
            onChange={(e) => replace({ to: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--text-dim)]">{t("kabupaten")}</span>
          <select
            className={inputClass}
            value={state.kab}
            onChange={(e) => replace({ kab: e.target.value })}
          >
            <option value="">{t("all")}</option>
            {(data?.facets.kabupaten ?? []).map((kab) => (
              <option key={kab} value={kab}>
                {kab}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--text-dim)]">{t("kecamatan")}</span>
          <select
            className={inputClass}
            value={state.kec}
            onChange={(e) => replace({ kec: e.target.value })}
          >
            <option value="">{t("all")}</option>
            {kecamatanOptions.map((kec) => (
              <option key={kec} value={kec}>
                {kec}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--text-dim)]">{t("jenis")}</span>
          <select
            className={inputClass}
            value={state.jenis}
            onChange={(e) => replace({ jenis: e.target.value, view: "jenis" })}
          >
            <option value="">{t("all")}</option>
            {(data?.facets.jenis ?? []).map((jenis) => (
              <option key={jenis} value={jenis}>
                {jenis}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--text-dim)]">{t("metric")}</span>
          <select
            className={inputClass}
            value={state.metric}
            onChange={(e) => replace({ metric: parseAnalisisMetric(e.target.value) })}
          >
            <option value="kejadian">{t("metricKejadian")}</option>
            <option value="rumah">{t("metricRumah")}</option>
            <option value="korban">{t("metricKorban")}</option>
          </select>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--text-dim)]">{t("compareKab")}</span>
          <select
            className={inputClass}
            value={state.compareKab}
            onChange={(e) => replace({ compareKab: e.target.value, compareYear: "" })}
          >
            <option value="">{t("compareNone")}</option>
            {(data?.facets.kabupaten ?? []).map((kab) => (
              <option key={kab} value={kab}>
                {kab}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--text-dim)]">{t("compareYear")}</span>
          <select
            className={inputClass}
            value={state.compareYear}
            onChange={(e) => replace({ compareYear: e.target.value, compareKab: "" })}
          >
            <option value="">{t("compareNone")}</option>
            {(data?.byYear ?? []).map((row) => (
              <option key={row.year} value={String(row.year)}>
                {row.year}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <Button type="button" size="sm" variant="outline" onClick={reset}>
            {t("reset")}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={copyLink}>
            {copied ? t("copied") : t("copyLink")}
          </Button>
        </div>
      </div>
    </div>
  );
}
