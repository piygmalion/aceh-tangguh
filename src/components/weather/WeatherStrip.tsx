"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { qk } from "@/lib/qk";
import type { WeatherApiResponse } from "@/lib/weather-types";
import { WeatherIcon } from "./WeatherIcon";

async function fetchWeather(): Promise<WeatherApiResponse> {
  const res = await fetch("/api/weather");
  if (!res.ok) throw new Error("Failed to load weather");
  return res.json();
}

export function WeatherStrip() {
  const t = useTranslations("weather");
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.weather,
    queryFn: fetchWeather,
    staleTime: 15 * 60_000,
    refetchInterval: 15 * 60_000,
  });

  const highlights = data?.kabupaten_kota
    ? [...data.kabupaten_kota]
        .sort((a, b) => b.current.precipitation_mm - a.current.precipitation_mm)
        .slice(0, 6)
    : [];

  return (
    <section
      className="border-y border-[var(--glass-border)] bg-[var(--bg-raised)]/60 px-4 py-5 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-dim)]">
              {t("stripTitle")}
            </h2>
            {data?.metadata.fetched_at && (
              <p className="mt-1 text-xs text-[var(--text-dim)]">
                {t("updated", {
                  time: new Date(data.metadata.fetched_at).toLocaleString(),
                })}
              </p>
            )}
          </div>
          <Link
            href="/cuaca"
            className="text-sm font-medium text-[var(--accent)] hover:underline"
          >
            {t("seeAll")}
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <span
                  key={i}
                  className="skeleton h-10 w-36 rounded-full"
                  aria-hidden
                />
              ))
            : null}
          {isError ? (
            <span className="text-sm text-[var(--text-dim)]">{t("error")}</span>
          ) : (
            highlights.map((kab) => (
              <Link
                key={kab.slug}
                href={{ pathname: "/cuaca", hash: kab.slug }}
                className="flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--bg)]/80 px-3 py-2 text-sm transition hover:ring-1 hover:ring-[var(--accent)]"
              >
                <WeatherIcon code={kab.current.weather_code} className="h-4 w-4" />
                <span className="font-medium">{kab.kabupaten_kota}</span>
                <span className="tabular-nums text-[var(--text-dim)]">
                  {Math.round(kab.current.temperature_c)}°C
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
