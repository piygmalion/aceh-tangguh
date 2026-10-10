import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { JSDOM } from "jsdom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { MapToolbar } from "@/components/map/MapToolbar";
import messages from "../../messages/id.json";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

type Box = { x: number; y: number; w: number; h: number };

function intersects(a: Box, b: Box): boolean {
  if (a.w <= 0 || a.h <= 0 || b.w <= 0 || b.h <= 0) return false;
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Tailwind spacing step 14 is 3.5rem. Root font size on this site is 16px. */
function tailwindLeftPx(className: string): number {
  const match = className.match(/left-(\d+)/);
  assert.ok(match, className);
  const step = Number(match[1]);
  assert.equal(step % 4, 2, "expected a half-rem step such as left-14");
  return (step / 4) * 16;
}

/**
 * MapLibre's default top-left navigation control: 10px margin, 29px buttons.
 * Compass stays on, so the group is three buttons tall.
 */
const ZOOM_390: Box = { x: 10, y: 106, w: 29, h: 87 };

/** Open layer sheet at 390×844: inset 8px, bottom 8px, height min(52vh, 28rem). */
function openPanelBox(width = 390, height = 844): Box {
  const inset = 8;
  const h = Math.min(height * 0.52, 28 * 16);
  return { x: inset, y: height - inset - h, w: width - inset * 2, h };
}

function settingsBox(width: number, height: number, hidden: boolean): Box {
  if (hidden) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: 12, y: height - 92 - 44, w: 44, h: 44 };
}

function fabBox(width: number, height: number, hidden: boolean): Box {
  if (hidden) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: width - 12 - 56, y: height - 92 - 56, w: 56, h: 56 };
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
    HTMLInputElement: w.HTMLInputElement,
    Element: w.Element,
    Node: w.Node,
    SVGElement: w.SVGElement,
    DocumentFragment: w.DocumentFragment,
    MutationObserver: w.MutationObserver,
    getComputedStyle: w.getComputedStyle.bind(w),
    requestAnimationFrame: w.requestAnimationFrame.bind(w),
    cancelAnimationFrame: w.cancelAnimationFrame.bind(w),
    MouseEvent: w.MouseEvent,
    KeyboardEvent: w.KeyboardEvent,
    Event: w.Event,
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  globalThis.fetch = (async () =>
    new Response("null", { status: 404, headers: { "content-type": "application/json" } })) as typeof fetch;
  return dom;
}

function chromeClause(workspace: string, marker: string): string {
  const at = workspace.indexOf(marker);
  assert.ok(at >= 0, marker);
  const slice = workspace.slice(at, at + 500);
  const classAt = slice.indexOf("className={cn(");
  assert.ok(classAt >= 0);
  return slice.slice(classAt, slice.indexOf(")}", classAt));
}

describe("FE-72 map chrome at 390", () => {
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

  it("hides settings and the report button while the layer panel is open below 768", async () => {
    assert.equal(window.innerWidth, 390);
    const workspace = read("src/components/map/MapWorkspace.tsx");
    const settings = chromeClause(workspace, 'data-map-chrome="settings"');
    const fab = chromeClause(workspace, 'data-map-chrome="fab"');
    assert.match(settings, /layerPanelOpen && "max-md:hidden"/);
    assert.match(fab, /layerPanelOpen && "max-md:hidden"/);
    assert.doesNotMatch(settings, /layerPanelOpen && "hidden"/);
    assert.doesNotMatch(fab, /layerPanelOpen && "hidden"/);
    assert.match(read("src/components/map/MapToolbar.tsx"), /onExpandedChange\?\.\(expanded\)/);
    assert.doesNotMatch(read("src/components/map/MapViewport.tsx"), /setAttribute\(\s*["']tabindex["']/);

    const panel = openPanelBox();
    const shownSettings = settingsBox(390, 844, false);
    const shownFab = fabBox(390, 844, false);
    assert.equal(intersects(shownSettings, panel), true);
    assert.equal(intersects(shownFab, panel), true);
    const hidden = true;
    assert.equal(intersects(settingsBox(390, 844, hidden), panel), false);
    assert.equal(intersects(fabBox(390, 844, hidden), panel), false);

    document.body.replaceChildren();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const next = createRoot(host);
    root = next;
    const toggled: string[] = [];
    let panelOpen = false;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const toolbar = createElement(MapToolbar, {
      areaLayer: null,
      onAreaLayerChange: () => {},
      markerLayers: ["disasterEvents"],
      onToggleMarker: (key) => {
        toggled.push(key);
      },
      disasterJenis: [],
      onToggleDisasterJenis: () => {},
      onToggleFasilitasUmum: () => {},
      onExpandedChange: (open) => {
        panelOpen = open;
      },
    });
    const intl = createElement(
      NextIntlClientProvider as (props: {
        locale: string;
        messages: AbstractIntlMessages;
        timeZone: string;
        children?: ReactNode;
      }) => ReactNode,
      { locale: "id", messages: messages as unknown as AbstractIntlMessages, timeZone: "Asia/Jakarta" },
      toolbar,
    );
    await act(async () => {
      next.render(createElement(QueryClientProvider, { client }, intl));
    });

    const handle = document.querySelector("button[aria-label='Buka panel layer']");
    assert.ok(handle instanceof HTMLButtonElement);
    await act(async () => {
      handle.click();
    });
    assert.equal(panelOpen, true);
    const aside = document.querySelector("aside[data-layer-panel='open']");
    assert.ok(aside);
    assert.equal(aside.querySelector("[data-map-chrome]"), null);

    const row = [...aside.querySelectorAll("label")].find((label) =>
      label.textContent?.includes("Laporan Kejadian"),
    );
    assert.ok(row, "Laporan Kejadian row is in the open panel");
    const box = row.querySelector("input[type='checkbox']");
    assert.ok(box instanceof HTMLInputElement);
    assert.equal(box.disabled, false);
    await act(async () => {
      box.click();
    });
    assert.deepEqual(toggled, ["laporanKejadian"]);
    assert.ok(aside.textContent?.includes("Jembatan"));
    assert.ok(aside.textContent?.includes("Infrastruktur"));
  });

  it("places the phone status legend clear of the zoom control", () => {
    const workspace = read("src/components/map/MapWorkspace.tsx");
    const mobile = workspace.slice(workspace.indexOf("<StatusLegend"), workspace.indexOf("<MapToolbar"));
    assert.match(mobile, /left-14/);
    assert.match(mobile, /top-\[5\.75rem\]/);
    assert.doesNotMatch(mobile, /left-3/);
    const left = tailwindLeftPx("left-14");
    assert.equal(left, 56);
    const legend: Box = { x: left, y: 5.75 * 16, w: 256, h: 220 };
    assert.equal(intersects(legend, ZOOM_390), false);
    const previous: Box = { ...legend, x: 12 };
    assert.equal(intersects(previous, ZOOM_390), true);

    const chip = read("src/components/ui/StatusScaleChip.tsx");
    assert.match(chip, /border-\[var\(--map-keyline\)\]/);
    assert.match(chip, /<Icon size=\{14\} aria-hidden \/>/);
    assert.match(chip, /\{label\}/);
    assert.match(read("src/app/globals.css"), /--map-keyline:\s*#111111/);
    const desktop = workspace.slice(workspace.indexOf('data-map-chrome="settings"'));
    assert.match(desktop, /hidden md:block/);
    assert.doesNotMatch(desktop.slice(0, desktop.indexOf("<MapSettings")), /left-14/);
  });

  it("stretches the mobile Laporkan control to the drawer row", () => {
    const lapor = read("src/components/laporan/ReportLaporDropdown.tsx");
    assert.match(lapor, /shape === "row" && "w-full"/);
    assert.match(lapor, /shape === "row" && "w-full justify-start"/);
    assert.match(lapor, /shape = "pill"/);
    const nav = read("src/components/SiteNav.tsx");
    const mobile = nav.slice(nav.indexOf('data-nav-ia="mobile"'));
    assert.match(mobile, /shape="row"/);
    const desktop = nav.slice(0, nav.indexOf('data-nav-ia="mobile"'));
    assert.doesNotMatch(desktop, /shape="row"/);
  });
});
