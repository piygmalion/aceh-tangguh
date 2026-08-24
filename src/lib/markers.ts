import { readFile } from "fs/promises";
import path from "path";
import type { Feature, FeatureCollection, Point } from "geojson";
import {
  asRecord,
  fetchAllRows,
  readDocumentPayload,
  trySupabaseThenFixture,
  type DomainSource,
} from "./supabase/fallback";
import type { TypedSupabaseClient } from "./supabase/server";
import type { MarkerFeatureRow } from "./supabase/types";
import { expandMarkerLayerKeys } from "./map-url-aliases";
import { applyStatusVocabToProperties } from "./status-vocab";

export type MarkersResponse = FeatureCollection & {
  source: DomainSource;
};

let cache: FeatureCollection | null = null;

function featureFromRow(row: MarkerFeatureRow): Feature<Point> {
  const properties = { ...asRecord(row.properties) };
  if (properties.layer == null) properties.layer = row.layer;
  if (row.title != null && properties.title == null) properties.title = row.title;
  if (row.status != null && properties.status == null) {
    properties.status = row.status;
  }
  if (row.kabupaten != null && properties.kabupaten == null) {
    properties.kabupaten = row.kabupaten;
  }
  return {
    type: "Feature",
    id: row.id,
    geometry: {
      type: "Point",
      coordinates: [row.longitude, row.latitude],
    },
    properties: applyStatusVocabToProperties(properties),
  };
}

function asFeatureCollection(payload: unknown): FeatureCollection | null {
  const rec = asRecord(payload);
  if (rec.type !== "FeatureCollection" || !Array.isArray(rec.features)) {
    return null;
  }
  if (rec.features.length === 0) return null;
  return normalizeMarkerCollection(rec as unknown as FeatureCollection);
}

function normalizeMarkerCollection(fc: FeatureCollection): FeatureCollection {
  return {
    ...fc,
    features: fc.features.map((f) => ({
      ...f,
      properties: applyStatusVocabToProperties(asRecord(f.properties)),
    })),
  };
}

async function loadMarkersFromSupabase(
  client: TypedSupabaseClient
): Promise<FeatureCollection | null> {
  const rows = await fetchAllRows<MarkerFeatureRow>((from, to) =>
    client.from("marker_features").select("*").range(from, to)
  );
  if (rows.length > 0) {
    return {
      type: "FeatureCollection",
      features: rows.map(featureFromRow),
    };
  }

  const snapshot = await readDocumentPayload(client, "data_documents", [
    "markers",
    "marker_features",
    "markers.geojson",
  ]);
  return asFeatureCollection(snapshot);
}

export async function loadMarkersFixture(): Promise<FeatureCollection> {
  if (cache) return cache;
  const file = path.join(process.cwd(), "public/fixtures/markers.geojson");
  const raw = await readFile(file, "utf8");
  cache = JSON.parse(raw) as FeatureCollection;
  return cache;
}

export async function loadMarkers(): Promise<MarkersResponse> {
  const loaded = await trySupabaseThenFixture(
    loadMarkersFromSupabase,
    loadMarkersFixture,
    {
      label: "markers",
      isEmpty: (value) => !value.features?.length,
    }
  );
  const normalized = normalizeMarkerCollection({
    type: "FeatureCollection",
    features: loaded.data.features ?? [],
  });
  return {
    type: "FeatureCollection",
    features: normalized.features,
    source: loaded.source,
  };
}

export function filterMarkersByKeys(
  fc: FeatureCollection,
  keys: string[]
): FeatureCollection {
  if (keys.length === 0) return fc;
  const set = new Set<string>(expandMarkerLayerKeys(keys));
  return {
    type: "FeatureCollection",
    features: fc.features.filter((f) =>
      set.has(String(f.properties?.layer ?? ""))
    ),
  };
}
