"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { SectionShell } from "./SectionShell";

export function MasukCta() {
  const t = useTranslations("beranda");

  return (
    <SectionShell density="compact">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 rounded-3xl bg-[var(--ink)] px-6 py-10 text-[var(--paper)] md:flex-row md:items-center md:justify-between md:px-10 md:py-12">
        <div className="max-w-xl">
          <h2 className="type-h2 text-[var(--accent-on-ink)]">
            {t("masuk.title")}
          </h2>
          <p className="type-lead mt-3 text-[var(--paper)]/75">
            {t("masuk.lead")}
          </p>
        </div>
        <Link
          href="/admin/login"
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-[var(--accent)] px-6 text-sm font-semibold text-[var(--accent-fg)] transition hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--paper)]"
        >
          {t("masuk.button")}
          <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    </SectionShell>
  );
}
