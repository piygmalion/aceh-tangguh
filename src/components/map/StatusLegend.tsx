"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { StatusScaleChip, type StatusLevel } from "@/components/ui/StatusScaleChip";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

const LEVELS: StatusLevel[] = ["aman", "waspada", "siaga", "awas"];

const LABEL_KEY: Record<StatusLevel, "statusAman" | "statusWaspada" | "statusSiaga" | "statusAwas"> = {
  aman: "statusAman",
  waspada: "statusWaspada",
  siaga: "statusSiaga",
  awas: "statusAwas",
};

/** Map legend for the single hybrid status scale. Not a data-layer palette. */
export function StatusLegend({
  className,
  collapsible = false,
}: {
  className?: string;
  /** Phone legend starts as a chip. Desktop leaves this false. */
  collapsible?: boolean;
}) {
  const t = useTranslations("map");
  const [open, setOpen] = useState(false);
  const showBody = !collapsible || open;
  return (
    <div
      data-status-legend
      data-legend-collapsed={collapsible && !open ? "true" : "false"}
      className={cn(
        "pointer-events-auto rounded-xl border border-[var(--border)] bg-[var(--map-chrome)] text-[var(--text)] shadow-[var(--shadow)]",
        showBody ? "p-3" : "p-0",
        className,
        collapsible && !open && "w-max",
      )}
    >
      {collapsible ? (
        <button
          type="button"
          data-legend-toggle
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className={cn(
            "rounded-xl px-3 py-2 text-left font-semibold text-[var(--text)]",
            TYPE_FLOOR_CLASS,
          )}
        >
          {t("statusLegend")}
        </button>
      ) : (
        <p className={cn("mb-2 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{t("statusLegend")}</p>
      )}
      {showBody ? (
        <>
          <ul className="flex flex-col gap-1.5">
            {LEVELS.map((level) => (
              <li key={level}>
                <StatusScaleChip level={level} label={t(LABEL_KEY[level])} />
              </li>
            ))}
          </ul>
          <p className={cn("mt-2 max-w-[16rem] leading-snug text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
            {t("statusNote")}
          </p>
        </>
      ) : null}
    </div>
  );
}
