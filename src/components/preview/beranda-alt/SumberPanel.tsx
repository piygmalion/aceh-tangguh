"use client";

import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { DIBI_DASHBOARD_URL } from "@/lib/dibi-types";
import { MAGMA_HOME, SIPONGI_PETA } from "@/lib/peringatan-dini-types";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./primitives";

type Sumber = {
  lembaga: string;
  isi: string;
  href?: string;
};

/** Every figure on this page traces back to one of these. */
const SUMBER: Sumber[] = [
  {
    lembaga: "BNPB, DIBI",
    isi: "Dampak kejadian bencana Aceh 2008 sampai 2026",
    href: DIBI_DASHBOARD_URL,
  },
  {
    lembaga: "BNPB, IRBI 2025",
    isi: "Indeks risiko bencana 23 kabupaten dan kota",
    href: "https://bnpb.go.id/",
  },
  {
    lembaga: "BMKG",
    isi: "Prakiraan cuaca dan peringatan dini per kabupaten",
    href: "https://www.bmkg.go.id/",
  },
  {
    lembaga: "BMKG Maritim",
    isi: "Tinggi gelombang perairan Aceh",
    href: "https://maritim.bmkg.go.id/",
  },
  {
    lembaga: "MAGMA, Kementerian ESDM",
    isi: "Gempa bumi terkini dan aktivitas gunung api",
    href: MAGMA_HOME,
  },
  {
    lembaga: "SIPONGI",
    isi: "Titik panas kebakaran hutan dan lahan",
    href: SIPONGI_PETA,
  },
  {
    lembaga: "Tatonas",
    isi: "Telemetri tinggi muka air dan curah hujan",
  },
  {
    lembaga: "Keputusan Gubernur PRRPKA",
    isi: "Rencana pemulihan pascabencana 2026 sampai 2028",
  },
  {
    lembaga: "Peraturan Gubernur APBA",
    isi: "Penjabaran anggaran penanganan bencana 2026",
  },
];

const JAMINAN = [
  {
    judul: "Terbuka tanpa akun",
    isi: "Seluruh lapisan publik dapat dibaca tanpa login.",
    tautan: "Lihat sumber data",
    href: "/sumber-data" as const,
  },
  {
    judul: "Angka bisa ditelusuri",
    isi: "Setiap klaim di halaman ini menautkan ke data mentahnya.",
    tautan: "Buka peta",
    href: "/peta" as const,
  },
  {
    judul: "Metode dapat diaudit",
    isi: "Cara pengolahan dan batasannya ditulis terbuka.",
    tautan: "Baca metodologi",
    href: "/metodologi" as const,
  },
];

export function SumberPanel() {
  return (
    <section id="sumber" className="scroll-mt-24 px-4 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          kicker="Data terbuka"
          title="Dari mana angka di halaman ini berasal"
          lead="Aceh Tangguh tidak memproduksi angka sendiri. Halaman ini menyusun ulang data resmi agar bisa dibaca dalam satu alur."
        />

        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <ul className="grid gap-x-10 sm:grid-cols-2">
              {SUMBER.map((s) => (
                <li
                  key={s.lembaga}
                  className="border-b border-[var(--border)] py-3 last:border-b-0 sm:last:border-b"
                >
                  {s.href ? (
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start justify-between gap-3"
                    >
                      <span className="min-w-0">
                        <span className="block text-[0.9375rem] font-medium transition-colors group-hover:text-[var(--primary)]">
                          {s.lembaga}
                        </span>
                        <span
                          className={cn("mt-0.5 block text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}
                        >
                          {s.isi}
                        </span>
                      </span>
                      <ArrowUpRight
                        size={15}
                        aria-hidden
                        className="mt-1 shrink-0 text-[var(--text-dim)] transition-colors group-hover:text-[var(--primary)]"
                      />
                    </a>
                  ) : (
                    <div>
                      <span className="block text-[0.9375rem] font-medium">{s.lembaga}</span>
                      <span
                        className={cn("mt-0.5 block text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}
                      >
                        {s.isi}
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-5">
            <ul className="grid gap-3">
              {JAMINAN.map((j) => (
                <li
                  key={j.judul}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] p-4"
                >
                  <p className="text-[0.9375rem] font-semibold">{j.judul}</p>
                  <p
                    className={cn(
                      "mt-1.5 leading-relaxed text-[var(--text-dim)]",
                      TYPE_FLOOR_CLASS,
                    )}
                  >
                    {j.isi}
                  </p>
                  <Link
                    href={j.href}
                    className={cn(
                      "mt-2.5 inline-flex items-center gap-1 font-semibold text-[var(--primary)] transition-colors hover:text-[var(--accent)]",
                      TYPE_FLOOR_CLASS,
                    )}
                  >
                    {j.tautan}
                    <ArrowUpRight size={13} aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
