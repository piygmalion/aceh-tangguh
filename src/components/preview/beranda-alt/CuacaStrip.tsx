"use client";

import { WeatherIcon } from "@/components/weather/WeatherIcon";
import type { WeatherForecastKab } from "@/lib/weather-types";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";
import { useCuaca } from "./data";
import { kapitalAwal } from "./format";
import { PanelSkeleton } from "./primitives";

const SEBARAN = [
  "banda-aceh",
  "aceh-besar",
  "aceh-utara",
  "aceh-selatan",
  "aceh-tengah",
  "simeulue",
] as const;

function pilihKab(list: WeatherForecastKab[]): WeatherForecastKab[] {
  const ranked = [...list].sort(
    (a, b) => (b.ir_cuaca_ekstrem ?? 0) - (a.ir_cuaca_ekstrem ?? 0),
  );
  if ((ranked[0]?.ir_cuaca_ekstrem ?? 0) > 0) return ranked.slice(0, 6);

  const bySlug = new Map(list.map((k) => [k.slug, k]));
  const picked = SEBARAN.map((slug) => bySlug.get(slug)).filter(
    (row): row is WeatherForecastKab => Boolean(row),
  );
  return picked.length >= 4 ? picked : list.slice(0, 6);
}

function toneKelas(kelas?: string): string {
  if (!kelas) return "text-[var(--text-dim)]";
  const k = kelas.toUpperCase();
  if (k.includes("TINGGI")) return "text-[var(--danger)]";
  if (k.includes("SEDANG") || k.includes("MEDIUM")) return "text-[var(--warn)]";
  return "text-[var(--info)]";
}

/**
 * Compact weather tape. Production uses a five-card carousel. This strip
 * shows six kabupaten at once so the page can be scanned without playback.
 */
export function CuacaStrip() {
  const { data, isLoading, isError } = useCuaca();
  const kab = data ? pilihKab(data.kabupaten_kota) : [];

  return (
    <section
      aria-label="Cuaca kabupaten"
      className="border-b border-[var(--border)] px-4 py-6"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-[0.9375rem] font-semibold">Cuaca kabupaten</h2>
          {data ? (
            <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
              {data.metadata.total_kabupaten_kota} wilayah, sumber BMKG
            </p>
          ) : null}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <PanelSkeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : null}

        {isError ? (
          <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
            Prakiraan cuaca belum bisa dimuat.
          </p>
        ) : null}

        {kab.length > 0 ? (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {kab.map((row) => (
              <li
                key={row.slug}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-3"
              >
                <p className="truncate text-[0.8125rem] font-medium">{row.kabupaten_kota}</p>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <span className="text-[1.5rem] font-semibold tabular-nums leading-none tracking-[-0.03em]">
                    {Math.round(row.current.temperature_c)}
                    <span className="text-[0.55em] font-medium opacity-65">°</span>
                  </span>
                  <WeatherIcon
                    code={row.current.weather_code}
                    className="h-5 w-5 shrink-0 text-[var(--info)]"
                  />
                </div>
                <p className={cn("mt-2 truncate text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                  {row.current.weather_desc_id}
                </p>
                {row.kelas_cuaca_ekstrem ? (
                  <p className={cn("mt-1 font-semibold", TYPE_FLOOR_CLASS, toneKelas(row.kelas_cuaca_ekstrem))}>
                    {kapitalAwal(row.kelas_cuaca_ekstrem)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
