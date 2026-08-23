"use client";

import { useTranslations } from "next-intl";

export function StaticPreviewBanner() {
  const t = useTranslations("staticPreview");
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-3 z-[60] flex justify-center px-3"
      role="status"
    >
      <p className="pointer-events-auto max-w-3xl rounded-full border border-[var(--glass-border)] bg-[var(--bg-raised)]/95 px-3.5 py-1.5 text-center text-[0.7rem] text-[var(--text-dim)] shadow-[var(--shadow)] backdrop-blur-md sm:text-xs">
        {t("banner")}
      </p>
    </div>
  );
}
