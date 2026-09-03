import { readFile } from "fs/promises";
import path from "path";
import { unstable_cache } from "next/cache";
import type { Feature, FeatureCollection, Point } from "geojson";
import { fetchTatonasDtData } from "./client";
import { cardFromStations, emptyTatonasCard, parseTatonasStations } from "./parse";
import type { TatonasCard, TatonasStation } from "./types";

function isTatonasCard(value: unknown): value is TatonasCard {
  if (!value || typeof value !== "object") return false;
  const rec = value as TatonasCard;
  return rec.kind === "tatonas" && Array.isArray(rec.highlights);
}

async function loadTatonasFixture(): Promise<TatonasCard> {
  const file = path.join(process.cwd(), "public/fixtures/peringatan-tatonas.json");
  const raw = await readFile(file, "utf8");
  const data: unknown = JSON.parse(raw);
  if (!isTatonasCard(data)) {
    return emptyTatonasCard({ source: "fixture", example: true });
  }
  return { ...data, stale: true, source: "fixture", tone: "neutral" };
}

async function fetchTatonasLive(): Promise<{ card: TatonasCard; stations: TatonasStation[] }> {
  const payload = await fetchTatonasDtData();
  const stations = parseTatonasStations(payload);
  return {
    stations,
    card: cardFromStations(stations, { source: "live" }),
  };
}

const getCachedTatonasLive = unstable_cache(
  fetchTatonasLive,
  ["peringatan-tatonas-aceh"],
  { revalidate: 600, tags: ["peringatan-tatonas"] },
);

export async function getTatonasPeringatan(): Promise<TatonasCard> {
  try {
    const live = await getCachedTatonasLive();
    return live.card;
  } catch (err) {
    console.error("[peringatan-dini/tatonas]", err);
    return loadTatonasFixture();
  }
}

export async function loadTatonasMarkerFeatures(): Promise<Feature<Point>[]> {
  try {
    const live = await getCachedTatonasLive();
    return live.stations
      .filter((s) => s.lat != null && s.lng != null)
      .map((s) => ({
        type: "Feature" as const,
        id: `tatonas-${s.kd_hardware}`,
        geometry: {
          type: "Point" as const,
          coordinates: [s.lng as number, s.lat as number],
        },
        properties: {
          layer: "tatonasStations",
          title: s.pos_name,
          jenis: s.logger_kind.toUpperCase(),
          value: s.primary?.value ?? undefined,
          satuan: s.primary?.satuan || undefined,
          level: s.level,
          project: s.project,
          source: "tatonas",
          status: s.level,
          time_local: s.time_local ?? undefined,
          stale: s.stale,
        },
      }));
  } catch (err) {
    console.error("[tatonas/markers]", err);
    return [];
  }
}

export async function mergeTatonasOverlays<T extends FeatureCollection>(
  fc: T,
): Promise<T> {
  const extras = await loadTatonasMarkerFeatures();
  if (extras.length === 0) return fc;
  const without = fc.features.filter(
    (f) => String(f.properties?.layer ?? "") !== "tatonasStations",
  );
  const existingIds = new Set(without.map((f) => String(f.id ?? "")));
  const merged = extras.filter((f) => !existingIds.has(String(f.id)));
  return { ...fc, features: [...without, ...merged] };
}
