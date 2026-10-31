import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SectionDensity = "compact" | "default" | "spacious";

/** Paper, raised, ink, and brand. Brand is the red field reserved for Lapor. */
export type SectionTone = "paper" | "raised" | "ink" | "brand";

/**
 * Shared beranda section. Rhythm comes from density, not from alternating
 * paper and raised fills. Raised sections carry a 1px top hairline.
 */
export function SectionShell({
  id,
  density = "default",
  tone,
  raised = false,
  ink = false,
  className,
  children,
}: {
  id?: string;
  density?: SectionDensity;
  tone?: SectionTone;
  raised?: boolean;
  ink?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const resolved: SectionTone = tone ?? (ink ? "ink" : raised ? "raised" : "paper");

  return (
    <section
      id={id}
      data-section-density={density}
      data-section-tone={resolved}
      data-ink-field={resolved === "ink" ? "" : undefined}
      className={cn(
        "scroll-mt-24 px-4",
        density === "compact" && "section-y-compact",
        density === "default" && "section-y",
        density === "spacious" && "section-y-spacious",
        resolved === "paper" && "bg-[var(--surface-paper)]",
        resolved === "raised" && "section-raised bg-[var(--surface-raised)]",
        resolved === "ink" && "bg-[var(--surface-ink)] text-[var(--putih)]",
        resolved === "brand" && "bg-[var(--surface-brand)] text-[var(--primary-fg)]",
        className,
      )}
    >
      {children}
    </section>
  );
}
