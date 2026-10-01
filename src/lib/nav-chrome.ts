import { cn } from "@/lib/utils";

export const NAV_ACCENT_HOVER =
  "hover:bg-[var(--accent-dim)] hover:text-[var(--accent)] focus-visible:bg-[var(--accent-dim)] focus-visible:text-[var(--accent)] active:text-[var(--accent-pressed)]";

export const NAV_ACCENT_MARKED = "bg-[var(--accent-dim)] font-medium text-[var(--accent)]";

export const NAV_UTILITY_HOVER =
  "hover:border-[var(--accent)] hover:bg-[var(--accent-dim)] hover:text-[var(--accent)] focus-visible:border-[var(--accent)] focus-visible:bg-[var(--accent-dim)] focus-visible:text-[var(--accent)] active:text-[var(--accent-pressed)]";

export function navInteractiveClass({
  active = false,
  open = false,
  shape = "pill",
  surface = "default",
}: {
  active?: boolean;
  open?: boolean;
  shape?: "pill" | "row";
  /** White type on the red header. Dropdown rows stay on the default surface. */
  surface?: "default" | "brand";
} = {}) {
  const marked = active || open;
  const base =
    shape === "pill"
      ? "rounded-full px-3.5 py-2 transition duration-200"
      : "rounded-xl px-3 py-2.5 text-sm transition duration-200";
  if (surface === "brand") {
    return cn(
      base,
      marked
        ? "bg-[var(--accent)] font-medium text-[var(--accent-fg)]"
        : "text-[var(--primary-fg)] hover:bg-white/15",
    );
  }
  return cn(base, marked ? NAV_ACCENT_MARKED : cn("text-[var(--text-dim)]", NAV_ACCENT_HOVER));
}
