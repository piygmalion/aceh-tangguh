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
        <div className="mb-2 glass rounded-xl border border-[var(--glass-border)] p-1 shadow-[var(--shadow-elevated)]">
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
        className="group inline-flex h-14 w-14 items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--accent)] text-[var(--accent-fg)] shadow-[var(--shadow-elevated)] transition duration-200 hover:bg-[var(--accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] active:scale-[0.98]"
      >
        {open ? <ChevronDown size={22} /> : <Plus size={22} strokeWidth={2.5} />}
      </button>
    </div>
  );
}
