import type { FeatureCollection } from "geojson";
import {
  AREA_LAYER_FILES,
  AREA_LAYER_LEGENDS,
  isAreaLayerKey,
} from "@/lib/area-layers";
import { filterAndPaginateKejadian } from "@/lib/kejadian-query";
import type { KejadianFixture, KejadianQuery } from "@/lib/kejadian-types";
import {
  asPrrpkaAcehFixture,
  asPrrpkaRingkasan,
  buildPrrpkaSummary,
} from "@/lib/prrpka-types";
import type { LegendModel } from "@/lib/types";
import { isStaticExport, withBasePath } from "./env";
import { HAZARD_STATUS_FALLBACK, LIVE_STATS_FALLBACK } from "./fallbacks";

const STATIC_UNAVAILABLE = {
  error: "not_available_on_static_preview",
  message:
    "This action needs the Next.js server (API routes). It is not available on the GitHub Pages static preview.",
};

function parseInput(input: string): { pathname: string; searchParams: URLSearchParams } {
  const url = input.startsWith("http://") || input.startsWith("https://")
    ? new URL(input)
    : new URL(input, "https://preview.local");
  return { pathname: url.pathname, searchParams: url.searchParams };
}

async function fetchJson(path: string): Promise<unknown> {
  const res = await fetch(withBasePath(path));
  if (!res.ok) {
    throw new Error(`Failed to load ${path} (${res.status})`);
  }
  return res.json();
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function filterMarkersByKeys(
  fc: FeatureCollection,
  keys: string[]
): FeatureCollection {
  if (keys.length === 0) return fc;
  const set = new Set(keys);
  return {
    type: "FeatureCollection",
    features: fc.features.filter((f) =>
      set.has(String(f.properties?.layer ?? ""))
    ),
  };
}

async function loadAreaLayer(key: string): Promise<Response> {
  if (!isAreaLayerKey(key)) {
    return jsonResponse({ error: "Unknown area layer" }, 404);
  }
  const file = AREA_LAYER_FILES[key];
  const fc = (await fetchJson(`/fixtures/areas/${file}`)) as FeatureCollection;
  let legend: LegendModel = AREA_LAYER_LEGENDS[key];
  try {
    legend = (await fetchJson(`/fixtures/areas/${key}.legend.json`)) as LegendModel;
  } catch {
    // keep baked-in legend
  }
  return jsonResponse({
    type: "FeatureCollection",
    features: fc.features,
    legend,
  });
}

async function resolveStaticGet(input: string): Promise<Response> {
  const { pathname, searchParams } = parseInput(input);
  const path = pathname.replace(/\/$/, "") || "/";

  if (path === "/api/stats/live") {
    return jsonResponse({ ...LIVE_STATS_FALLBACK, source: "fallback" });
  }
  if (path === "/api/hazards") {
    return jsonResponse(HAZARD_STATUS_FALLBACK);
  }
  if (path === "/api/prrpka/summary" || path === "/api/r3p/summary") {
    const [acehRaw, ringkasanRaw] = await Promise.all([
      fetchJson("/fixtures/prrpka_aceh.json"),
      fetchJson("/fixtures/prrpka_ringkasan.json"),
    ]);
    const aceh = asPrrpkaAcehFixture(acehRaw);
    const ringkasan = asPrrpkaRingkasan(ringkasanRaw);
    if (!aceh || !ringkasan) {
      return jsonResponse({ error: "Invalid PRRPKA fixtures" }, 500);
    }
    return jsonResponse(buildPrrpkaSummary(aceh, ringkasan));
  }
  if (path === "/api/dibi/aceh") {
    const data = (await fetchJson("/fixtures/dibi-aceh.json")) as Record<
      string,
      unknown
    >;
    return jsonResponse({ ...data, source: "fixture" });
  }
  if (path === "/api/weather") {
    return jsonResponse(await fetchJson("/fixtures/weather-snapshot.json"));
  }
  if (path === "/api/irbi") {
    const data = (await fetchJson("/fixtures/irbi-2025.json")) as Record<
      string,
      unknown
    >;
    return jsonResponse({ ...data, source: "fixture" });
  }
  if (path === "/api/layers/markers") {
    const fc = (await fetchJson("/fixtures/markers.geojson")) as FeatureCollection;
    const keysParam = searchParams.get("keys");
    const keys = keysParam
      ? keysParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const filtered = keys.length ? filterMarkersByKeys(fc, keys) : fc;
    return jsonResponse({ ...filtered, source: "fixture" });
  }
  if (path.startsWith("/api/layers/areas/")) {
    const key = path.slice("/api/layers/areas/".length);
    return loadAreaLayer(key);
  }
  if (path === "/api/kejadian") {
    const fixture = (await fetchJson(
      "/fixtures/kejadian-bencana.json"
    )) as KejadianFixture;
    const query: KejadianQuery = {
      q: searchParams.get("q") ?? undefined,
      jenis: searchParams.get("jenis") ?? undefined,
      kabupaten: searchParams.get("kabupaten") ?? undefined,
      kecamatan: searchParams.get("kecamatan") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      page: Number(searchParams.get("page") ?? "1"),
      pageSize: Number(searchParams.get("pageSize") ?? "10"),
    };
    return jsonResponse(filterAndPaginateKejadian(fixture, query, "fixture"));
  }
  if (path === "/api/anggaran") {
    const [analisis, kegiatanFile] = await Promise.all([
      fetchJson("/fixtures/analisis-anggaran-2026.json"),
      fetchJson("/fixtures/kegiatan-penanganan-2026.json") as Promise<{
        kegiatan?: unknown[];
      }>,
    ]);
    return jsonResponse({
      analisis,
      kegiatan: kegiatanFile.kegiatan ?? [],
      source: "fixture",
    });
  }
  if (path === "/api/publikasi") {
    const data = (await fetchJson("/fixtures/publikasi-btt.json")) as {
      metadata: Record<string, unknown>;
      publikasi?: Array<Record<string, unknown>>;
    };
    const slug = searchParams.get("slug")?.trim();
    const items = Array.isArray(data.publikasi) ? data.publikasi : [];
    if (slug) {
      const item = items.find((p) => p.slug === slug);
      if (!item) return jsonResponse({ error: "not_found", slug }, 404);
      return jsonResponse({ metadata: data.metadata, item, source: "fixture" });
    }
    const sorted = [...items].sort((a, b) =>
      String(b.published_at ?? "").localeCompare(String(a.published_at ?? ""))
    );
    const publikasi = sorted.map((item) => {
      const copy = { ...item };
      delete copy.html_content;
      delete copy.mdx_bundle;
      delete copy.json_ld;
      return copy;
    });
    const tags = Array.from(
      new Set(items.flatMap((item) => (item.tags as string[] | undefined) ?? []))
    ).sort((a, b) => a.localeCompare(b));
    return jsonResponse({
      metadata: data.metadata,
      publikasi,
      source: "fixture",
      tags,
    });
  }
  if (path.startsWith("/api/profil-desa")) {
    return jsonResponse({ error: "Not found" }, 404);
  }

  return jsonResponse(STATIC_UNAVAILABLE, 503);
}

/**
 * Drop-in `fetch` for public `/api/*` reads.
 * On the Node host this is a normal fetch.
 * On the static preview it maps GET requests to `public/fixtures` (with basePath).
 */
export async function fetchPublicApi(
  input: string,
  init?: RequestInit
): Promise<Response> {
  if (!isStaticExport()) {
    return fetch(input, init);
  }

  const method = (init?.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return jsonResponse(STATIC_UNAVAILABLE, 503);
  }

  try {
    return await resolveStaticGet(input);
  } catch (err) {
    const message = err instanceof Error ? err.message : "fixture load failed";
    return jsonResponse({ error: message }, 502);
  }
}
