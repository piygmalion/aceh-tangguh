import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  acceptFeatureCard,
  loadFeatureCard,
  reduceFeatureSlot,
} from "@/lib/feature-card-query";
import { nearestSheetSnap, sheetFrame } from "@/lib/map-sheet";

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
  it("snaps the phone sheet to peek, half, and full above the layer handle", () => {
    const frame = sheetFrame(844, 34);
    assert.equal(frame.bottom, 4.25 * 16 + 34);
    assert.equal(frame.peek, 120);
    assert.ok(frame.half > frame.peek);
    assert.ok(frame.half < frame.full);
    assert.equal(nearestSheetSnap(frame.peek, frame), "peek");
    assert.equal(nearestSheetSnap(frame.half, frame), "half");
    assert.equal(nearestSheetSnap(frame.full, frame), "full");
    assert.equal(nearestSheetSnap(frame.peek - 60, frame), "closed");
    const zero = sheetFrame(844, 0);
    assert.equal(zero.bottom, 4.25 * 16 + 8);
    const viewport = read("src/components/map/MapViewport.tsx");
    assert.match(viewport, /MapFeatureSheet/);
    assert.match(viewport, /max-width: 767px/);
    assert.match(viewport, /layout="sheet"/);
    assert.match(viewport, /layout="popup"/);
    assert.match(read("src/components/map/MapFeatureSheet.tsx"), /data-sheet-snap/);
    assert.match(read("src/components/map/MapFeatureSheet.tsx"), /safe-area-inset-bottom/);
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
    assert.match(fab, /5\.75rem\+var\(--map-credit-strip,44px\)\+8px/);
    assert.match(read("src/app/globals.css"), /--map-credit-strip:\s*44px/);
    const viewportH = 844;
    const strip = 44;
    const fabSize = 56;
    const base = 5.75 * 16;
    const fabBottom = base + strip + 8;
    const fabBox = {
      x: 390 - 12 - fabSize,
      y: viewportH - fabBottom - fabSize,
      w: fabSize,
      h: fabSize,
    };
    const info0 = { x: 356, y: 742, w: 24, h: 24 };
    const info34 = { x: 356, y: 708, w: 24, h: 24 };
    const zoom = { x: 10, y: 106, w: 29, h: 29 };
    assert.equal(intersects(fabBox, info0), false);
    assert.equal(intersects(fabBox, info34), false);
    assert.equal(intersects(zoom, info0), false);
    assert.equal(intersects(zoom, info34), false);
    assert.ok(info34.y >= fabBox.y + fabBox.h);
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
});
