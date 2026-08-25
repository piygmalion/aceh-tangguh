"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ExternalLink } from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";
import { Chip } from "@/components/ui/Chip";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { qk } from "@/lib/qk";
import {
  DIBI_DASHBOARD_URL,
  jiwaTerdampak,
  meninggalHilang,
  rumahRusakTotal,
  type DibiAcehResponse,
  type DibiMetrics,
} from "@/lib/dibi-types";
import { Link } from "@/i18n/routing";

import { CHART_SERIES, JENIS_HEX } from "@/lib/chart-colors";
import { DISASTER_JENIS_COLORS } from "@/lib/disaster-jenis";
import { TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

const BAR_COLOR = CHART_SERIES[0];
const YEAR_COLOR = CHART_SERIES[1];

const KATEGORI_COLOR: Record<string, string> = {
  Banjir: DISASTER_JENIS_COLORS.Banjir,
  Longsor: DISASTER_JENIS_COLORS.Longsor,
  "Cuaca ekstrem": JENIS_HEX.wind,
  "Gelombang pasang / Abrasi": DISASTER_JENIS_COLORS.Abrasi,
  "Erupsi gunung api": JENIS_HEX.fire,
  Gempabumi: DISASTER_JENIS_COLORS["Gempa Bumi"],
  Kekeringan: DISASTER_JENIS_COLORS.Kekeringan,
  "Kebakaran hutan dan lahan": DISASTER_JENIS_COLORS["Kebakaran Hutan dan Lahan"],
  Tsunami: JENIS_HEX.water,
};

const YEAR_CHIPS = 8;

async function fetchDibiAceh(): Promise<DibiAcehResponse> {
  const res = await fetchPublicApi("/api/dibi/aceh");
  if (!res.ok) throw new Error("dibi aceh fetch failed");
  return res.json();
}

function fmt(n: number): string {
  return n.toLocaleString("id-ID");
}

/** DIBI stores housing-loss estimates in million rupiah (`jt`). */
function fmtJutaRp(n: number): string {
  if (n >= 1_000_000) {
    return `Rp ${(n / 1_000_000).toLocaleString("id-ID", {
      maximumFractionDigits: 1,
    })} T`;
  }
  if (n >= 1_000) {
    return `Rp ${(n / 1_000).toLocaleString("id-ID", {
      maximumFractionDigits: 1,
    })} M`;
  }
  return `Rp ${n.toLocaleString("id-ID")} jt`;
}

type TipRow = { name: string; value: number; extra?: string };

function ChartTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ payload?: TipRow }>;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-2 text-xs text-[var(--text)] shadow-[var(--shadow)]">
      <div className="font-semibold text-[var(--text)]">{row.name}</div>
      <div className="mt-0.5 text-[var(--text-dim)]">
        {fmt(row.value)} {unit}
      </div>
      {row.extra ? (
        <div className="mt-1 text-[var(--text-dim)]">{row.extra}</div>
      ) : null}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-muted)]/60 px-3.5 py-3">
      <div className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tracking-tight text-[var(--text)] tabular-nums">
        {value}
      </div>
      {sub ? (
        <div className="mt-0.5 text-xs text-[var(--text-dim)]">{sub}</div>
      ) : null}
    </div>
  );
}

export function DibiDashboard() {
  const t = useTranslations("dibi");
  const tn = useTranslations("nav");
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.dibiAceh,
    queryFn: fetchDibiAceh,
    staleTime: 10 * 60_000,
    refetchInterval: 10 * 60_000,
  });

  const yearsDesc = useMemo(() => {
    if (!data?.by_tahun.length) return [];
    return [...data.by_tahun].map((r) => r.tahun).sort((a, b) => b - a);
  }, [data]);

  const yearOptions = useMemo(
    () => yearsDesc.slice(0, YEAR_CHIPS),
    [yearsDesc],
  );

  const [year, setYear] = useState<number | "all">("all");

  const metrics: DibiMetrics | null = useMemo(() => {
    if (!data) return null;
    if (year === "all") return data.totals;
    return data.by_tahun.find((r) => r.tahun === year) ?? data.totals;
  }, [data, year]);

  const kategoriBars = useMemo<TipRow[]>(() => {
    if (!data) return [];
    return data.by_kategori.map((r) => ({
      name: r.kategori_bencana,
      value: r.kejadian,
      extra: t("tooltipKategori", {
        meninggal: fmt(meninggalHilang(r)),
        terdampak: fmt(jiwaTerdampak(r)),
      }),
    }));
  }, [data, t]);

  const kabBars = useMemo<TipRow[]>(() => {
    if (!data) return [];
    return data.by_kabupaten.slice(0, 10).map((r) => ({
      name: r.kabupaten.replace(/^Kota\s+/i, ""),
      value: r.kejadian,
      extra: t("tooltipKab", {
        rusak: fmt(rumahRusakTotal(r)),
        terendam: fmt(r.rumah_terendam),
      }),
    }));
  }, [data, t]);

  const tahunBars = useMemo<TipRow[]>(() => {
    if (!data) return [];
    return data.by_tahun.map((r) => ({
      name: String(r.tahun),
      value: r.kejadian,
      extra: t("tooltipTahun", {
        meninggal: fmt(meninggalHilang(r)),
        rusak: fmt(rumahRusakTotal(r)),
      }),
    }));
  }, [data, t]);

  const fetchedLabel = data?.metadata.fetched_at
    ? new Date(data.metadata.fetched_at).toLocaleString("id-ID")
    : null;

  return (
    <BlurFade delay={0.06} inView>
      <GlassPanel className="mt-8 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("yearAria")}>
            <Chip
              tone={year === "all" ? "ok" : "neutral"}
              active={year === "all"}
              onClick={() => setYear("all")}
              className="px-3 py-1 text-xs"
            >
              {t("allYears")}
            </Chip>
            {yearOptions.map((y) => (
              <Chip
                key={y}
                tone={year === y ? "ok" : "neutral"}
                active={year === y}
                onClick={() => setYear(y)}
                className="px-3 py-1 text-xs tabular-nums"
              >
                {y}
              </Chip>
            ))}
          </div>
          {data ? (
            <span className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
              {t("provinceBadge")}
            </span>
          ) : null}
        </div>

        {isLoading ? (
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="skeleton h-[4.75rem] rounded-2xl" />
            ))}
          </div>
        ) : null}

        {isError ? (
          <p className="py-16 text-center text-sm text-[var(--danger)]">
            {t("error")}
          </p>
        ) : null}

        {!isLoading && !isError && metrics && data ? (
          <>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCard
                label={t("kpi.kejadian")}
                value={fmt(metrics.kejadian)}
                sub={
                  year === "all"
                    ? t("kpi.kejadianSub", {
                        from: data.metadata.year_from,
                        to: data.metadata.year_to,
                      })
                    : t("kpi.yearSub", { year })
                }
              />
              <KpiCard
                label={t("kpi.meninggalHilang")}
                value={fmt(meninggalHilang(metrics))}
                sub={t("kpi.meninggalHilangSub", {
                  meninggal: fmt(metrics.meninggal),
                  hilang: fmt(metrics.hilang),
                })}
              />
              <KpiCard
                label={t("kpi.terdampak")}
                value={fmt(jiwaTerdampak(metrics))}
                sub={t("kpi.terdampakSub", {
                  mengungsi: fmt(metrics.menderita_mengungsi),
                  luka: fmt(metrics.luka_sakit),
                })}
              />
              <KpiCard
                label={t("kpi.rumahRusak")}
                value={fmt(rumahRusakTotal(metrics))}
                sub={t("kpi.rumahRusakSub", {
                  rb: fmt(metrics.rumah_rusak_berat),
                  rs: fmt(metrics.rumah_rusak_sedang),
                  rr: fmt(metrics.rumah_rusak_ringan),
                })}
              />
              <KpiCard
                label={t("kpi.terendam")}
                value={fmt(metrics.rumah_terendam)}
                sub={t("kpi.terendamSub")}
              />
              <KpiCard
                label={t("kpi.kerugian")}
                value={fmtJutaRp(metrics.estimasi_kerugian_rumah)}
                sub={t("kpi.kerugianSub")}
              />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-[var(--text)]">
                  {t("chartKategori")}
                </h3>
                <p className="mb-3 text-xs text-[var(--text-dim)]">
                  {t("chartCumulative")}
                </p>
                <div className="h-[18rem] w-full sm:h-[22rem]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={kategoriBars}
                      layout="vertical"
                      margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                    >
                      <CartesianGrid
                        stroke="var(--border)"
                        strokeDasharray="3 3"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tick={{ fill: "var(--text-dim)", fontSize: 11 }}
                        axisLine={{ stroke: "var(--border)" }}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={128}
                        tick={{ fill: "var(--text)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "var(--primary-dim)" }}
                        content={<ChartTooltip unit={t("unit.kejadian")} />}
                      />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
                        {kategoriBars.map((r) => (
                          <Cell
                            key={r.name}
                            fill={KATEGORI_COLOR[r.name] ?? BAR_COLOR}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-[var(--text)]">
                  {t("chartKabupaten")}
                </h3>
                <p className="mb-3 text-xs text-[var(--text-dim)]">
                  {t("chartCumulative")}
                </p>
                <div className="h-[18rem] w-full sm:h-[22rem]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={kabBars}
                      layout="vertical"
                      margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                    >
                      <CartesianGrid
                        stroke="var(--border)"
                        strokeDasharray="3 3"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tick={{ fill: "var(--text-dim)", fontSize: 11 }}
                        axisLine={{ stroke: "var(--border)" }}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={108}
                        tick={{ fill: "var(--text)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "var(--primary-dim)" }}
                        content={<ChartTooltip unit={t("unit.kejadian")} />}
                      />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
                        {kabBars.map((r) => (
                          <Cell key={r.name} fill={BAR_COLOR} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-[var(--text)]">
                {t("chartTahun")}
              </h3>
              <div className="h-[14rem] w-full sm:h-[16rem]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={tahunBars}
                    margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
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
                      tick={{ fill: "var(--text-dim)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--primary-dim)" }}
                      content={<ChartTooltip unit={t("unit.kejadian")} />}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={28}>
                      {tahunBars.map((r) => (
                        <Cell
                          key={r.name}
                          fill={
                            year !== "all" && r.name === String(year)
                              ? BAR_COLOR
                              : YEAR_COLOR
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : null}

        <p className="mt-5 text-xs leading-relaxed text-[var(--text-dim)]">
          {t("attribution")}
          {fetchedLabel ? (
            <>
              {" "}
              {t("updated", { time: fetchedLabel })}
            </>
          ) : null}
          {data?.source === "fixture" ? <> {t("fixtureNote")}</> : null}
          {" · "}
          <a
            href={data?.metadata.source_url ?? DIBI_DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[var(--primary)] underline-offset-2 hover:underline"
          >
            {t("sourceLink")}
            <ExternalLink className="h-3 w-3" />
          </a>
          {" · "}
          <Link
            href="/sumber-data"
            className="text-[var(--primary)] underline-offset-2 hover:underline"
          >
            {tn("sumberData")}
          </Link>
        </p>
      </GlassPanel>
    </BlurFade>
  );
}
