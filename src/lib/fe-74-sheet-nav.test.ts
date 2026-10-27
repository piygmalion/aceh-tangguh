import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  SHEET_WHEEL_LINE_PX,
  mapCreditFromAnchors,
  mapCreditParts,
  sheetFooterCredit,
  sheetWheelDelta,
  sheetWheelStep,
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
    const line = sheetFooterCredit(mixed);
    assert.deepEqual(
      line.map((item) => item.label).join(" · "),
      "© OpenStreetMap · MapLibre",
    );
    assert.equal(line[0]?.href, "https://www.openstreetmap.org/copyright");
    assert.equal(line[1]?.href, "https://maplibre.org/");
    assert.deepEqual(sheetFooterCredit([{ href: null, label: "Tiles © Esri" }]), []);
    const sheet = read("src/components/map/MapFeatureSheet.tsx");
    const header = sheet.slice(sheet.indexOf('role="slider"'), sheet.indexOf("data-sheet-body"));
    assert.doesNotMatch(header, /data-sheet-credit/);
    const footer = sheet.slice(sheet.indexOf("data-sheet-body"));
    assert.match(footer, /data-sheet-credit/);
    assert.match(sheet, /sheetFooterCredit/);
    assert.match(sheet, /mapCreditParts/);
    assert.match(sheet, /\.maplibregl-ctrl-attrib-inner/);
    assert.match(sheet, /inner\.childNodes/);
    assert.match(sheet, /snap === "full"/);
    assert.match(sheet, /\.maplibregl-ctrl-attrib/);
    assert.match(sheet, /text-\[0\.8125rem\]/);
    assert.match(sheet, /height,/);
    const css = read("src/app/globals.css");
    assert.match(css, /data-sheet-snap="full"\] \.maplibregl-ctrl-bottom-right/);
  });
});
