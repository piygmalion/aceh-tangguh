import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/supabase/public-env";
import { kabupatenIndexKeys } from "@/lib/irbi-by-kab";
import { bearerMatches } from "@/lib/security/bearer";
import { loadRegistry } from "@/lib/weather/service";
import { fetchBmkgForecast } from "@/lib/weather/bmkg";
import { fetchOpenMeteoForecast } from "@/lib/weather/open-meteo";
import { readFile } from "fs/promises";
import path from "path";
import { revalidateTag } from "next/cache";

type UpsertError = { message?: string; code?: string } | null;

export type WeatherForecastWriter = {
  from: (table: string) => {
    upsert: (row: Record<string, unknown>) => PromiseLike<{ error: UpsertError }>;
  };
};

/** Test seam. Production uses the service-role client and the real fetchers. */
export const weatherRefreshDeps = {
  loadRegistry,
  fetchBmkgForecast,
  fetchOpenMeteoForecast,
  createWriter(url: string, serviceKey: string): WeatherForecastWriter {
    const client = createClient(url, serviceKey);
    return {
      from(table: string) {
        return {
          upsert(row: Record<string, unknown>) {
            return client.from(table).upsert(row as never);
          },
        };
      },
    };
  },
  revalidateTag,
};

export const dynamic = "force-dynamic";
/** Hobby cap is 60s. The GitHub Action still builds the long snapshot. */
export const maxDuration = 60;

type IrbiKab = {
  kabupaten_kota?: string;
  kabupaten_kota_kode?: string;
  ir_cuaca_ekstrem?: number;
  kelas_cuaca_ekstrem?: string;
};

async function loadIrbiMap() {
  const file = path.join(process.cwd(), "public/fixtures/irbi-2025.json");
  const raw = await readFile(file, "utf8");
  const data = JSON.parse(raw) as { kabupaten_kota?: IrbiKab[] };
  const map = new Map<string, { ir: number; kelas: string }>();
  for (const kab of data.kabupaten_kota ?? []) {
    if (kab.ir_cuaca_ekstrem == null || !kab.kelas_cuaca_ekstrem) continue;
    const value = { ir: kab.ir_cuaca_ekstrem, kelas: kab.kelas_cuaca_ekstrem };
    for (const key of kabupatenIndexKeys(kab)) {
      if (!map.has(key)) map.set(key, value);
    }
  }
  return map;
}

export async function POST(request: Request) {
  const secret = process.env.WEATHER_CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  }
  if (!bearerMatches(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = supabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Supabase service key missing" }, { status: 503 });
  }

  const registry = await weatherRefreshDeps.loadRegistry();
  const irbiMap = await loadIrbiMap();
  const supabase = weatherRefreshDeps.createWriter(url, serviceKey);
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const providers = new Set<string>();
  let ok = 0;
  let failed = 0;

  for (const entry of registry) {
    let forecast = null;
    if (entry.adm4) {
      try {
        forecast = await weatherRefreshDeps.fetchBmkgForecast(entry);
      } catch {
        /* fallback */
      }
    }
    if (!forecast) {
      try {
        forecast = await weatherRefreshDeps.fetchOpenMeteoForecast(entry);
      } catch {
        /* skip */
      }
    }
    if (!forecast) continue;

    let irbi: { ir: number; kelas: string } | undefined;
    for (const key of kabupatenIndexKeys(forecast)) {
      irbi = irbiMap.get(key);
      if (irbi) break;
    }
    if (irbi) {
      forecast.ir_cuaca_ekstrem = irbi.ir;
      forecast.kelas_cuaca_ekstrem = irbi.kelas;
    }
    providers.add(forecast.source);

    const { error } = await supabase.from("weather_forecasts").upsert({
      kabupaten_kota: forecast.kabupaten_kota,
      adm4_code: forecast.adm4 ?? null,
      payload: forecast,
      source: forecast.source,
      fetched_at: forecast.fetched_at,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      failed += 1;
      console.error("weather_forecasts upsert failed", {
        kabupaten_kota: forecast.kabupaten_kota,
        code: error.code ?? null,
        message: error.message ?? null,
      });
    } else {
      ok++;
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  if (failed > 0) {
    return NextResponse.json(
      { ok: false, error: "upsert_failed", failed },
      { status: 502 },
    );
  }

  weatherRefreshDeps.revalidateTag("weather");

  return NextResponse.json({
    refreshed: ok,
    providers: Array.from(providers),
    expires_at: expiresAt,
  });
}
