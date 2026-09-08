"use client";

import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { jiwaTerdampak } from "@/lib/dibi-types";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";
import { useAnggaran, useDibi, useIrbi } from "./data";
import { angkaRingkas, rupiahRingkas } from "./format";
import { Figure, PanelSkeleton } from "./primitives";

type Metric = {
  label: string;
  value: number;
  decimals?: 0 | 1 | 2;
  unit?: string;
  prefix?: string;
  note: string;
  /** Same-page anchors use a plain link; page routes go through the typed Link. */
  href: "/data-bencana" | "/analisis-data" | "/anggaran-bencana" | "#risiko";
  tautan: string;
  siap: boolean;
};

const tautanClass = cn(
  "mt-3 inline-flex items-center gap-1 font-semibold text-[var(--primary)] transition-colors hover:text-[var(--accent)]",
  TYPE_FLOOR_CLASS,
);

/**
 * Credibility rail: the four numbers that establish what this observatory holds.
 * Hairline dividers rather than cards, so the figures read as one instrument.
 */
export function MetricRail() {
  const { data: dibi } = useDibi();
  const { data: irbi } = useIrbi();
  const { data: anggaran } = useAnggaran();

  const terdampak = angkaRingkas(dibi ? jiwaTerdampak(dibi.totals) : 0);
  const dana = rupiahRingkas(anggaran?.totalRp ?? 0);

  const metrics: Metric[] = [
    {
      label: "Kejadian tercatat",
      value: dibi?.totals.kejadian ?? 0,
      note: dibi
        ? `Aceh ${dibi.metadata.year_from}-${dibi.metadata.year_to} menurut DIBI BNPB`
        : "Data Informasi Bencana Indonesia",
      href: "/data-bencana",
      tautan: "Telusuri kejadian",
      siap: Boolean(dibi),
    },
    {
      label: "Jiwa terdampak",
      value: terdampak.n,
      decimals: terdampak.decimals,
      unit: terdampak.unit,
      note: "Menderita, mengungsi, luka, dan sakit",
      href: "/analisis-data",
      tautan: "Buka analisis",
      siap: Boolean(dibi),
    },
    {
      label: "Indeks risiko provinsi",
      value: irbi?.nilai_irb_provinsi ?? 0,
      decimals: 2,
      note: irbi
        ? `Kelas tinggi pada ${irbi.total_kabupaten_kota} kabupaten/kota, IRBI ${irbi.tahun}`
        : "Indeks Risiko Bencana Indonesia",
      href: "#risiko",
      tautan: "Lihat peringkat",
      siap: Boolean(irbi),
    },
    {
      label: `Anggaran penanganan ${anggaran?.tahun ?? 2026}`,
      value: dana.n,
      decimals: dana.decimals,
      prefix: "Rp",
      unit: dana.unit,
      note: anggaran
        ? `${anggaran.totalKegiatan} kegiatan dalam ${anggaran.sumber}`
        : "Penjabaran APBA tahun berjalan",
      href: "/anggaran-bencana",
      tautan: "Rincian anggaran",
      siap: Boolean(anggaran),
    },
  ];

  return (
    <section
      aria-label="Angka kunci Aceh Tangguh"
      className="relative z-10 -mt-16 px-4 pb-2"
    >
      <dl className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] shadow-[var(--shadow-elevated)] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        {metrics.map((m, i) => (
          <div
            key={m.label}
            className={cn(
              "group relative px-5 py-6 lg:px-7",
              "sm:border-[var(--border)]",
              i % 2 === 0 ? "sm:border-r" : "",
              i < 2 ? "sm:border-b lg:border-b-0" : "",
            )}
          >
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
