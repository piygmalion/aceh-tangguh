import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { shiftCardIntoFreeArea } from "@/components/map/MapFeatureCard";
import { getBasemapStyle } from "@/lib/basemap";
import {
  SHEET_WHEEL_LINE_PX,
  attributionCreditParts,
  mapCreditFromAnchors,
  mapCreditParts,
  sheetWheelDelta,
  sheetWheelStep,
  styleSourceAttributions,
} from "@/lib/map-sheet";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("FE-74 sheet wheel, credit, and Laporkan accordion", () => {
  it("converts line and page wheel modes to pixels", () => {
    const bodyHeight = 398;
    assert.equal(SHEET_WHEEL_LINE_PX, 16);
    assert.equal(sheetWheelDelta(3, 1, bodyHeight), 48);
    assert.equal(sheetWheelDelta(1, 2, bodyHeight), bodyHeight);
    assert.equal(sheetWheelDelta(-2, 1, bodyHeight), -32);
    const sheetHeight = 464;
    assert.equal(sheetWheelDelta(1, 2, sheetHeight), sheetHeight);
    const page = sheetWheelStep({
      scrollTop: 0,
      scrollHeight: 1200,
      clientHeight: 200,
      pageHeight: sheetHeight,
      deltaY: 1,
      deltaMode: 2,
    });
    assert.equal(page.scrollTop, sheetHeight);
    assert.equal(page.remainder, 0);
    const source = read("src/components/map/MapFeatureSheet.tsx");
    assert.match(source, /pageHeight = el\.clientHeight/);
  });

  it("keeps trackpad momentum in the sheet without dropping sub-pixel ticks", () => {
    let scrollTop = 0;
    let remainder = 0;
    const flick = [0.4, 0.4, 0.4, 8, 5, 2, 0.6];
    for (const deltaY of flick) {
      const step = sheetWheelStep({
        scrollTop,
        scrollHeight: 772,
        clientHeight: 398,
        deltaY,
        deltaMode: 0,
        remainder,
      });
      scrollTop = step.scrollTop;
      remainder = step.remainder;
    }
    const expected = flick.reduce((sum, delta) => sum + delta, 0);
    assert.ok(Math.abs(scrollTop + remainder - expected) < 0.001);
    assert.ok(scrollTop >= 16);
    const sheet = read("src/components/map/MapFeatureSheet.tsx");
    assert.match(sheet, /sheetWheelStep/);
    assert.match(sheet, /pageHeight/);
    assert.match(sheet, /remainder/);
    assert.match(sheet, /event\.preventDefault\(\)/);
    assert.match(sheet, /passive: false/);
    assert.match(sheet, /addEventListener\("wheel", stop, \{ capture: true, passive: false \}\)/);
  });

  it("keeps the sheet header and grip from being selected", () => {
    const css = read("src/app/globals.css");
    assert.match(
      css,
      /\[data-sheet-header\],\s*\n\.map-feature-sheet \[data-sheet-handle\] \{\s*\n\s*user-select:\s*none;/,
    );
    const sheet = read("src/components/map/MapFeatureSheet.tsx");
    assert.match(sheet, /select-none/);
    assert.match(sheet, /data-sheet-header/);
    assert.match(sheet, /data-sheet-handle/);
    assert.match(
      css,
      /\[data-sheet-body\],\s*\n\.map-feature-sheet \[data-sheet-body\] \* \{\s*\n\s*user-select:\s*text;/,
    );
    assert.match(sheet, /data-sheet-grip/);
    assert.match(css, /\[data-sheet-grip\] \{\s*\n\s*user-select:\s*none;/);
    const body = sheet.slice(sheet.indexOf("data-sheet-body"), sheet.indexOf("data-sheet-body") + 280);
    assert.doesNotMatch(body, /select-none/);
  });

  it("opens Laporkan in the phone drawer as an inline accordion", () => {
    const lapor = read("src/components/laporan/ReportLaporDropdown.tsx");
    assert.match(lapor, /aria-expanded=\{open\}/);
    assert.match(lapor, /shape === "row" && "w-full"/);
    assert.match(lapor, /shape === "row" && "w-full justify-start"/);
    assert.match(lapor, /data-lapor-accordion/);
    assert.match(lapor, /data-lapor-chevron/);
    assert.match(lapor, /rotate-180/);
    assert.match(lapor, /event\.key !== "Enter" && event\.key !== " "/);
    assert.match(lapor, /marginLeft: -16, paddingLeft: 28, minHeight: 44/);
    assert.match(lapor, /shape !== "row"/);
    assert.match(lapor, /absolute right-0 top-full/);
    const nav = read("src/components/SiteNav.tsx");
    const mobile = nav.slice(nav.indexOf('data-nav-ia="mobile"'));
    assert.match(mobile, /shape="row"/);
    const desktop = nav.slice(0, nav.indexOf('data-nav-ia="mobile"'));
    assert.doesNotMatch(desktop, /shape="row"/);
  });

  it("shows the map credit in the sheet footer at full height", () => {
    const links = mapCreditFromAnchors([
      { href: "https://www.openstreetmap.org/copyright", text: " OpenStreetMap " },
      { href: "https://carto.com/attributions", text: "CARTO" },
      { href: "https://carto.com/attributions", text: "CARTO" },
    ]);
    assert.equal(links.length, 2);
    assert.equal(links[0]?.label, "OpenStreetMap");
    assert.equal(links[1]?.label, "CARTO");
    const plain = mapCreditParts([{ href: null, text: " © CARTO © OpenStreetMap " }]);
    assert.deepEqual(plain, [{ href: null, label: "© CARTO © OpenStreetMap" }]);
    const mixed = mapCreditParts([
      { href: null, text: "© OpenStreetMap contributors | " },
      { href: "https://maplibre.org/", text: "MapLibre" },
    ]);
    assert.deepEqual(mixed, [
      { href: null, label: "© OpenStreetMap contributors" },
      { href: "https://maplibre.org/", label: "MapLibre" },
    ]);
    const prevKey = process.env.NEXT_PUBLIC_CARTO_API_KEY;
    process.env.NEXT_PUBLIC_CARTO_API_KEY = "present";
    try {
      const cartoText = attributionCreditParts(styleSourceAttributions(getBasemapStyle("positron")))
        .map((part) => part.label)
        .join("");
      assert.equal(cartoText, "© OpenStreetMap contributors © CARTO");
      const cartoLinks = attributionCreditParts(styleSourceAttributions(getBasemapStyle("positron")));
      assert.equal(
        cartoLinks.find((part) => part.label === "OpenStreetMap")?.href,
        "https://www.openstreetmap.org/copyright",
      );
      assert.equal(
        cartoLinks.find((part) => part.label === "CARTO")?.href,
        "https://carto.com/attribution/",
      );
    } finally {
      if (prevKey === undefined) delete process.env.NEXT_PUBLIC_CARTO_API_KEY;
      else process.env.NEXT_PUBLIC_CARTO_API_KEY = prevKey;
    }
    const satelliteText = attributionCreditParts(styleSourceAttributions(getBasemapStyle("satellite")))
      .map((part) => part.label)
      .join("");
    assert.match(satelliteText, /Esri/);
    assert.match(satelliteText, /Vantor/);
    assert.match(satelliteText, /Earthstar Geographics/);
    assert.match(satelliteText, /GIS User Community/);
    assert.equal(
      attributionCreditParts(styleSourceAttributions(getBasemapStyle("satellite"))).find(
        (part) => part.label === "Esri",
      )?.href,
      "https://www.esri.com/en-us/legal/terms/data-attributions",
    );
    const sheet = read("src/components/map/MapFeatureSheet.tsx");
    const header = sheet.slice(sheet.indexOf('role="slider"'), sheet.indexOf("data-sheet-body"));
    assert.doesNotMatch(header, /data-sheet-credit/);
    const footer = sheet.slice(sheet.indexOf("data-sheet-body"));
    assert.match(footer, /data-sheet-credit/);
    assert.match(sheet, /attributionCreditParts/);
    assert.match(sheet, /creditHtml/);
    assert.doesNotMatch(sheet, /sheetFooterCredit/);
    assert.doesNotMatch(sheet, /© OpenStreetMap · MapLibre/);
    assert.match(sheet, /snap === "full"/);
    assert.match(sheet, /text-\[0\.8125rem\]/);
    assert.match(sheet, /height,/);
    const viewport = read("src/components/map/MapViewport.tsx");
    assert.match(viewport, /styleSourceAttributions\(mapStyle\)/);
    assert.match(viewport, /creditHtml=\{basemapCredit\}/);
    const css = read("src/app/globals.css");
    assert.match(css, /data-sheet-snap="full"\] \.maplibregl-ctrl-bottom-right/);
  });

  it("keeps a right-side popup clear of the report button and the attribution button", () => {
    const canvas = { left: 0, top: 96, right: 1112, bottom: 900 };
    const fab = { left: 1032, top: 820, right: 1088, bottom: 876 };
    const info = { left: 1072, top: 860, right: 1100, bottom: 888 };
    const attrib = { left: 833, top: 856, right: 1112, bottom: 900 };
    const card = { left: 768, top: 486, right: 1104, bottom: 848 };
    const overlapY = Math.min(card.bottom, fab.bottom) - Math.max(card.top, fab.top);
    assert.equal(overlapY, 28);
    const shift = shiftCardIntoFreeArea({ card, canvas, obstacles: [attrib, fab, info] });
    const placed = {
      left: card.left + shift.dx,
      top: card.top + shift.dy,
      right: card.right + shift.dx,
      bottom: card.bottom + shift.dy,
    };
    const blocks = (box: { left: number; top: number; right: number; bottom: number }) => {
      const grown = {
        left: box.left - 8,
        top: box.top - 8,
        right: box.right + 8,
        bottom: box.bottom + 8,
      };
      return (
        placed.left < grown.right &&
        grown.left < placed.right &&
        placed.top < grown.bottom &&
        grown.top < placed.bottom
      );
    };
    assert.equal(blocks(fab), false);
    assert.equal(blocks(info), false);
    assert.equal(blocks(attrib), false);
    assert.ok(placed.bottom <= fab.top - 8);
    const source = read("src/components/map/MapFeatureCard.tsx");
    assert.match(source, /\[data-map-chrome='fab'\] button/);
    assert.match(source, /\.maplibregl-ctrl-attrib-button/);
    assert.match(source, /\.maplibregl-ctrl-top-left \.maplibregl-ctrl-group/);
    const zoom = { left: 8, top: 106, right: 38, bottom: 176 };
    const overZoom = { left: 0, top: 110, right: 336, bottom: 470 };
    const zoomShift = shiftCardIntoFreeArea({
      card: overZoom,
      canvas,
      obstacles: [zoom, fab, info],
    });
    const cleared = {
      left: overZoom.left + zoomShift.dx,
      top: overZoom.top + zoomShift.dy,
      right: overZoom.right + zoomShift.dx,
      bottom: overZoom.bottom + zoomShift.dy,
    };
    const grownZoom = { left: zoom.left - 8, top: zoom.top - 8, right: zoom.right + 8, bottom: zoom.bottom + 8 };
    const hitsZoom =
      cleared.left < grownZoom.right &&
      grownZoom.left < cleared.right &&
      cleared.top < grownZoom.bottom &&
      grownZoom.top < cleared.bottom;
    assert.equal(hitsZoom, false);
  });
});
