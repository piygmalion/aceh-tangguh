import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { DEFAULT_LAYERS, parseMarkerLayers } from "./map-url-aliases";
import { LIVE_MARKER_LAYER_KEYS } from "./map-layers-catalog";
import {
  applySearchParamsPatch,
  composeMapHref,
  createMapUrlWriter,
  isMapPathname,
  isOffMapHref,
  planMapUrlWrite,
  shouldCancelMapUrlSyncOnClick,
} from "./map-url-sync";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("isMapPathname", () => {
  it("treats locale-prefixed and bare /peta as the map route", () => {
    assert.equal(isMapPathname("/id/peta"), true);
    assert.equal(isMapPathname("/en/peta"), true);
    assert.equal(isMapPathname("/peta"), true);
    assert.equal(isMapPathname("/id/peta/"), true);
    assert.equal(isMapPathname("/id/peta?lat=1"), true);
  });

  it("does not treat other site-nav destinations as the map", () => {
    assert.equal(isMapPathname("/id"), false);
    assert.equal(isMapPathname("/id/"), false);
    assert.equal(isMapPathname("/id/data-bencana"), false);
    assert.equal(isMapPathname("/en/disaster-data"), false);
    assert.equal(isMapPathname("/id/lapor/kejadian"), false);
    assert.equal(isMapPathname("/id/destana"), false);
    assert.equal(isMapPathname("/id/peta-teaser"), false);
  });
});

describe("planMapUrlWrite", () => {
  it("merges camera and layer patches onto the live map URL", () => {
    const plan = planMapUrlWrite({
      currentPathname: "/id/peta",
      livePathname: "/id/peta",
      currentSearch: "lat=4.4&lng=96.3&z=8&layers=laporanKejadian&area=villageDistribution",
      patch: { lat: "4.5", z: "9" },
    });
    assert.equal(plan.method, "replaceState");
    assert.match(plan.href, /^\/id\/peta\?/);
    assert.equal(new URLSearchParams(plan.search).get("lat"), "4.5");
    assert.equal(new URLSearchParams(plan.search).get("lng"), "96.3");
    assert.equal(new URLSearchParams(plan.search).get("z"), "9");
    assert.equal(new URLSearchParams(plan.search).get("layers"), "laporanKejadian");
    assert.equal(new URLSearchParams(plan.search).get("area"), "villageDistribution");
  });

  it("writes nasa and nasaDate on /peta without touching overlays", () => {
    const plan = planMapUrlWrite({
      currentPathname: "/id/peta",
      livePathname: "/id/peta",
      currentSearch: "overlays=sipongiHotspots&layers=laporanKejadian",
      patch: { nasa: "gibsTrueColor,firmsHotspots", nasaDate: "2026-09-08" },
    });
    assert.equal(plan.method, "replaceState");
    const qs = new URLSearchParams(plan.search);
    assert.equal(qs.get("nasa"), "gibsTrueColor,firmsHotspots");
    assert.equal(qs.get("nasaDate"), "2026-09-08");
    assert.equal(qs.get("overlays"), "sipongiHotspots");
    assert.equal(qs.get("layers"), "laporanKejadian");
  });

  it("keeps nasa query when a camera patch is applied", () => {
    const plan = planMapUrlWrite({
      currentPathname: "/id/peta",
      livePathname: "/id/peta",
      currentSearch: "lat=4.4&nasa=gibsTrueColor&nasaDate=2026-09-08",
      patch: { lat: "4.5", z: "9" },
    });
    assert.equal(plan.method, "replaceState");
    const qs = new URLSearchParams(plan.search);
    assert.equal(qs.get("lat"), "4.5");
    assert.equal(qs.get("nasa"), "gibsTrueColor");
    assert.equal(qs.get("nasaDate"), "2026-09-08");
  });

  it("skips nasa writes after leaving /peta so App Router nav is not bounced", () => {
    const plan = planMapUrlWrite({
      currentPathname: "/id/peta",
      livePathname: "/id/data-bencana",
      currentSearch: "nasa=gibsTrueColor",
      patch: { nasa: "gibsTrueColor,firmsHotspots" },
    });
    assert.equal(plan.method, "skip");
    assert.equal(plan.href, "");
  });

  it("skips when the live location has already left the map", () => {
    const plan = planMapUrlWrite({
      currentPathname: "/id/peta",
      livePathname: "/id/data-bencana",
      currentSearch: "lat=4.4",
      patch: { lat: "4.5" },
    });
    assert.equal(plan.method, "skip");
    assert.equal(plan.href, "");
  });

  it("skips when React pathname has left the map even if location lags", () => {
    const plan = planMapUrlWrite({
      currentPathname: "/id/data-bencana",
      livePathname: "/id/peta",
      currentSearch: "lat=4.4",
      patch: { lat: "4.5" },
    });
    assert.equal(plan.method, "skip");
  });

  it("deletes blank patch values and keeps a shareable query", () => {
    const params = applySearchParamsPatch("layers=disasterEvents,citizenReports", {
      layers: "laporanKejadian",
      cluster: null,
      hazard: "",
    });
    assert.equal(params.get("layers"), "laporanKejadian");
    assert.equal(params.has("cluster"), false);
    assert.equal(params.has("hazard"), false);
    assert.equal(composeMapHref("/en/peta", params.toString()), "/en/peta?layers=laporanKejadian");
  });
});

describe("shouldCancelMapUrlSyncOnClick", () => {
  it("cancels when a primary SiteNav link leaves /id/peta", () => {
    assert.equal(
      shouldCancelMapUrlSyncOnClick({
        href: "/id/data-bencana",
        currentPathname: "/id/peta",
      }),
      true
    );
    assert.equal(
      shouldCancelMapUrlSyncOnClick({
        href: "/id/lapor/kejadian",
        currentPathname: "/id/peta",
      }),
      true
    );
    assert.equal(
      shouldCancelMapUrlSyncOnClick({
        href: "/id",
        currentPathname: "/id/peta",
      }),
      true
    );
    assert.equal(isOffMapHref("/en/disaster-data", "/en/peta"), true);
  });

  it("does not cancel same-map deep links, modified clicks, or new tabs", () => {
    assert.equal(
      shouldCancelMapUrlSyncOnClick({
        href: "/id/peta?layers=laporanKejadian&area=villageDistribution",
        currentPathname: "/id/peta",
      }),
      false
    );
    assert.equal(
      shouldCancelMapUrlSyncOnClick({
        href: "/id/data-bencana",
        currentPathname: "/id/peta",
        metaKey: true,
      }),
      false
    );
    assert.equal(
      shouldCancelMapUrlSyncOnClick({
        href: "/id/data-bencana",
        currentPathname: "/id/peta",
        target: "_blank",
      }),
      false
    );
  });
});

describe("createMapUrlWriter leave cancels pending sync", () => {
  it("does not call replaceState after cancel, including a pending camera write", async () => {
    const hrefs: string[] = [];
    const timeouts: Array<() => void> = [];
    const writer = createMapUrlWriter({
      getLivePathname: () => "/id/peta",
      replaceState: (href) => hrefs.push(href),
      setTimeoutFn: (fn) => {
        timeouts.push(fn);
        return timeouts.length as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimeoutFn: () => {
        timeouts.length = 0;
      },
    });

    writer.schedule(
      () => ({
        currentPathname: "/id/peta",
        currentSearch: "lat=4.42&lng=96.33&z=8.1&layers=laporanKejadian",
        patch: { lat: "4.43", z: "8.2" },
      }),
      250
    );
    assert.equal(timeouts.length, 1);
    const pending = timeouts[0];

    writer.cancel();
    pending();

    assert.equal(hrefs.length, 0);
    assert.equal(writer.isCancelled(), true);
    assert.equal(
      writer.write({
        currentPathname: "/id/peta",
        currentSearch: "lat=4.42",
        patch: { lat: "5" },
      }).method,
      "skip"
    );
  });

  it("writes via replaceState while still on the map so App Router is not enqueued", () => {
    const hrefs: string[] = [];
    const writer = createMapUrlWriter({
      getLivePathname: () => "/id/peta",
      replaceState: (href) => hrefs.push(href),
    });
    const plan = writer.write({
      currentPathname: "/id/peta",
      currentSearch: "layers=laporanKejadian&area=villageDistribution",
      patch: { z: "8.15" },
    });
    assert.equal(plan.method, "replaceState");
    assert.deepEqual(hrefs, [plan.href]);
    assert.match(plan.href, /\/id\/peta\?/);
    assert.equal(new URLSearchParams(plan.search).get("layers"), "laporanKejadian");
    assert.equal(new URLSearchParams(plan.search).get("area"), "villageDistribution");
  });
});

describe("map URL hook must not fight App Router", () => {
  it("useMapUrlState writes with the cancellable replaceState helper, not router.replace", () => {
    const src = read("src/hooks/useMapUrlState.ts");
    assert.match(src, /createMapUrlWriter/);
    assert.match(src, /bindDocumentClick/);
    assert.equal(src.includes("router.replace"), false);
    assert.equal(/from "next\/navigation"/.test(src) && /useRouter/.test(src), false);
  });

  it("MapViewport does not keep a moveend timer that can fire after leaving /peta", () => {
    const src = read("src/components/map/MapViewport.tsx");
    assert.equal(src.includes("moveTimer"), false);
    assert.match(src, /onMoveEnd=\{onMoveEnd\}/);
  });
});

describe("public ?layers= links stay on live marker keys", () => {
  it("resolves beranda teaser, unused teaser, and kejadian-table links", () => {
    const live = new Set<string>(LIVE_MARKER_LAYER_KEYS);
    const peta = read("src/components/beranda/PetaPanel.tsx");
    const teaser = read("src/components/MapTeaserSection.tsx");
    const table = read("src/components/kejadian/KejadianTable.tsx");
    for (const key of ["disasterEvents", "facHealth", "laporanKejadian"]) {
      assert.match(peta, new RegExp(`key: "${key}"`));
      assert.equal(live.has(key), true, key);
      assert.deepEqual(parseMarkerLayers(key), [key]);
    }
    assert.match(teaser, /DEFAULT_LAYERS/);
    assert.match(table, /layers: "disasterEvents"/);
    for (const key of DEFAULT_LAYERS) {
      assert.equal(live.has(key), true, key);
      assert.deepEqual(parseMarkerLayers(key), [key]);
    }
  });
});
