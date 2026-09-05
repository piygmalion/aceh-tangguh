"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export function ReportLaporDropdown({ className = "" }: { className?: string }) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-full bg-accent px-3.5 py-2 text-sm font-semibold text-accent-foreground transition hover:bg-[var(--accent-hover)]"
      >
        {t("lapor")}
        <ChevronDown size={14} className={open ? "rotate-180 transition" : "transition"} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-[220px] rounded-xl border border-[var(--glass-border)] bg-[var(--bg-raised)] p-1 shadow-[var(--shadow-elevated)]">
          <Link
            href="/lapor/kejadian"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[var(--accent-dim)] hover:text-[var(--accent)]"
          >
            {t("laporKejadian")}
          </Link>
          <Link
            href="/lapor/penanganan"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2.5 text-sm hover:bg-[var(--accent-dim)] hover:text-[var(--accent)]"
          >
            {t("laporPenanganan")}
          </Link>
        </div>
      )}
    </div>
  );
}
