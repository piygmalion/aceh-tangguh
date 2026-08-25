"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronLeft, ChevronRight, Download, Pause, Play } from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Link } from "@/i18n/routing";
import { formatRpCompact } from "@/lib/anggaran-format";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { withBasePath } from "@/lib/preview/env";
import { PRRPKA_DOC_PATH, type PrrpkaSummaryResponse } from "@/lib/prrpka-types";
import { qk } from "@/lib/qk";
import { CHART_SERIES } from "@/lib/chart-colors";
import { TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

const SLIDE_IDS = [
  "jitupasna",
  "kebutuhan",
  "perumahan",
  "prrka",
  "kesenjangan",
  "sektor",
] as const;

type SlideId = (typeof SLIDE_IDS)[number];

const BAR_COLOR = CHART_SERIES[0];
const AUTOPLAY_MS = 8000;
const TOP_N = 10;

const SEKTOR_COLORS: Record<string, string> = {
  Infrastruktur: CHART_SERIES[0],
  Permukiman: CHART_SERIES[1],
  Sosial: CHART_SERIES[2],
  Ekonomi: CHART_SERIES[3],
  "Lintas Sektor": CHART_SERIES[4],
};

const SERIES_COLORS = {
  prrp: CHART_SERIES[1],
  r3p: CHART_SERIES[0],
  bnba: CHART_SERIES[2],
  kebutuhan: CHART_SERIES[1],
  terakomodasi: CHART_SERIES[0],
  kesenjangan: CHART_SERIES[3],
} as const;

type BarTipRow = {
  name: string;
  value: number;
  extra?: string;
};

type GroupedRow = {
  name: string;
  [key: string]: string | number;
};

type PieSlice = {
  key: string;
  name: string;
  value: number;
  pct: number;
  fill: string;
};

type SeriesDef = { key: string; color: string; label: string };

type KpiItem = { label: string; value: string; sub?: string };

async function fetchPrrpkaSummary(): Promise<PrrpkaSummaryResponse> {
  const res = await fetchPublicApi("/api/prrpka/summary");
  if (!res.ok) throw new Error("prrpka summary fetch failed");
  return res.json();
}

function fmt(n: number, digits = 0): string {
  return n.toLocaleString("id-ID", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits > 0 ? Math.min(digits, 1) : 0,
  });
}

function ChartTooltip({
  active,
  payload,
  money,
}: {
  active?: boolean;
  payload?: Array<{ payload?: BarTipRow }>;
  money?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--bg-raised)] px-3 py-2 text-xs shadow-[var(--shadow)]">
      <div className="font-semibold text-[var(--text)]">{row.name}</div>
      <div className="mt-0.5 text-[var(--text-dim)]">
        {money ? formatRpCompact(row.value) : fmt(row.value)}
      </div>
      {row.extra ? (
        <div className="mt-1 text-[var(--text-dim)]">{row.extra}</div>
      ) : null}
    </div>
  );
}

function GroupedTooltip({
  active,
  payload,
  label,
  money,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
  money?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--bg-raised)] px-3 py-2 text-xs shadow-[var(--shadow)]">
      <div className="font-semibold text-[var(--text)]">{label}</div>
      <ul className="mt-1.5 space-y-0.5 text-[var(--text-dim)]">
        {payload.map((p) => (
          <li key={p.name} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: p.color }}
              aria-hidden
            />
            {p.name}: {money ? formatRpCompact(Number(p.value ?? 0)) : fmt(Number(p.value ?? 0))}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload?: { pct?: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const pct = p.payload?.pct;
  return (
    <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--bg-raised)] px-3 py-2 text-xs shadow-[var(--shadow)]">
      <div className="font-semibold text-[var(--text)]">{p.name}</div>
      <div className="mt-0.5 text-[var(--text-dim)]">
        {formatRpCompact(Number(p.value ?? 0))}
        {pct != null ? ` · ${fmt(pct, 1)}%` : ""}
      </div>
    </div>
  );
}

function HorizontalBar({
  data,
  money,
}: {
  data: BarTipRow[];
  money?: boolean;
}) {
  return (
    <div className="h-[22rem] w-full sm:h-[26rem]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
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
            tickFormatter={(v: number) =>
              money
                ? formatRpCompact(v)
                : v >= 1000
                  ? `${Math.round(v / 1000)}k`
                  : String(Math.round(v))
            }
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
            content={<ChartTooltip money={money} />}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {data.map((r) => (
              <Cell key={r.name} fill={BAR_COLOR} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function GroupedBar({
  data,
  series,
  money,
  layout = "vertical",
}: {
  data: GroupedRow[];
  series: SeriesDef[];
  money?: boolean;
  layout?: "vertical" | "horizontal";
}) {
  const vertical = layout === "vertical";
  return (
    <div className="h-[22rem] w-full sm:h-[26rem]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={vertical ? "vertical" : "horizontal"}
          margin={{ top: 8, right: 16, left: 8, bottom: vertical ? 8 : 8 }}
        >
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="3 3"
            horizontal={!vertical}
            vertical={vertical}
          />
          {vertical ? (
            <>
              <XAxis
                type="number"
                tick={{ fill: "var(--text-dim)", fontSize: 11 }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
                tickFormatter={(v: number) =>
                  money ? formatRpCompact(v) : String(Math.round(v))
                }
              />
              <YAxis
                type="category"
                dataKey="name"
                width={118}
                tick={{ fill: "var(--text)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--text)", fontSize: 11 }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--text-dim)", fontSize: 11 }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
                tickFormatter={(v: number) =>
                  money ? formatRpCompact(v) : String(Math.round(v))
                }
              />
            </>
          )}
          <Tooltip
            cursor={{ fill: "var(--primary-dim)" }}
            content={<GroupedTooltip money={money} />}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "var(--text-dim)" }}
          />
          {series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color}
              radius={[0, 4, 4, 0]}
              maxBarSize={22}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function R3PChartSection() {
  const t = useTranslations("prrpkaChart");
  const tn = useTranslations("nav");
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.prrpkaSummary,
    queryFn: fetchPrrpkaSummary,
    staleTime: 60_000,
  });

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovering, setHovering] = useState(false);

  const slideId = SLIDE_IDS[index] ?? "jitupasna";
  const slideCount = SLIDE_IDS.length;

  const go = useCallback(
    (dir: -1 | 1) => {
      setIndex((i) => (i + dir + slideCount) % slideCount);
    },
    [slideCount]
  );

  const goTo = useCallback(
    (i: number) => {
      setIndex(((i % slideCount) + slideCount) % slideCount);
    },
    [slideCount]
  );

  useEffect(() => {
    if (!playing || hovering || isLoading || isError) return;
    const id = window.setInterval(() => go(1), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [playing, hovering, isLoading, isError, go]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const slideModel = useMemo(() => {
    if (!data) return null;
    const { ringkasan: r, kabupaten_kota: kab } = data;

    const topKerusakan: BarTipRow[] = [...kab]
      .filter((row) => row.jitupasna_kerusakan_kerugian > 0)
      .sort(
        (a, b) =>
          b.jitupasna_kerusakan_kerugian - a.jitupasna_kerusakan_kerugian
      )
      .slice(0, TOP_N)
      .map((row) => ({
        name: row.kabupaten_kota,
        value: row.jitupasna_kerusakan_kerugian,
        extra: `${t("kpi.prrkaAceh")}: ${formatRpCompact(row.prrka_total)}`,
      }));

    const topKebutuhan: BarTipRow[] = [...kab]
      .filter((row) => row.jitupasna_kebutuhan_rr > 0)
      .sort((a, b) => b.jitupasna_kebutuhan_rr - a.jitupasna_kebutuhan_rr)
      .slice(0, TOP_N)
      .map((row) => ({
        name: row.kabupaten_kota,
        value: row.jitupasna_kebutuhan_rr,
      }));

    const perumahanGrouped: GroupedRow[] = [...kab]
      .filter((row) => row.perumahan_r3p_jumlah > 0)
      .sort((a, b) => b.perumahan_r3p_jumlah - a.perumahan_r3p_jumlah)
      .slice(0, TOP_N)
      .map((row) => ({
        name: row.kabupaten_kota,
        prrp: row.perumahan_prrp_kk_jumlah,
        r3p: row.perumahan_r3p_jumlah,
        bnba: row.perumahan_bnba_jumlah,
      }));

    const topPrrka: BarTipRow[] = [...kab]
      .filter((row) => row.prrka_total > 0)
      .sort((a, b) => b.prrka_total - a.prrka_total)
      .slice(0, TOP_N)
      .map((row) => ({
        name: row.kabupaten_kota,
        value: row.prrka_total,
        extra:
          row.pangsa_prrka_terhadap_kebutuhan_rr != null
            ? `${fmt(row.pangsa_prrka_terhadap_kebutuhan_rr * 100, 1)}% ${t("kpi.kebutuhanRr")}`
            : undefined,
      }));

    const tingkatLabel = (tingkat: string) => {
      if (
        tingkat === "nasional" ||
        tingkat === "provinsi" ||
        tingkat === "kabupaten_kota"
      ) {
        return t(`tingkat.${tingkat}`);
      }
      return tingkat;
    };

    const kesenjanganGrouped: GroupedRow[] = r.kesenjangan_tingkat.map(
      (row) => ({
        name: tingkatLabel(row.tingkat),
        kebutuhan: row.kebutuhan,
        terakomodasi: row.terakomodasi,
        kesenjangan: row.kesenjangan,
      })
    );

    const sektorTotal =
      r.prrka_sektor.reduce((acc, s) => acc + s.total, 0) || 1;
    const pieData: PieSlice[] = r.prrka_sektor.map((s) => ({
      key: s.sektor,
      name: s.sektor,
      value: s.total,
      pct: (s.total / sektorTotal) * 100,
      fill: SEKTOR_COLORS[s.sektor] ?? BAR_COLOR,
    }));
    const sektorTop = [...r.prrka_sektor].sort((a, b) => b.total - a.total)[0];

    const gap = (tingkat: string) =>
      r.kesenjangan_tingkat.find((row) => row.tingkat === tingkat);

    const perumahanSeries: SeriesDef[] = [
      { key: "prrp", color: SERIES_COLORS.prrp, label: t("series.prrp") },
      { key: "r3p", color: SERIES_COLORS.r3p, label: t("series.r3p") },
      { key: "bnba", color: SERIES_COLORS.bnba, label: t("series.bnba") },
    ];
    const gapSeries: SeriesDef[] = [
      {
        key: "kebutuhan",
        color: SERIES_COLORS.kebutuhan,
        label: t("series.kebutuhan"),
      },
      {
        key: "terakomodasi",
        color: SERIES_COLORS.terakomodasi,
        label: t("series.terakomodasi"),
      },
      {
        key: "kesenjangan",
        color: SERIES_COLORS.kesenjangan,
        label: t("series.kesenjangan"),
      },
    ];

    const bySlide: Record<
      SlideId,
      {
        kpis: KpiItem[];
        kind: "bar" | "grouped" | "pie";
        bars?: BarTipRow[];
        grouped?: GroupedRow[];
        series?: SeriesDef[];
        groupedLayout?: "vertical" | "horizontal";
        pie?: PieSlice[];
        notes?: string[];
        money?: boolean;
      }
    > = {
      jitupasna: {
        kind: "bar",
        money: true,
        bars: topKerusakan,
        kpis: [
          {
            label: t("kpi.kerusakan"),
            value: formatRpCompact(r.jitupasna_kerusakan_kerugian),
          },
          {
            label: t("kpi.kebutuhanRr"),
            value: formatRpCompact(r.jitupasna_kebutuhan_rr),
          },
          {
            label: t("kpi.kabTerdampak"),
            value: `${r.kabupaten_terdampak}/${r.total_kabupaten_kota}`,
            sub: t("unit.kab"),
          },
          {
            label: t("kpi.kabLingkup"),
            value: String(r.kabupaten_dalam_lingkup),
            sub: t("unit.kab"),
          },
        ],
      },
      kebutuhan: {
        kind: "bar",
        money: true,
        bars: topKebutuhan,
        kpis: [
          {
            label: t("kpi.kebutuhanPusat"),
            value: formatRpCompact(r.kebutuhan_pusat),
          },
          {
            label: t("kpi.kebutuhanProvinsi"),
            value: formatRpCompact(r.kebutuhan_provinsi_r3p),
          },
          {
            label: t("kpi.kebutuhanKabR3p"),
            value: formatRpCompact(r.kebutuhan_kab_r3p),
          },
          {
            label: t("kpi.kebutuhanKabPrrp"),
            value: formatRpCompact(r.kebutuhan_kab_prrp),
          },
        ],
      },
      perumahan: {
        kind: "grouped",
        grouped: perumahanGrouped,
        series: perumahanSeries,
        kpis: [
          {
            label: t("kpi.prrpKk"),
            value: fmt(r.perumahan_prrp_kk),
            sub: t("unit.kk"),
          },
          {
            label: t("kpi.r3pUnit"),
            value: fmt(r.perumahan_r3p_unit),
            sub: t("unit.rumah"),
          },
          {
            label: t("kpi.bnbaUnit"),
            value: fmt(r.perumahan_bnba_unit),
            sub: t("unit.rumah"),
          },
          {
            label: t("kpi.kab"),
            value: String(r.kabupaten_terdampak),
          },
        ],
      },
      prrka: {
        kind: "bar",
        money: true,
        bars: topPrrka,
        kpis: [
          {
            label: t("kpi.prrkaAceh"),
            value: formatRpCompact(r.prrka_kewenangan_aceh),
          },
          {
            label: t("kpi.prrkaLintas"),
            value: formatRpCompact(r.prrka_lintas_kabupaten),
          },
          {
            label: t("kpi.kabLingkup"),
            value: `${r.kabupaten_dalam_lingkup}/${r.total_kabupaten_kota}`,
          },
          {
            label: t("kpi.kab"),
            value: String(
              kab.filter((row) => row.prrka_total > 0).length
            ),
          },
        ],
      },
      kesenjangan: {
        kind: "grouped",
        money: true,
        grouped: kesenjanganGrouped,
        series: gapSeries,
        groupedLayout: "horizontal",
        notes: r.kesenjangan_tingkat.map((row) => row.catatan),
        kpis: [
          {
            label: t("kpi.surplusNasional"),
            value: formatRpCompact(gap("nasional")?.kesenjangan ?? 0),
          },
          {
            label: t("kpi.defisitProvinsi"),
            value: formatRpCompact(gap("provinsi")?.kesenjangan ?? 0),
          },
          {
            label: t("kpi.defisitKab"),
            value: formatRpCompact(gap("kabupaten_kota")?.kesenjangan ?? 0),
          },
        ],
      },
      sektor: {
        kind: "pie",
        pie: pieData,
        kpis: [
          {
            label: t("kpi.prrkaAceh"),
            value: formatRpCompact(r.prrka_kewenangan_aceh),
          },
          {
            label: t("kpi.sektorTop"),
            value: sektorTop?.sektor ?? "—",
            sub: sektorTop ? formatRpCompact(sektorTop.total) : undefined,
          },
          {
            label: t("kpi.prrkaLintas"),
            value: formatRpCompact(r.prrka_lintas_kabupaten),
          },
        ],
      },
    };

    return bySlide;
  }, [data, t]);

  const current = slideModel?.[slideId];
  const docHref = withBasePath(
    data?.metadata.dokumen_url ?? PRRPKA_DOC_PATH
  );

  return (
    <section className="section-shell reveal mt-16 md:mt-24" id="prrpka">
      <BlurFade inView>
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {t("heading")}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text-dim)]">
            {t("lead")}
          </p>
        </div>
      </BlurFade>

      <BlurFade delay={0.08} inView>
        <GlassPanel className="mt-8 p-4 sm:p-6">
          <div
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
          >
            {isLoading && (
              <p className="py-16 text-center text-sm text-[var(--text-dim)]">
                {t("loading")}
              </p>
            )}
            {isError && (
              <p className="py-16 text-center text-sm text-[var(--danger)]">
                {t("error")}
              </p>
            )}

            {!isLoading && !isError && current && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div
                    className="flex flex-wrap gap-1.5"
                    role="tablist"
                    aria-label={t("slidesAria")}
                  >
                    {SLIDE_IDS.map((id, i) => (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={i === index}
                        id={`prrpka-tab-${id}`}
                        aria-controls={`prrpka-panel-${id}`}
                        onClick={() => goTo(i)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                          i === index
                            ? "border-[var(--primary)] bg-[var(--primary-dim)] text-[var(--primary)]"
                            : "border-[var(--glass-border)] bg-[var(--bg-muted)] text-[var(--text-dim)] hover:text-[var(--text)]"
                        }`}
                      >
                        {t(`slides.${id}`)}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => go(-1)}
                      aria-label={t("prev")}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--bg-muted)] text-[var(--text)] hover:border-[var(--primary)]"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlaying((p) => !p)}
                      aria-label={playing ? t("pause") : t("play")}
                      title={t("autoplay")}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--bg-muted)] text-[var(--text)] hover:border-[var(--primary)]"
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
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--bg-muted)] text-[var(--text)] hover:border-[var(--primary)]"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div
                  className="mt-3 flex items-center justify-center gap-1.5"
                  role="presentation"
                >
                  {SLIDE_IDS.map((id, i) => (
                    <button
                      key={`dot-${id}`}
                      type="button"
                      aria-label={t(`slides.${id}`)}
                      aria-current={i === index ? "true" : undefined}
                      onClick={() => goTo(i)}
                      className={`h-1.5 rounded-full transition ${
                        i === index
                          ? "w-6 bg-[var(--primary)]"
                          : "w-1.5 bg-[var(--border)] hover:bg-[var(--text-dim)]"
                      }`}
                    />
                  ))}
                </div>

                <div
                  className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
                  aria-live="polite"
                >
                  {current.kpis.map((kpi) => (
                    <div
                      key={kpi.label}
                      className="rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-muted)]/60 px-3.5 py-3"
                    >
                      <div className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
                        {kpi.label}
                      </div>
                      <div className="mt-1 text-lg font-semibold tracking-tight text-[var(--text)]">
                        {kpi.value}
                      </div>
                      {kpi.sub ? (
                        <div className="mt-0.5 text-xs text-[var(--text-dim)]">
                          {kpi.sub}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div
                  className="mt-4"
                  role="tabpanel"
                  id={`prrpka-panel-${slideId}`}
                  aria-labelledby={`prrpka-tab-${slideId}`}
                >
                  <h3 className="mb-2 text-sm font-semibold text-[var(--text)]">
                    {t(`slides.${slideId}`)}
                  </h3>

                  {current.kind === "bar" && current.bars ? (
                    <HorizontalBar data={current.bars} money={current.money} />
                  ) : null}

                  {current.kind === "grouped" &&
                  current.grouped &&
                  current.series ? (
                    <GroupedBar
                      data={current.grouped}
                      series={current.series}
                      money={current.money}
                      layout={current.groupedLayout ?? "vertical"}
                    />
                  ) : null}

                  {current.kind === "pie" && current.pie ? (
                    <div className="flex h-[22rem] w-full flex-col items-center justify-center gap-4 sm:h-[26rem] sm:flex-row">
                      <div className="h-56 w-full max-w-sm sm:h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={current.pie}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius="55%"
                              outerRadius="80%"
                              paddingAngle={2}
                              stroke="var(--bg-raised)"
                              strokeWidth={2}
                            >
                              {current.pie.map((s) => (
                                <Cell key={s.key} fill={s.fill} />
                              ))}
                            </Pie>
                            <Tooltip content={<PieTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <ul className="w-full max-w-xs space-y-2 text-sm">
                        {current.pie.map((s) => (
                          <li
                            key={s.key}
                            className="flex items-center justify-between gap-3 rounded-xl border border-[var(--glass-border)] bg-[var(--bg-muted)]/50 px-3 py-2"
                          >
                            <span className="flex items-center gap-2 text-[var(--text)]">
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full"
                                style={{ background: s.fill }}
                                aria-hidden
                              />
                              {s.name}
                            </span>
                            <span className="tabular-nums text-[var(--text-dim)]">
                              {formatRpCompact(s.value)} · {fmt(s.pct, 1)}%
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {current.notes?.length ? (
                    <ul className="mt-3 space-y-1 text-xs text-[var(--text-dim)]">
                      {current.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </>
            )}

            <p className="mt-4 text-xs text-[var(--text-dim)]">
              <Link
                href="/metodologi"
                className="text-[var(--primary)] underline-offset-2 hover:underline"
              >
                {tn("metodologi")}
              </Link>
              {" · "}
              <Link
                href="/sumber-data"
                className="text-[var(--primary)] underline-offset-2 hover:underline"
              >
                {tn("sumberData")}
              </Link>
              {" · "}
              <span>{t("sourceNote")}</span>
              {" · "}
              <a
                href={docHref}
                download
                className="inline-flex items-center gap-1 text-[var(--primary)] underline-offset-2 hover:underline"
              >
                <Download className="h-3 w-3" aria-hidden />
                {t("downloadDoc")}
              </a>
            </p>
          </div>
        </GlassPanel>
      </BlurFade>
    </section>
  );
}
