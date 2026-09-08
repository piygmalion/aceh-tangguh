"use client";

import { useMemo } from "react";
import { ArrowUpRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
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
  const t = useTranslations("beranda");
  const locale = useLocale();
  const totals = dibi.totals;
  const terdampak = angkaRingkas(jiwaTerdampak(totals), locale);
  const kerugian = rupiahDariJuta(totals.estimasi_kerugian_rumah, locale);

  const baris = [
    {
      key: "meninggal",
      label: t("dibi.meninggal"),
      node: <Figure value={meninggalHilang(totals)} size="sm" tone="danger" />,
      note: t("dibi.meninggalNote", {
        meninggal: angka(totals.meninggal, locale),
        hilang: angka(totals.hilang, locale),
      }),
    },
    {
      key: "terdampak",
      label: t("dibi.terdampak"),
      node: (
        <Figure
          value={terdampak.n}
          decimals={terdampak.decimals}
          unit={terdampak.unit}
          size="sm"
        />
      ),
      note: t("dibi.terdampakNote", { count: angka(totals.luka_sakit, locale) }),
    },
    {
      key: "rumahRusak",
      label: t("dibi.rumahRusak"),
      node: <Figure value={rumahRusakTotal(totals)} size="sm" />,
      note: t("dibi.rumahRusakNote", {
        berat: angka(totals.rumah_rusak_berat, locale),
        sedang: angka(totals.rumah_rusak_sedang, locale),
        ringan: angka(totals.rumah_rusak_ringan, locale),
      }),
    },
    {
      key: "rumahTerendam",
      label: t("dibi.rumahTerendam"),
      node: <Figure value={totals.rumah_terendam} size="sm" />,
      note: t("dibi.rumahTerendamNote"),
    },
    {
      key: "kerugian",
      label: t("dibi.kerugian"),
      node: (
        <Figure
          value={kerugian.n}
          decimals={kerugian.decimals}
          unit={kerugian.unit}
          prefix="Rp"
          size="sm"
        />
      ),
      note: t("dibi.kerugianNote"),
    },
  ];

  return (
    <dl className="divide-y divide-[var(--border)]">
      {baris.map((b) => (
        <div key={b.key} className="py-4 first:pt-0 last:pb-0">
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
  const t = useTranslations("beranda");
  const locale = useLocale();
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
        <span className="font-semibold text-[var(--text)]">{t("dibi.perTahun")}</span>
        <span>
          {t("dibi.puncak", {
            year: puncak.tahun,
            count: angka(puncak.kejadian, locale),
          })}
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
                title={t("dibi.barTitle", {
                  year: r.tahun,
                  count: angka(r.kejadian, locale),
                  mati: angka(r.meninggal + r.hilang, locale),
                })}
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
  const t = useTranslations("beranda");
  const locale = useLocale();
  const { data, isLoading, isError } = useDibi();

  const kategori = useMemo(() => {
    const rows = [...(data?.by_kategori ?? [])].sort((a, b) => b.kejadian - a.kejadian);
    const maks = rows.reduce((m, r) => Math.max(m, r.kejadian), 0);
    return { rows, maks };
  }, [data]);

  return (
    <section id="dibi" className="scroll-mt-24 px-4 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          title={t("dibi.title")}
          lead={t("dibi.lead")}
          aside={
            <Link
              href="/data-bencana"
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--border)] px-4 font-semibold transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]",
                TYPE_FLOOR_CLASS,
              )}
            >
              {t("dibi.cta")}
              <ArrowUpRight size={14} aria-hidden />
            </Link>
          }
        />

        {isLoading ? <PanelSkeleton className="mt-8 h-[28rem]" /> : null}
        {isError ? (
          <div className="mt-8">
            <PanelError>{t("dibi.error")}</PanelError>
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
                  {t("dibi.kategori")}
                </p>
                <ul className="space-y-3.5">
                  {kategori.rows.map((row) => (
                    <li key={row.kategori_bencana}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-[0.9375rem] font-medium">
                          {rapikanTanda(row.kategori_bencana)}
                        </span>
                        <span className="shrink-0 text-[0.9375rem] font-semibold tabular-nums">
                          {angka(row.kejadian, locale)}
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
                        {t("dibi.kategoriNote", {
                          mati: angka(row.meninggal + row.hilang, locale),
                          jiwa: angka(jiwaTerdampak(row), locale),
                        })}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <TrenTahun dibi={data} />

            <Sumber href={data.metadata.source_url}>
              {t("dibi.sumber", {
                name: rapikanTanda(data.metadata.source_name),
                from: data.metadata.year_from,
                to: data.metadata.year_to,
              })}
            </Sumber>
          </>
        ) : null}
      </div>
    </section>
  );
}
