"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Map } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { Link } from "@/i18n/routing";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { qk } from "@/lib/qk";
import { JENIS_HEX, KELAS_FILL } from "@/lib/chart-colors";
import { TYPE_FLOOR_CLASS, TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

export type IrbiKab = {
  kabupaten_kota: string;
  irb_2025: number;
  kelas_risiko: string;
  ancaman_tertinggi: string;
  skor_ancaman_tertinggi?: number;
  ir_banjir?: number;
  ir_gempabumi?: number;
  ir_tsunami?: number;
  ir_likuefaksi?: number;
  ir_tanah_longsor?: number;
  ir_kebakaran_hutan_lahan?: number;
};

export type IrbiPayload = {
  metadata: {
    nilai_irb_provinsi: number;
    kelas_risiko_provinsi: string;
    jumlah_penduduk_2025: number;
    total_kabupaten_kota: number;
    judul?: string;
  };
  kabupaten_kota: IrbiKab[];
};

const KELAS_COLOR: Record<string, string> = {
  TINGGI: KELAS_FILL.TINGGI,
  SEDANG: KELAS_FILL.SEDANG,
  RENDAH: KELAS_FILL.RENDAH,
};

const HAZARD_KEYS = [
  "ir_banjir",
  "ir_gempabumi",
  "ir_tsunami",
  "ir_likuefaksi",
  "ir_tanah_longsor",
  "ir_kebakaran_hutan_lahan",
] as const;

const HAZARD_COLORS: Record<(typeof HAZARD_KEYS)[number], string> = {
  ir_banjir: JENIS_HEX.water,
  ir_gempabumi: JENIS_HEX.quake,
  ir_tsunami: JENIS_HEX.water,
  ir_likuefaksi: JENIS_HEX.quake,
  ir_tanah_longsor: JENIS_HEX.slide,
  ir_kebakaran_hutan_lahan: JENIS_HEX.fire,
};

async function fetchIrbi(): Promise<IrbiPayload> {
  const res = await fetchPublicApi("/api/irbi");
  if (!res.ok) throw new Error("irbi fetch failed");
  return res.json();
}

function IrbTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: { name: string; irb: number; kelas: string } }>;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-2 text-xs text-[var(--text)] shadow-lg backdrop-blur">
      <div className="font-semibold">{row.name}</div>
      <div className="mt-0.5 text-[var(--text-dim)]">
        {row.irb.toLocaleString(undefined, { maximumFractionDigits: 2 })} {unit}
      </div>
      <div className="mt-0.5 text-[var(--text-dim)]">{row.kelas}</div>
    </div>
  );
}

export function IrbiHeroPanel() {
  const t = useTranslations("irbi");
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.irbi,
    queryFn: fetchIrbi,
    staleTime: 60_000,
  });

  const sorted = useMemo(() => {
    if (!data?.kabupaten_kota) return [] as IrbiKab[];
    return [...data.kabupaten_kota].sort((a, b) => b.irb_2025 - a.irb_2025);
  }, [data]);

  const barRows = useMemo(
    () =>
      sorted.map((k) => ({
        name: k.kabupaten_kota,
        irb: k.irb_2025,
        kelas: k.kelas_risiko,
      })),
    [sorted]
  );

  const hazardRows = useMemo(
    () =>
      sorted.slice(0, 10).map((k) => ({
        name: k.kabupaten_kota,
        ir_banjir: k.ir_banjir ?? 0,
        ir_gempabumi: k.ir_gempabumi ?? 0,
        ir_tsunami: k.ir_tsunami ?? 0,
        ir_likuefaksi: k.ir_likuefaksi ?? 0,
        ir_tanah_longsor: k.ir_tanah_longsor ?? 0,
        ir_kebakaran_hutan_lahan: k.ir_kebakaran_hutan_lahan ?? 0,
      })),
    [sorted]
  );

  const top5 = sorted.slice(0, 5);
  const meta = data?.metadata;

  if (isLoading) {
    return (
      <p className="py-16 text-center text-sm text-white/60">{t("loading")}</p>
    );
  }
  if (isError || !meta) {
    return (
      <p className="py-16 text-center text-sm text-red-300">{t("error")}</p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {t("heading")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-white/65 sm:text-base">
          {t("lead")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2" aria-live="polite">
        <Chip tone="glass">
          <span className="font-semibold tabular-nums text-white">
            {meta.nilai_irb_provinsi.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </span>{" "}
          {t("chipIrb")}
        </Chip>
        <Chip tone="glass">
          <span className="font-semibold text-white">
            {meta.kelas_risiko_provinsi}
          </span>{" "}
          {t("chipKelas")}
        </Chip>
        <Chip tone="glass">
          <span className="font-semibold tabular-nums text-white">
            {(meta.jumlah_penduduk_2025 / 1_000_000).toLocaleString(undefined, {
              maximumFractionDigits: 1,
            })}
            M
          </span>{" "}
          {t("chipPenduduk")}
        </Chip>
        <Chip tone="glass">
          <span className="font-semibold tabular-nums text-white">
            {meta.total_kabupaten_kota}
          </span>{" "}
          {t("chipKab")}
        </Chip>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-md sm:p-4">
        <h3 className="mb-3 text-sm font-semibold text-white/90">
          {t("chartTitle")}
        </h3>
        <div className="h-[28rem] w-full sm:h-[32rem]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barRows}
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
                tick={{ fill: "var(--hero-fg)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.06)" }}
                content={<IrbTooltip unit={t("chartUnit")} />}
              />
              <Bar dataKey="irb" radius={[0, 5, 5, 0]} maxBarSize={18}>
                {barRows.map((r) => (
                  <Cell
                    key={r.name}
                    fill={KELAS_COLOR[r.kelas] ?? "var(--status-waspada)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-md sm:p-4">
        <h3 className="mb-3 text-sm font-semibold text-white/90">
          {t("hazardsTitle")}
        </h3>
        <div className="h-[22rem] w-full sm:h-[26rem]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={hazardRows}
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
                tick={{ fill: "var(--hero-fg)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--text)",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}
                formatter={(value: string) => {
                  const key = value.replace(/^ir_/, "hazard_") as
                    | "hazard_banjir"
                    | "hazard_gempabumi"
                    | "hazard_tsunami"
                    | "hazard_likuefaksi"
                    | "hazard_tanah_longsor"
                    | "hazard_kebakaran_hutan_lahan";
                  try {
                    return t(key);
                  } catch {
                    return value;
                  }
                }}
              />
              {HAZARD_KEYS.map((key) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="h"
                  fill={HAZARD_COLORS[key]}
                  maxBarSize={18}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-white/90">
          {t("topTitle")}
        </h3>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {top5.map((k, i) => (
            <li
              key={k.kabupaten_kota}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-md"
            >
              <div className={cn("text-white/45", TYPE_KICKER_CLASS)}>
                #{i + 1}
              </div>
              <div className="mt-1 text-sm font-semibold text-white">
                {k.kabupaten_kota}
              </div>
              <div
                className="mt-1 text-lg font-semibold tabular-nums"
                style={{ color: KELAS_COLOR[k.kelas_risiko] ?? "#fff" }}
              >
                {k.irb_2025.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className={cn("mt-1 text-white/55", TYPE_FLOOR_CLASS)}>
                {k.kelas_risiko}
              </div>
              <div className={cn("mt-2 text-white/70", TYPE_FLOOR_CLASS)}>
                <span className="text-white/45">{t("topThreat")}: </span>
                {k.ancaman_tertinggi.replace(/_/g, " ")}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Link
          href={{
            pathname: "/peta",
            query: { area: "irbi2025", basemap: "positron" },
          }}
        >
          <button
            type="button"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-fg)] shadow-lg transition hover:bg-[var(--primary-hover)]"
          >
            <Map size={16} />
            {t("seeMap")}
          </button>
        </Link>
        <p className={cn("text-white/40", TYPE_FLOOR_CLASS)}>{t("sourceNote")}</p>
      </div>
    </div>
  );
}
