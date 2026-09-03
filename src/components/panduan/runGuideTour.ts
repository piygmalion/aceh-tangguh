import type { GuideHref } from "@/lib/panduan/types";

const QUEUE_KEY = "panduan:pendingTour";

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function highlightTourTarget(elementId: string): void {
  if (typeof document === "undefined") return;
  const el = document.getElementById(elementId);
  if (!el) return;
  el.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "center",
  });
  el.classList.add("panduan-tour-highlight");
  window.setTimeout(() => {
    el.classList.remove("panduan-tour-highlight");
  }, 1200);
}

export function queueTourTarget(href: GuideHref, hash?: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(QUEUE_KEY, JSON.stringify({ href, hash }));
}

export function consumeQueuedTour(pathname: string): { hash?: string } | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(QUEUE_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { href?: string; hash?: string };
    if (data.href !== pathname) return null;
    sessionStorage.removeItem(QUEUE_KEY);
    return { hash: data.hash };
  } catch {
    sessionStorage.removeItem(QUEUE_KEY);
    return null;
  }
}
