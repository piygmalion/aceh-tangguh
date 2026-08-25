import { getWeatherForecasts } from "@/lib/weather/service";
import {
  CUACA_HREF,
  type CuacaWarningCard,
  type PeringatanDiniResponse,
} from "@/lib/peringatan-dini-types";
import { summarizeWeatherWarning } from "./weather-summary";
import { getMagmaPeringatan } from "./magma";
import { getSipongiPeringatan } from "./sipongi";

async function getCuacaPeringatan(): Promise<CuacaWarningCard> {
  const weather = await getWeatherForecasts();
  return summarizeWeatherWarning(weather, CUACA_HREF);
}

export async function getPeringatanDini(): Promise<PeringatanDiniResponse> {
  const [cuaca, magma, sipongi] = await Promise.all([
    getCuacaPeringatan().catch((err): CuacaWarningCard => {
      console.error("[peringatan-dini/cuaca]", err);
      return {
        kind: "cuaca",
        tone: "neutral",
        empty: true,
        highlights: [],
        extra_count: 0,
        fetched_at: new Date().toISOString(),
        providers: [],
        href: CUACA_HREF,
        stale: true,
        source: "fixture",
      };
    }),
    getMagmaPeringatan(),
    getSipongiPeringatan(),
  ]);

  return { cuaca, magma, sipongi };
}

export { getCuacaPeringatan, getMagmaPeringatan, getSipongiPeringatan };
