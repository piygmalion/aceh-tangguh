import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { JSDOM } from "jsdom";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { nextHeaderCompact } from "@/components/map/MapFeatureCard";
import { StatusLegend } from "@/components/map/StatusLegend";
import { yearChartBlocksTanggapiBubble } from "@/components/panduan/GuideBot";
import messages from "../../messages/id.json";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const HANDLE_HEIGHT = 4.25 * 16;
const HANDLE_GAP = 0.5 * 16;
const ATTRIB_MARGIN = 10;

function handleTopFromBottom(inset: number): number {
  return Math.max(HANDLE_GAP, inset) + HANDLE_HEIGHT;
}

function attribButtonFromBottom(inset: number): number {
  return HANDLE_HEIGHT + inset + ATTRIB_MARGIN;
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

  it("lifts attribution above the layer handle plus the safe-area inset", () => {
    const css = read("src/app/globals.css");
    assert.match(
      css,
      /bottom:\s*calc\(4\.25rem \+ var\(--map-safe-area-bottom, env\(safe-area-inset-bottom, 0px\)\)\)/,
    );
    assert.match(css, /@media \(max-width: 767px\)/);
    assert.doesNotMatch(css, /data-feature-popup="open"\] \.maplibregl-ctrl-bottom/);
    assert.ok(attribButtonFromBottom(34) > handleTopFromBottom(34));
    assert.ok(attribButtonFromBottom(0) > handleTopFromBottom(0));
    const viewportH = 844;
    const info = {
      y: viewportH - attribButtonFromBottom(34) - 20,
      h: 20,
    };
    const handle = {
      y: viewportH - handleTopFromBottom(34),
      h: HANDLE_HEIGHT,
    };
    assert.ok(info.y + info.h <= handle.y);
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

    assert.equal(nextHeaderCompact(0, false), false);
    assert.equal(nextHeaderCompact(16, false), false);
    assert.equal(nextHeaderCompact(16, true), true);
    assert.equal(nextHeaderCompact(25, false), true);
    assert.equal(nextHeaderCompact(20, true), true);
    assert.equal(nextHeaderCompact(7, true), false);
  });

  it("holds the phone invite while the year chart is on screen", () => {
    assert.equal(yearChartBlocksTanggapiBubble(true, true), true);
    assert.equal(yearChartBlocksTanggapiBubble(true, false), false);
    assert.equal(yearChartBlocksTanggapiBubble(false, true), false);
    const bot = read("src/components/panduan/GuideBot.tsx");
    assert.match(bot, /IntersectionObserver/);
    assert.match(bot, /data-year-chart/);
    assert.match(bot, /setTimeout\(dismiss, 6000\)/);
    assert.match(bot, /dismissInvite/);
    assert.match(bot, /if \(!narrow\) window\.addEventListener\("scroll"/);
    assert.match(read("src/components/beranda/YearBars.tsx"), /data-year-chart/);
  });
});
