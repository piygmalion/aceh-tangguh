"use client";

import { ArrowUpRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";
import { useAnggaran, usePrrpka } from "./data";
import { angka, rapikanTanda, rupiahRingkas, rupiahTeks } from "./format";
import { Bar, Figure, PanelError, PanelSkeleton, SectionHeading, Sumber } from "./primitives";

function BarisKesenjangan({
  tingkat,
  kebutuhan,
  terakomodasi,
}: {
  tingkat: string;
  kebutuhan: number;
  terakomodasi: number;
}) {
  const t = useTranslations("beranda");
  const locale = useLocale();
  const rasio = kebutuhan > 0 ? terakomodasi / kebutuhan : 0;
  const cukup = terakomodasi >= kebutuhan;
  const selisih = Math.abs(terakomodasi - kebutuhan);

  return (
    <li className="border-b border-[var(--border)] py-4 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-[0.9375rem] font-medium">
          {t(`pemulihan.tingkat.${tingkat}`)}
        </span>
        <span
          className={cn(
            "font-semibold",
            TYPE_FLOOR_CLASS,
            cukup ? "text-[var(--primary)]" : "text-[var(--danger)]",
          )}
        >
          {cukup
            ? t("pemulihan.surplus", { amount: rupiahTeks(selisih, locale) })
            : t("pemulihan.kurang", { amount: rupiahTeks(selisih, locale) })}
        </span>
      </div>

      <div className="mt-2.5">
        <Bar
          ratio={Math.min(1, rasio)}
          className={cukup ? "bg-[var(--primary)]" : "bg-[var(--danger)]"}
        />
      </div>

      <div
        className={cn(
          "mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[var(--text-dim)]",
          TYPE_FLOOR_CLASS,
        )}
      >
        <span>{t("pemulihan.kebutuhan", { amount: rupiahTeks(kebutuhan, locale) })}</span>
        <span className="tabular-nums">
          {t("pemulihan.terakomodasi", {
            amount: rupiahTeks(terakomodasi, locale),
            pct: Math.round(rasio * 100),
          })}
        </span>
      </div>
    </li>
  );
}

export function PemulihanPanel() {
  const t = useTranslations("beranda");
  const locale = useLocale();
  const { data: prrpka, isLoading, isError } = usePrrpka();
  const { data: anggaran } = useAnggaran();

  const r = prrpka?.ringkasan;
  const kerusakan = rupiahRingkas(r?.jitupasna_kerusakan_kerugian ?? 0, locale);
  const kebutuhanRR = rupiahRingkas(r?.jitupasna_kebutuhan_rr ?? 0, locale);
  const totalApba = rupiahRingkas(anggaran?.totalRp ?? 0, locale);
  const maksFase = (anggaran?.perFase ?? []).reduce((m, f) => Math.max(m, f.rp), 0);

  return (
    <section
      id="prrpka"
      className="scroll-mt-24 border-y border-[var(--border)] bg-[var(--bg-raised)] px-4 py-16 md:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          title={t("pemulihan.title")}
          lead={t("pemulihan.lead")}
          aside={
            <Link
              href="/anggaran-bencana"
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--border)] px-4 font-semibold transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]",
                TYPE_FLOOR_CLASS,
              )}
            >
              {t("pemulihan.cta")}
              <ArrowUpRight size={14} aria-hidden />
            </Link>
          }
        />

        {isLoading ? <PanelSkeleton className="mt-8 h-96" /> : null}
        {isError ? (
          <div className="mt-8">
            <PanelError>{t("pemulihan.error")}</PanelError>
          </div>
        ) : null}

        {r ? (
          <>
            <dl className="mt-8 grid gap-6 border-y border-[var(--border)] py-6 sm:grid-cols-3 sm:gap-8">
              <div>
                <dt className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                  {t("pemulihan.kerusakan")}
                </dt>
                <dd className="mt-1.5">
                  <Figure
                    value={kerusakan.n}
                    decimals={kerusakan.decimals}
                    unit={kerusakan.unit}
                    prefix="Rp"
                    size="md"
                    tone="danger"
                  />
                </dd>
              </div>
              <div>
                <dt className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                  {t("pemulihan.kebutuhanRR")}
                </dt>
                <dd className="mt-1.5">
                  <Figure
                    value={kebutuhanRR.n}
                    decimals={kebutuhanRR.decimals}
                    unit={kebutuhanRR.unit}
                    prefix="Rp"
                    size="md"
                  />
                </dd>
              </div>
              <div>
                <dt className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                  {t("pemulihan.rumahR3p")}
                </dt>
                <dd className="mt-1.5">
                  <Figure value={r.perumahan_r3p_unit} unit={t("pemulihan.unit")} size="md" />
                  <p className={cn("mt-1 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                    {t("pemulihan.rumahNote", { count: r.kabupaten_terdampak })}
                  </p>
                </dd>
              </div>
            </dl>

            <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-7">
                <p className={cn("mb-1 font-semibold", TYPE_FLOOR_CLASS)}>
                  {t("pemulihan.kesenjangan")}
                </p>
                <ul>
                  {r.kesenjangan_tingkat.map((row) => (
                    <BarisKesenjangan
                      key={row.tingkat}
                      tingkat={row.tingkat}
                      kebutuhan={row.kebutuhan}
                      terakomodasi={row.terakomodasi}
                    />
                  ))}
                </ul>
              </div>

              {anggaran ? (
                <div className="lg:col-span-5">
                  <div className="h-full rounded-2xl border border-[var(--border)] bg-[var(--bg-muted)] p-5">
                    <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                      {t("pemulihan.apba", { year: anggaran.tahun })}
                    </p>
                    <div className="mt-1.5">
                      <Figure
                        value={totalApba.n}
                        decimals={totalApba.decimals}
                        unit={totalApba.unit}
                        prefix="Rp"
                        size="md"
                        tone="primary"
                      />
                    </div>
                    <p className={cn("mt-1.5 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                      {t("pemulihan.apbaNote", {
                        count: anggaran.totalKegiatan,
                        pct: angka(anggaran.perubahanPct, locale),
                      })}
                    </p>

                    <ul className="mt-5 space-y-3">
                      {anggaran.perFase.map((f) => (
                        <li key={f.faseKey}>
                          <div className="flex items-baseline justify-between gap-3">
                            <span className={cn("font-medium", TYPE_FLOOR_CLASS)}>
                              {t(`pemulihan.fase.${f.faseKey}`)}
                            </span>
                            <span
                              className={cn(
                                "shrink-0 tabular-nums text-[var(--text-dim)]",
                                TYPE_FLOOR_CLASS,
                              )}
                            >
                              {rupiahTeks(f.rp, locale)}
                            </span>
                          </div>
                          <div className="mt-1.5">
                            <Bar
                              ratio={maksFase > 0 ? f.rp / maksFase : 0}
                              className="bg-[var(--accent-soft)]"
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>

            <Sumber>
              {prrpka?.metadata.nomor_kepgub
                ? t("pemulihan.sumberKepgub", {
                    nomor: rapikanTanda(prrpka.metadata.nomor_kepgub),
                    periode: prrpka.metadata.periode,
                  })
                : t("pemulihan.sumberFallback")}
              {anggaran
                ? ` ${t("pemulihan.sumberAnggaran", { sumber: rapikanTanda(anggaran.sumber) })}`
                : null}
            </Sumber>
          </>
        ) : null}
      </div>
    </section>
  );
}
