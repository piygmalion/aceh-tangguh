"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { navInteractiveClass } from "@/lib/nav-chrome";
import { cn } from "@/lib/utils";

/** Drawer pad 16 + this margin puts the rule on the label (x28). Text then sits at x44. */
const LAPOR_SUBROW_STYLE = {
  marginLeft: 12,
  paddingLeft: 15,
  minHeight: 44,
  borderLeft: "1px solid rgba(255,255,255,.24)",
} as const;

export function ReportLaporDropdown({
  className = "",
  active = false,
  surface = "default",
  shape = "pill",
}: {
  className?: string;
  active?: boolean;
  surface?: "default" | "brand";
  shape?: "pill" | "row";
}) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", shape === "row" && "w-full", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1 text-sm",
          shape === "row" && "w-full justify-start",
          navInteractiveClass({ active, open, shape, surface }),
        )}
        style={shape === "row" ? { minHeight: 44 } : undefined}
        onKeyDown={(event) => {
          if (shape !== "row") return;
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          setOpen((value) => !value);
        }}
      >
        {t("lapor")}
        <ChevronDown
          data-lapor-chevron
          size={14}
          className={cn("transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      {open && shape === "row" ? (
        <div data-lapor-accordion className="flex w-full flex-col">
          <Link
            href="/lapor/kejadian"
            data-lapor-subrow
            onClick={() => setOpen(false)}
            className="flex w-full items-center text-sm text-[var(--primary-fg)]"
            style={LAPOR_SUBROW_STYLE}
          >
            {t("laporKejadian")}
          </Link>
          <Link
            href="/lapor/penanganan"
            data-lapor-subrow
            onClick={() => setOpen(false)}
            className="flex w-full items-center text-sm text-[var(--primary-fg)]"
            style={LAPOR_SUBROW_STYLE}
          >
            {t("laporPenanganan")}
          </Link>
        </div>
      ) : null}
      {open && shape !== "row" ? (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-[220px] rounded-xl border border-[var(--glass-border)] bg-[var(--bg-raised)] p-1 shadow-[var(--shadow-elevated)]">
          <Link
            href="/lapor/kejadian"
            onClick={() => setOpen(false)}
            className={cn("block", navInteractiveClass({ shape: "row" }))}
          >
            {t("laporKejadian")}
          </Link>
          <Link
            href="/lapor/penanganan"
            onClick={() => setOpen(false)}
            className={cn("block", navInteractiveClass({ shape: "row" }))}
          >
            {t("laporPenanganan")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
