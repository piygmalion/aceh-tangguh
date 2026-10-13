import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { phoneBandRightPad } from "@/lib/home-fab-reserve";
import { sheetWheelScrollTop } from "@/lib/map-sheet";
import {
  freeMapHorizontalBounds,
  popupHorizontalShift,
  shiftIntoHorizontalArea,
} from "@/components/map/MapFeatureCard";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("FE-73b popup clamp and sheet wheel", () => {
  it("keeps the card inside the free map area with an 8px margin", () => {
    const viewport = 1440;
    const legendRight = 248;
    const zoomRight = 61;
    const panelLeft = 1116;
    const area = freeMapHorizontalBounds({
      viewportWidth: viewport,
      leftRights: [legendRight, zoomRight],
      rightLefts: [panelLeft],
    });
    assert.equal(area.left, legendRight + 8);
    assert.equal(area.right, panelLeft - 8);
    assert.ok(area.left > zoomRight + 8);

    const offLeft = shiftIntoHorizontalArea({ left: -12, right: 324 }, area);
    assert.equal(-12 + offLeft, area.left);
    assert.ok(324 + offLeft <= area.right);

    const overPanel = shiftIntoHorizontalArea({ left: 948, right: 1284 }, area);
    assert.equal(948 + overPanel, area.right - (1284 - 948));
    assert.ok(1284 + overPanel <= panelLeft - 8);
    assert.ok(948 + overPanel >= legendRight + 8);

    const phone = popupHorizontalShift({ left: -12, right: 324 }, 390);
    assert.equal(-12 + phone, 8);
  });

  it("re-clamps after move end", () => {
    const viewport = read("src/components/map/MapViewport.tsx");
    const end = viewport.slice(viewport.indexOf("const onMoveEnd"));
    assert.match(end, /requestAnimationFrame/);
    assert.match(end, /aceh:map-move/);
    const card = read("src/components/map/MapFeatureCard.tsx");
    assert.match(card, /aceh:map-move/);
    assert.match(card, /fitSettled/);
    assert.match(card, /data-map-chrome='settings'/);
    assert.match(card, /maplibregl-ctrl-top-left/);
    assert.match(card, /aside\[data-layer-panel\]/);
  });

  it("pads the home band clear of the Tanggapi button and keeps the button low", () => {
    const pad = phoneBandRightPad({
      viewportWidth: 390,
      sectionPadX: 16,
      fabRight: 12,
      fabSize: 56,
    });
    assert.equal(pad, 60);
    assert.equal(pad / 16, 3.75);
    const hero = read("src/components/beranda/DataHero.tsx");
    assert.match(hero, /data-fab-reserve/);
    assert.match(hero, /max-md:pr-\[3\.75rem\]/);
    const bot = read("src/components/panduan/GuideBot.tsx");
    assert.match(bot, /bottom-\[calc\(1rem\+env\(safe-area-inset-bottom,0px\)\)\]/);
    assert.match(bot, /right-3/);
  });

  it("scrolls the sheet on wheel and leaves the map zoom alone", () => {
    const next = sheetWheelScrollTop({
      scrollTop: 0,
      scrollHeight: 772,
      clientHeight: 398,
      deltaY: 400,
    });
    assert.ok(next > 0);
    assert.equal(next, 374);
    const capped = sheetWheelScrollTop({
      scrollTop: 370,
      scrollHeight: 772,
      clientHeight: 398,
      deltaY: 400,
    });
    assert.equal(capped, 374);
    const sheet = read("src/components/map/MapFeatureSheet.tsx");
    assert.match(sheet, /sheetWheelScrollTop/);
    assert.match(sheet, /event\.preventDefault\(\)/);
    assert.match(sheet, /passive: false/);
    const css = read("src/app/globals.css");
    assert.match(css, /\.map-feature-sheet \.map-feature-card-body[\s\S]*overflow:\s*visible/);
    assert.match(css, /\[data-sheet-header\],\s*\n\.map-feature-sheet \[data-sheet-handle\] \{\s*\n\s*user-select:\s*none;/);
    assert.match(sheet, /select-none/);
  });
});
