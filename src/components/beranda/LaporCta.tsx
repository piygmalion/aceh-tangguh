"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export function LaporCta() {
  const t = useTranslations("beranda");

  return (
    <section id="partisipasi" className="scroll-mt-24 bg-[var(--accent)] text-[var(--accent-fg)]">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-12 md:flex-row md:items-center md:justify-between md:py-14">
        <h2 className="max-w-2xl text-[1.35rem] font-semibold leading-snug tracking-[-0.02em] sm:text-[1.6rem]">
          {t("lapor.title")}
        </h2>
        <Link
          href="/lapor/kejadian"
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-[var(--ink)] px-6 text-sm font-semibold text-[var(--paper)] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]"
        >
          {t("lapor.button")}
          <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    </section>
  );
}
