"use client";

import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";
import { useAnggaran, usePrrpka } from "./data";
import { angka, rapikanTanda, rupiahRingkas, rupiahTeks } from "./format";
import { Bar, Figure, PanelError, PanelSkeleton, SectionHeading, Sumber } from "./primitives";

const LABEL_TINGKAT: Record<string, string> = {
  nasional: "Kewenangan pusat",
  provinsi: "Pemerintah Aceh",
  kabupaten_kota: "Kabupaten dan kota",
};

function BarisKesenjangan({
  tingkat,
  kebutuhan,
  terakomodasi,
}: {
  tingkat: string;
  kebutuhan: number;
  terakomodasi: number;
}) {
  const rasio = kebutuhan > 0 ? terakomodasi / kebutuhan : 0;
  const cukup = terakomodasi >= kebutuhan;
  const selisih = Math.abs(terakomodasi - kebutuhan);

  return (
    <li className="border-b border-[var(--border)] py-4 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-[0.9375rem] font-medium">
          {LABEL_TINGKAT[tingkat] ?? tingkat}
        </span>
        <span
          className={cn(
            "font-semibold",
            TYPE_FLOOR_CLASS,
            cukup ? "text-[var(--primary)]" : "text-[var(--danger)]",
          )}
        >
          {cukup ? "Surplus" : "Kurang"} {rupiahTeks(selisih)}
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
        <span>Kebutuhan {rupiahTeks(kebutuhan)}</span>
        <span className="tabular-nums">
          Terakomodasi {rupiahTeks(terakomodasi)} ({Math.round(rasio * 100)} persen)
        </span>
      </div>
    </li>
  );
}

export function PemulihanPanel() {
  const { data: prrpka, isLoading, isError } = usePrrpka();
  const { data: anggaran } = useAnggaran();

  const r = prrpka?.ringkasan;
  const kerusakan = rupiahRingkas(r?.jitupasna_kerusakan_kerugian ?? 0);
  const kebutuhanRR = rupiahRingkas(r?.jitupasna_kebutuhan_rr ?? 0);
  const totalApba = rupiahRingkas(anggaran?.totalRp ?? 0);
  const maksFase = (anggaran?.perFase ?? []).reduce((m, f) => Math.max(m, f.rp), 0);

  return (
    <section
      id="pemulihan"
      className="scroll-mt-24 border-y border-[var(--border)] bg-[var(--bg-raised)] px-4 py-16 md:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          title="Kebutuhan pemulihan dan dana yang tersedia"
          lead="Kajian kebutuhan pascabencana menghitung nilai kerusakan dan rencana rehabilitasi rekonstruksi 2026 sampai 2028. Selisihnya menunjukkan di mana pendanaan masih kurang."
          aside={
            <Link
              href="/anggaran-bencana"
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--border)] px-4 font-semibold transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]",
                TYPE_FLOOR_CLASS,
              )}
            >
              Rincian anggaran
              <ArrowUpRight size={14} aria-hidden />
            </Link>
          }
        />

        {isLoading ? <PanelSkeleton className="mt-8 h-96" /> : null}
        {isError ? (
          <div className="mt-8">
            <PanelError>Ringkasan pemulihan belum bisa dimuat.</PanelError>
          </div>
        ) : null}

        {r ? (
          <>
            <dl className="mt-8 grid gap-6 border-y border-[var(--border)] py-6 sm:grid-cols-3 sm:gap-8">
              <div>
                <dt className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                  Nilai kerusakan dan kerugian
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
                  Kebutuhan rehabilitasi dan rekonstruksi
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
                  Rumah dalam rencana R3P
                </dt>
                <dd className="mt-1.5">
                  <Figure value={r.perumahan_r3p_unit} unit="unit" size="md" />
                  <p className={cn("mt-1 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                    Tersebar di {r.kabupaten_terdampak} kabupaten dan kota terdampak
                  </p>
                </dd>
              </div>
            </dl>

            <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-7">
                <p className={cn("mb-1 font-semibold", TYPE_FLOOR_CLASS)}>
                  Kesenjangan pendanaan menurut kewenangan
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
                      Anggaran penanganan bencana {anggaran.tahun}
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
                      {anggaran.totalKegiatan} kegiatan, naik{" "}
                      {angka(anggaran.perubahanPct)} persen dari tahun sebelumnya
                    </p>

                    <ul className="mt-5 space-y-3">
                      {anggaran.perFase.map((f) => (
                        <li key={f.fase}>
                          <div className="flex items-baseline justify-between gap-3">
                            <span className={cn("font-medium", TYPE_FLOOR_CLASS)}>
                              {f.fase}
                            </span>
                            <span
                              className={cn(
                                "shrink-0 tabular-nums text-[var(--text-dim)]",
                                TYPE_FLOOR_CLASS,
                              )}
                            >
                              {rupiahTeks(f.rp)}
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
                ? rapikanTanda(
                    `${prrpka.metadata.nomor_kepgub}, periode ${prrpka.metadata.periode}`,
                  )
                : "Keputusan Gubernur tentang PRRPKA"}
              {anggaran ? `. Anggaran dari ${rapikanTanda(anggaran.sumber)}` : null}
            </Sumber>
          </>
        ) : null}
      </div>
    </section>
  );
}
