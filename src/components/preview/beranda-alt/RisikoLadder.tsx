"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";
import { useIrbi, type IrbiKabView } from "./data";
import { angka, dariSlug, desimal, kapitalAwal, kelasRisikoBar, kelasRisikoChip } from "./format";
import { Bar, PanelError, PanelSkeleton, SectionHeading, Sumber } from "./primitives";

const AWAL_TAMPIL = 10;

function BarisKab({
  kab,
  peringkat,
  maks,
}: {
  kab: IrbiKabView;
  peringkat: number;
  maks: number;
}) {
  return (
    <li className="grid grid-cols-[1.75rem_1fr_auto] items-center gap-x-3 gap-y-1.5 border-b border-[var(--border)] py-3 last:border-b-0">
      <span
        className={cn(
          "tabular-nums text-[var(--text-dim)]",
          TYPE_FLOOR_CLASS,
        )}
      >
        {peringkat}
      </span>
      <span className="truncate text-[0.9375rem] font-medium" title={kab.kabupaten_kota}>
        {kab.kabupaten_kota}
      </span>
      <span className="flex items-baseline gap-2">
        <span className="text-[0.9375rem] font-semibold tabular-nums tracking-[-0.02em]">
          {desimal(kab.irb_2025, 2)}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 font-semibold",
            TYPE_FLOOR_CLASS,
            kelasRisikoChip(kab.kelas_risiko),
          )}
        >
          {kapitalAwal(kab.kelas_risiko)}
        </span>
      </span>

      <span className="col-start-2 col-end-4 flex items-center gap-3">
        <Bar
          ratio={maks > 0 ? kab.irb_2025 / maks : 0}
          className={kelasRisikoBar(kab.kelas_risiko)}
        />
        <span
          className={cn("shrink-0 whitespace-nowrap text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}
        >
          {dariSlug(kab.ancaman_tertinggi)}
        </span>
      </span>
    </li>
  );
}

export function RisikoLadder() {
  const { data, isLoading, isError } = useIrbi();
  const [tampilSemua, setTampilSemua] = useState(false);

  const { daftar, maks, tally, penduduk } = useMemo(() => {
    const kabupaten = data?.kabupaten ?? [];
    const hitung = new Map<string, number>();
    for (const k of kabupaten) {
      hitung.set(k.ancaman_tertinggi, (hitung.get(k.ancaman_tertinggi) ?? 0) + 1);
    }
    return {
      daftar: kabupaten,
      maks: kabupaten.reduce((m, k) => Math.max(m, k.irb_2025), 0),
      tally: Array.from(hitung.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      penduduk: data?.jumlah_penduduk_2025 ?? 0,
    };
  }, [data]);

  const terlihat = tampilSemua ? daftar : daftar.slice(0, AWAL_TAMPIL);
  const tersisa = Math.max(0, daftar.length - AWAL_TAMPIL);

  return (
    <section
      id="risiko"
      className="scroll-mt-24 border-y border-[var(--border)] bg-[var(--bg-raised)] px-4 py-16 md:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          kicker="Risiko jangka panjang"
          title="Peringkat risiko 23 kabupaten dan kota"
          lead="Indeks Risiko Bencana BNPB menimbang bahaya 40 persen, kerentanan 30 persen, dan kapasitas 30 persen. Nilai yang lebih tinggi berarti risiko lebih besar."
          aside={
            <Link
              href={{ pathname: "/peta", query: { area: "irbi2025", basemap: "positron" } }}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-full bg-[var(--primary)] px-4 font-semibold text-[var(--primary-fg)] transition hover:bg-[var(--primary-hover)]",
                TYPE_FLOOR_CLASS,
              )}
            >
              Buka peta IRBI
              <ArrowUpRight size={14} aria-hidden />
            </Link>
          }
        />

        {isLoading ? <PanelSkeleton className="mt-8 h-96" /> : null}
        {isError ? (
          <div className="mt-8">
            <PanelError>Data IRBI belum bisa dimuat.</PanelError>
          </div>
        ) : null}

        {daftar.length > 0 ? (
          <>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-muted)] px-4 py-3.5">
              <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                Ancaman tertinggi per wilayah
              </p>
              <ul className="flex flex-wrap items-center gap-2">
                {tally.map(([ancaman, jumlah]) => (
                  <li
                    key={ancaman}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-1 font-medium",
                      TYPE_FLOOR_CLASS,
                    )}
                  >
                    {dariSlug(ancaman)}
                    <span className="font-semibold tabular-nums text-[var(--text-dim)]">
                      {jumlah}
                    </span>
                  </li>
                ))}
              </ul>
              {penduduk > 0 ? (
                <p className={cn("text-[var(--text-dim)] sm:ml-auto", TYPE_FLOOR_CLASS)}>
                  {angka(penduduk)} jiwa terpapar
                </p>
              ) : null}
            </div>

            <ol className="mt-2 grid gap-x-10 md:grid-cols-2">
              {terlihat.map((kab, i) => (
                <BarisKab
                  key={kab.kabupaten_kota}
                  kab={kab}
                  peringkat={i + 1}
                  maks={maks}
                />
              ))}
            </ol>

            {tersisa > 0 ? (
              <button
                type="button"
                onClick={() => setTampilSemua((v) => !v)}
                aria-expanded={tampilSemua}
                className={cn(
                  "mt-5 inline-flex h-10 items-center rounded-full border border-[var(--border)] px-4 font-semibold transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]",
                  TYPE_FLOOR_CLASS,
                )}
              >
                {tampilSemua
                  ? "Ringkas kembali"
                  : `Tampilkan ${tersisa} wilayah lainnya`}
              </button>
            ) : null}

            <Sumber href="https://bnpb.go.id/">
              BNPB, Indeks Risiko Bencana Indonesia 2025, Volume 04 Nomor 04
            </Sumber>
          </>
        ) : null}
      </div>
    </section>
  );
}
