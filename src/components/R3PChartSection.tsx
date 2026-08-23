"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Link } from "@/i18n/routing";
import { qk } from "@/lib/qk";
import {
  metersToKm,
  sumRecord,
  type R3PKabRow,
  type R3PSummaryResponse,
} from "@/lib/r3p-summary";

const SLIDE_IDS = [
  "rumah",
  "komposisi",
  "jalan",
  "drainase",
  "lahan",
  "desa",
] as const;

type SlideId = (typeof SLIDE_IDS)[number];

const SEVERITY_COLORS = {
  rr: "#6bcf8e",
  rs: "#f59e0b",
  rb: "#e11d48",
} as const;

const BAR_COLOR = "#2e9e4e";
const AUTOPLAY_MS = 8000;
const TOP_N = 10;

type BarTipRow = {
  name: string;
  value: number;
  rr?: number;
  rs?: number;
  rb?: number;
  extra?: string;
};

async function fetchR3PSummary(): Promise<R3PSummaryResponse> {
  const res = await fetch("/api/r3p/summary");
  if (!res.ok) throw new Error("r3p summary fetch failed");
  return res.json();
}

function fmt(n: number, digits = 0): string {
  return n.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits > 0 ? Math.min(digits, 1) : 0,
  });
}

function topBy(
  rows: R3PKabRow[],
  key: keyof R3PKabRow,
  n = TOP_N
): R3PKabRow[] {
  return [...rows]
    .filter((r) => Number(r[key]) > 0)
    .sort((a, b) => Number(b[key]) - Number(a[key]))
    .slice(0, n);
}

function ChartTooltip({
  active,
  payload,
  unit,
  severityLabels,
}: {
  active?: boolean;
  payload?: Array<{ payload?: BarTipRow }>;
  unit: string;
  severityLabels?: { rr: string; rs: string; rb: string };
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--bg-raised)] px-3 py-2 text-xs shadow-[var(--shadow)]">
      <div className="font-semibold text-[var(--text)]">{row.name}</div>
      <div className="mt-0.5 text-[var(--text-dim)]">
        {fmt(row.value, unit === "km" || unit === "ha" ? 1 : 0)} {unit}
      </div>
      {severityLabels &&
      (row.rr != null || row.rs != null || row.rb != null) ? (
        <ul className="mt-1.5 space-y-0.5 text-[var(--text-dim)]">
          {row.rr != null ? (
            <li>
              {severityLabels.rr}: {fmt(row.rr)}
            </li>
          ) : null}
          {row.rs != null ? (
            <li>
              {severityLabels.rs}: {fmt(row.rs)}
            </li>
          ) : null}
          {row.rb != null ? (
            <li>
              {severityLabels.rb}: {fmt(row.rb)}
            </li>
          ) : null}
        </ul>
      ) : null}
      {row.extra ? (
        <div className="mt-1 text-[var(--text-dim)]">{row.extra}</div>
      ) : null}
    </div>
  );
}

function PieTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload?: { pct?: number } }>;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const pct = p.payload?.pct;
  return (
    <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--bg-raised)] px-3 py-2 text-xs shadow-[var(--shadow)]">
      <div className="font-semibold text-[var(--text)]">{p.name}</div>
      <div className="mt-0.5 text-[var(--text-dim)]">
        {fmt(Number(p.value ?? 0))} {unit}
        {pct != null ? ` · ${fmt(pct, 1)}%` : ""}
      </div>
    </div>
  );
}

function HorizontalBar({
  data,
  unit,
  severityLabels,
  valueFormatter,
}: {
  data: BarTipRow[];
  unit: string;
  severityLabels?: { rr: string; rs: string; rb: string };
  valueFormatter?: (v: number) => string;
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
              valueFormatter
                ? valueFormatter(v)
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
            cursor={{ fill: "var(--accent-dim)" }}
            content={
              <ChartTooltip unit={unit} severityLabels={severityLabels} />
            }
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

type KpiItem = { label: string; value: string; sub?: string };

export function R3PChartSection() {
  const t = useTranslations("r3pChart");
  const tn = useTranslations("nav");
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.r3pSummary,
    queryFn: fetchR3PSummary,
    staleTime: 60_000,
  });

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovering, setHovering] = useState(false);

  const slideId = SLIDE_IDS[index] ?? "rumah";
  const slideCount = SLIDE_IDS.length;

  const go = useCallback(
    (dir: -1 | 1) => {
      setIndex((i) => (i + dir + slideCount) % slideCount);
    },
    [slideCount]
  );

  const goTo = useCallback((i: number) => {
    setIndex(((i % slideCount) + slideCount) % slideCount);
  }, [slideCount]);

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

  const severityLabels = useMemo(
    () => ({
      rr: t("severity.rr"),
      rs: t("severity.rs"),
      rb: t("severity.rb"),
    }),
    [t]
  );

  const slideModel = useMemo(() => {
    if (!data) return null;
    const kab = data.per_kabupaten;
    const { perumahan, wilayah, infrastruktur_transportasi, infrastruktur_pengairan, ekonomi } =
      data.totals;

    const jalanTotalM = sumRecord(infrastruktur_transportasi);
    const drainaseTotalM =
      infrastruktur_pengairan.drainase_rr_meter +
      infrastruktur_pengairan.drainase_rs_meter +
      infrastruktur_pengairan.drainase_rb_meter;
    const lahanTotalHa =
      ekonomi.lahan_pertanian_rr_hektar +
      ekonomi.lahan_pertanian_rs_hektar +
      ekonomi.lahan_pertanian_rb_hektar;

    const rumahBars: BarTipRow[] = topBy(kab, "rumah").map((r) => ({
      name: r.name,
      value: r.rumah,
      rr: r.rr,
      rs: r.rs,
      rb: r.rb,
    }));

    const pieTotal = perumahan.total_rumah || 1;
    const pieData = [
      {
        key: "rr",
        name: severityLabels.rr,
        value: perumahan.rumah_rusak_ringan,
        pct: (perumahan.rumah_rusak_ringan / pieTotal) * 100,
        fill: SEVERITY_COLORS.rr,
      },
      {
        key: "rs",
        name: severityLabels.rs,
        value: perumahan.rumah_rusak_sedang,
        pct: (perumahan.rumah_rusak_sedang / pieTotal) * 100,
        fill: SEVERITY_COLORS.rs,
      },
      {
        key: "rb",
        name: severityLabels.rb,
        value: perumahan.rumah_rusak_berat,
        pct: (perumahan.rumah_rusak_berat / pieTotal) * 100,
        fill: SEVERITY_COLORS.rb,
      },
    ];

    const jalanBars: BarTipRow[] = topBy(kab, "jalan_total_m").map((r) => ({
      name: r.name,
      value: metersToKm(r.jalan_total_m),
      rr: r.jalan_rr_m,
      rs: r.jalan_rs_m,
      rb: r.jalan_rb_m,
    }));

    const drainaseBars: BarTipRow[] = topBy(kab, "drainase_total_m").map(
      (r) => ({
        name: r.name,
        value: metersToKm(r.drainase_total_m),
        rr: r.drainase_rr_m,
        rs: r.drainase_rs_m,
        rb: r.drainase_rb_m,
      })
    );

    const lahanBars: BarTipRow[] = topBy(kab, "lahan_total_ha").map((r) => ({
      name: r.name,
      value: r.lahan_total_ha,
      rr: r.lahan_rr_ha,
      rs: r.lahan_rs_ha,
      rb: r.lahan_rb_ha,
    }));

    const desaBars: BarTipRow[] = [...kab]
      .filter((r) => r.desa_rusak > 0)
      .sort((a, b) => {
        const pa = a.desa_total ? a.desa_rusak / a.desa_total : 0;
        const pb = b.desa_total ? b.desa_rusak / b.desa_total : 0;
        if (b.desa_rusak !== a.desa_rusak) return b.desa_rusak - a.desa_rusak;
        return pb - pa;
      })
      .slice(0, TOP_N)
      .map((r) => {
        const pct = r.desa_total ? (r.desa_rusak / r.desa_total) * 100 : 0;
        return {
          name: r.name,
          value: r.desa_rusak,
          extra: `${fmt(pct, 1)}% · ${r.desa_rusak}/${r.desa_total}`,
        };
      });

    const bySlide: Record<
      SlideId,
      { kpis: KpiItem[]; kind: "bar" | "pie"; bars?: BarTipRow[]; pie?: typeof pieData; unit: string }
    > = {
      rumah: {
        kind: "bar",
        unit: t("unit.rumah"),
        bars: rumahBars,
        kpis: [
          {
            label: t("kpi.totalRumah"),
            value: fmt(perumahan.total_rumah),
            sub: t("unit.rumah"),
          },
          { label: t("kpi.rr"), value: fmt(perumahan.rumah_rusak_ringan) },
          { label: t("kpi.rs"), value: fmt(perumahan.rumah_rusak_sedang) },
          { label: t("kpi.rb"), value: fmt(perumahan.rumah_rusak_berat) },
        ],
      },
      komposisi: {
        kind: "pie",
        unit: t("unit.rumah"),
        pie: pieData,
        kpis: [
          {
            label: t("kpi.totalRumah"),
            value: fmt(perumahan.total_rumah),
            sub: t("unit.rumah"),
          },
          {
            label: t("kpi.rr"),
            value: `${fmt((perumahan.rumah_rusak_ringan / pieTotal) * 100, 1)}%`,
          },
          {
            label: t("kpi.rs"),
            value: `${fmt((perumahan.rumah_rusak_sedang / pieTotal) * 100, 1)}%`,
          },
          {
            label: t("kpi.rb"),
            value: `${fmt((perumahan.rumah_rusak_berat / pieTotal) * 100, 1)}%`,
          },
        ],
      },
      jalan: {
        kind: "bar",
        unit: t("unit.km"),
        bars: jalanBars,
        kpis: [
          {
            label: t("kpi.jalanKm"),
            value: fmt(metersToKm(jalanTotalM), 1),
            sub: t("unit.km"),
          },
          {
            label: t("kpi.kab"),
            value: String(
              kab.filter((r) => r.jalan_total_m > 0).length
            ),
          },
        ],
      },
      drainase: {
        kind: "bar",
        unit: t("unit.km"),
        bars: drainaseBars,
        kpis: [
          {
            label: t("kpi.drainaseKm"),
            value: fmt(metersToKm(drainaseTotalM), 1),
            sub: t("unit.km"),
          },
          {
            label: t("kpi.kab"),
            value: String(
              kab.filter((r) => r.drainase_total_m > 0).length
            ),
          },
        ],
      },
      lahan: {
        kind: "bar",
        unit: t("unit.ha"),
        bars: lahanBars,
        kpis: [
          {
            label: t("kpi.lahanHa"),
            value: fmt(lahanTotalHa, 1),
            sub: t("unit.ha"),
          },
          {
            label: t("kpi.kab"),
            value: String(kab.filter((r) => r.lahan_total_ha > 0).length),
          },
        ],
      },
      desa: {
        kind: "bar",
        unit: t("unit.desa"),
        bars: desaBars,
        kpis: [
          {
            label: t("kpi.desaRusak"),
            value: fmt(wilayah.desa_dengan_data_kerusakan),
            sub: t("unit.desa"),
          },
          {
            label: t("kpi.desaTotal"),
            value: fmt(wilayah.total_desa_kelurahan),
          },
          {
            label: t("kpi.cakupan"),
            value: `${fmt(wilayah.persentase_berkerusakan, 1)}${t("unit.pct")}`,
            sub: `${wilayah.desa_dengan_data_kerusakan}/${wilayah.total_desa_kelurahan}`,
          },
          {
            label: t("kpi.kab"),
            value: String(wilayah.total_kabupaten_kota),
          },
        ],
      },
    };

    return bySlide;
  }, [data, severityLabels, t]);

  const current = slideModel?.[slideId];

  const sumberHref =
    data?.metadata?.sumber_url ??
    "https://docs.google.com/spreadsheets/d/1eG7jewwOeuv0GKLLlfJp8hrDAwvW1wtnYFK4mz_DwPA/edit?gid=0";

  return (
    <section className="section-shell reveal mt-16 md:mt-24" id="data">
      <BlurFade inView>
        <div className="max-w-2xl">
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
              {/* Slide controls */}
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
                      id={`r3p-tab-${id}`}
                      aria-controls={`r3p-panel-${id}`}
                      onClick={() => goTo(i)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        i === index
                          ? "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]"
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
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--bg-muted)] text-[var(--text)] hover:border-[var(--accent)]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlaying((p) => !p)}
                    aria-label={playing ? t("pause") : t("play")}
                    title={t("autoplay")}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--bg-muted)] text-[var(--text)] hover:border-[var(--accent)]"
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
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--bg-muted)] text-[var(--text)] hover:border-[var(--accent)]"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Dots */}
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
                        ? "w-6 bg-[var(--accent)]"
                        : "w-1.5 bg-[var(--border)] hover:bg-[var(--text-dim)]"
                    }`}
                  />
                ))}
              </div>

              {/* KPI strip */}
              <div
                className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
                aria-live="polite"
              >
                {current.kpis.map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-muted)]/60 px-3.5 py-3"
                  >
                    <div className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-dim)]">
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

              {/* Chart */}
              <div
                className="mt-4"
                role="tabpanel"
                id={`r3p-panel-${slideId}`}
                aria-labelledby={`r3p-tab-${slideId}`}
              >
                <h3 className="mb-2 text-sm font-semibold text-[var(--text)]">
                  {t(`slides.${slideId}`)}
                </h3>

                {current.kind === "bar" && current.bars ? (
                  <HorizontalBar
                    data={current.bars}
                    unit={
                      slideId === "jalan" || slideId === "drainase"
                        ? t("unit.km")
                        : current.unit
                    }
                    severityLabels={
                      slideId === "desa" ? undefined : severityLabels
                    }
                    valueFormatter={
                      slideId === "jalan" || slideId === "drainase"
                        ? (v) => (v >= 100 ? String(Math.round(v)) : fmt(v, 1))
                        : slideId === "lahan"
                          ? (v) =>
                              v >= 1000
                                ? `${Math.round(v / 1000)}k`
                                : fmt(v, 0)
                          : undefined
                    }
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
                          <Tooltip
                            content={<PieTooltip unit={t("unit.rumah")} />}
                          />
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
                            {fmt(s.value)} · {fmt(s.pct, 1)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </>
          )}

          <p className="mt-4 text-xs text-[var(--text-dim)]">
            <Link
              href="/metodologi"
              className="text-[var(--accent)] underline-offset-2 hover:underline"
            >
              {tn("metodologi")}
            </Link>
            {" · "}
            <Link
              href="/sumber-data"
              className="text-[var(--accent)] underline-offset-2 hover:underline"
            >
              {tn("sumberData")}
            </Link>
            {" · "}
            <a
              href={sumberHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] underline-offset-2 hover:underline"
            >
              {t("sourceNote")}
            </a>
          </p>
          </div>
        </GlassPanel>
      </BlurFade>
    </section>
  );
}
