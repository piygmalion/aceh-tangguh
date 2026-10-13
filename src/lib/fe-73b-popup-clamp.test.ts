import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { JSDOM } from "jsdom";
import { phoneBandRightPad } from "@/lib/home-fab-reserve";
import { sheetScrollTarget, sheetWheelScrollTop } from "@/lib/map-sheet";
import {
  freeMapHorizontalBounds,
  popupHorizontalShift,
  maxCardHeightInFreeArea,
  shiftCardIntoFreeArea,
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

  it("keeps the card out of the legend, settings, panel, and attribution", () => {
    const canvas = { left: 0, top: 96, right: 1112, bottom: 900 };
    const legend = { left: 16, top: 528, right: 298, bottom: 828 };
    const settings = { left: 16, top: 840, right: 147, bottom: 884 };
    const panel = { left: 1116, top: 96, right: 1428, bottom: 888 };
    const attrib = { left: 820, top: 848, right: 1098, bottom: 892 };
    const offLeft = shiftCardIntoFreeArea({
      card: { left: -12, top: 522, right: 324, bottom: 884 },
      canvas,
      obstacles: [legend, settings, panel, attrib],
    });
    const left = -12 + offLeft.dx;
    const bottom = 884 + offLeft.dy;
    assert.ok(left >= legend.right + 8);
    assert.ok(bottom <= settings.top - 8 || left >= settings.right + 8);
    assert.ok(left + 336 <= panel.left - 8);

    const overPanel = shiftCardIntoFreeArea({
      card: { left: 772, top: 522, right: 1108, bottom: 884 },
      canvas,
      obstacles: [legend, settings, panel, attrib],
    });
    const right = 1108 + overPanel.dx;
    const overBottom = 884 + overPanel.dy;
    assert.ok(right <= panel.left - 8);
    assert.ok(right <= attrib.left - 8 || overBottom <= attrib.top - 8);
    assert.ok(772 + overPanel.dx >= legend.right + 8);

    const card = read("src/components/map/MapFeatureCard.tsx");
    assert.match(card, /data-status-legend/);
    assert.match(card, /button\[aria-expanded\]/);
    assert.match(card, /aside\[data-layer-panel\]/);
    assert.match(card, /maplibregl-ctrl-bottom-right/);
    assert.match(card, /maplibregl-canvas/);

    const tall = { left: 768, top: 104, right: 1104, bottom: 876 };
    const room = maxCardHeightInFreeArea({
      card: tall,
      canvas,
      obstacles: [legend, settings, panel, attrib],
    });
    assert.ok(room < tall.bottom - tall.top);
    assert.ok(104 + room <= attrib.top - 8);
  });

  it("re-clamps after move end", () => {
    const viewport = read("src/components/map/MapViewport.tsx");
    const end = viewport.slice(viewport.indexOf("const onMoveEnd"));
    assert.match(end, /requestAnimationFrame/);
    assert.match(end, /aceh:map-move/);
    const card = read("src/components/map/MapFeatureCard.tsx");
    assert.match(card, /aceh:map-move/);
    assert.match(card, /fitSettled/);
    assert.match(card, /measurePopupFreeArea/);
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
    assert.match(sheet, /sheetScrollTarget/);
    assert.match(sheet, /data-sheet-scroller/);

    const dom = new JSDOM("<!doctype html><body></body>");
    const previous = {
      HTMLElement: globalThis.HTMLElement,
      Node: globalThis.Node,
    };
    globalThis.HTMLElement = dom.window.HTMLElement;
    globalThis.Node = dom.window.Node;
    const root = dom.window.document.createElement("div");
    const body = dom.window.document.createElement("div");
    body.setAttribute("data-sheet-body", "true");
    const inner = dom.window.document.createElement("div");
    root.append(body);
    body.append(inner);
    const scrolled = sheetScrollTarget(root, inner, (el) => el === body);
    assert.equal(scrolled, body);
    const fallback = sheetScrollTarget(root, inner, () => false);
    assert.equal(fallback, body);
    globalThis.HTMLElement = previous.HTMLElement;
    globalThis.Node = previous.Node;
  });

  it("does not focus the sheet header or the SIK Aceh logo while dragging", () => {
    const sheet = read("src/components/map/MapFeatureSheet.tsx");
    assert.match(sheet, /onMouseDown/);
    assert.match(sheet, /event\.preventDefault\(\)/);
    assert.match(sheet, /releaseSheetDragFocus/);
    assert.match(sheet, /SIK Aceh/);
    assert.match(sheet, /active\.blur\(\)/);
  });
});
