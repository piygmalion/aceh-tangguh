import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { MAGMA_HOME, MAGMA_VSI_HOME } from "@/lib/peringatan-dini-types";
import { fetchMagmaLive, getMagmaPeringatanFromLive } from "./magma-live";
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
    assert.equal(toneOf({ magnitude: 2.1, mmi: null, level: "SIAGA" }), "danger");
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
