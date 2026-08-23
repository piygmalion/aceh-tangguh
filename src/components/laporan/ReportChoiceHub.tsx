"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { ShimmerButton } from "@/components/ui/shimmer-button";

export function ReportChoiceHub() {
  const t = useTranslations("laporHub");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-2 text-sm text-[var(--text-dim)]">{t("subtitle")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/lapor/kejadian"
          className="rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-raised)] p-6 transition hover:border-[var(--accent)]"
        >
          <h2 className="text-lg font-semibold">{t("kejadianTitle")}</h2>
          <p className="mt-2 text-sm text-[var(--text-dim)]">{t("kejadianBody")}</p>
          <div className="mt-4">
            <ShimmerButton background="rgba(46, 158, 78, 1)" shimmerColor="#e8ffe8">
              <span className="text-sm font-semibold">{t("kejadianCta")}</span>
            </ShimmerButton>
          </div>
        </Link>
        <Link
          href="/lapor/penanganan"
          className="rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-raised)] p-6 transition hover:border-[var(--accent)]"
        >
          <h2 className="text-lg font-semibold">{t("penangananTitle")}</h2>
          <p className="mt-2 text-sm text-[var(--text-dim)]">{t("penangananBody")}</p>
          <div className="mt-4">
            <span className="inline-flex rounded-full border border-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--accent)]">
              {t("penangananCta")}
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
