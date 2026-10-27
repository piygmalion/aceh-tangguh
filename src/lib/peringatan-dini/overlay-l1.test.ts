import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import type { Feature, Point } from "geojson";
import { overlayLiveExpiresAt, resolveOverlayLiveRead } from "@/lib/overlay-live";
import { MAGMA_HOME, unavailableMagmaCard } from "@/lib/peringatan-dini-types";

const ROOT = process.cwd();
const JUNE18_ID = "ROQ20260618170813";
const nowMs = Date.parse("2026-09-16T03:00:00.000Z");
const fetchedAt = "2026-09-16T03:00:00.000Z";

const GET_PD_MODULES = [
  "src/lib/peringatan-dini/service.ts",
  "src/lib/peringatan-dini/magma.ts",
  "src/lib/peringatan-dini/sipongi.ts",
  "src/lib/peringatan-dini/overlay-cards.ts",
  "src/lib/tatonas/service.ts",
  "src/app/api/peringatan-dini/route.ts",
  "src/app/api/peringatan-dini/magma/route.ts",
  "src/app/api/peringatan-dini/sipongi/route.ts",
  "src/app/api/peringatan-dini/tatonas/route.ts",
] as const;

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

function magmaFeature(overrides: Partial<Feature<Point>["properties"]> = {}): Feature<Point> {
  return {
    type: "Feature",
    id: `magma-${JUNE18_ID}`,
    geometry: { type: "Point", coordinates: [96.88, 4.77] },
    properties: {
      layer: "magmaQuakes",
      title: "Kabupaten Bener Meriah",
      magnitude: 2.7,
      magtype: "SR",
      datetime_wib: "2026-06-18 17:08:13",
      area: "Kabupaten Bener Meriah",
      koter: "Bener Meriah",
      mmi: "II-III Bener Meriah",
      merusak: 0,
      latlon_text: "4.77 LU 96.88 BT",
      nearest_volcano: "Bur Ni Telong (4 km)",
      occurred_at: "2026-06-18T10:08:13.000Z",
      href: MAGMA_HOME,
      ...overrides,
    },
  };
}

describe("AN-52 isolation: GET PD modules do not scrape overlay upstream", () => {
  it("does not load MAGMA homepage / Sipongi opsroom / dt_data from GET PD modules", () => {
    for (const rel of GET_PD_MODULES) {
      const src = read(rel);
      assert.doesNotMatch(src, /fetchMagmaLive|getMagmaPeringatanFromLive|MAGMA_HOMES/);
      assert.doesNotMatch(src, /fetchSipongiLive|SIPONGI_OPSROOM|opsroom\.sipongidata/);
      assert.doesNotMatch(src, /fetchTatonasLive|fetchTatonasDtData|dt_data/);
      assert.doesNotMatch(src, /magma\.esdm\.go\.id\/["'`]|magma\.vsi\.esdm\.go\.id/);
      assert.doesNotMatch(src, /refreshOverlayLive|syncCalonDariOverlay|overlay_calon_kejadian/);
      assert.doesNotMatch(src, /magmaVolcanoes/);
    }
  });

  it("keeps scrape + calon sync on overlay cron, not on GET PD route", () => {
    const cron = read("src/app/api/cron/overlay-live/route.ts");
    assert.match(cron, /refreshAllOverlayLive/);
    assert.match(cron, /revalidateTag\("peringatan-magma"\)/);
    assert.match(cron, /revalidateTag\("peringatan-sipongi"\)/);
    assert.match(cron, /revalidateTag\("peringatan-tatonas"\)/);
    assert.match(cron, /revalidateTag\("maritime-perairan"\)/);

    const pdGet = read("src/app/api/peringatan-dini/route.ts");
    assert.match(pdGet, /getPeringatanDini/);
    assert.doesNotMatch(pdGet, /refreshAllOverlayLive|fetchMagmaLive|fetchSipongiLive|fetchTatonasLive/);
  });

  it("wraps overlay SELECT with peringatan tags, not scrape", () => {
    const magma = read("src/lib/peringatan-dini/magma.ts");
    const sipongi = read("src/lib/peringatan-dini/sipongi.ts");
    const tatonas = read("src/lib/tatonas/service.ts");
    assert.match(magma, /readOverlayLiveForPd/);
    assert.match(magma, /peringatan-magma/);
    assert.match(sipongi, /readOverlayLiveForPd/);
    assert.match(sipongi, /peringatan-sipongi/);
    assert.match(tatonas, /readOverlayLiveForPd/);
    assert.match(tatonas, /peringatan-tatonas/);
    assert.doesNotMatch(magma, /unstable_cache\(\s*fetchMagmaLive/);
    assert.doesNotMatch(sipongi, /unstable_cache\(\s*fetchSipongiLive/);
    assert.doesNotMatch(tatonas, /unstable_cache\(\s*fetchTatonasLive/);
  });

  it("enriches MAGMA and Sipongi overlay properties on cron persist", () => {
    const src = read("src/lib/overlay-live.ts");
    const magmaFn = src.slice(src.indexOf("function magmaToPoint"), src.indexOf("function extractNamedArray"));
    assert.match(magmaFn, /datetime_wib/);
    assert.match(magmaFn, /area/);
    assert.match(magmaFn, /koter/);
    assert.match(magmaFn, /mmi/);
    assert.match(magmaFn, /merusak/);
    assert.match(magmaFn, /level/);
    const quakes = src.slice(
      src.indexOf("async function fetchMagmaQuakes"),
      src.indexOf("async function fetchMagmaVolcanoes"),
    );
    assert.match(quakes, /fetchMagmaQuakeRaws/);
    assert.doesNotMatch(quakes, /extractMarkersGempa/);
    assert.match(magmaFn, /magtype/);
    assert.match(magmaFn, /latlon_text/);
    assert.match(magmaFn, /occurred_at/);
    assert.doesNotMatch(magmaFn, /magmaVolcanoes/);

    const sipongiFn = src.slice(src.indexOf("async function fetchSipongiPoints"), src.indexOf("async function loadFixturePoints"));
    assert.match(sipongiFn, /desa/);
    assert.match(sipongiFn, /kecamatan/);
    assert.match(sipongiFn, /kabkota/);
    assert.match(sipongiFn, /confidence_level/);
  });
});

describe("AN-52 MAGMA / Sipongi / Tatonas cards from overlay L1", () => {
  it("maps L1 empty + ledger fail to MAGMA unavailable without event", async () => {
    const { magmaCardFromOverlayRead } = await import("./overlay-cards");
    const overlay = resolveOverlayLiveRead([], nowMs, { ok: false, feature_count: 0 });
    assert.equal(overlay.status, 503);
    const card = magmaCardFromOverlayRead(overlay, fetchedAt);
    assert.equal(card.source, "unavailable");
    assert.equal(card.stale, true);
    assert.equal(card.empty, true);
    assert.equal(card.event, null);
    assert.equal(JSON.stringify(card).includes(JUNE18_ID), false);
    assert.equal(JSON.stringify(card).includes("Bener Meriah"), false);
    assert.deepEqual(card, unavailableMagmaCard(fetchedAt));
  });

  it("maps L1 rows + ledger fail to MAGMA stale live cache from the row", async () => {
    const { magmaCardFromOverlayRead } = await import("./overlay-cards");
    const overlay = resolveOverlayLiveRead(
      [{ expires_at: overlayLiveExpiresAt("magmaQuakes", nowMs), feature: magmaFeature() }],
      nowMs,
      { ok: false, feature_count: 1 },
    );
    assert.equal(overlay.status, 200);
    assert.equal(overlay.body.stale, true);
    const card = magmaCardFromOverlayRead(overlay, fetchedAt);
    assert.equal(card.source, "live");
    assert.equal(card.stale, true);
    assert.equal(card.empty, false);
    assert.equal(card.event?.id, JUNE18_ID);
    assert.equal(card.event?.magnitude, 2.7);
    assert.equal(card.tone, "neutral");
    assert.match(card.event?.wilayah ?? "", /Bener Meriah/);
  });

  it("maps empty-ok ledger to live empty MAGMA without inventing magnitude", async () => {
    const { magmaCardFromOverlayRead } = await import("./overlay-cards");
    const overlay = resolveOverlayLiveRead([], nowMs, { ok: true, feature_count: 0 });
    assert.equal(overlay.status, 200);
    const card = magmaCardFromOverlayRead(overlay, fetchedAt);
    assert.equal(card.source, "live");
    assert.equal(card.stale, false);
    assert.equal(card.empty, true);
    assert.equal(card.event, null);
  });

  it("picks the latest MAGMA event, not the full overlay list", async () => {
    const { magmaCardFromOverlayRead } = await import("./overlay-cards");
    const older = magmaFeature();
    const newer: Feature<Point> = {
      type: "Feature",
      id: "magma-ROQ20260916010000",
      geometry: { type: "Point", coordinates: [95.32, 5.55] },
      properties: {
        layer: "magmaQuakes",
        title: "Banda Aceh",
        magnitude: 3.1,
        magtype: "SR",
        datetime_wib: "2026-09-16 08:00:00",
        area: "Banda Aceh",
        occurred_at: "2026-09-16T01:00:00.000Z",
      },
    };
    const overlay = resolveOverlayLiveRead(
      [
        { expires_at: overlayLiveExpiresAt("magmaQuakes", nowMs), feature: older },
        { expires_at: overlayLiveExpiresAt("magmaQuakes", nowMs), feature: newer },
      ],
      nowMs,
      { ok: true, feature_count: 2 },
    );
    const card = magmaCardFromOverlayRead(overlay, fetchedAt);
    assert.equal(card.stale, false);
    assert.equal(card.source, "live");
    assert.equal(card.event?.id, "ROQ20260916010000");
    assert.equal(card.event?.magnitude, 3.1);
  });

  it("does not invent MAGMA magnitude when the row omitted it", async () => {
    const { magmaCardFromOverlayRead } = await import("./overlay-cards");
    const overlay = resolveOverlayLiveRead(
      [
        {
          expires_at: overlayLiveExpiresAt("magmaQuakes", nowMs),
          feature: magmaFeature({ magnitude: undefined, magtype: undefined }),
        },
      ],
      nowMs,
      { ok: true, feature_count: 1 },
    );
    const card = magmaCardFromOverlayRead(overlay, fetchedAt);
    assert.equal(card.event?.magnitude, null);
    assert.equal(card.event?.magnitude_text, "—");
  });

  it("maps Sipongi 503-equivalent to unavailable empty points, not fixture", async () => {
    const { sipongiCardFromOverlayRead } = await import("./overlay-cards");
    const overlay = resolveOverlayLiveRead([], nowMs, { ok: false, feature_count: 0 });
    const card = sipongiCardFromOverlayRead(overlay, fetchedAt);
    assert.equal(card.source, "unavailable");
    assert.equal(card.stale, true);
    assert.deepEqual(card.points, []);
    assert.equal(card.empty, true);
    assert.notEqual(card.source, "fixture");
    assert.notEqual(card.example, true);
  });

  it("maps Tatonas 503-equivalent to unavailable empty card", async () => {
    const { tatonasCardFromOverlayRead } = await import("./overlay-cards");
    const overlay = resolveOverlayLiveRead([], nowMs, { ok: false, feature_count: 0 });
    const card = tatonasCardFromOverlayRead(overlay, fetchedAt);
    assert.equal(card.source, "unavailable");
    assert.equal(card.stale, true);
    assert.equal(card.empty, true);
    assert.deepEqual(card.highlights, []);
  });

  it("maps Tatonas highlights from stored row properties", async () => {
    const { tatonasCardFromOverlayRead } = await import("./overlay-cards");
    const station: Feature<Point> = {
      type: "Feature",
      id: "tatonas-4216",
      geometry: { type: "Point", coordinates: [95.5854056, 5.3585549] },
      properties: {
        layer: "tatonasStations",
        title: "AWLR Buga",
        pos_name: "AWLR Buga",
        level: "AWAS",
        value: 48.437,
        satuan: "cm",
        jenis: "WL",
        logger_kind: "wl",
        project: "BWS Aceh",
        sensor: "Water Level",
        time_local: "2026-09-16 09:00:00",
      },
    };
    const overlay = resolveOverlayLiveRead(
      [{ expires_at: overlayLiveExpiresAt("tatonasStations", nowMs), feature: station }],
      nowMs,
      { ok: true, feature_count: 1 },
    );
    const card = tatonasCardFromOverlayRead(overlay, fetchedAt);
    assert.equal(card.source, "live");
    assert.equal(card.stale, false);
    assert.equal(card.empty, false);
    assert.equal(card.highlights[0]?.pos_name, "AWLR Buga");
    assert.equal(card.highlights[0]?.level, "AWAS");
    assert.equal(card.highlights[0]?.value, 48.437);
    assert.equal(card.highlights[0]?.satuan, "cm");
    assert.equal(card.highlights[0]?.logger_kind, "wl");
    assert.equal(card.tone, "danger");
    assert.equal(card.fresh_count, 1);
    assert.equal(card.alert_count, 1);
  });

  it("ages a stored Tatonas post from occurred_at, not the overlay TTL", async () => {
    const { tatonasCardFromOverlayRead } = await import("./overlay-cards");
    const old: Feature<Point> = {
      type: "Feature",
      id: "tatonas-1",
      geometry: { type: "Point", coordinates: [95.58, 5.35] },
      properties: {
        layer: "tatonasStations",
        title: "Pos Lama",
        pos_name: "Pos Lama",
        level: "WASPADA",
        occurred_at: new Date(nowMs - 16 * 60 * 1000).toISOString(),
        time_local: "2026-09-16 09:44:00",
      },
    };
    const fresh: Feature<Point> = {
      type: "Feature",
      id: "tatonas-2",
      geometry: { type: "Point", coordinates: [95.59, 5.36] },
      properties: {
        layer: "tatonasStations",
        title: "Pos Baru",
        pos_name: "Pos Baru",
        level: "AMAN",
        occurred_at: new Date(nowMs - 60 * 1000).toISOString(),
        time_local: "2026-09-16 09:59:00",
      },
    };
    const overlay = resolveOverlayLiveRead(
      [
        { expires_at: overlayLiveExpiresAt("tatonasStations", nowMs), feature: old },
        { expires_at: overlayLiveExpiresAt("tatonasStations", nowMs), feature: fresh },
      ],
      nowMs,
      { ok: true, feature_count: 2 },
    );
    const card = tatonasCardFromOverlayRead(overlay, fetchedAt, nowMs);
    assert.equal(card.fresh_count, 1);
    assert.equal(card.alert_count, 0);
    assert.equal(card.tone, "neutral");
    assert.equal(card.highlights.some((row) => row.pos_name === "Pos Lama"), false);
    assert.equal(card.highlights[0]?.pos_name, "Pos Baru");
  });
});
