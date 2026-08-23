"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export function ReportFAB() {
  const t = useTranslations("map");
  return (
    <Link
      href="/lapor"
      aria-label={t("reportFab")}
      className="group absolute bottom-[5.75rem] right-3 z-30 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-3.5 text-sm font-semibold text-white shadow-[var(--shadow-elevated)] ring-2 ring-white/20 transition duration-200 hover:bg-[var(--accent-hover)] hover:shadow-[0_16px_40px_rgba(46,158,78,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] active:scale-[0.98] sm:bottom-6 md:right-[22rem]"
    >
      <span className="grid h-6 w-6 place-items-center rounded-full bg-white/15 transition group-hover:bg-white/25">
        <Plus size={16} strokeWidth={2.5} />
      </span>
      <span className="pr-0.5">{t("reportFab")}</span>
    </Link>
  );
}
