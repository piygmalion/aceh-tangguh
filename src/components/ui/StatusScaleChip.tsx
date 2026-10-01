import type { LucideIcon } from "lucide-react";
import { AlertTriangle, ShieldCheck, TriangleAlert } from "lucide-react";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

export type StatusLevel = "aman" | "waspada" | "siaga" | "awas";

const ICON: Record<StatusLevel, LucideIcon> = {
  aman: ShieldCheck,
  waspada: AlertTriangle,
  siaga: AlertTriangle,
  awas: TriangleAlert,
};

const FILL: Record<StatusLevel, string> = {
  aman: "bg-[var(--status-aman)] text-[var(--map-status-aman-fg)]",
  waspada: "bg-[var(--status-waspada)] text-[var(--map-status-waspada-fg)]",
  siaga: "bg-[var(--status-siaga)] text-[var(--map-status-siaga-fg)]",
  awas: "bg-[var(--status-awas)] text-[var(--map-status-awas-fg)] shadow-[inset_4px_0_0_var(--status-awas-bar)]",
};

/** Hybrid status chip: icon, capital label, #111111 keyline. Awas keeps the side bar. */
export function StatusScaleChip({
  level,
  label,
  className,
}: {
  level: StatusLevel;
  label: string;
  className?: string;
}) {
  const Icon = ICON[level];
  return (
    <span
      data-status-level={level}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[var(--map-keyline)] px-2.5 py-1 font-semibold uppercase tracking-[0.06em]",
        TYPE_FLOOR_CLASS,
        FILL[level],
        className,
      )}
    >
      <Icon size={14} aria-hidden />
      {label}
    </span>
  );
}
