import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { JSDOM } from "jsdom";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import {
  nextHeaderCompact,
  popupBottomReserve,
  popupHorizontalShift,
} from "@/components/map/MapFeatureCard";
import { StatusLegend } from "@/components/map/StatusLegend";
import { tanggapiBubbleOnViewport } from "@/components/panduan/GuideBot";
import messages from "../../messages/id.json";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const HANDLE_HEIGHT = 4.25 * 16;
const HANDLE_GAP = 0.5 * 16;
const STAGE_PAD = 4.25 * 16;
const ATTRIB_MARGIN = 10;
const ATTRIB_BUTTON = 24;

/** Distance from the viewport bottom to the top of the collapsed layer handle. */
function handleTopFromBottom(inset: number): number {
  return Math.max(HANDLE_GAP, inset) + HANDLE_HEIGHT;
}

/** Distance from the viewport bottom to the bottom edge of the ⓘ button.
 *  Stage padding already clears the handle; CSS bottom is only the inset. */
function attribButtonBottomFromBottom(inset: number): number {
  return STAGE_PAD + inset + ATTRIB_MARGIN;
}

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://127.0.0.1:3000/id/peta",
    pretendToBeVisual: true,
  });
  const w = dom.window;
  Object.defineProperty(w, "innerWidth", { value: 390, configurable: true });
  Object.defineProperty(w, "innerHeight", { value: 844, configurable: true });
  w.matchMedia = (query: string) =>
    ({
      matches: /max-width:\s*767px/.test(query),
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() {
        return false;
      },
    }) as unknown as MediaQueryList;
  const globals = {
    window: w,
    document: w.document,
    navigator: w.navigator,
    HTMLElement: w.HTMLElement,
    HTMLButtonElement: w.HTMLButtonElement,
    Element: w.Element,
    Node: w.Node,
    SVGElement: w.SVGElement,
    DocumentFragment: w.DocumentFragment,
    MutationObserver: w.MutationObserver,
    getComputedStyle: w.getComputedStyle.bind(w),
    requestAnimationFrame: w.requestAnimationFrame.bind(w),
    cancelAnimationFrame: w.cancelAnimationFrame.bind(w),
    MouseEvent: w.MouseEvent,
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  return dom;
}

describe("FE-72b map follow-up", () => {
  let dom: JSDOM;
  let root: Root | undefined;

  before(() => {
    dom = installDom();
  });

  after(async () => {
    if (root) {
      await act(async () => {
        root?.unmount();
      });
    }
    dom.window.close();
  });

  it("lifts attribution by the safe-area inset only", () => {
    const css = read("src/app/globals.css");
    const rule = css.slice(css.indexOf("@media (max-width: 767px)"));
    assert.match(
      rule,
      /bottom:\s*var\(--map-safe-area-bottom, env\(safe-area-inset-bottom, 0px\)\)/,
    );
    assert.doesNotMatch(rule, /4\.25rem \+/);
    assert.match(rule, /z-index:\s*40\s*!important/);
    assert.doesNotMatch(css, /data-feature-popup="open"\] \.maplibregl-ctrl-bottom/);
    assert.ok(attribButtonBottomFromBottom(34) > handleTopFromBottom(34));
    assert.ok(attribButtonBottomFromBottom(0) > handleTopFromBottom(0));
    const viewportH = 844;
    const info = {
      y: viewportH - attribButtonBottomFromBottom(34) - ATTRIB_BUTTON,
      h: ATTRIB_BUTTON,
    };
    const handle = {
      y: viewportH - handleTopFromBottom(34),
      h: HANDLE_HEIGHT,
    };
    assert.ok(info.y + info.h <= handle.y);
    assert.ok(Math.abs(info.y - 708) <= 12);

    const card = read("src/components/map/MapFeatureCard.tsx");
    assert.match(card, /stripHeight \+ 8/);
    assert.match(card, /safeAreaBottom/);
    assert.equal(
      popupBottomReserve({
        viewportHeight: 844,
        stripHeight: 44,
        stripTop: 730,
        safeAreaBottom: 34,
      }),
      844 - 730 + 8,
    );
    assert.equal(
      popupBottomReserve({
        viewportHeight: 844,
        stripHeight: 0,
        stripTop: null,
        safeAreaBottom: 34,
      }),
      34,
    );
    assert.equal(
      popupBottomReserve({
        viewportHeight: 844,
        stripHeight: 0,
        stripTop: null,
        safeAreaBottom: 0,
      }),
      8,
    );
  });

  it("hides the phone legend while the panel is open and collapses it until opened", async () => {
    const workspace = read("src/components/map/MapWorkspace.tsx");
    const mobile = workspace.slice(workspace.indexOf("<StatusLegend"), workspace.indexOf("<MapToolbar"));
    assert.match(mobile, /collapsible/);
    assert.match(mobile, /layerPanelOpen && "hidden"/);
    assert.doesNotMatch(mobile, /layerPanelOpen && "max-md:hidden"/);
    const chip = read("src/components/ui/StatusScaleChip.tsx");
    assert.match(chip, /border-\[var\(--map-keyline\)\]/);
    assert.match(chip, /\{label\}/);
    assert.match(read("src/app/globals.css"), /--map-keyline:\s*#111111/);

    document.body.replaceChildren();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const next = createRoot(host);
    root = next;
    const legend = createElement(StatusLegend, { collapsible: true });
    const intl = createElement(
      NextIntlClientProvider as (props: {
        locale: string;
        messages: AbstractIntlMessages;
        timeZone: string;
        children?: ReactNode;
      }) => ReactNode,
      { locale: "id", messages: messages as unknown as AbstractIntlMessages, timeZone: "Asia/Jakarta" },
      legend,
    );
    await act(async () => {
      next.render(intl);
    });

    const toggle = document.querySelector("[data-legend-toggle]");
    assert.ok(toggle instanceof HTMLButtonElement);
    assert.equal(toggle.getAttribute("aria-expanded"), "false");
    assert.equal(document.querySelector("[data-status-level]"), null);
    assert.equal(document.querySelector("[data-status-legend]")?.getAttribute("data-legend-collapsed"), "true");

    await act(async () => {
      toggle.click();
    });
    assert.equal(toggle.getAttribute("aria-expanded"), "true");
    const chips = Array.from(document.querySelectorAll("[data-status-level]"));
    assert.equal(chips.length, 4);
    assert.ok(chips.every((el) => (el.textContent ?? "").trim().length > 0));
    assert.ok(chips.every((el) => el.querySelector("svg")));
  });

  it("keeps panel focus, holds the popup header, and closes overlay popups", () => {
    const viewport = read("src/components/map/MapViewport.tsx");
    const closeAt = viewport.indexOf("const closeFromPanel");
    const closeBody = viewport.slice(closeAt, closeAt + 420);
    assert.match(closeBody, /skipCanvasFocus\.current = true/);
    assert.match(closeBody, /setOverlayPopup\(null\)/);
    assert.match(closeBody, /setNasaFirmsPopup\(null\)/);
    assert.doesNotMatch(closeBody, /getCanvas\(\)/);
    assert.match(viewport, /getCanvas\(\)\?\.focus\(\)/);
    assert.doesNotMatch(viewport, /setAttribute\(\s*["']tabindex["']/);
    const toolbar = read("src/components/map/MapToolbar.tsx");
    assert.match(toolbar, /aceh:close-feature-popup/);
    assert.doesNotMatch(toolbar, /\.focus\(\)/);

    assert.match(read("src/components/map/MapFeatureCard.tsx"), /scrollTop > 24/);
    assert.match(read("src/components/map/MapFeatureCard.tsx"), /scrollTop < 8/);
    assert.equal(nextHeaderCompact(0, false), false);
    assert.equal(nextHeaderCompact(8, true), true);
    assert.equal(nextHeaderCompact(16, false), false);
    assert.equal(nextHeaderCompact(16, true), true);
    assert.equal(nextHeaderCompact(24, false), false);
    assert.equal(nextHeaderCompact(24, true), true);
    assert.equal(nextHeaderCompact(25, false), true);
    assert.equal(nextHeaderCompact(20, true), true);
    assert.equal(nextHeaderCompact(7, true), false);
  });

  it("keeps a loading and a loaded popup inside the 390 viewport", () => {
    const card = read("src/components/map/MapFeatureCard.tsx");
    assert.match(card, /popupHorizontalShift/);
    assert.match(card, /translateX/);
    assert.match(card, /ResizeObserver/);
    const viewport = 390;
    const loading = popupHorizontalShift({ left: -36, right: 180 }, viewport);
    assert.equal(-36 + loading, 8);
    assert.ok(180 + loading <= viewport - 8);
    const loaded = popupHorizontalShift({ left: -12, right: 324 }, viewport);
    assert.equal(-12 + loaded, 8);
    assert.ok(324 + loaded <= viewport - 8);
    assert.equal(popupHorizontalShift({ left: 16, right: 300 }, viewport), 0);
    const overflowRight = popupHorizontalShift({ left: 80, right: 400 }, viewport);
    assert.ok(80 + overflowRight >= 8);
    assert.ok(400 + overflowRight <= viewport - 8);
  });

  it("shows no Tanggapi invite on a phone and keeps the desktop bubble", () => {
    assert.equal(tanggapiBubbleOnViewport(true), false);
    assert.equal(tanggapiBubbleOnViewport(false), true);
    const bot = read("src/components/panduan/GuideBot.tsx");
    assert.doesNotMatch(bot, /IntersectionObserver/);
    assert.doesNotMatch(bot, /data-year-chart/);
    assert.match(bot, /tanggapiBubbleOnViewport/);
    const gate = bot.slice(bot.indexOf("tanggapiBubbleOnViewport"), bot.indexOf("setShowBubble(true)"));
    assert.match(gate, /setShowBubble\(false\)/);
    assert.match(gate, /return/);
    assert.match(bot, /setTimeout\(dismiss, 6000\)/);
    assert.match(bot, /dismissInvite/);
    assert.match(bot, /window\.addEventListener\("scroll"/);
    assert.match(bot, /max-md:!block max-md:max-w-\[17\.5rem\]/);
  });
});
