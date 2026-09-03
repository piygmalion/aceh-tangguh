import { unstable_cache } from "next/cache";
import {
  TATONAS_DT_DATA_PATH,
  TATONAS_HOME,
  TATONAS_ORIGIN,
  TATONAS_SERVER_TIME_PATH,
  type TatonasDtData,
} from "./types";
import { extractDashboardSigningKey, signTatonasPath } from "./parse";

const UA =
  "AcehTangguh/0.1 (+https://github.com/piygmalion/aceh-tangguh; Tatonas hidrologi Aceh)";

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    Accept: "application/json, text/html",
    "User-Agent": UA,
    Referer: TATONAS_HOME,
    ...extra,
  };
}

async function fetchText(url: string, extra?: Record<string, string>): Promise<string> {
  const res = await fetch(url, {
    headers: headers(extra),
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Tatonas ${url} ${res.status}`);
  return res.text();
}

async function loadSigningKey(): Promise<string> {
  const fromEnv = process.env.TATONAS_SIGNING_KEY?.trim();
  if (fromEnv) return fromEnv;
  const html = await fetchText(TATONAS_HOME, { Accept: "text/html" });
  const key = extractDashboardSigningKey(html);
  if (!key) throw new Error("Tatonas dashboard signing key not found");
  return key;
}

const getCachedSigningKey = unstable_cache(loadSigningKey, ["tatonas-dashboard-key"], {
  revalidate: 3600,
  tags: ["tatonas-key"],
});

async function serverTimeOffset(): Promise<number> {
  const raw = await fetchText(`${TATONAS_ORIGIN}${TATONAS_SERVER_TIME_PATH}`);
  const data = JSON.parse(raw) as { time?: number };
  if (typeof data.time !== "number" || !Number.isFinite(data.time)) {
    throw new Error("Tatonas server-time missing");
  }
  return data.time - Math.floor(Date.now() / 1000);
}

async function fetchSignedDtData(secret: string, offset: number): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000) + offset;
  const signature = signTatonasPath(TATONAS_DT_DATA_PATH, timestamp, secret);
  return fetchText(`${TATONAS_ORIGIN}${TATONAS_DT_DATA_PATH}`, {
    Accept: "application/json",
    "X-Signature": signature,
    "X-Timestamp": String(timestamp),
  });
}

export async function fetchTatonasDtData(): Promise<TatonasDtData> {
  const [secret, offset] = await Promise.all([getCachedSigningKey(), serverTimeOffset()]);
  let raw: string;
  try {
    raw = await fetchSignedDtData(secret, offset);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("403")) throw err;
    raw = await fetchSignedDtData(secret, await serverTimeOffset());
  }
  const data = JSON.parse(raw) as TatonasDtData;
  if (!data || typeof data !== "object" || !data.plantData) {
    throw new Error("Tatonas dt_data missing plantData");
  }
  return data;
}
