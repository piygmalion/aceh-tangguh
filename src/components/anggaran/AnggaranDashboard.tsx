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
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Chip } from "@/components/ui/Chip";
import { qk } from "@/lib/qk";
import {
  formatRpCompact,
  formatRpFull,
  pctOf,
} from "@/lib/anggaran-format";
import type {
  AnggaranApiResponse,
  BreakdownView,
  KegiatanAnggaran,
} from "@/lib/anggaran-types";

const PHASE_ORDER = [
  "tanggap_darurat",
  "mitigasi",
  "penanganan",
  "kesiapsiagaan",
  "rehabilitasi",
] as const;

const CHART_COLORS = [
  "#2e9e4e",
  "#3b82f6",
  "#f59e0b",
  "#a855f7",
  "#06b6d4",
  "#e11d48",
  "#84cc16",
  "#f97316",
  "#64748b",
];

type ChartRow = {
  key: string;
  label: string;
  value: number;
  kegiatan: number;
};

async function fetchAnggaran(): Promise<AnggaranApiResponse> {
  const res = await fetch("/api/anggaran");
  if (!res.ok) throw new Error("anggaran fetch failed");
  return res.json();
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ChartRow }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--bg-raised)] px-3 py-2 text-xs shadow-[var(--shadow)]">
      <div className="font-semibold text-[var(--text)]">{row.label}</div>
      <div className="mt-0.5 text-[var(--text-dim)]">
        {formatRpCompact(row.value)} · {row.kegiatan} kegiatan
      </div>
    </div>
  );
}

function YoYTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; name?: string; fill?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--bg-raised)] px-3 py-2 text-xs shadow-[var(--shadow)]">
      <div className="font-semibold text-[var(--text)]">{label}</div>
      {payload.map((p) => (
        <div key={String(p.name)} className="mt-0.5 text-[var(--text-dim)]">
          {p.name}: {formatRpCompact(Number(p.value ?? 0))}
        </div>
      ))}
    </div>
  );
}

export function AnggaranDashboard() {
  const t = useTranslations("anggaranBencana");
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.anggaran,
    queryFn: fetchAnggaran,
    staleTime: 60_000,
  });

  const [view, setView] = useState<BreakdownView>("fase");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [fase, setFase] = useState("");
  const [kategori, setKategori] = useState("");
  const [skpd, setSkpd] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const analisis = data?.analisis;
  const meta = analisis?.metadata;
  const yoy = analisis?.perbandingan_2025_2026;
  const total = analisis?.total_anggaran_rp ?? meta?.total_anggaran_rp ?? 0;

  const labelFor = (kind: BreakdownView, key: string) => {
    if (kind === "fase") {
      try {
        return t(`fase.${key}` as "fase.tanggap_darurat");
      } catch {
        return key;
      }
    }
    if (kind === "kategori") {
      try {
        return t(`kategori.${key}` as "kategori.logistik_dan_bantuan");
      } catch {
        return key;
      }
    }
    return key;
  };

  const chartRows = useMemo(() => {
    if (!analisis) return [] as ChartRow[];
    const source =
      view === "fase"
        ? analisis.per_fase
        : view === "skpd"
          ? analisis.per_skpd
          : analisis.per_kategori;

    const entries = Object.entries(source).map(([key, bucket]) => ({
      key,
      label: labelFor(view, key),
      value: bucket.anggaran_rp,
      kegiatan: bucket.kegiatan,
    }));

    if (view === "fase") {
      entries.sort(
        (a, b) =>
          PHASE_ORDER.indexOf(a.key as (typeof PHASE_ORDER)[number]) -
          PHASE_ORDER.indexOf(b.key as (typeof PHASE_ORDER)[number])
      );
    } else {
      entries.sort((a, b) => b.value - a.value);
    }
    return entries;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analisis, view, t]);

  const yoyRows = useMemo(() => {
    if (!yoy) return [];
    return [
      {
        name: "2025",
        anggaran: yoy.total_anggaran_2025_rp,
        kegiatan: yoy.kegiatan_2025,
      },
      {
        name: "2026",
        anggaran: yoy.total_anggaran_2026_rp,
        kegiatan: yoy.kegiatan_2026,
      },
    ];
  }, [yoy]);

  const faseOptions = useMemo(() => {
    if (!data?.kegiatan) return [] as string[];
    return Array.from(
      new Set(data.kegiatan.map((k) => k.fase_penanganan))
    ).sort();
  }, [data]);

  const kategoriOptions = useMemo(() => {
    if (!data?.kegiatan) return [] as string[];
    return Array.from(
      new Set(data.kegiatan.map((k) => k.kategori_kegiatan))
    ).sort();
  }, [data]);

  const skpdOptions = useMemo(() => {
    if (!data?.kegiatan) return [] as string[];
    return Array.from(
      new Set(data.kegiatan.flatMap((k) => k.skpd ?? []))
    ).sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!data?.kegiatan) return [] as KegiatanAnggaran[];
    const needle = q.trim().toLowerCase();
    let rows = data.kegiatan.filter((k) => {
      if (fase && k.fase_penanganan !== fase) return false;
      if (kategori && k.kategori_kegiatan !== kategori) return false;
      if (skpd && !(k.skpd ?? []).includes(skpd)) return false;
      if (needle) {
        const hay = [
          k.nama_kegiatan,
          k.program,
          k.kegiatan_apba,
          ...(k.uraian_anggaran ?? []),
          ...(k.skpd ?? []),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });

    if (selectedKey) {
      rows = rows.filter((k) => {
        if (view === "fase") return k.fase_penanganan === selectedKey;
        if (view === "kategori") return k.kategori_kegiatan === selectedKey;
        return (k.skpd ?? []).includes(selectedKey);
      });
    }

    return [...rows].sort(
      (a, b) => b.jumlah_anggaran_rp - a.jumlah_anggaran_rp
    );
  }, [data, q, fase, kategori, skpd, selectedKey, view]);

  const insights = useMemo(() => {
    if (!analisis) return [];
    const faseTop = Object.entries(analisis.per_fase).sort(
      (a, b) => b[1].anggaran_rp - a[1].anggaran_rp
    )[0];
    const skpdTop = Object.entries(analisis.per_skpd).sort(
      (a, b) => b[1].anggaran_rp - a[1].anggaran_rp
    )[0];
    const katTop = Object.entries(analisis.per_kategori).sort(
      (a, b) => b[1].anggaran_rp - a[1].anggaran_rp
    )[0];
    return [
      {
        id: "fase",
        title: t("insight.faseTitle"),
        body: t("insight.faseBody", {
          label: labelFor("fase", faseTop[0]),
          pct: pctOf(faseTop[1].anggaran_rp, total).toFixed(1),
          amount: formatRpCompact(faseTop[1].anggaran_rp),
        }),
      },
      {
        id: "skpd",
        title: t("insight.skpdTitle"),
        body: t("insight.skpdBody", {
          label: skpdTop[0],
          pct: pctOf(skpdTop[1].anggaran_rp, total).toFixed(1),
          amount: formatRpCompact(skpdTop[1].anggaran_rp),
        }),
      },
      {
        id: "kategori",
        title: t("insight.kategoriTitle"),
        body: t("insight.kategoriBody", {
          label: labelFor("kategori", katTop[0]),
          pct: pctOf(katTop[1].anggaran_rp, total).toFixed(1),
          amount: formatRpCompact(katTop[1].anggaran_rp),
        }),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analisis, total, t]);

  const resetFilters = () => {
    setQ("");
    setFase("");
    setKategori("");
    setSkpd("");
    setSelectedKey(null);
  };

  if (isLoading) {
    return (
      <GlassPanel className="p-8 text-center text-sm text-[var(--text-dim)]">
        {t("loading")}
      </GlassPanel>
    );
  }

  if (isError || !analisis || !meta) {
    return (
      <GlassPanel className="p-8 text-center text-sm text-[var(--danger)]">
        {t("error")}
      </GlassPanel>
    );
  }

  const yoyPct = yoy?.persentase_perubahan ?? 0;
  const yoySign = yoyPct >= 0 ? "+" : "";

  return (
    <div className="space-y-8">
      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          {
            label: t("kpi.total"),
            value: formatRpCompact(total),
            sub: formatRpFull(total),
          },
          {
            label: t("kpi.kegiatan"),
            value: String(analisis.total_kegiatan),
            sub: t("kpi.kegiatanSub"),
          },
          {
            label: t("kpi.item"),
            value: String(analisis.total_item_anggaran),
            sub: t("kpi.itemSub"),
          },
          {
            label: t("kpi.yoy"),
            value: `${yoySign}${yoyPct.toFixed(1)}%`,
            sub: yoy
              ? `${formatRpCompact(yoy.total_anggaran_2025_rp)} → ${formatRpCompact(yoy.total_anggaran_2026_rp)}`
              : undefined,
          },
          {
            label: t("kpi.risiko"),
            value: meta.konteks_risiko.kelas_risiko,
            sub: `IRB ${meta.konteks_risiko.irb_provinsi}`,
            danger: meta.konteks_risiko.kelas_risiko === "TINGGI",
          },
        ].map((card) => (
          <GlassPanel key={card.label} className="p-4">
            <div className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
              {card.label}
            </div>
            <div
              className={`mt-2 text-xl font-semibold tracking-tight ${
                card.danger ? "text-[var(--danger)]" : "text-[var(--text)]"
              }`}
            >
              {card.value}
            </div>
            {card.sub ? (
              <div className="mt-1 text-xs text-[var(--text-dim)]">{card.sub}</div>
            ) : null}
          </GlassPanel>
        ))}
      </div>

      {/* Insight cards */}
      <div className="grid gap-3 md:grid-cols-3">
        {insights.map((ins) => (
          <GlassPanel key={ins.id} className="p-4">
            <div className="text-sm font-semibold text-[var(--accent)]">
              {ins.title}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-dim)]">
              {ins.body}
            </p>
          </GlassPanel>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <GlassPanel className="p-4 sm:p-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">
              {t("chart.breakdownTitle")}
            </h2>
            <div
              className="inline-flex rounded-full border border-[var(--glass-border)] bg-[var(--bg-muted)] p-1 text-xs"
              role="tablist"
              aria-label={t("chart.viewAria")}
            >
              {(
                [
                  ["fase", t("chart.perFase")],
                  ["skpd", t("chart.perSkpd")],
                  ["kategori", t("chart.perKategori")],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={view === key}
                  className={`rounded-full px-3 py-1.5 transition ${
                    view === key
                      ? "bg-[var(--accent-dim)] font-medium text-[var(--accent)]"
                      : "text-[var(--text-dim)] hover:text-[var(--text)]"
                  }`}
                  onClick={() => {
                    setView(key);
                    setSelectedKey(null);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {selectedKey ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Chip tone="ok" active>
                {t("chart.filteredBy", { label: labelFor(view, selectedKey) })}
              </Chip>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-[var(--text-dim)] hover:text-[var(--accent)]"
                onClick={() => setSelectedKey(null)}
              >
                <X size={12} /> {t("chart.clearSelection")}
              </button>
            </div>
          ) : (
            <p className="mt-2 text-xs text-[var(--text-dim)]">
              {t("chart.clickHint")}
            </p>
          )}
          <div className="mt-4 h-[22rem] w-full sm:h-[26rem]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartRows}
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
                    v >= 1e9
                      ? `${(v / 1e9).toFixed(0)}M`
                      : v >= 1e6
                        ? `${(v / 1e6).toFixed(0)}Jt`
                        : String(v)
                  }
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={128}
                  tick={{ fill: "var(--text)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--accent-dim)" }}
                  content={<ChartTooltip />}
                />
                <Bar
                  dataKey="value"
                  radius={[0, 6, 6, 0]}
                  maxBarSize={28}
                  cursor="pointer"
                  onClick={(entry: unknown) => {
                    const raw = entry as ChartRow & { payload?: ChartRow };
                    const key = raw?.key ?? raw?.payload?.key;
                    if (!key) return;
                    setSelectedKey((prev) => (prev === key ? null : key));
                  }}
                >
                  {chartRows.map((r, i) => (
                    <Cell
                      key={r.key}
                      fill={
                        selectedKey && selectedKey !== r.key
                          ? "var(--border)"
                          : CHART_COLORS[i % CHART_COLORS.length]
                      }
                      opacity={
                        selectedKey && selectedKey !== r.key ? 0.35 : 1
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>

        <GlassPanel className="p-4 sm:p-6">
          <h2 className="text-lg font-semibold tracking-tight">
            {t("chart.yoyTitle")}
          </h2>
          <p className="mt-1 text-xs text-[var(--text-dim)]">
            {t("chart.yoyLead", {
              pct: `${yoySign}${yoyPct.toFixed(1)}%`,
              selisih: formatRpCompact(yoy?.selisih_rp ?? 0),
            })}
          </p>
          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={yoyRows}
                margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
              >
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--text)", fontSize: 12 }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--text-dim)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1e9 ? `${(v / 1e9).toFixed(0)}M` : String(v)
                  }
                />
                <Tooltip content={<YoYTooltip />} />
                <Bar
                  dataKey="anggaran"
                  name={t("chart.anggaran")}
                  fill="var(--accent)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-xl bg-[var(--bg-muted)] px-2 py-2">
              <div className="text-[var(--text-dim)]">2025</div>
              <div className="mt-0.5 font-semibold">
                {yoy?.kegiatan_2025 ?? "—"} {t("kpi.kegiatanSub")}
              </div>
            </div>
            <div className="rounded-xl bg-[var(--accent-dim)] px-2 py-2">
              <div className="text-[var(--accent)]">2026</div>
              <div className="mt-0.5 font-semibold text-[var(--accent)]">
                {yoy?.kegiatan_2026 ?? "—"} {t("kpi.kegiatanSub")}
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* Table */}
      <GlassPanel className="overflow-hidden p-0">
        <div className="border-b border-[var(--glass-border)] p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                {t("table.title")}
              </h2>
              <p className="mt-1 text-xs text-[var(--text-dim)]">
                {t("table.showing", { count: filtered.length })}
              </p>
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-[var(--text-dim)] hover:text-[var(--accent)]"
            >
              {t("table.reset")}
            </button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="relative block">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]"
              />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("table.searchPlaceholder")}
                className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg-muted)] py-2 pl-8 pr-3 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
            <select
              value={fase}
              onChange={(e) => setFase(e.target.value)}
              className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg-muted)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              aria-label={t("table.fase")}
            >
              <option value="">{t("table.allFase")}</option>
              {faseOptions.map((f) => (
                <option key={f} value={f}>
                  {labelFor("fase", f)}
                </option>
              ))}
            </select>
            <select
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg-muted)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              aria-label={t("table.kategori")}
            >
              <option value="">{t("table.allKategori")}</option>
              {kategoriOptions.map((k) => (
                <option key={k} value={k}>
                  {labelFor("kategori", k)}
                </option>
              ))}
            </select>
            <select
              value={skpd}
              onChange={(e) => setSkpd(e.target.value)}
              className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg-muted)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              aria-label={t("table.skpd")}
            >
              <option value="">{t("table.allSkpd")}</option>
              {skpdOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[var(--bg-muted)] text-[0.7rem] uppercase tracking-[0.12em] text-[var(--text-dim)]">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("table.cols.nama")}</th>
                <th className="px-3 py-3 font-semibold">{t("table.cols.fase")}</th>
                <th className="px-3 py-3 font-semibold">
                  {t("table.cols.kategori")}
                </th>
                <th className="px-3 py-3 font-semibold">{t("table.cols.skpd")}</th>
                <th className="px-4 py-3 text-right font-semibold">
                  {t("table.cols.anggaran")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-[var(--text-dim)]"
                  >
                    {t("table.empty")}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const open = expanded === row.id;
                  return (
                    <FragmentRow
                      key={row.id}
                      row={row}
                      open={open}
                      onToggle={() =>
                        setExpanded((prev) => (prev === row.id ? null : row.id))
                      }
                      labelFor={labelFor}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </div>
  );
}

function FragmentRow({
  row,
  open,
  onToggle,
  labelFor,
}: {
  row: KegiatanAnggaran;
  open: boolean;
  onToggle: () => void;
  labelFor: (kind: BreakdownView, key: string) => string;
}) {
  const t = useTranslations("anggaranBencana");
  return (
    <>
      <tr
        className="cursor-pointer border-t border-[var(--glass-border)] transition hover:bg-[var(--accent-dim)]/40"
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-[var(--text-dim)]">
              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
            <span className="font-medium leading-snug">{row.nama_kegiatan}</span>
          </div>
        </td>
        <td className="px-3 py-3 text-[var(--text-dim)]">
          {labelFor("fase", row.fase_penanganan)}
        </td>
        <td className="px-3 py-3 text-[var(--text-dim)]">
          {labelFor("kategori", row.kategori_kegiatan)}
        </td>
        <td className="px-3 py-3 text-[var(--text-dim)]">
          {(row.skpd ?? []).join(", ") || "—"}
        </td>
        <td className="px-4 py-3 text-right font-medium tabular-nums">
          {formatRpCompact(row.jumlah_anggaran_rp)}
        </td>
      </tr>
      {open ? (
        <tr className="border-t border-[var(--glass-border)] bg-[var(--bg-muted)]/60">
          <td colSpan={5} className="px-4 py-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-dim)]">
                  {t("table.detail.program")}
                </div>
                <p className="mt-1 text-sm">{row.program || "—"}</p>
                <p className="mt-1 text-xs text-[var(--text-dim)]">
                  {row.kegiatan_apba || "—"}
                </p>
              </div>
              <div>
                <div className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-dim)]">
                  {t("table.detail.anggaranFull")}
                </div>
                <p className="mt-1 text-sm tabular-nums">
                  {formatRpFull(row.jumlah_anggaran_rp)}
                </p>
                <p className="mt-1 text-xs text-[var(--text-dim)]">
                  {t("table.detail.items", { count: row.jumlah_item_anggaran })}
                </p>
              </div>
              <div className="md:col-span-2">
                <div className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-dim)]">
                  {t("table.detail.uraian")}
                </div>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-[var(--text-dim)]">
                  {(row.uraian_anggaran ?? []).length === 0 ? (
                    <li>—</li>
                  ) : (
                    row.uraian_anggaran.map((u) => <li key={u}>{u}</li>)
                  )}
                </ul>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
