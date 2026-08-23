"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Chip } from "@/components/ui/Chip";
import { GlassPanel } from "@/components/ui/GlassPanel";
import type { WeatherForecastKab } from "@/lib/weather-types";
import { WeatherIcon } from "./WeatherIcon";

function riskTone(kelas?: string): "danger" | "warn" | "neutral" {
  if (!kelas) return "neutral";
  const k = kelas.toUpperCase();
  if (k === "TINGGI" || k === "SANGAT TINGGI") return "danger";
  if (k === "SEDANG" || k === "MEDIUM") return "warn";
  return "neutral";
}

export function WeatherKabCard({ forecast }: { forecast: WeatherForecastKab }) {
  const t = useTranslations("weather");
  const locale = useLocale();
  const desc =
    locale === "en"
      ? forecast.current.weather_desc_en
      : forecast.current.weather_desc_id;

  return (
    <GlassPanel className="flex flex-col gap-3 p-4 transition hover:ring-1 hover:ring-[var(--accent)]/40">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold tracking-tight">
            {forecast.kabupaten_kota}
          </h3>
          <p className="text-sm text-[var(--text-dim)]">{desc}</p>
        </div>
        <WeatherIcon code={forecast.current.weather_code} className="h-6 w-6 shrink-0 text-[var(--accent)]" />
      </div>

      <div className="flex items-end gap-2">
        <span className="text-3xl font-semibold tabular-nums">
          {Math.round(forecast.current.temperature_c)}°
        </span>
        <span className="text-sm text-[var(--text-dim)]">
          {t("humidity")} {forecast.current.humidity_pct}%
        </span>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-[var(--text-dim)]">
        <span>
          {t("wind")} {Math.round(forecast.current.wind_speed_kmh)} km/h
        </span>
        {forecast.daily[0] && (
          <span>
            {t("rain")} {forecast.daily[0].precipitation_mm.toFixed(1)} mm
          </span>
        )}
      </div>

      {forecast.kelas_cuaca_ekstrem && (
        <Chip tone={riskTone(forecast.kelas_cuaca_ekstrem)} className="text-xs">
          {t("irbiRisk")}: {forecast.kelas_cuaca_ekstrem}
        </Chip>
      )}

      {forecast.daily.length > 0 && (
        <div className="mt-1 grid grid-cols-3 gap-2 border-t border-[var(--glass-border)] pt-3 text-center text-xs">
          {forecast.daily.slice(0, 3).map((day) => (
            <div key={day.date} className="flex flex-col gap-1">
              <span className="text-[var(--text-dim)]">
                {new Date(day.date).toLocaleDateString(locale, {
                  weekday: "short",
                })}
              </span>
              <WeatherIcon code={day.weather_code} className="mx-auto h-4 w-4" />
              <span className="tabular-nums">
                {Math.round(day.temp_max_c)}° / {Math.round(day.temp_min_c)}°
              </span>
            </div>
          ))}
        </div>
      )}
    </GlassPanel>
  );
}

export function WeatherKabCardLink({
  forecast,
}: {
  forecast: WeatherForecastKab;
}) {
  return (
    <Link href={{ pathname: "/cuaca", hash: forecast.slug }} className="block">
      <WeatherKabCard forecast={forecast} />
    </Link>
  );
}
