"use client";

import { ArrowUpRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { jiwaTerdampak } from "@/lib/dibi-types";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";
import { useDibi, useIrbi } from "./data";
import { angkaRingkas } from "./format";
import { Figure, PanelSkeleton } from "./primitives";

type Metric = {
  key: string;
  label: string;
  value: number;
  decimals?: 0 | 1 | 2;
  unit?: string;
  prefix?: string;
  note: string;
  /** Same-page anchors use a plain link; page routes go through the typed Link. */
  href: "/data-bencana" | "/analisis-data" | "#risiko";
  tautan: string;
  siap: boolean;
};

const tautanClass = cn(
  "mt-3 inline-flex items-center gap-1 font-semibold text-[var(--primary)] transition-colors hover:text-[var(--accent)]",
  TYPE_FLOOR_CLASS,
);

/**
 * Credibility rail: the three public numbers that establish what this observatory holds.
 * Hairline dividers rather than cards, so the figures read as one instrument.
 */
export function MetricRail() {
  const t = useTranslations("beranda");
  const locale = useLocale();
  const { data: dibi } = useDibi();
  const { data: irbi } = useIrbi();

  const terdampak = angkaRingkas(dibi ? jiwaTerdampak(dibi.totals) : 0, locale);

  const metrics: Metric[] = [
    {
      key: "kejadian",
      label: t("metrics.kejadian"),
      value: dibi?.totals.kejadian ?? 0,
      note: dibi
        ? t("metrics.kejadianNote", {
            from: dibi.metadata.year_from,
            to: dibi.metadata.year_to,
          })
        : t("metrics.kejadianNoteFallback"),
      href: "/data-bencana",
      tautan: t("metrics.kejadianLink"),
      siap: Boolean(dibi),
    },
    {
      key: "terdampak",
      label: t("metrics.terdampak"),
      value: terdampak.n,
      decimals: terdampak.decimals,
      unit: terdampak.unit,
      note: t("metrics.terdampakNote"),
      href: "/analisis-data",
      tautan: t("metrics.terdampakLink"),
      siap: Boolean(dibi),
    },
    {
      key: "irbi",
      label: t("metrics.irbi"),
      value: irbi?.nilai_irb_provinsi ?? 0,
      decimals: 2,
      note: irbi
        ? t("metrics.irbiNote", {
            count: irbi.total_kabupaten_kota,
            year: irbi.tahun,
          })
        : t("metrics.irbiNoteFallback"),
      href: "#risiko",
      tautan: t("metrics.irbiLink"),
      siap: Boolean(irbi),
    },
  ];

  return (
    <section
      aria-label={t("metrics.aria")}
      className="relative z-10 -mt-16 px-4 pb-2"
    >
      <dl className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] shadow-[var(--shadow-elevated)] md:grid-cols-3 md:divide-x md:divide-y-0">
        {metrics.map((m) => (
          <div key={m.key} className="group relative px-5 py-6 lg:px-7">
            <dt className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{m.label}</dt>
            <dd className="mt-2">
              {m.siap ? (
                <Figure
                  value={m.value}
                  decimals={m.decimals}
                  unit={m.unit}
                  prefix={m.prefix}
                  size="md"
                />
              ) : (
                <PanelSkeleton className="h-[2.75rem] w-32 rounded-lg" />
              )}
              <p className={cn("mt-2 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                {m.note}
              </p>
              {m.href.startsWith("#") ? (
                <a href={m.href} className={tautanClass}>
                  {m.tautan}
                  <ArrowUpRight size={14} aria-hidden />
                </a>
              ) : (
                <Link
                  href={m.href as Exclude<Metric["href"], "#risiko">}
                  className={tautanClass}
                >
                  {m.tautan}
                  <ArrowUpRight size={14} aria-hidden />
                </Link>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
