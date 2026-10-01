"use client";

import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { DIBI_DASHBOARD_URL } from "@/lib/dibi-types";
import { MAGMA_HOME, SIPONGI_PETA } from "@/lib/peringatan-dini-types";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./primitives";
import { SectionShell } from "./SectionShell";

type SumberRow = {
  lembagaKey: "sumber.dibi" | "sumber.irbi" | "sumber.bmkg" | "sumber.maritim" | "sumber.magma" | "sumber.sipongi" | "sumber.tatonas";
  isiKey: "sumber.dibiIsi" | "sumber.irbiIsi" | "sumber.bmkgIsi" | "sumber.maritimIsi" | "sumber.magmaIsi" | "sumber.sipongiIsi" | "sumber.tatonasIsi";
  href?: string;
};

/** Every figure on this page traces back to one of these. */
const SUMBER: SumberRow[] = [
  {
    lembagaKey: "sumber.dibi",
    isiKey: "sumber.dibiIsi",
    href: DIBI_DASHBOARD_URL,
  },
  {
    lembagaKey: "sumber.irbi",
    isiKey: "sumber.irbiIsi",
    href: "https://bnpb.go.id/",
  },
  {
    lembagaKey: "sumber.bmkg",
    isiKey: "sumber.bmkgIsi",
    href: "https://www.bmkg.go.id/",
  },
  {
    lembagaKey: "sumber.maritim",
    isiKey: "sumber.maritimIsi",
    href: "https://maritim.bmkg.go.id/",
  },
  {
    lembagaKey: "sumber.magma",
    isiKey: "sumber.magmaIsi",
    href: MAGMA_HOME,
  },
  {
    lembagaKey: "sumber.sipongi",
    isiKey: "sumber.sipongiIsi",
    href: SIPONGI_PETA,
  },
  {
    lembagaKey: "sumber.tatonas",
    isiKey: "sumber.tatonasIsi",
  },
];

const JAMINAN = [
  {
    judulKey: "sumber.j1Title",
    isiKey: "sumber.j1Isi",
    tautanKey: "sumber.j1Cta",
    href: "/sumber-data" as const,
  },
  {
    judulKey: "sumber.j2Title",
    isiKey: "sumber.j2Isi",
    tautanKey: "sumber.j2Cta",
    href: "/peta" as const,
  },
  {
    judulKey: "sumber.j3Title",
    isiKey: "sumber.j3Isi",
    tautanKey: "sumber.j3Cta",
    href: "/metodologi" as const,
  },
] as const;

export function SumberPanel() {
  const t = useTranslations("beranda");

  return (
    <SectionShell id="transparansi" density="default" raised>
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          kicker={t("sumber.kicker")}
          title={t("sumber.title")}
          lead={t("sumber.lead")}
        />

        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <ul className="grid gap-x-10 sm:grid-cols-2">
              {SUMBER.map((s) => (
                <li
                  key={s.lembagaKey}
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
                          {t(s.lembagaKey)}
                        </span>
                        <span
                          className={cn("mt-0.5 block text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}
                        >
                          {t(s.isiKey)}
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
                      <span className="block text-[0.9375rem] font-medium">{t(s.lembagaKey)}</span>
                      <span
                        className={cn("mt-0.5 block text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}
                      >
                        {t(s.isiKey)}
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
                  key={j.judulKey}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] p-4"
                >
                  <p className="text-[0.9375rem] font-semibold">{t(j.judulKey)}</p>
                  <p
                    className={cn(
                      "mt-1.5 leading-relaxed text-[var(--text-dim)]",
                      TYPE_FLOOR_CLASS,
                    )}
                  >
                    {t(j.isiKey)}
                  </p>
                  <Link
                    href={j.href}
                    className={cn(
                      "mt-2.5 inline-flex items-center gap-1 font-semibold text-[var(--primary)] transition-colors hover:text-[var(--accent)]",
                      TYPE_FLOOR_CLASS,
                    )}
                  >
                    {t(j.tautanKey)}
                    <ArrowUpRight size={13} aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
