"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

function Clock() {
  const t = useTranslations("nav");
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const format = () =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date());
    setLabel(format());
    const id = window.setInterval(() => setLabel(format()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className="tabular-nums text-[var(--topbar-dim)]">
      {label ?? "––:––"} {t("emergencyClock")}
    </span>
  );
}

/**
 * Thin emergency strip above the red header.
 * Numbers: 112 (national emergency) and 117 (BNPB call centre) only.
 * Pusdalops stays “belum ada” until BPBA confirms a published number.
 */
export function EmergencyStrip() {
  const t = useTranslations("nav");

  return (
    <div
      data-emergency-strip
      className="flex h-[30px] items-center bg-[var(--topbar-bg)] text-[var(--topbar-fg)]"
    >
      <div
        className={cn(
          "mx-auto flex h-full w-full max-w-6xl items-center gap-x-4 overflow-x-auto px-3 whitespace-nowrap sm:px-4",
          TYPE_FLOOR_CLASS,
        )}
        aria-label={t("emergencyAria")}
      >
        <a href="tel:112" className="inline-flex items-baseline gap-1.5 font-semibold">
          <span>{t("emergency112")}</span>
          <span className="font-medium text-[var(--topbar-dim)]">{t("emergency112Label")}</span>
        </a>
        <a href="tel:117" className="inline-flex items-baseline gap-1.5 font-semibold">
          <span>{t("emergency117")}</span>
          <span className="font-medium text-[var(--topbar-dim)]">{t("emergency117Label")}</span>
        </a>
        <span className="inline-flex items-baseline gap-1.5">
          <span className="font-semibold">{t("emergencyPusdalops")}</span>
          <span className="text-[var(--topbar-dim)]">{t("emergencyMissing")}</span>
        </span>
        <span className="ml-auto">
          <Clock />
        </span>
      </div>
    </div>
  );
}
