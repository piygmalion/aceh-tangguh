"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/Chip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { qk } from "@/lib/qk";
import { TYPE_FLOOR_CLASS, TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";
import type { WeatherInovasiResponse } from "@/lib/weather-inovasi/types";

async function fetchInovasi(): Promise<{
  status: number;
  body: WeatherInovasiResponse;
}> {
  const res = await fetchPublicApi("/api/weather/inovasi");
  const body = (await res.json()) as WeatherInovasiResponse;
  return { status: res.status, body };
}

function isUsable(
  data: { status: number; body: WeatherInovasiResponse } | undefined,
): data is { status: number; body: WeatherInovasiResponse } {
  if (!data || data.status !== 200) return false;
  const { body } = data;
  if (body.metadata?.official !== false) return false;
  if (body.metadata.status === "unconfigured") return false;
  return body.kabupaten_kota.length > 0;
}

export function WeatherInovasiStrip() {
  const t = useTranslations("weatherInovasi");
  const { data, isLoading } = useQuery({
    queryKey: qk.weatherInovasi,
    queryFn: fetchInovasi,
    staleTime: 15 * 60_000,
    refetchInterval: 15 * 60_000,
  });

  const usable = isUsable(data);
  const points = usable ? data.body.kabupaten_kota : [];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="accent"
          size="sm"
          aria-label={t("triggerAria")}
          className="rounded-full"
        >
          {t("trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-[var(--glass-border)] bg-[var(--bg-raised)] p-6 text-[var(--text)] sm:max-w-2xl">
        <div className="flex flex-col gap-4">
          <DialogHeader className="flex flex-col gap-2 space-y-0 text-left sm:flex-row sm:items-start sm:justify-between">
            <DialogTitle className={cn("pr-8 text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
              {t("title")}
            </DialogTitle>
            <Chip tone="warn" className="shrink-0">
              {t("pill")}
            </Chip>
          </DialogHeader>
          <DialogDescription className={cn("text-left text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
            {t("lead")}
          </DialogDescription>
          {isLoading || !usable ? (
            <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{t("delayed")}</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {points.map((row) => (
                <li
                  key={row.slug}
                  className="flex flex-col gap-0.5 rounded-lg border border-[var(--glass-border)] bg-[var(--bg-muted)]/40 px-3 py-2"
                >
                  <p className={cn("font-medium text-[var(--text)]", TYPE_FLOOR_CLASS)}>
                    {row.kabupaten_kota}
                  </p>
                  <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                    {row.temperature_c != null ? `${row.temperature_c}°` : "—"}
                    <span aria-hidden> · </span>
                    {row.precipitation_mm != null ? `${row.precipitation_mm} mm` : "—"}
                    <span aria-hidden> · </span>
                    {row.wind_speed_kmh != null ? `${row.wind_speed_kmh} km/j` : "—"}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{t("attribution")}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
