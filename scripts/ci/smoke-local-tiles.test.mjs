import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assessTileSmoke, assertLoopback } from "./smoke-local-tiles.mjs";

describe("smoke ubin loopback", () => {
  it("menerima 206 dengan cache dan menolak host lain serta Carto", () => {
    assert.doesNotThrow(() => assertLoopback("http://127.0.0.1:3456"));
    assert.throws(() => assertLoopback("https://aceh-tangguh.vercel.app"));
    assert.deepEqual(
      assessTileSmoke({
        status: 206,
        cacheControl: "public, max-age=86400, stale-while-revalidate=604800",
        contentRange: "bytes 0-16383/100",
        location: null,
        bodyByteLength: 16384,
      }),
      [],
    );
    assert.match(
      assessTileSmoke({
        status: 206,
        cacheControl: "public, max-age=86400",
        contentRange: "bytes 0-1/2",
        location: "https://basemaps.cartocdn.com/x",
        bodyByteLength: 2,
      }).join("\n"),
      /Carto/,
    );
    assert.match(
      assessTileSmoke({
        status: 404,
        cacheControl: "",
        contentRange: null,
        location: null,
        bodyByteLength: 0,
      }).join("\n"),
      /404/,
    );
  });
});
