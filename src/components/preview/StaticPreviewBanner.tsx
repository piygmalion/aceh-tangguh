"use client";

import { useTranslations } from "next-intl";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

export function StaticPreviewBanner() {
  const t = useTranslations("staticPreview");
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-3 z-[60] flex justify-center px-3"
      role="status"
    >
      <p className={cn("pointer-events-auto max-w-3xl rounded-full border border-[var(--glass-border)] bg-[var(--bg-raised)]/95 px-3.5 py-1.5 text-center text-[var(--text-dim)] shadow-[var(--shadow)] backdrop-blur-md", TYPE_FLOOR_CLASS)}>
        {t("banner")}
      </p>
    </div>
  );
}
