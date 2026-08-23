"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
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
import { BlurFade } from "@/components/ui/blur-fade";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Link } from "@/i18n/routing";
import type { FeatureCollection } from "geojson";

type Row = { name: string; value: number; bucket: string };

const BUCKET_COLOR: Record<string, string> = {
  tinggi: "#2e9e4e",
  sedang: "#6bcf8e",
  rendah: "#c7f0d2",
};

async function fetchR3P(): Promise<FeatureCollection> {
  const res = await fetch("/api/layers/areas/r3pDistribution");
  if (!res.ok) throw new Error("r3p fetch failed");
  return res.json();
}

function ChartTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: Row }>;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--bg-raised)] px-3 py-2 text-xs shadow-[var(--shadow)]">
      <div className="font-semibold text-[var(--text)]">{row.name}</div>
      <div className="mt-0.5 text-[var(--text-dim)]">
        {row.value.toLocaleString()} {unit}
      </div>
    </div>
  );
}

export function R3PChartSection() {
  const t = useTranslations("r3pChart");
  const tn = useTranslations("nav");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["r3p-chart"],
    queryFn: fetchR3P,
    staleTime: 60_000,
  });

  const rows = useMemo(() => {
    if (!data?.features) return [] as Row[];
    return data.features
      .map((f) => ({
        name: String(f.properties?.name ?? ""),
        value: Number(f.properties?.value ?? 0),
        bucket: String(f.properties?.bucket ?? "rendah"),
      }))
      .filter((r) => r.name)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [data]);

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
          {!isLoading && !isError && rows.length > 0 && (
            <div className="h-[22rem] w-full sm:h-[26rem]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rows}
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
                      v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fill: "var(--text)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--accent-dim)" }}
                    content={<ChartTooltip unit={t("unit")} />}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
                    {rows.map((r) => (
                      <Cell
                        key={r.name}
                        fill={BUCKET_COLOR[r.bucket] ?? "var(--accent)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
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
          </p>
        </GlassPanel>
      </BlurFade>
    </section>
  );
}
