import { readFile } from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import {
  emptyInovasiResponse,
  isInovasiResponse,
  type WeatherInovasiResponse,
} from "./types";

const FIXTURE = path.join(
  process.cwd(),
  "public/fixtures/weather-inovasi-snapshot.json",
);

export async function loadInovasiFixture(): Promise<WeatherInovasiResponse> {
  try {
    const raw = await readFile(FIXTURE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (isInovasiResponse(parsed)) return parsed;
  } catch {
    /* fall through */
  }
  return emptyInovasiResponse("unconfigured");
}

function markStale(body: WeatherInovasiResponse): WeatherInovasiResponse {
  return {
    ...body,
    metadata: { ...body.metadata, official: false, status: "stale" },
  };
}

export async function loadInovasiFromSupabase(): Promise<{
  body: WeatherInovasiResponse;
  expiresAt: string | null;
} | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) return null;

  const supabase = createClient(url, anon);
  const { data, error } = await supabase
    .from("weather_inovasi_snapshot")
    .select("payload, expires_at")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data?.payload) return null;
  if (!isInovasiResponse(data.payload)) return null;
  return {
    body: { ...data.payload, metadata: { ...data.payload.metadata, official: false } },
    expiresAt: typeof data.expires_at === "string" ? data.expires_at : null,
  };
}

export async function getWeatherInovasi(): Promise<{
  body: WeatherInovasiResponse;
  status: number;
}> {
  const cached = await loadInovasiFromSupabase();
  if (cached) {
    const expired =
      cached.expiresAt != null && Date.parse(cached.expiresAt) < Date.now();
    const body =
      expired && cached.body.kabupaten_kota.length > 0
        ? markStale(cached.body)
        : cached.body;
    if (expired && cached.body.kabupaten_kota.length === 0) {
      return { body: emptyInovasiResponse("unconfigured"), status: 200 };
    }
    return { body, status: 200 };
  }

  const fixture = await loadInovasiFixture();
  if (fixture.metadata.status === "unconfigured" || fixture.kabupaten_kota.length === 0) {
    return {
      body: {
        ...fixture,
        metadata: { ...fixture.metadata, official: false, status: "unconfigured" },
        kabupaten_kota: [],
      },
      status: 200,
    };
  }
  return { body: { ...fixture, metadata: { ...fixture.metadata, official: false } }, status: 200 };
}

export function inovasiHttpStatus(body: WeatherInovasiResponse): number {
  if (body.metadata.status === "upstream" && body.kabupaten_kota.length === 0) {
    return 503;
  }
  return 200;
}
