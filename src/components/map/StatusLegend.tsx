"use client";

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
export function StatusLegend({ className }: { className?: string }) {
  const t = useTranslations("map");
  return (
    <div
      data-status-legend
      className={cn(
        "pointer-events-auto rounded-xl border border-[var(--border)] bg-[var(--map-chrome)] p-3 text-[var(--text)] shadow-[var(--shadow)]",
        className,
      )}
    >
      <p className={cn("mb-2 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{t("statusLegend")}</p>
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
    </div>
  );
}
