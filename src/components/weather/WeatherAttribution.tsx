"use client";

import { useTranslations } from "next-intl";

export function WeatherAttribution() {
  const t = useTranslations("weather");

  return (
    <p className="text-xs leading-relaxed text-[var(--text-dim)]">
      {t("attribution")}
    </p>
  );
}
