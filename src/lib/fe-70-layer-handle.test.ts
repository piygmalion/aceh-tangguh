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

describe("FE-70 layer handle at 390", () => {
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

  it("keeps Panel layer clickable while a feature popup is open and opens the panel", async () => {
    assert.equal(window.innerWidth, 390);
    const workspace = read("src/components/map/MapWorkspace.tsx");
    const toolbarAt = workspace.indexOf("<MapToolbar");
    const afterToolbar = workspace.indexOf("<div", toolbarAt);
    const toolbarMount = workspace.slice(toolbarAt, afterToolbar);
    assert.equal(toolbarMount.includes("featurePopupOpen"), false);
    assert.equal(toolbarMount.includes("max-md:hidden"), false);
    assert.equal(read("src/app/globals.css").includes('[data-feature-popup="open"] .map-stage'), false);
    assert.equal(messages.map.toolbarHandle, "Panel layer");
    assert.match(read("src/components/map/MapToolbar.tsx"), /aria-expanded=\{expanded\}/);
    assert.match(read("src/components/map/MapToolbar.tsx"), /setExpanded\(\(v\) => !v\)/);

    document.body.replaceChildren();
    const host = document.createElement("div");
    host.setAttribute("data-feature-popup", "open");
    document.body.appendChild(host);
    const next = createRoot(host);
    root = next;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const toolbar = createElement(MapToolbar, {
      areaLayer: null,
      onAreaLayerChange: () => {},
      markerLayers: ["disasterEvents"],
      onToggleMarker: () => {},
      disasterJenis: [],
      onToggleDisasterJenis: () => {},
      onToggleFasilitasUmum: () => {},
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

    const button = document.querySelector("button[aria-label='Buka panel layer']");
    assert.ok(button instanceof HTMLButtonElement);
    assert.match(button.textContent ?? "", /Panel layer/);
    assert.equal(button.hidden, false);
    assert.equal(button.getAttribute("aria-expanded"), "false");
    const aside = button.closest("aside");
    assert.ok(aside);
    assert.equal(aside.hidden, false);
    assert.match(aside.className, /z-30/);
    assert.doesNotMatch(aside.className, /max-md:hidden/);

    await act(async () => {
      button.click();
    });

    assert.equal(button.getAttribute("aria-expanded"), "true");
    assert.equal(button.getAttribute("aria-label"), "Tutup panel layer");
    assert.match(aside.className, /max-md:max-h-\[min\(52vh,28rem\)\]/);
    assert.ok(aside.textContent?.includes("Lokasi"));
  });
});
