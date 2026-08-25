import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { kabupatenIndexKeys } from "@/lib/irbi-by-kab";
import { bearerMatches } from "@/lib/security/bearer";
import { loadRegistry } from "@/lib/weather/service";
import { fetchBmkgForecast } from "@/lib/weather/bmkg";
import { fetchOpenMeteoForecast } from "@/lib/weather/open-meteo";
import { readFile } from "fs/promises";
import path from "path";
import { revalidateTag } from "next/cache";

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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Supabase service key missing" }, { status: 503 });
  }

  const registry = await loadRegistry();
  const irbiMap = await loadIrbiMap();
  const supabase = createClient(url, serviceKey);
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const providers = new Set<string>();
  let ok = 0;

  for (const entry of registry) {
    let forecast = null;
    if (entry.adm4) {
      try {
        forecast = await fetchBmkgForecast(entry);
      } catch {
        /* fallback */
      }
    }
    if (!forecast) {
      try {
        forecast = await fetchOpenMeteoForecast(entry);
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

    await supabase.from("weather_forecasts").upsert({
      kabupaten_kota: forecast.kabupaten_kota,
      adm4_code: forecast.adm4 ?? null,
      payload: forecast,
      source: forecast.source,
      fetched_at: forecast.fetched_at,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    });
    ok++;
    await new Promise((r) => setTimeout(r, 200));
  }

  revalidateTag("weather");

  return NextResponse.json({
    refreshed: ok,
    providers: Array.from(providers),
    expires_at: expiresAt,
  });
}
