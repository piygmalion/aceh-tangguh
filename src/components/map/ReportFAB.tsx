"use client";

import { useLayoutEffect, useState } from "react";
import { Plus, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export function ReportFAB() {
  const t = useTranslations("map");
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    let resizeObs: ResizeObserver | null = null;
    const apply = () => {
      const stage = document.querySelector(".map-stage");
      const strip = stage?.querySelector(".maplibregl-ctrl-bottom-right");
      if (!stage || !strip) return;
      const height = Math.round(strip.getBoundingClientRect().height);
      if (height <= 0) return;
      document.documentElement.style.removeProperty("--map-credit-strip");
      if (stage instanceof HTMLElement) stage.style.setProperty("--map-credit-strip", `${height}px`);
      if (!resizeObs) {
        resizeObs = new ResizeObserver(apply);
        resizeObs.observe(strip);
      }
    };
    apply();
    const mutations = new MutationObserver(apply);
    const stage = document.querySelector(".map-stage");
    if (stage) mutations.observe(stage, { childList: true, subtree: true });
    window.addEventListener("resize", apply);
    return () => {
      resizeObs?.disconnect();
      mutations.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, []);

  return (
    <div className="absolute bottom-[calc(5.75rem+var(--map-credit-strip,44px)+8px+var(--map-safe-area-bottom,env(safe-area-inset-bottom,0px)))] right-3 z-30 md:bottom-6 md:right-[22rem]">
      {open && (
        <div className="mb-2 glass rounded-xl border border-[var(--glass-border)] p-1 shadow-[var(--shadow-elevated)]">
          <Link
            href="/lapor/kejadian"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-[var(--accent-dim)]"
          >
            {t("reportKejadian")}
          </Link>
          <Link
            href="/lapor/penanganan"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm hover:bg-[var(--accent-dim)]"
          >
            {t("reportPenanganan")}
          </Link>
        </div>
      )}
      <button
        type="button"
        aria-label={t("reportFab")}
        onClick={() => setOpen((v) => !v)}
        className="group inline-flex h-14 w-14 items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--accent)] text-[var(--accent-fg)] shadow-[var(--shadow-elevated)] transition duration-200 hover:bg-[var(--accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] active:scale-[0.98]"
      >
        {open ? <ChevronDown size={22} /> : <Plus size={22} strokeWidth={2.5} />}
      </button>
    </div>
  );
}
