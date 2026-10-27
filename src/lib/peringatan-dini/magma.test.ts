import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  MAGMA_HOME,
  MAGMA_VSI_HOME,
  applyMagmaFetchReason,
  unavailableMagmaCard,
} from "@/lib/peringatan-dini-types";
import type { Feature, Point } from "geojson";
import { fetchMagmaLive, getMagmaPeringatanFromLive } from "./magma-live";
import { magmaCardFromOverlayRead } from "./overlay-cards";
import {
  cardFromMagmaRaws,
  magmaRawsFromPublicPayload,
  magmaTone,
  mergeMagmaRaws,
  normalizeEvent,
  parseMagmaHomepage,
  type MagmaRaw,
} from "./magma-parse";

const JUNE18_ID = "ROQ20260618170813";
const SNIPPET = readFileSync(
  join(process.cwd(), "src/lib/peringatan-dini/testdata/magma-homepage-snippet.html"),
  "utf8",
);

function assertNoJune18(card: { event: { id?: string } | null }) {
  assert.notEqual(card.event?.id, JUNE18_ID);
  assert.equal(JSON.stringify(card).includes(JUNE18_ID), false);
}

describe("parseMagmaHomepage", () => {
  it("reads the official markersGempa snippet and keeps the latest Aceh event", () => {
    const card = parseMagmaHomepage(SNIPPET);
    assert.equal(card.kind, "magma");
    assert.equal(card.empty, false);
    assert.ok(card.event);
    assert.equal(card.event.id, JUNE18_ID);
    assert.equal(card.event.magnitude, 2.7);
    assert.equal(card.event.magnitude_text, "2.7 SR");
    assert.equal(card.event.waktu_kejadian, "18 Juni 2026, 17:08:13 WIB");
    assert.match(card.event.wilayah, /Bener Meriah/);
    assert.equal(card.event.intensitas_mmi, "II-III Bener Meriah");
    assert.equal(card.event.gunung_api_terdekat, "Bur Ni Telong (4 km)");
    assert.equal(card.href, MAGMA_HOME);
  });

  it("returns empty:true when the official feed has no Aceh hit", () => {
    const html = `<script>var markersGempa = [{
      "id_lap": "ROQ20260625110335",
      "datetime_wib": "2026-06-25 11:03:35",
      "magnitude": 5.3,
      "magtype": "SR",
      "depth": 10,
      "lon_lima": 125.07,
      "lat_lima": 5.5,
      "area": "215 km BaratLaut TAHUNA-KEP.SANGIHE-SULUT",
      "koter": "TAHUNA-KEP.SANGIHE-SULUT"
    }];</script>`;
    const card = parseMagmaHomepage(html);
    assert.equal(card.empty, true);
    assert.equal(card.event, null);
    assert.equal(card.tone, "neutral");
    assertNoJune18(card);
  });

  it("throws on unparseable HTML", () => {
    assert.throws(() => parseMagmaHomepage("<html>no feed</html>"), /feed not found/);
  });
});

function toneOf(partial: MagmaRaw): ReturnType<typeof magmaTone> {
  const raw = { merusak: 0, mmi: null, magtype: "SR", area: "Aceh", ...partial };
  return magmaTone(normalizeEvent(raw), raw);
}

describe("magmaTone", () => {
  it("keeps an M2.7 with MMI text neutral", () => {
    assert.equal(toneOf({ magnitude: 2.7, mmi: "II-III Bener Meriah" }), "neutral");
  });

  it("keeps an M4.9 neutral", () => {
    assert.equal(toneOf({ magnitude: 4.9, mmi: null }), "neutral");
  });

  it("keeps M5+ neutral when the feed has no alert level", () => {
    assert.equal(toneOf({ magnitude: 5 }), "neutral");
    assert.equal(toneOf({ magnitude: 5.4, mmi: "III Kab. Aceh Selatan" }), "neutral");
    assert.equal(toneOf({ magnitude: 6.2, merusak: 1 }), "neutral");
  });

  it("keeps a missing magnitude neutral", () => {
    assert.equal(toneOf({ mmi: null }), "neutral");
  });

  it("uses only an explicit upstream level word", () => {
    assert.equal(toneOf({ magnitude: 2.1, mmi: null, level: "WASPADA" }), "warn");
    assert.equal(toneOf({ magnitude: 2.1, mmi: null, level: "AWAS" }), "danger");
    assert.equal(toneOf({ magnitude: 2.1, mmi: null, level: "SIAGA" }), "siaga");
    assert.equal(toneOf({ magnitude: 4.9, mmi: "IV Gayo Lues", level: "Level II (Waspada)" }), "neutral");
  });
});

describe("getMagmaPeringatanFromLive fail-closed", () => {
  it("does not serve the June 18 snapshot on HTTP 403", async () => {
    const card = await getMagmaPeringatanFromLive(async () => {
      throw new Error("MAGMA homepage 403");
    });
    assert.equal(card.empty, true);
    assert.equal(card.event, null);
    assert.equal(card.stale, true);
    assert.equal(card.source, "unavailable");
    assert.equal(card.tone, "neutral");
    assert.equal(card.href, MAGMA_HOME);
    assertNoJune18(card);
  });

  it("does not serve the June 18 snapshot on timeout", async () => {
    const card = await getMagmaPeringatanFromLive(async () => {
      const err = new Error("The operation was aborted due to timeout");
      err.name = "TimeoutError";
      throw err;
    });
    assert.equal(card.empty, true);
    assert.equal(card.stale, true);
    assert.equal(card.source, "unavailable");
    assert.equal(card.event, null);
    assertNoJune18(card);
  });

  it("does not serve the June 18 snapshot when HTML is unparseable", async () => {
    const card = await getMagmaPeringatanFromLive(async () => {
      return parseMagmaHomepage("<html>WAF block</html>");
    });
    assert.equal(card.empty, true);
    assert.equal(card.event, null);
    assert.equal(card.stale, true);
    assert.equal(card.source, "unavailable");
    assertNoJune18(card);
  });

  it("passes through a live Aceh card unchanged (except live flags)", async () => {
    const card = await getMagmaPeringatanFromLive(async () => parseMagmaHomepage(SNIPPET));
    assert.equal(card.stale, false);
    assert.equal(card.source, "live");
    assert.equal(card.event?.id, JUNE18_ID);
    assert.equal(card.empty, false);
    assert.equal(Object.hasOwn(card, "reason"), false);
  });
});

describe("fetchMagmaLive", () => {
  it("uses MAGMA_VSI_HOME when the primary homepage is blocked", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url === MAGMA_HOME) {
        return new Response("blocked", { status: 403, statusText: "Forbidden" });
      }
      if (url === MAGMA_VSI_HOME) {
        return new Response(SNIPPET, { status: 200, headers: { "Content-Type": "text/html" } });
      }
      throw new Error(`unexpected url ${url}`);
    };
    const card = await fetchMagmaLive(fetchImpl);
    assert.equal(card.event?.id, JUNE18_ID);
    assert.equal(card.empty, false);
  });

  it("throws after both official homepages 403, without inventing an event", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response("blocked", { status: 403, statusText: "Forbidden" });
    await assert.rejects(fetchMagmaLive(fetchImpl), /403/);
    const card = await getMagmaPeringatanFromLive(() => fetchMagmaLive(fetchImpl));
    assert.equal(card.empty, true);
    assert.equal(card.stale, true);
    assert.equal(card.source, "unavailable");
    assertNoJune18(card);
  });

  it("does not treat a 200 homepage without markersGempa as an empty success", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response("<html><body>Next.js</body></html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    await assert.rejects(fetchMagmaLive(fetchImpl), /unavailable|feed not found|unreadable/i);
    const card = await getMagmaPeringatanFromLive(() => fetchMagmaLive(fetchImpl));
    assert.equal(card.empty, true);
    assert.equal(card.stale, true);
    assert.equal(card.source, "unavailable");
    assert.equal(card.event, null);
    assertNoJune18(card);
  });

  it("keeps a maps-only read when the earthquake list returns 403", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith("/home/maps")) {
        return Response.json({
          success: true,
          data: {
            earthquake: [
              {
                id: "uuid-maps",
                report_id: "ROQ20261027010101",
                magnitude: "2.7",
                latitude: 4.77,
                longitude: 96.88,
                region: "Kabupaten Bener Meriah",
                affected_area: "Kabupaten Bener Meriah",
                datetime_wib: "2026-10-27T01:01:01",
              },
            ],
          },
        });
      }
      if (url.endsWith("/earthquake/list")) {
        return new Response("blocked", { status: 403, statusText: "Forbidden" });
      }
      throw new Error(`unexpected url ${url}`);
    };
    const card = await fetchMagmaLive(fetchImpl);
    assert.equal(card.event?.id, "ROQ20261027010101");
    assert.equal(card.event?.magnitude, 2.7);
    assert.equal(card.tone, "neutral");
    assert.equal(card.empty, false);
  });

  it("fail-closes when maps fails even if the earthquake list is readable", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith("/home/maps")) {
        return new Response("blocked", { status: 403, statusText: "Forbidden" });
      }
      if (url.endsWith("/earthquake/list")) {
        return Response.json({
          success: true,
          data: {
            data: [
              {
                report_id: "ROQ-FROM-LIST-ONLY",
                datetime_wib: "2026-10-27T02:02:02",
                magnitude: "6.1",
                latitude: 5.5,
                longitude: 95.3,
                region: "Banda Aceh",
                affected_area: "Banda Aceh",
              },
            ],
          },
        });
      }
      return new Response("<html>no feed</html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    };
    await assert.rejects(fetchMagmaLive(fetchImpl), /403|unavailable|feed not found/i);
    const card = await getMagmaPeringatanFromLive(() => fetchMagmaLive(fetchImpl));
    assert.equal(card.source, "unavailable");
    assert.equal(card.stale, true);
    assert.equal(card.event, null);
    assert.equal(JSON.stringify(card).includes("ROQ-FROM-LIST-ONLY"), false);
  });

  it("reads the public JSON list ahead of HTML and stays neutral", async () => {
    let htmlHits = 0;
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith("/home/maps")) {
        return Response.json({
          success: true,
          data: {
            earthquake: [
              {
                id: "uuid-map",
                report_id: null,
                magnitude: "5.4",
                latitude: 4.13,
                longitude: 96.12,
                region: "Meulaboh",
                affected_area: "Kabupaten Aceh Barat",
              },
            ],
          },
        });
      }
      if (url.endsWith("/earthquake/list")) {
        return Response.json({
          success: true,
          data: {
            data: [
              {
                report_id: "ROQ20261020232935",
                datetime_wib: "2026-10-20T23:29:35",
                magnitude: "5.4",
                depth: 10,
                latitude: 4.13,
                longitude: 96.12,
                region: "Meulaboh",
                affected_area: "Kabupaten Aceh Barat",
                is_destructive_earthquake: false,
              },
            ],
          },
        });
      }
      htmlHits += 1;
      return new Response("no", { status: 500 });
    };
    const card = await fetchMagmaLive(fetchImpl);
    assert.equal(htmlHits, 0);
    assert.equal(card.event?.id, "ROQ20261020232935");
    assert.equal(card.event?.magnitude, 5.4);
    assert.equal(card.tone, "neutral");
    assert.equal(card.empty, false);
  });

  it("throws on timeout from both official homepages", async () => {
    const fetchImpl: typeof fetch = async () => {
      const err = new Error("The operation was aborted due to timeout");
      err.name = "TimeoutError";
      throw err;
    };
    await assert.rejects(fetchMagmaLive(fetchImpl), /timeout|TimeoutError/i);
    const card = await getMagmaPeringatanFromLive(() => fetchMagmaLive(fetchImpl));
    assert.equal(card.empty, true);
    assert.equal(card.source, "unavailable");
    assertNoJune18(card);
  });
});

describe("public MAGMA JSON", () => {
  it("keeps the dated Aceh ROQ over an undated map row and stays neutral", () => {
    const maps = magmaRawsFromPublicPayload({
      success: true,
      data: {
        earthquake: [
          {
            id: "uuid-tamiang",
            report_id: null,
            magnitude: "4.9",
            latitude: 4.24,
            longitude: 97.65,
            region: "Aceh Tamiang",
            affected_area: "Aceh Tamiang",
            intensity: "IV Gayo Lues",
          },
          {
            id: "uuid-meulaboh",
            report_id: null,
            magnitude: "5.4",
            latitude: 4.13,
            longitude: 96.12,
            region: "Meulaboh",
            affected_area: "Kabupaten Aceh Barat",
          },
        ],
      },
    });
    const list = magmaRawsFromPublicPayload({
      success: true,
      data: {
        data: [
          {
            report_id: "ROQ20261020232935",
            datetime_wib: "2026-10-20T23:29:35",
            magnitude: "5.4",
            depth: 10,
            latitude: 4.13,
            longitude: 96.12,
            region: "Meulaboh",
            affected_area: "Kabupaten Aceh Barat",
            is_destructive_earthquake: false,
          },
        ],
      },
    });
    const merged = mergeMagmaRaws([maps, list]);
    assert.equal(merged.filter((row) => row.magnitude === 5.4).length, 1);
    assert.equal(
      merged.find((row) => row.magnitude === 5.4)?.id_lap,
      "ROQ20261020232935",
    );
    const card = cardFromMagmaRaws(merged);
    assert.equal(card.event?.id, "ROQ20261020232935");
    assert.equal(card.event?.magnitude, 5.4);
    assert.equal(card.tone, "neutral");
  });

  it("does not treat success:false or an empty list as rows", () => {
    assert.deepEqual(magmaRawsFromPublicPayload({ success: false, data: { earthquake: [] } }), []);
    assert.deepEqual(magmaRawsFromPublicPayload({ success: true, data: { earthquake: [] } }), []);
  });
});

const REASON =
  /^(?:maps|vsi|home|vsi-home):(upstream_[1-9]\d{2}|timeout|json_unreadable|empty|network)(?:;(?:maps|vsi|home|vsi-home):(upstream_[1-9]\d{2}|timeout|json_unreadable|empty|network))*$/;

function assertFailClosed(card: {
  empty: boolean;
  stale: boolean;
  source: string;
  event: unknown;
  tone: string;
  href: string;
  reason?: string;
}) {
  assert.equal(card.empty, true);
  assert.equal(card.stale, true);
  assert.equal(card.source, "unavailable");
  assert.equal(card.event, null);
  assert.equal(card.tone, "neutral");
  assert.equal(card.href, MAGMA_HOME);
  assert.match(card.reason ?? "", REASON);
  assert.doesNotMatch(card.reason ?? "", /https?:|esdm|user-agent|referer|secret|forbidden/i);
}

function timeoutError(): Error {
  return new DOMException("The operation was aborted due to timeout", "TimeoutError");
}

function abortError(): Error {
  return new DOMException("This operation was aborted", "AbortError");
}

describe("MAGMA unavailable reason codes", () => {
  it("records upstream_403 per tried source and keeps the card fail-closed", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response("SECRET_BODY", { status: 403, statusText: "Forbidden https://evil.example/x" });
    const card = await getMagmaPeringatanFromLive(() => fetchMagmaLive(fetchImpl));
    assertFailClosed(card);
    assert.equal(
      card.reason,
      "maps:upstream_403;vsi:upstream_403;home:upstream_403;vsi-home:upstream_403",
    );
    assert.equal(JSON.stringify(card).includes("SECRET_BODY"), false);
    assertNoJune18(card);
  });

  it("records upstream_<status> for a non-403 failure", async () => {
    const fetchImpl: typeof fetch = async () => new Response("no", { status: 502 });
    const card = await getMagmaPeringatanFromLive(() => fetchMagmaLive(fetchImpl));
    assertFailClosed(card);
    assert.equal(
      card.reason,
      "maps:upstream_502;vsi:upstream_502;home:upstream_502;vsi-home:upstream_502",
    );
  });

  it("records timeout for TimeoutError and AbortError", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("/_api/home/maps")) throw timeoutError();
      if (url.includes("vsi.esdm.go.id/data/api/public/home/maps")) throw abortError();
      throw timeoutError();
    };
    const card = await getMagmaPeringatanFromLive(() => fetchMagmaLive(fetchImpl));
    assertFailClosed(card);
    assert.equal(card.reason, "maps:timeout;vsi:timeout;home:timeout;vsi-home:timeout");
    assert.doesNotMatch(card.reason ?? "", /aborted|operation/i);
  });

  it("records json_unreadable when the body is not JSON", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith("/home/maps")) {
        return new Response("{not-json SECRET_BODY", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("<html>SECRET_BODY</html>", { status: 200 });
    };
    const card = await getMagmaPeringatanFromLive(() => fetchMagmaLive(fetchImpl));
    assertFailClosed(card);
    assert.equal(
      card.reason,
      "maps:json_unreadable;vsi:json_unreadable;home:json_unreadable;vsi-home:json_unreadable",
    );
    assert.equal(JSON.stringify(card).includes("SECRET_BODY"), false);
    assert.equal(JSON.stringify(card).includes("not-json"), false);
  });

  it("records empty when maps JSON has no rows and later sources fail", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith("/home/maps")) {
        return Response.json({ success: true, data: { earthquake: [] } });
      }
      return new Response("SECRET_BODY", { status: 403 });
    };
    const card = await getMagmaPeringatanFromLive(() => fetchMagmaLive(fetchImpl));
    assertFailClosed(card);
    assert.equal(card.reason, "maps:empty;vsi:empty;home:upstream_403;vsi-home:upstream_403");
    assert.equal(card.event, null);
    assert.equal(JSON.stringify(card).includes("SECRET_BODY"), false);
  });

  it("records network for a transport TypeError and drops the message", async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new TypeError("fetch failed https://magma.esdm.go.id/_api/home/maps SECRET_BODY");
    };
    const card = await getMagmaPeringatanFromLive(() => fetchMagmaLive(fetchImpl));
    assertFailClosed(card);
    assert.equal(card.reason, "maps:network;vsi:network;home:network;vsi-home:network");
    assert.equal(JSON.stringify(card.reason).includes("SECRET_BODY"), false);
    assert.equal(JSON.stringify(card.reason).includes("magma.esdm"), false);
  });

  it("omits reason when the thrown error is an unclassified URL", async () => {
    const card = await getMagmaPeringatanFromLive(async () => {
      throw new Error("https://magma.esdm.go.id/_api/home/maps SECRET_BODY");
    });
    assert.equal(card.empty, true);
    assert.equal(card.stale, true);
    assert.equal(card.source, "unavailable");
    assert.equal(card.event, null);
    assert.equal(Object.hasOwn(card, "reason"), false);
    assert.equal(JSON.stringify(card).includes("SECRET_BODY"), false);
  });

  it("does not attach a reason to a live card", () => {
    const live = {
      ...unavailableMagmaCard("2026-10-27T00:00:00.000Z"),
      empty: false,
      stale: false,
      source: "live" as const,
      reason: "maps:upstream_403",
    };
    const card = applyMagmaFetchReason(live, "maps:upstream_403;vsi:timeout");
    assert.equal(card.source, "live");
    assert.equal(Object.hasOwn(card, "reason"), false);
  });

  it("keeps a sanitized ledger reason only on the unavailable card", () => {
    const fetchedAt = "2026-10-27T00:00:00.000Z";
    const unavailable = applyMagmaFetchReason(
      unavailableMagmaCard(fetchedAt),
      "maps:upstream_403;vsi:timeout",
    );
    assert.equal(unavailable.reason, "maps:upstream_403;vsi:timeout");
    assert.equal(unavailable.empty, true);
    assert.equal(unavailable.event, null);
    assert.equal(unavailable.stale, true);
    assert.equal(unavailable.source, "unavailable");

    const dirty = applyMagmaFetchReason(
      unavailableMagmaCard(fetchedAt),
      "https://magma.esdm.go.id/_api/home/maps 403 SECRET_BODY",
    );
    assert.equal(Object.hasOwn(dirty, "reason"), false);
    assert.equal(JSON.stringify(dirty).includes("SECRET_BODY"), false);
    assert.equal(JSON.stringify(dirty).includes("_api"), false);
  });

  it("reads the ledger error onto the GET card without scraping", () => {
    const magma = readFileSync(join(process.cwd(), "src/lib/peringatan-dini/magma.ts"), "utf8");
    const overlay = readFileSync(join(process.cwd(), "src/lib/overlay-live.ts"), "utf8");
    const route = readFileSync(
      join(process.cwd(), "src/app/api/peringatan-dini/magma/route.ts"),
      "utf8",
    );
    const aggregate = readFileSync(
      join(process.cwd(), "src/app/api/peringatan-dini/route.ts"),
      "utf8",
    );
    assert.match(magma, /applyMagmaFetchReason\(/);
    assert.match(magma, /refreshError/);
    assert.doesNotMatch(magma, /fetchMagmaLive|getMagmaPeringatanFromLive/);
    assert.match(overlay, /select\("ok, feature_count, error, refreshed_at"\)/);
    assert.match(route, /NextResponse\.json\(data/);
    assert.match(aggregate, /NextResponse\.json\(data/);
    assert.doesNotMatch(route, /fetchMagmaLive/);
    assert.doesNotMatch(aggregate, /fetchMagmaLive/);
  });
});

const REQUEST_AT = "2026-10-27T12:00:00.000Z";
const ROW_FETCHED_AT = "2026-10-01T02:30:00.000Z";
const LEDGER_FETCHED_AT = "2026-10-27T08:15:00.000Z";
const QUAKE_OCCURRED_AT = "2026-06-18T10:08:13.000Z";

function cachedQuake(): Feature<Point> {
  return {
    type: "Feature",
    id: `magma-${JUNE18_ID}`,
    geometry: { type: "Point", coordinates: [96.88, 4.77] },
    properties: {
      layer: "magmaQuakes",
      title: "Kabupaten Bener Meriah",
      magnitude: 2.7,
      area: "Kabupaten Bener Meriah",
      occurred_at: QUAKE_OCCURRED_AT,
    },
  };
}

function overlayRead(stale: boolean, features: Feature<Point>[]) {
  return {
    status: 200 as const,
    body: {
      type: "FeatureCollection" as const,
      features,
      ...(stale ? { stale: true as const } : {}),
    },
  };
}

describe("BE-76 MAGMA stale overlay is unavailable", () => {
  it("turns stale rows into an unavailable card with a null event", () => {
    const card = magmaCardFromOverlayRead(overlayRead(true, [cachedQuake()]), REQUEST_AT, {
      rowFetchedAt: ROW_FETCHED_AT,
      ledgerFetchedAt: LEDGER_FETCHED_AT,
    });
    assert.equal(card.source, "unavailable");
    assert.equal(card.empty, true);
    assert.equal(card.event, null);
    assert.equal(card.stale, true);
    assert.equal(card.tone, "neutral");
    assert.equal(card.href, MAGMA_HOME);
    assertNoJune18(card);
    assert.equal(JSON.stringify(card).includes("Bener Meriah"), false);
    const withReason = applyMagmaFetchReason(card, "maps:upstream_403;vsi:timeout");
    assert.equal(withReason.reason, "maps:upstream_403;vsi:timeout");
    assert.equal(withReason.event, null);
    assert.equal(withReason.source, "unavailable");
  });

  it("turns a stale empty read into an unavailable card", () => {
    const card = magmaCardFromOverlayRead(overlayRead(true, []), REQUEST_AT, {
      ledgerFetchedAt: LEDGER_FETCHED_AT,
    });
    assert.equal(card.source, "unavailable");
    assert.equal(card.empty, true);
    assert.equal(card.event, null);
    assert.equal(card.stale, true);
    assert.deepEqual(card, unavailableMagmaCard(LEDGER_FETCHED_AT));
  });

  it("keeps a fresh row as a live card that is not stale", () => {
    const card = magmaCardFromOverlayRead(overlayRead(false, [cachedQuake()]), REQUEST_AT, {
      rowFetchedAt: ROW_FETCHED_AT,
      ledgerFetchedAt: LEDGER_FETCHED_AT,
    });
    assert.equal(card.source, "live");
    assert.equal(card.stale, false);
    assert.equal(card.empty, false);
    assert.equal(card.event?.id, JUNE18_ID);
    assert.equal(card.event?.magnitude, 2.7);
    assert.equal(Object.hasOwn(card, "reason"), false);
    const stripped = applyMagmaFetchReason(card, "maps:upstream_403");
    assert.equal(stripped.source, "live");
    assert.equal(Object.hasOwn(stripped, "reason"), false);
  });

  it("keeps a fresh empty read as an empty live card", () => {
    const card = magmaCardFromOverlayRead(overlayRead(false, []), REQUEST_AT, {
      ledgerFetchedAt: LEDGER_FETCHED_AT,
      rowFetchedAt: ROW_FETCHED_AT,
    });
    assert.equal(card.source, "live");
    assert.equal(card.stale, false);
    assert.equal(card.empty, true);
    assert.equal(card.event, null);
    assert.equal(Object.hasOwn(card, "reason"), false);
  });

  it("stamps a fresh quake with the overlay row fetch time, not the quake or the request", () => {
    const card = magmaCardFromOverlayRead(overlayRead(false, [cachedQuake()]), REQUEST_AT, {
      rowFetchedAt: "2026-10-01T09:30:00+07:00",
      ledgerFetchedAt: LEDGER_FETCHED_AT,
    });
    assert.equal(card.fetched_at, ROW_FETCHED_AT);
    assert.notEqual(card.fetched_at, REQUEST_AT);
    assert.notEqual(card.fetched_at, QUAKE_OCCURRED_AT);
  });

  it("stamps a fresh quake with the ledger fetch time when the row timestamp is missing", () => {
    const card = magmaCardFromOverlayRead(overlayRead(false, [cachedQuake()]), REQUEST_AT, {
      rowFetchedAt: null,
      ledgerFetchedAt: LEDGER_FETCHED_AT,
    });
    assert.equal(card.fetched_at, LEDGER_FETCHED_AT);
    assert.notEqual(card.fetched_at, REQUEST_AT);
  });

  it("stamps a fresh empty read with the ledger fetch time", () => {
    const card = magmaCardFromOverlayRead(overlayRead(false, []), REQUEST_AT, {
      ledgerFetchedAt: LEDGER_FETCHED_AT,
      rowFetchedAt: ROW_FETCHED_AT,
    });
    assert.equal(card.fetched_at, LEDGER_FETCHED_AT);
    assert.notEqual(card.fetched_at, REQUEST_AT);
    assert.notEqual(card.fetched_at, ROW_FETCHED_AT);
  });

  it("stamps an unavailable card with the ledger attempt time, not the cached row", () => {
    const card = magmaCardFromOverlayRead(overlayRead(true, [cachedQuake()]), REQUEST_AT, {
      rowFetchedAt: ROW_FETCHED_AT,
      ledgerFetchedAt: LEDGER_FETCHED_AT,
    });
    assert.equal(card.fetched_at, LEDGER_FETCHED_AT);
    assert.notEqual(card.fetched_at, ROW_FETCHED_AT);
    assert.notEqual(card.fetched_at, REQUEST_AT);
    assert.notEqual(card.fetched_at, QUAKE_OCCURRED_AT);
  });

  it("stamps an unavailable card with the request time when the ledger has no attempt time", () => {
    const missing = magmaCardFromOverlayRead(overlayRead(true, [cachedQuake()]), REQUEST_AT, {
      rowFetchedAt: ROW_FETCHED_AT,
      ledgerFetchedAt: null,
    });
    assert.equal(missing.source, "unavailable");
    assert.equal(missing.event, null);
    assert.equal(missing.fetched_at, REQUEST_AT);
    assert.notEqual(missing.fetched_at, ROW_FETCHED_AT);
    const invalid = magmaCardFromOverlayRead(overlayRead(true, []), REQUEST_AT, {
      ledgerFetchedAt: "not-a-date",
    });
    assert.equal(invalid.fetched_at, REQUEST_AT);
    assert.equal(invalid.source, "unavailable");
    assert.equal(invalid.event, null);
  });

  it("reads row and ledger fetch times into the GET card", () => {
    const magma = readFileSync(join(process.cwd(), "src/lib/peringatan-dini/magma.ts"), "utf8");
    const overlay = readFileSync(join(process.cwd(), "src/lib/overlay-live.ts"), "utf8");
    assert.match(magma, /rowFetchedAt: select\.rowsFetchedAt/);
    assert.match(magma, /ledgerFetchedAt: select\.refreshedAt/);
    assert.match(overlay, /rowsFetchedAt: newestOverlayRowFetchedAt\(rows\)/);
    assert.match(overlay, /refreshedAt: isoTimestamp\(ledger\?\.refreshed_at\)/);
    assert.match(
      overlay,
      /select\("id, longitude, latitude, properties, occurred_at, expires_at, updated_at"\)/,
    );
    const section = readFileSync(
      join(process.cwd(), "src/components/PeringatanDiniSection.tsx"),
      "utf8",
    );
    const bento = readFileSync(
      join(process.cwd(), "src/components/beranda/PeringatanBento.tsx"),
      "utf8",
    );
    const magmaView = section.slice(
      section.indexOf("function MagmaCardView"),
      section.indexOf("function SipongiCardView"),
    );
    assert.doesNotMatch(magmaView, /reason/);
    assert.doesNotMatch(bento, /magma\.reason|card\.reason|\.reason/);
  });
});
