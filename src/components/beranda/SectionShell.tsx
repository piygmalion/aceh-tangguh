import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SectionDensity = "compact" | "default" | "spacious";

/**
 * Shared beranda section. Rhythm comes from density, not from alternating
 * paper and raised fills. Raised sections carry a 1px top hairline.
 */
export function SectionShell({
  id,
  density = "default",
  raised = false,
  ink = false,
  className,
  children,
}: {
  id?: string;
  density?: SectionDensity;
  raised?: boolean;
  ink?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      data-section-density={density}
      data-ink-field={ink ? "" : undefined}
      className={cn(
        "scroll-mt-24 px-4",
        density === "compact" && "section-y-compact",
        density === "default" && "section-y",
        density === "spacious" && "section-y-spacious",
        raised && "section-raised bg-[var(--bg-raised)]",
        className,
      )}
    >
      {children}
    </section>
  );
}
