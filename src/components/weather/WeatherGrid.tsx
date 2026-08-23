"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { qk } from "@/lib/qk";
import type { WeatherApiResponse } from "@/lib/weather-types";
import { WeatherKabCard } from "./WeatherKabCard";
import { WeatherAttribution } from "./WeatherAttribution";

async function fetchWeather(): Promise<WeatherApiResponse> {
  const res = await fetch("/api/weather");
  if (!res.ok) throw new Error("Failed to load weather");
  return res.json();
}

export function WeatherGrid() {
  const t = useTranslations("weather");
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.weather,
    queryFn: fetchWeather,
    staleTime: 15 * 60_000,
    refetchInterval: 15 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-44 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-[var(--text-dim)]">{t("error")}</p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--text-dim)]">
        {t("updated", {
          time: new Date(data.metadata.fetched_at).toLocaleString(),
        })}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.kabupaten_kota.map((forecast) => (
          <div key={forecast.slug} id={forecast.slug}>
            <WeatherKabCard forecast={forecast} />
          </div>
        ))}
      </div>
      <WeatherAttribution />
    </div>
  );
}
