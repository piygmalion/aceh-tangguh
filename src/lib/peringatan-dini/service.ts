import { getWeatherForecasts } from "@/lib/weather/service";
import {
  CUACA_HREF,
  type CuacaWarningCard,
  type PeringatanDiniResponse,
} from "@/lib/peringatan-dini-types";
import { getTatonasPeringatan } from "@/lib/tatonas/service";
import { emptyTatonasCard } from "@/lib/tatonas/parse";
import { summarizeWeatherWarning } from "./weather-summary";
import { getMagmaPeringatan } from "./magma";
import { getSipongiPeringatan } from "./sipongi";

async function getCuacaPeringatan(): Promise<CuacaWarningCard> {
  const weather = await getWeatherForecasts();
  return summarizeWeatherWarning(weather, CUACA_HREF);
}

export async function getPeringatanDini(): Promise<PeringatanDiniResponse> {
  const [cuaca, magma, sipongi, tatonas] = await Promise.all([
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
    getTatonasPeringatan().catch((err) => {
      console.error("[peringatan-dini/tatonas]", err);
      return emptyTatonasCard({ source: "unavailable" });
    }),
  ]);

  return { cuaca, magma, sipongi, tatonas };
}

export { getCuacaPeringatan, getMagmaPeringatan, getSipongiPeringatan, getTatonasPeringatan };
