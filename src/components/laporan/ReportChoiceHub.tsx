"use client";

import { AlertTriangle, ArrowRight, ClipboardCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

export function ReportChoiceHub() {
  const t = useTranslations("laporHub");

  return (
    <div>
      <p className={cn("mb-2 text-[var(--eyebrow)]", TYPE_KICKER_CLASS)}>{t("kicker")}</p>
      <h1 className="page-h1">{t("title")}</h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--text-dim)] md:text-lg">
        {t("subtitle")}
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 md:gap-6">
        <Link
          href="/lapor/kejadian"
          className="glass flex min-h-[280px] flex-col rounded-2xl border border-[var(--glass-border)] p-6 transition hover:!border-[color-mix(in_srgb,var(--accent)_50%,transparent)] md:p-7"
        >
          <div className="mb-5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--accent)]/30 bg-[var(--accent-dim)] text-[var(--accent)]">
            <AlertTriangle size={20} />
          </div>
          <h2 className="text-lg font-semibold tracking-tight">{t("kejadianTitle")}</h2>
          <p className="mt-2 flex-1 text-[15px] leading-relaxed text-[var(--text-dim)]">
            {t("kejadianBody")}
          </p>
          <span className="mt-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 text-sm font-semibold text-[var(--accent-fg)] sm:w-auto">
            {t("kejadianCta")}
            <ArrowRight size={18} />
          </span>
        </Link>
        <Link
          href="/lapor/penanganan"
          className="glass flex min-h-[280px] flex-col rounded-2xl border border-[var(--glass-border)] p-6 transition hover:border-[var(--accent-soft)]/50 md:p-7"
        >
          <div className="mb-5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--accent-soft)]/30 bg-[var(--accent-soft)]/15 text-[var(--accent-soft)]">
            <ClipboardCheck size={20} />
          </div>
          <h2 className="text-lg font-semibold tracking-tight">{t("penangananTitle")}</h2>
          <p className="mt-2 flex-1 text-[15px] leading-relaxed text-[var(--text-dim)]">
            {t("penangananBody")}
          </p>
          <span className="mt-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--glass-border)] bg-transparent px-6 text-sm font-semibold text-[var(--text)] sm:w-auto">
            {t("penangananCta")}
            <ArrowRight size={18} />
          </span>
        </Link>
      </div>

      <p className="mt-8 max-w-xl text-[0.8125rem] leading-relaxed text-[var(--text-dim)]">
        {t("helper")}
      </p>
    </div>
  );
}
