import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  neutral:
    "bg-[var(--bg-muted)] text-[var(--text)] border border-[var(--border)]",
  ok: "bg-[var(--primary-dim)] text-[var(--primary)] border border-transparent",
  warn: "bg-[var(--warn-dim)] text-[var(--warn)] border border-transparent",
  danger: "bg-[var(--danger-dim)] text-[var(--danger)] border border-transparent",
  info: "bg-[var(--info-dim)] text-[var(--info)] border border-transparent",
  /** CTA orange + ink — never white on #FF7722. */
  accent: "border-transparent bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]",
  glass:
    "glass-pill text-[var(--hero-fg)] border border-white/15",
} as const;

export function Chip({
  tone = "neutral",
  children,
  onClick,
  active,
  className = "",
}: {
  tone?: keyof typeof tones;
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition duration-200",
        tones[tone],
        active ? "ring-2 ring-[var(--ring)]" : "",
        onClick ? "hover:brightness-110 cursor-pointer" : "",
        className,
      )}
    >
      {children}
    </Comp>
  );
}
