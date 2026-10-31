"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export function LaporCta() {
  const t = useTranslations("beranda");

  return (
    <section
      id="partisipasi"
      data-section-density="compact"
      className="section-y-compact scroll-mt-24 bg-[var(--surface-brand)] text-[var(--primary-fg)]"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <h2 className="type-h3 w-full sm:w-auto sm:min-w-0">
          {t("lapor.title")}
        </h2>
        <Link
          href="/lapor/kejadian"
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-[var(--accent)] px-6 text-sm font-semibold text-[var(--accent-fg)] transition hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--primary)]"
        >
          {t("lapor.button")}
          <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    </section>
  );
}
