"use client";

import { useState } from "react";
import { Plus, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export function ReportFAB() {
  const t = useTranslations("map");
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute bottom-[5.75rem] right-3 z-30 sm:bottom-6 md:right-[22rem]">
      {open && (
        <div className="mb-2 rounded-xl border border-[var(--glass-border)] bg-[var(--bg-raised)] p-1 shadow-[var(--shadow-elevated)]">
          <Link
            href="/lapor/kejadian"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-[var(--accent-dim)]"
          >
            {t("reportKejadian")}
          </Link>
          <Link
            href="/lapor/penanganan"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm hover:bg-[var(--accent-dim)]"
          >
            {t("reportPenanganan")}
          </Link>
        </div>
      )}
      <button
        type="button"
        aria-label={t("reportFab")}
        onClick={() => setOpen((v) => !v)}
        className="group inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-3.5 text-sm font-semibold text-[var(--accent-fg)] shadow-[var(--shadow-elevated)] ring-2 ring-[var(--accent-dim)] transition duration-200 hover:bg-[var(--accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] active:scale-[0.98]"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-white/15 transition group-hover:bg-white/25">
          {open ? <ChevronDown size={16} /> : <Plus size={16} strokeWidth={2.5} />}
        </span>
        <span className="pr-0.5">{t("reportFab")}</span>
      </button>
    </div>
  );
}
