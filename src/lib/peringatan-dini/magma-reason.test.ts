import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  MAGMA_HOME,
  MAGMA_VSI_HOME,
  unavailableMagmaCard,
  type MagmaCard,
} from "@/lib/peringatan-dini-types";
import { fetchMagmaLive, getMagmaPeringatanFromLive } from "./magma-live";
import { parseMagmaHomepage } from "./magma-parse";

const AT = "2026-10-27T00:00:00.000Z";
const JUNE18_ID = "ROQ20260618170813";
const SNIPPET = readFileSync(
  join(process.cwd(), "src/lib/peringatan-dini/testdata/magma-homepage-snippet.html"),
  "utf8",
);

const LEAKS = ["LEAK_BODY", "LEAK_STATUS_TEXT", "LEAK_HEADER", "LEAK_BAD_JSON", "LEAK_EMPTY_BODY"];

function assertNoLeak(card: MagmaCard) {
  const blob = JSON.stringify(card);
  for (const leak of LEAKS) {
    assert.equal(blob.includes(leak), false, `leaked ${leak}`);
  }
  if (card.reason !== undefined) {
    assert.equal(/https?:\/\//i.test(card.reason), false);
    assert.equal(card.reason.includes("magma.esdm"), false);
    assert.equal(card.reason.includes("vsi.esdm"), false);
  }
}

function assertFailClosed(card: MagmaCard) {
  assert.equal(card.empty, true);
  assert.equal(card.stale, true);
  assert.equal(card.source, "unavailable");
  assert.equal(card.event, null);
  assert.equal(card.tone, "neutral");
  assert.equal(JSON.stringify(card).includes(JUNE18_ID), false);
  assertNoLeak(card);
}

function namedError(name: string, message: string): Error {
  const err = new Error(message);
  err.name = name;
  return err;
}

type FetchImpl = typeof fetch;

function fetchByUrl(decide: (url: string) => Response | Promise<Response> | Error): FetchImpl {
  return (async (input) => {
    const url = String(input);
    const outcome = await decide(url);
    if (outcome instanceof Error) throw outcome;
    return outcome;
  }) as FetchImpl;
}

async function unavailableFrom(fetchImpl: FetchImpl): Promise<MagmaCard> {
  await assert.rejects(fetchMagmaLive(fetchImpl));
  return getMagmaPeringatanFromLive(() => fetchMagmaLive(fetchImpl));
}

describe("MAGMA unavailable reason codes", () => {
  it("records upstream_403 per tried source and drops the body, status text, and header", async () => {
    const card = await unavailableFrom(
      fetchByUrl(
        () =>
          new Response("LEAK_BODY", {
            status: 403,
            statusText: "LEAK_STATUS_TEXT",
            headers: { "x-secret": "LEAK_HEADER" },
          }),
      ),
    );
    assertFailClosed(card);
    assert.equal(
      card.reason,
      "maps:upstream_403;vsi:upstream_403;home:upstream_403;vsi-home:upstream_403",
    );
  });

  it("records timeout when the fetch rejects with AbortError", async () => {
    const card = await unavailableFrom(
      fetchByUrl(() => namedError("AbortError", "aborted https://magma.esdm.go.id/_api/home/maps LEAK_BODY")),
    );
    assertFailClosed(card);
    assert.equal(card.reason, "maps:timeout;vsi:timeout;home:timeout;vsi-home:timeout");
  });

  it("records timeout when the fetch rejects with TimeoutError", async () => {
    const card = await unavailableFrom(
      fetchByUrl(() =>
        namedError("TimeoutError", "The operation was aborted due to timeout LEAK_BODY"),
      ),
    );
    assertFailClosed(card);
    assert.equal(card.reason, "maps:timeout;vsi:timeout;home:timeout;vsi-home:timeout");
  });

  it("records json_unreadable when a 200 maps body is not JSON", async () => {
    const card = await unavailableFrom(
      fetchByUrl(
        () =>
          new Response("LEAK_BAD_JSON", {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );
    assertFailClosed(card);
    assert.equal(JSON.stringify(card).includes("LEAK_BAD_JSON"), false);
    assert.equal(
      card.reason,
      "maps:json_unreadable;vsi:json_unreadable;home:unreadable;vsi-home:unreadable",
    );
  });

  it("records empty when the maps payload has no quake rows", async () => {
    const card = await unavailableFrom(
      fetchByUrl((url) => {
        if (url.endsWith("/home/maps")) {
          return Response.json({
            success: true,
            note: "LEAK_EMPTY_BODY",
            data: { earthquake: [] },
          });
        }
        return new Response("<html><body>LEAK_BODY</body></html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        });
      }),
    );
    assertFailClosed(card);
    assert.equal(JSON.stringify(card).includes("LEAK_EMPTY_BODY"), false);
    assert.equal(
      card.reason,
      "maps:empty;vsi:empty;home:unreadable;vsi-home:unreadable",
    );
  });

  it("records network for a TypeError and drops the error message", async () => {
    const card = await unavailableFrom(
      fetchByUrl(() => new TypeError("connect ECONNREFUSED https://magma.esdm.go.id/secret LEAK_BODY")),
    );
    assertFailClosed(card);
    assert.equal(card.reason, "maps:network;vsi:network;home:network;vsi-home:network");
  });

  it("joins one code per tried source", async () => {
    const card = await unavailableFrom(
      fetchByUrl((url) => {
        if (url === "https://magma.esdm.go.id/_api/home/maps") {
          return new Response("LEAK_BODY", { status: 403, statusText: "LEAK_STATUS_TEXT" });
        }
        if (url === "https://vsi.esdm.go.id/data/api/public/home/maps") {
          return namedError("TimeoutError", "timeout https://vsi.esdm.go.id LEAK_BODY");
        }
        if (url === MAGMA_HOME) {
          return new Response("LEAK_BODY", { status: 502 });
        }
        if (url === MAGMA_VSI_HOME) {
          return new TypeError("failed https://magma.vsi.esdm.go.id LEAK_HEADER");
        }
        return namedError("Error", `unexpected ${url}`);
      }),
    );
    assertFailClosed(card);
    assert.equal(card.reason, "maps:upstream_403;vsi:timeout;home:upstream_502;vsi-home:network");
  });

  it("does not put reason on a live card", async () => {
    const fetchImpl = fetchByUrl((url) => {
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
        return new Response("LEAK_BODY", { status: 403, headers: { "x-secret": "LEAK_HEADER" } });
      }
      throw new Error(`unexpected ${url}`);
    });
    const live = await fetchMagmaLive(fetchImpl);
    assert.equal(Object.hasOwn(live, "reason"), false);
    const card = await getMagmaPeringatanFromLive(async () => ({
      ...parseMagmaHomepage(SNIPPET),
      reason: "maps:upstream_403",
    }));
    assert.equal(card.source, "live");
    assert.equal(card.stale, false);
    assert.equal(card.event?.id, JUNE18_ID);
    assert.equal(Object.hasOwn(card, "reason"), false);
    assert.equal(JSON.stringify(card).includes("upstream_403"), false);
  });

  it("keeps a safe reason on the unavailable card and drops a URL", () => {
    const safe = unavailableMagmaCard(AT, "maps:upstream_403;vsi:timeout");
    assert.equal(safe.reason, "maps:upstream_403;vsi:timeout");
    assert.equal(safe.empty, true);
    assert.equal(safe.event, null);
    assert.equal(safe.source, "unavailable");

    const leaked = unavailableMagmaCard(AT, "https://magma.esdm.go.id/_api/home/maps LEAK_HEADER");
    assert.equal(Object.hasOwn(leaked, "reason"), false);
    assertNoLeak(leaked);

    const bare = unavailableMagmaCard(AT);
    assert.equal(Object.hasOwn(bare, "reason"), false);
  });

  it("copies only an allowlisted ledger reason onto an unavailable card", async () => {
    const types = await import("@/lib/peringatan-dini-types");
    const apply = types.applyMagmaRefreshReason;
    assert.equal(typeof apply, "function");
    const unavailable = unavailableMagmaCard(AT);
    const withReason = apply(unavailable, "maps:upstream_403;vsi:timeout");
    assert.equal(withReason.reason, "maps:upstream_403;vsi:timeout");
    assert.equal(withReason.event, null);
    assert.equal(withReason.source, "unavailable");

    const urlLedger = apply(
      unavailable,
      "MAGMA unavailable: https://magma.esdm.go.id/_api/home/maps (MAGMA 403) LEAK_BODY",
    );
    assert.equal(Object.hasOwn(urlLedger, "reason"), false);
    assertNoLeak(urlLedger);

    const live = apply(
      {
        ...unavailable,
        source: "live",
        stale: true,
        empty: false,
        event: {
          id: JUNE18_ID,
          magnitude: 2.7,
          magnitude_text: "2.7 SR",
          waktu_kejadian: "18 Juni 2026, 17:08:13 WIB",
          koordinat_kedalaman: "—",
          wilayah: "Kabupaten Bener Meriah",
          intensitas_mmi: null,
          gunung_api_terdekat: null,
          href: MAGMA_HOME,
          occurred_at: "2026-06-18T10:08:13.000Z",
        },
      },
      "maps:upstream_403",
    );
    assert.equal(live.source, "live");
    assert.equal(Object.hasOwn(live, "reason"), false);
    assert.equal(live.event?.id, JUNE18_ID);
  });

  it("threads the refresh reason through the MAGMA card used by both PD routes", () => {
    const root = process.cwd();
    const magma = readFileSync(join(root, "src/lib/peringatan-dini/magma.ts"), "utf8");
    const service = readFileSync(join(root, "src/lib/peringatan-dini/service.ts"), "utf8");
    const magmaRoute = readFileSync(join(root, "src/app/api/peringatan-dini/magma/route.ts"), "utf8");
    const aggregate = readFileSync(join(root, "src/app/api/peringatan-dini/route.ts"), "utf8");
    const overlay = readFileSync(join(root, "src/lib/overlay-live.ts"), "utf8");
    assert.match(magma, /applyMagmaRefreshReason/);
    assert.match(magma, /refreshError/);
    assert.match(service, /getMagmaPeringatan\(\)/);
    assert.match(magmaRoute, /getMagmaPeringatan\(\)/);
    assert.match(aggregate, /getPeringatanDini\(\)/);
    assert.match(overlay, /refreshError/);
    assert.doesNotMatch(magmaRoute, /fetchMagmaLive|fetchMagmaQuakeRaws/);
    assert.doesNotMatch(aggregate, /fetchMagmaLive|fetchMagmaQuakeRaws/);
  });
});
