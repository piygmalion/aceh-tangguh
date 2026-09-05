import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import type { Feature, Point } from "geojson";
import { TATONAS_STALE_MS } from "./tatonas/types";
import {
  overlayLiveOk,
  OVERLAY_LIVE_REFRESH_KEYS,
  OVERLAY_UPSTREAM_FAILURE_BODY,
  OVERLAY_WEATHER_LIKE_TTL_MS,
  overlayLiveExpiresAt,
  overlayLiveTtlMs,
  planOverlayLiveWrite,
  resolveOverlayLiveFailure,
  resolveOverlayLiveRead,
} from "./overlay-live";

const cached: Feature<Point> = {
  type: "Feature",
  id: "bmkg-cached",
  geometry: { type: "Point", coordinates: [95.3, 5.5] },
  properties: { layer: "bmkgQuakes", title: "Gempa cache" },
};

const nowMs = Date.parse("2026-09-04T06:00:00.000Z");

describe("overlay live fail vs empty", () => {
  it("maps live failure without cache to 503 + stale + upstream", () => {
    const none = resolveOverlayLiveFailure(null);
    assert.equal(none.status, 503);
    assert.equal(none.body.stale, true);
    assert.equal(none.body.error, "upstream");
    assert.deepEqual(none.body.features, []);
    assert.equal(none.body.type, "FeatureCollection");

    const emptyCache = resolveOverlayLiveFailure([]);
    assert.equal(emptyCache.status, 503);
    assert.equal(emptyCache.body.error, "upstream");
  });

  it("maps live failure with cached features to 200 + stale, not upstream-empty", () => {
    const stale = resolveOverlayLiveFailure([cached]);
    assert.equal(stale.status, 200);
    assert.equal(stale.body.stale, true);
    assert.equal(stale.body.error, undefined);
    assert.equal(stale.body.features.length, 1);
    assert.equal(stale.body.features[0].id, "bmkg-cached");
  });

  it("keeps a successful empty collection as 200 without stale or error", () => {
    const empty = overlayLiveOk([]);
    assert.equal(empty.status, 200);
    assert.equal(empty.body.stale, undefined);
    assert.equal(empty.body.error, undefined);
    assert.deepEqual(empty.body.features, []);
    assert.notEqual("stale" in empty.body && empty.body.stale === true, true);
  });

  it("does not let the overlay route catch answer 200", () => {
    const src = readFileSync(
      path.join(process.cwd(), "src/app/api/overlay/[key]/route.ts"),
      "utf8",
    );
    assert.match(src, /OVERLAY_UPSTREAM_FAILURE_BODY/);
    assert.match(src, /status:\s*503/);
    assert.equal(/status:\s*200/.test(src.split("catch")[1] ?? ""), false);
    assert.doesNotMatch(src, /refreshOverlayLive|refreshAllOverlayLive/);
    assert.deepEqual(OVERLAY_UPSTREAM_FAILURE_BODY, {
      type: "FeatureCollection",
      features: [],
      stale: true,
      error: "upstream",
    });
  });
});

describe("overlay live read vs refresh", () => {
  it("uses TATONAS_STALE_MS for stations and weather 2h for other live layers", () => {
    assert.equal(overlayLiveTtlMs("tatonasStations"), TATONAS_STALE_MS);
    assert.equal(overlayLiveTtlMs("tatonasStations"), 15 * 60 * 1000);
    assert.equal(OVERLAY_WEATHER_LIKE_TTL_MS, 2 * 60 * 60 * 1000);
    for (const key of OVERLAY_LIVE_REFRESH_KEYS) {
      if (key === "tatonasStations") continue;
      assert.equal(overlayLiveTtlMs(key), OVERLAY_WEATHER_LIKE_TTL_MS);
    }
    assert.equal(
      overlayLiveExpiresAt("bmkgQuakes", nowMs),
      new Date(nowMs + OVERLAY_WEATHER_LIKE_TTL_MS).toISOString(),
    );
    assert.equal(
      overlayLiveExpiresAt("tatonasStations", nowMs),
      new Date(nowMs + TATONAS_STALE_MS).toISOString(),
    );
  });

  it("plans a layer clear when refresh succeeds with zero Aceh features", () => {
    const empty = planOverlayLiveWrite("bmkgQuakes", [], nowMs);
    assert.deepEqual(empty, { action: "clear", layer: "bmkgQuakes" });

    const replace = planOverlayLiveWrite("sipongiHotspots", [cached], nowMs);
    assert.equal(replace.action, "replace");
    if (replace.action === "replace") {
      assert.deepEqual(replace.ids, ["bmkg-cached"]);
      assert.equal(replace.expiresAt, overlayLiveExpiresAt("sipongiHotspots", nowMs));
    }
  });

  it("maps table rows to 503 when empty and 200 stale when expired", () => {
    assert.equal(resolveOverlayLiveRead(null, nowMs).status, 503);
    assert.equal(resolveOverlayLiveRead([], nowMs).status, 503);
    assert.equal(resolveOverlayLiveRead([], nowMs).body.error, "upstream");

    const expired = resolveOverlayLiveRead(
      [{ expires_at: new Date(nowMs - 1).toISOString(), feature: cached }],
      nowMs,
    );
    assert.equal(expired.status, 200);
    assert.equal(expired.body.stale, true);
    assert.equal(expired.body.error, undefined);
    assert.equal(expired.body.features[0].id, "bmkg-cached");

    const unstamped = resolveOverlayLiveRead([{ expires_at: null, feature: cached }], nowMs);
    assert.equal(unstamped.status, 200);
    assert.equal(unstamped.body.stale, true);

    const fresh = resolveOverlayLiveRead(
      [{ expires_at: overlayLiveExpiresAt("bmkgQuakes", nowMs), feature: cached }],
      nowMs,
    );
    assert.equal(fresh.status, 200);
    assert.equal(fresh.body.stale, undefined);
    assert.equal(fresh.body.error, undefined);
  });

  it("keeps GET loadOverlayLive read-only and confines fetch to refresh", () => {
    const src = readFileSync(path.join(process.cwd(), "src/lib/overlay-live.ts"), "utf8");
    const loadStart = src.indexOf("export async function loadOverlayLive");
    const loadEnd = src.indexOf("export async function loadOverlayVector");
    assert.ok(loadStart >= 0 && loadEnd > loadStart);
    const loadBody = src.slice(loadStart, loadEnd);
    assert.match(loadBody, /resolveOverlayLiveRead/);
    assert.match(loadBody, /readStoredLive/);
    assert.match(loadBody, /readStoredRefresh/);
    assert.doesNotMatch(loadBody, /fetchLiveFeatures|persistLive|fetchBmkgTews|fetchMagma|fetchSipongi|fetchTatonas|refreshOverlayLive|syncCalonDariOverlay/);

    const fixtureBranch = loadBody.slice(0, loadBody.indexOf("isOverlayLiveRefreshKey"));
    assert.doesNotMatch(fixtureBranch, /readStoredRefresh|overlay_live_refresh/);
    const liveBranch = loadBody.slice(loadBody.indexOf("isOverlayLiveRefreshKey"));
    assert.match(liveBranch, /readStoredRefresh/);
    assert.match(liveBranch, /readStoredLive/);

    const refreshStart = src.indexOf("export async function refreshOverlayLive");
    const refreshEnd = src.indexOf("async function purgeExpiredOverlayRows");
    assert.ok(refreshStart >= 0 && refreshEnd > refreshStart);
    const refreshBody = src.slice(refreshStart, refreshEnd);
    assert.match(refreshBody, /fetchLiveFeatures/);
    assert.match(refreshBody, /persistLive/);
    assert.match(refreshBody, /writeOverlayLiveRefresh/);
    assert.match(refreshBody, /countStoredLive/);
    assert.match(refreshBody, /shouldSyncCalonAfterRefresh/);
    assert.match(refreshBody, /syncCalonDariOverlay/);
    assert.ok(refreshBody.indexOf("persistLive") < refreshBody.indexOf("writeOverlayLiveRefresh"));
    assert.match(refreshBody, /ok:\s*ledgerOk/);
    assert.match(refreshBody, /ok:\s*false/);

    assert.match(src, /expires_at: expiresAt/);
    assert.match(src, /action === "clear"/);
    assert.doesNotMatch(src, /if \(!client \|\| features\.length === 0\) return/);
    assert.doesNotMatch(src, /from\("overlay_live_features"\)[\s\S]{0,120}sentinel/i);
  });

  it("adds overlay_live_refresh with public SELECT and no staff write policy", (t) => {
    const sqlPath = path.join(process.cwd(), "supabase/migrations/20260916_overlay_live_refresh.sql");
    if (!existsSync(sqlPath)) {
      t.skip("20260916 belum di pohon git G14");
      return;
    }
    const sql = readFileSync(sqlPath, "utf8");
    assert.match(sql, /create table if not exists public\.overlay_live_refresh/);
    assert.match(sql, /layer_key text primary key/);
    assert.match(sql, /'bmkgQuakes'/);
    assert.match(sql, /'magmaQuakes'/);
    assert.match(sql, /'magmaVolcanoes'/);
    assert.match(sql, /'sipongiHotspots'/);
    assert.match(sql, /'tatonasStations'/);
    assert.match(sql, /refreshed_at timestamptz not null/);
    assert.match(sql, /ok boolean not null/);
    assert.match(sql, /feature_count integer not null check \(feature_count >= 0\)/);
    assert.match(sql, /error text null/);
    assert.match(sql, /enable row level security/);
    assert.match(sql, /for select to anon, authenticated using \(true\)/);
    assert.doesNotMatch(sql, /is_staff|is_ops|is_super_admin/);
    assert.doesNotMatch(sql, /for insert|for update|for delete|for all/i);
    assert.doesNotMatch(sql, /alter table public\.overlay_live_features/i);
  });

  it("documents the overlay cron bearer secret and 503/401 branches", () => {
    const cron = readFileSync(
      path.join(process.cwd(), "src/app/api/cron/overlay-live/route.ts"),
      "utf8",
    );
    assert.match(cron, /OVERLAY_CRON_SECRET/);
    assert.match(cron, /refreshAllOverlayLive/);
    assert.match(cron, /bearerMatches/);
    assert.match(cron, /status:\s*503/);
    assert.match(cron, /status:\s*401/);
    assert.doesNotMatch(cron, /WEATHER_CRON_SECRET|LAPORAN_CRON_SECRET/);

    const workflow = readFileSync(
      path.join(process.cwd(), ".github/workflows/overlay-live-refresh.yml"),
      "utf8",
    );
    assert.match(workflow, /vars\.OVERLAY_REFRESH_URL/);
    assert.match(workflow, /secrets\.OVERLAY_CRON_SECRET/);
    assert.match(workflow, /Authorization: Bearer/);
    assert.doesNotMatch(workflow, /node-version/);
  });
});

describe("overlay live refresh ledger (AN-5 / BE-8)", () => {
  const emptyLedgerOk = { ok: true as const, feature_count: 0 };
  const failedLedger = { ok: false as const, feature_count: 0 };
  const countedLedger = { ok: true as const, feature_count: 1 };
  const stored = [{ expires_at: overlayLiveExpiresAt("bmkgQuakes", nowMs), feature: cached }];
  const expired = [{ expires_at: new Date(nowMs - 1).toISOString(), feature: cached }];

  it("maps ledger ok + feature_count 0 + empty rows to 200 without stale or error", () => {
    const empty = resolveOverlayLiveRead([], nowMs, emptyLedgerOk);
    assert.equal(empty.status, 200);
    assert.equal(empty.body.stale, undefined);
    assert.equal(empty.body.error, undefined);
    assert.deepEqual(empty.body.features, []);
    assert.equal("stale" in empty.body, false);
    assert.equal("error" in empty.body, false);

    const fromNull = resolveOverlayLiveRead(null, nowMs, emptyLedgerOk);
    assert.equal(fromNull.status, 200);
    assert.deepEqual(fromNull.body.features, []);
    assert.equal(fromNull.body.stale, undefined);
    assert.equal(fromNull.body.error, undefined);
  });

  it("keeps expires_at when ledger says 0 but feature rows exist", () => {
    const fresh = resolveOverlayLiveRead(stored, nowMs, emptyLedgerOk);
    assert.equal(fresh.status, 200);
    assert.equal(fresh.body.stale, undefined);
    assert.equal(fresh.body.error, undefined);
    assert.equal(fresh.body.features.length, 1);
    assert.equal(fresh.body.features[0].id, "bmkg-cached");

    const stale = resolveOverlayLiveRead(expired, nowMs, emptyLedgerOk);
    assert.equal(stale.status, 200);
    assert.equal(stale.body.stale, true);
    assert.equal(stale.body.error, undefined);
    assert.equal(stale.body.features.length, 1);
  });

  it("maps no ledger + empty rows to 503 + error upstream", () => {
    const none = resolveOverlayLiveRead([], nowMs);
    assert.equal(none.status, 503);
    assert.equal(none.body.error, "upstream");
    assert.equal(none.body.stale, true);
    assert.deepEqual(none.body.features, []);

    const missing = resolveOverlayLiveRead(null, nowMs, null);
    assert.equal(missing.status, 503);
    assert.equal(missing.body.error, "upstream");
  });

  it("maps ledger ok false + empty rows to 503", () => {
    const empty = resolveOverlayLiveRead([], nowMs, failedLedger);
    assert.equal(empty.status, 503);
    assert.equal(empty.body.error, "upstream");
    assert.deepEqual(empty.body.features, []);

    const none = resolveOverlayLiveRead(null, nowMs, { ok: false, feature_count: 2 });
    assert.equal(none.status, 503);
  });

  it("maps ledger ok false + cached rows to 200 stale, not 503", () => {
    const stale = resolveOverlayLiveRead(stored, nowMs, { ok: false, feature_count: 1 });
    assert.equal(stale.status, 200);
    assert.equal(stale.body.stale, true);
    assert.equal(stale.body.error, undefined);
    assert.equal(stale.body.features.length, 1);
    assert.equal(stale.body.features[0].id, "bmkg-cached");
  });

  it("maps ledger ok + feature_count > 0 + empty rows to 503", () => {
    const gone = resolveOverlayLiveRead([], nowMs, countedLedger);
    assert.equal(gone.status, 503);
    assert.equal(gone.body.error, "upstream");
    assert.deepEqual(gone.body.features, []);

    const purged = resolveOverlayLiveRead(null, nowMs, { ok: true, feature_count: 3 });
    assert.equal(purged.status, 503);
    assert.equal(purged.body.error, "upstream");
  });

  it("keeps planOverlayLiveWrite empty as clear, not a feature sentinel", () => {
    assert.deepEqual(planOverlayLiveWrite("bmkgQuakes", [], nowMs), {
      action: "clear",
      layer: "bmkgQuakes",
    });
    assert.deepEqual(planOverlayLiveWrite("magmaQuakes", [], nowMs), {
      action: "clear",
      layer: "magmaQuakes",
    });
  });

  it("follows expires_at when ledger ok + feature_count > 0 and rows exist", () => {
    const fresh = resolveOverlayLiveRead(stored, nowMs, countedLedger);
    assert.equal(fresh.status, 200);
    assert.equal(fresh.body.stale, undefined);
    assert.equal(fresh.body.features.length, 1);

    const stale = resolveOverlayLiveRead(expired, nowMs, countedLedger);
    assert.equal(stale.status, 200);
    assert.equal(stale.body.stale, true);
    assert.equal(stale.body.features.length, 1);
  });
});
