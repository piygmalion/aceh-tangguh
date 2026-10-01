"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

export function MasukCta() {
  const t = useTranslations("beranda");

  return (
    <section className="scroll-mt-24 px-4 pb-4">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 rounded-3xl bg-[var(--ink)] px-6 py-10 text-[var(--paper)] md:flex-row md:items-center md:justify-between md:px-10 md:py-12">
        <div className="max-w-xl">
          <p className={cn("text-[var(--eyebrow)]", TYPE_KICKER_CLASS)}>{t("masuk.kicker")}</p>
          <h2 className="mt-3 text-[1.6rem] font-semibold leading-[1.18] tracking-[-0.028em] sm:text-[2rem]">
            {t("masuk.title")}
          </h2>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--paper)]/75">
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
    </section>
  );
}
