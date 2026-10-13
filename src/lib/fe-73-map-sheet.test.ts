import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  acceptFeatureCard,
  loadFeatureCard,
  reduceFeatureSlot,
} from "@/lib/feature-card-query";
import {
  nearestSheetSnap,
  sheetCameraPadding,
  sheetFrame,
  shouldCloseSheetOnMapClick,
} from "@/lib/map-sheet";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

function intersects(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

describe("FE-73 map sheet", () => {
  it("snaps the phone sheet to default and full under the site header", () => {
    const tall = sheetFrame(844, 34, 2000);
    assert.equal(tall.default, Math.round(844 * 0.55));
    assert.equal(tall.full, Math.round(844 * 0.85));
    assert.ok(844 - tall.full >= 96);
    assert.equal(tall.safeAreaBottom, 34);
    const short = sheetFrame(844, 0, 300);
    assert.equal(short.default, 300);
    assert.equal(nearestSheetSnap(tall.default, tall), "default");
    assert.equal(nearestSheetSnap(tall.full, tall), "full");
    assert.equal(nearestSheetSnap(tall.default - 40, tall), "closed");
    assert.equal(sheetCameraPadding("default", tall.default).bottom, tall.default);
    assert.equal(sheetCameraPadding("full", tall.full).bottom, 0);
    assert.equal(sheetCameraPadding("closed", 0).bottom, 0);
    const viewport = read("src/components/map/MapViewport.tsx");
    assert.match(viewport, /MapFeatureSheet/);
    assert.match(viewport, /max-width: 767px/);
    assert.match(viewport, /layout="sheet"/);
    assert.match(viewport, /layout="popup"/);
    assert.match(viewport, /sheetCameraPadding\(sheetSnap, sheetHeight\)/);
    assert.match(viewport, /sheetCameraPadding\("closed", 0\)/);
    assert.match(viewport, /easeTo\(\{/);
    assert.doesNotMatch(viewport, /router\.replace/);
    const sheet = read("src/components/map/MapFeatureSheet.tsx");
    assert.match(sheet, /data-sheet-snap/);
    assert.match(sheet, /safe-area-inset-bottom/);
    assert.match(sheet, /paddingBottom: frame.safeAreaBottom/);
    assert.match(sheet, /bottom: 0/);
    assert.doesNotMatch(sheet, /peek/);
  });

  it("hides the layer handle, closes on empty map, and keeps a marker tap open", () => {
    const css = read("src/app/globals.css");
    const hide = css.slice(css.indexOf("Phone sheet covers"));
    assert.match(hide, /max-width: 767px/);
    assert.match(hide, /\[data-feature-popup="open"\] aside\[data-layer-panel\]/);
    assert.match(hide, /display:\s*none/);
    const workspace = read("src/components/map/MapWorkspace.tsx");
    const toolbarAt = workspace.indexOf("<MapToolbar");
    const toolbarMount = workspace.slice(toolbarAt, workspace.indexOf("<div", toolbarAt));
    assert.equal(toolbarMount.includes("featurePopupOpen"), false);
    assert.equal(
      shouldCloseSheetOnMapClick({ narrow: true, sheetOpen: true, hitFeature: false }),
      true,
    );
    assert.equal(
      shouldCloseSheetOnMapClick({ narrow: true, sheetOpen: true, hitFeature: true }),
      false,
    );
    assert.equal(
      shouldCloseSheetOnMapClick({ narrow: false, sheetOpen: true, hitFeature: false }),
      false,
    );
    const viewport = read("src/components/map/MapViewport.tsx");
    assert.match(viewport, /shouldCloseSheetOnMapClick/);
    assert.match(viewport, /closeEmptySheet/);
    assert.match(viewport, /setPopup\(\{/);
    const marker = viewport.slice(viewport.indexOf("pointFeat && pointFeat.geometry.type"));
    assert.match(marker, /setPopup\(\{/);
    assert.doesNotMatch(marker.slice(0, marker.indexOf("setCardId(id)")), /setPopup\(null\)/);
    const sheet = read("src/components/map/MapFeatureSheet.tsx");
    assert.match(sheet, /event.key !== "Escape"/);
    assert.match(sheet, /data-sheet-close/);
    assert.match(sheet, /h-11 w-11/);
    assert.match(sheet, /height: SHEET_HEADER_PX/);
    assert.match(viewport, /getCanvas\(\)\?\.focus\(\)/);
    assert.match(sheet, /stopPropagation/);
    assert.match(css, /z-index:\s*40 !important/);
  });

  it("re-clamps an open popup when the map moves", () => {
    const viewport = read("src/components/map/MapViewport.tsx");
    assert.match(viewport, /onMove=\{onMapMove\}/);
    assert.match(viewport, /aceh:map-move/);
    const card = read("src/components/map/MapFeatureCard.tsx");
    assert.match(card, /aceh:map-move/);
    const clamp = card.slice(card.indexOf("function clampCardHorizontally"));
    assert.match(clamp, /popupHorizontalShift\(\{ left: rect\.left, right: rect\.right \}, window\.innerWidth\)/);
  });

  it("keeps the credit button and the report FAB apart at 390", () => {
    const fab = read("src/components/map/ReportFAB.tsx");
    assert.match(
      fab,
      /5\.75rem\+var\(--map-credit-strip,44px\)\+8px\+var\(--map-safe-area-bottom,env\(safe-area-inset-bottom,0px\)\)/,
    );
    assert.match(fab, /stage\.style\.setProperty\("--map-credit-strip"/);
    assert.match(fab, /documentElement\.style\.removeProperty\("--map-credit-strip"\)/);
    assert.doesNotMatch(fab, /documentElement\.style\.setProperty\("--map-credit-strip"/);
    const css = read("src/app/globals.css");
    assert.match(css, /\.map-stage \{\s*--map-credit-strip:\s*44px;/);
    const home = read("src/components/panduan/GuideBot.tsx");
    assert.match(home, /bottom-\[calc\(1rem\+env\(safe-area-inset-bottom,0px\)\)\]/);
    assert.match(read("src/app/[locale]/page.tsx"), /pb-\[4\.5rem\]/);
    assert.match(read("src/components/beranda/DataHero.tsx"), /max-md:pb-\[4\.5rem\]/);
    const viewportH = 844;
    const strip = 44;
    const fabSize = 56;
    const base = 5.75 * 16;
    const gap = (safe: number, infoY: number) => {
      const fabBottom = base + strip + 8 + safe;
      const fabTop = viewportH - fabBottom - fabSize;
      return infoY - (fabTop + fabSize);
    };
    assert.ok(gap(0, 742) >= 16);
    assert.ok(gap(34, 708) >= 16);
    const zoom = { x: 10, y: 106, w: 29, h: 29 };
    const info0 = { x: 356, y: 742, w: 24, h: 24 };
    const info34 = { x: 356, y: 708, w: 24, h: 24 };
    const fab0 = {
      x: 390 - 12 - fabSize,
      y: viewportH - (base + strip + 8) - fabSize,
      w: fabSize,
      h: fabSize,
    };
    const fab34 = {
      x: fab0.x,
      y: viewportH - (base + strip + 8 + 34) - fabSize,
      w: fabSize,
      h: fabSize,
    };
    assert.equal(intersects(fab0, info0), false);
    assert.equal(intersects(fab34, info34), false);
    assert.equal(intersects(zoom, info0), false);
  });

  it("gives status chips a 44px target and pads the kab/kota list", () => {
    const chip = read("src/components/ui/StatusScaleChip.tsx");
    assert.match(chip, /min-h-\[44px\]/);
    assert.match(chip, /min-w-\[44px\]/);
    const hero = read("src/components/beranda/DataHero.tsx");
    const list = hero.slice(hero.indexOf("statistik.kabTitle"), hero.indexOf("statistik.chartKabAria"));
    assert.match(list, /overflow-y-auto pb-6/);
  });

  it("does not let a delayed first tap overwrite the second feature", async () => {
    const pending = new Map<string, (card: { id: string }) => void>();
    const fetcher = (id: string, _layer: string | undefined, signal: AbortSignal) =>
      new Promise<{ id: string }>((resolve, reject) => {
        pending.set(id, resolve);
        signal.addEventListener("abort", () => {
          pending.delete(id);
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });

    const firstCtl = new AbortController();
    const first = loadFeatureCard("a", "disasterEvents", firstCtl.signal, fetcher);
    const secondCtl = new AbortController();
    firstCtl.abort();
    const second = loadFeatureCard("b", "disasterEvents", secondCtl.signal, fetcher);
    pending.get("b")?.({ id: "b" });
    await assert.rejects(first, (err: unknown) => (err as Error).name === "AbortError");
    assert.deepEqual(await second, { id: "b" });

    let slot = reduceFeatureSlot({ id: null, card: null }, { type: "tap", id: "a" });
    slot = reduceFeatureSlot(slot, { type: "tap", id: "b" });
    slot = reduceFeatureSlot(slot, { type: "result", id: "a", card: { id: "a" } });
    assert.equal(slot.card, null);
    assert.equal(acceptFeatureCard(slot.id, { id: "a" }), false);
    slot = reduceFeatureSlot(slot, { type: "result", id: "b", card: { id: "b" } });
    assert.equal(slot.card?.id, "b");
    assert.equal(acceptFeatureCard("b", slot.card), true);

    const viewport = read("src/components/map/MapViewport.tsx");
    assert.match(viewport, /loadFeatureCard/);
    assert.match(viewport, /queryKey\[2\]/);
    assert.match(viewport, /signal/);
    assert.match(viewport, /acceptFeatureCard/);
    assert.match(read("src/lib/qk.ts"), /feature-card", id/);
  });

  it("rejects a card response that arrives after the tap was aborted", async () => {
    let resolveFetch: (card: { id: string }) => void = () => {};
    const fetcher = (_id: string, _layer: string | undefined, _signal: AbortSignal) =>
      new Promise<{ id: string }>((resolve) => {
        resolveFetch = resolve;
      });
    const ctl = new AbortController();
    const pending = loadFeatureCard("a", "disasterEvents", ctl.signal, fetcher);
    ctl.abort();
    resolveFetch({ id: "a" });
    await assert.rejects(pending, (err: unknown) => (err as Error).name === "AbortError");
    assert.equal(acceptFeatureCard("b", { id: "a" }), false);
  });
});
