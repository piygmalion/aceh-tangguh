import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  MAP_DOT_RADIUS_PX,
  MAP_PIN_DISC_PX,
  MAP_PIN_GLYPH_PX,
  TOOLBAR_DISC_PX,
  TOOLBAR_GLYPH_PX,
} from "./map-marker-chrome";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function mapNs(locale: "id" | "en"): Record<string, string> {
  const root = JSON.parse(read(`messages/${locale}.json`)) as {
    map: Record<string, string>;
  };
  return root.map;
}

function leftoverSpace(src: string): string[] {
  return src
    .split("\n")
    .filter((line) => /space-[xy]-/.test(line) && !/space-[xy]-0/.test(line));
}

describe("FE-33 map SoT-2 UX", () => {
  it("tightens MapFeatureCard padding/stack/gap without changing marker chrome", () => {
    const card = read("src/components/map/MapFeatureCard.tsx");
    const css = read("src/app/globals.css");
    const cardCss = css.slice(css.indexOf(".map-feature-card {"));

    assert.match(card, /flex flex-col gap-/);
    assert.deepEqual(leftoverSpace(card), [], "MapFeatureCard still uses space-y-* / space-x-*");
    assert.equal(/lime|bg-lime|text-lime/.test(card), false);
    assert.equal(card.includes("size="), false, "card must not override MapLayerIcon size");
    assert.equal(
      cardCss.includes("padding: 0.85rem 0.95rem 1rem"),
      false,
      "card padding should be tighter than FE-29",
    );
    assert.match(cardCss, /padding:\s*0\.625rem 0\.75rem 0\.75rem/);
    assert.match(cardCss, /width:\s*min\(21rem/);

    assert.equal(MAP_DOT_RADIUS_PX, 7);
    assert.equal(MAP_PIN_GLYPH_PX, 24);
    assert.equal(MAP_PIN_DISC_PX, 28);
    assert.equal(TOOLBAR_GLYPH_PX, 20);
    assert.equal(TOOLBAR_DISC_PX, 32);
  });

  it("shows Empty or Skeleton plus data-tertunda retry on overlay stale/503", () => {
    assert.equal(existsSync(join(ROOT, "src/components/map/OverlayLiveStatus.tsx")), true);
    const status = read("src/components/map/OverlayLiveStatus.tsx");
    const toolbar = read("src/components/map/MapToolbar.tsx");
    const hook = read("src/hooks/useOverlayGeojson.ts");

    assert.equal(status.includes('from "@/components/ui/empty"'), true);
    assert.equal(status.includes('from "@/components/ui/skeleton"'), true);
    assert.match(status, /overlayLiveStale/);
    assert.match(status, /overlayLiveRetry/);
    assert.match(status, /TYPE_FLOOR_CLASS/);
    assert.match(status, /variant="accent"/);
    assert.equal(/lime|bg-lime|text-lime/.test(status), false);
    assert.match(status, /data-testid="overlay-live-skeleton"/);
    assert.match(status, /data-testid="overlay-live-empty"/);
    assert.deepEqual(leftoverSpace(status), [], "OverlayLiveStatus still uses space-y-*");

    assert.match(toolbar, /OverlayLiveStatus/);
    assert.match(toolbar, /useLiveOverlayStatus/);
    assert.equal(toolbar.includes("overlayLiveUpstreamHint"), false);
    assert.match(hook, /useLiveOverlayStatus/);
    assert.match(hook, /liveOverlayKeysForRetry/);
    assert.match(hook, /invalidateQueries/);

    assert.equal(mapNs("id").overlayLiveStale, "Data tertunda");
    assert.equal(mapNs("en").overlayLiveStale, "Delayed data");
    assert.equal(mapNs("id").overlayLiveRetry, "Coba lagi");
    assert.equal(mapNs("en").overlayLiveRetry, "Try again");
    assert.equal(
      mapNs("id").overlayLiveStaleHint,
      "Umpan hidup tertunda. Layer yang tampil mungkin cache lama.",
    );
  });

  it("does not retile, invent points, or touch AreaProfil / SIK / basemap", () => {
    const status = read("src/components/map/OverlayLiveStatus.tsx");
    const hook = read("src/hooks/useOverlayGeojson.ts");
    assert.equal(/pmtiles|retile|invent/i.test(status), false);
    assert.equal(status.includes("AreaProfilPanel"), false);
    assert.equal(hook.includes("EMPTY_FC"), true);
    assert.match(hook, /asFeatureCollection\(input\.body\) \?\? EMPTY_FC/);
  });
});
