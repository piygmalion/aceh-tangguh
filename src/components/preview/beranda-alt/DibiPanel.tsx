"use client";

import { useMemo } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import {
  jiwaTerdampak,
  meninggalHilang,
  rumahRusakTotal,
  type DibiAcehResponse,
} from "@/lib/dibi-types";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";
import { useDibi } from "./data";
import { angka, angkaRingkas, rapikanTanda, rupiahDariJuta } from "./format";
import { Bar, Figure, PanelError, PanelSkeleton, SectionHeading, Sumber } from "./primitives";

/** Colour by severity of the category, drawn only from the Aceh status scale. */
function warnaKategori(kejadian: number, maks: number): string {
  const share = maks > 0 ? kejadian / maks : 0;
  if (share >= 0.6) return "bg-[var(--danger)]";
  if (share >= 0.25) return "bg-[var(--warn)]";
  return "bg-[var(--accent-soft)]";
}

function RingkasanDampak({ dibi }: { dibi: DibiAcehResponse }) {
  const t = dibi.totals;
  const terdampak = angkaRingkas(jiwaTerdampak(t));
  const kerugian = rupiahDariJuta(t.estimasi_kerugian_rumah);

  const baris = [
    {
      label: "Meninggal dan hilang",
      node: <Figure value={meninggalHilang(t)} size="sm" tone="danger" />,
      note: `${angka(t.meninggal)} meninggal, ${angka(t.hilang)} hilang`,
    },
    {
      label: "Jiwa terdampak",
      node: (
        <Figure
          value={terdampak.n}
          decimals={terdampak.decimals}
          unit={terdampak.unit}
          size="sm"
        />
      ),
      note: `${angka(t.luka_sakit)} di antaranya luka atau sakit`,
    },
    {
      label: "Rumah rusak",
      node: <Figure value={rumahRusakTotal(t)} size="sm" />,
      note: `Rusak berat ${angka(t.rumah_rusak_berat)}, sedang ${angka(t.rumah_rusak_sedang)}, ringan ${angka(t.rumah_rusak_ringan)}`,
    },
    {
      label: "Rumah terendam",
      node: <Figure value={t.rumah_terendam} size="sm" />,
      note: "Tergenang tanpa kerusakan struktur",
    },
    {
      label: "Estimasi kerugian rumah",
      node: (
        <Figure
          value={kerugian.n}
          decimals={kerugian.decimals}
          unit={kerugian.unit}
          prefix="Rp"
          size="sm"
        />
      ),
      note: "Nilai kerusakan permukiman menurut DIBI",
    },
  ];

  return (
    <dl className="divide-y divide-[var(--border)]">
      {baris.map((b) => (
        <div key={b.label} className="py-4 first:pt-0 last:pb-0">
          <dt className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{b.label}</dt>
          <dd className="mt-1.5">
            {b.node}
            <p className={cn("mt-1 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{b.note}</p>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function TrenTahun({ dibi }: { dibi: DibiAcehResponse }) {
  const rows = dibi.by_tahun;
  if (rows.length === 0) return null;

  const maks = rows.reduce((m, r) => Math.max(m, r.kejadian), 0);
  const puncak = rows.reduce((a, b) => (b.kejadian > a.kejadian ? b : a));

  return (
    <figure className="mt-10">
      <figcaption
        className={cn(
          "mb-3 flex flex-wrap items-baseline justify-between gap-2 text-[var(--text-dim)]",
          TYPE_FLOOR_CLASS,
        )}
      >
        <span className="font-semibold text-[var(--text)]">Kejadian per tahun</span>
        <span>
          Puncak {puncak.tahun} dengan {angka(puncak.kejadian)} kejadian
        </span>
      </figcaption>
      <ul className="flex items-end gap-[3px] sm:gap-1.5" role="list">
        {rows.map((r) => {
          const tinggi = maks > 0 ? Math.max(4, (r.kejadian / maks) * 100) : 4;
          const isPuncak = r.tahun === puncak.tahun;
          return (
            <li
              key={r.tahun}
              className="group flex min-w-0 flex-1 flex-col items-center gap-1.5"
            >
              <span
                className={cn(
                  "w-full rounded-t-[3px] transition-colors",
                  isPuncak
                    ? "bg-[var(--accent)]"
                    : "bg-[var(--accent-soft)] group-hover:bg-[var(--primary)]",
                )}
                style={{ height: `${tinggi}px` }}
                title={`${r.tahun}: ${angka(r.kejadian)} kejadian, ${angka(r.meninggal + r.hilang)} meninggal dan hilang`}
              />
              <span
                className={cn(
                  "hidden tabular-nums text-[var(--text-dim)] sm:block",
                  TYPE_FLOOR_CLASS,
                )}
              >
                {String(r.tahun).slice(2)}
              </span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}

export function DibiPanel() {
  const { data, isLoading, isError } = useDibi();

  const kategori = useMemo(() => {
    const rows = [...(data?.by_kategori ?? [])].sort((a, b) => b.kejadian - a.kejadian);
    const maks = rows.reduce((m, r) => Math.max(m, r.kejadian), 0);
    return { rows, maks };
  }, [data]);

  return (
    <section id="dampak" className="scroll-mt-24 px-4 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          title="Delapan belas tahun dampak bencana di Aceh"
          lead="Agregat kejadian Provinsi Aceh dari Data Informasi Bencana Indonesia. Angka nasional tidak dicampurkan."
          aside={
            <Link
              href="/data-bencana"
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--border)] px-4 font-semibold transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]",
                TYPE_FLOOR_CLASS,
              )}
            >
              Telusuri per kejadian
              <ArrowUpRight size={14} aria-hidden />
            </Link>
          }
        />

        {isLoading ? <PanelSkeleton className="mt-8 h-[28rem]" /> : null}
        {isError ? (
          <div className="mt-8">
            <PanelError>Dashboard DIBI Aceh belum bisa dimuat.</PanelError>
          </div>
        ) : null}

        {data ? (
          <>
            <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-5">
                <RingkasanDampak dibi={data} />
              </div>

              <div className="lg:col-span-7">
                <p className={cn("mb-4 font-semibold", TYPE_FLOOR_CLASS)}>
                  Kejadian menurut kategori bencana
                </p>
                <ul className="space-y-3.5">
                  {kategori.rows.map((row) => (
                    <li key={row.kategori_bencana}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-[0.9375rem] font-medium">
                          {rapikanTanda(row.kategori_bencana)}
                        </span>
                        <span className="shrink-0 text-[0.9375rem] font-semibold tabular-nums">
                          {angka(row.kejadian)}
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <Bar
                          ratio={row.kejadian / kategori.maks}
                          className={warnaKategori(row.kejadian, kategori.maks)}
                        />
                      </div>
                      <p
                        className={cn(
                          "mt-1.5 text-[var(--text-dim)]",
                          TYPE_FLOOR_CLASS,
                        )}
                      >
                        {angka(row.meninggal + row.hilang)} meninggal dan hilang,{" "}
                        {angka(jiwaTerdampak(row))} jiwa terdampak
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <TrenTahun dibi={data} />

            <Sumber href={data.metadata.source_url}>
              {rapikanTanda(data.metadata.source_name)}, difilter untuk Provinsi Aceh tahun{" "}
              {data.metadata.year_from} sampai {data.metadata.year_to}
            </Sumber>
          </>
        ) : null}
      </div>
    </section>
  );
}
