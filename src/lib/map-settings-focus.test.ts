import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { JSDOM } from "jsdom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { MapSettings } from "@/components/map/MapSettings";
import messages from "../../messages/en.json";

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://127.0.0.1:3000/id/peta",
    pretendToBeVisual: true,
  });
  const w = dom.window;
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
  w.localStorage.setItem("at-theme", "dark");
  globalThis.fetch = (async () =>
    new Response("null", { status: 404, headers: { "content-type": "application/json" } })) as typeof fetch;
  return dom;
}

describe("MapSettings focus return", () => {
  let dom: JSDOM;
  let root: Root | undefined;

  before(() => {
    dom = installDom();
  });

  after(async () => {
    const mounted = root;
    if (mounted) {
      await act(async () => {
        mounted.unmount();
      });
    }
    dom.window.close();
  });

  async function render() {
    const previous = root;
    if (previous) {
      await act(async () => {
        previous.unmount();
      });
    }
    document.body.replaceChildren();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const next = createRoot(host);
    root = next;
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const intl = createElement(
      NextIntlClientProvider as (props: {
        locale: string;
        messages: AbstractIntlMessages;
        timeZone: string;
        children?: ReactNode;
      }) => ReactNode,
      {
        locale: "en",
        messages: messages as unknown as AbstractIntlMessages,
        timeZone: "UTC",
      },
      createElement(
        ThemeProvider,
        null,
        createElement(MapSettings, { basemap: "positron", onBasemapChange: () => {} }),
        createElement("button", { type: "button", id: "outside-button" }, "Outside"),
        createElement("input", { id: "outside-input" }),
      ),
    );
    const tree: ReactNode = createElement(QueryClientProvider, { client }, intl);
    await act(async () => {
      next.render(tree);
    });
  }

  function toggle(): HTMLButtonElement {
    const button = document.querySelector("button[aria-haspopup='dialog']");
    assert.ok(button instanceof HTMLButtonElement);
    return button;
  }

  async function openPanel() {
    await render();
    await act(async () => {
      toggle().click();
    });
    assert.ok(document.querySelector("[role='dialog']"));
  }

  it("returns focus to the Pengaturan button on Escape", async () => {
    await openPanel();
    const button = toggle();
    const close = document.querySelector("button[aria-label='Close settings']");
    assert.ok(close instanceof HTMLButtonElement);
    await act(async () => {
      close.focus();
    });
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    assert.equal(document.querySelector("[role='dialog']"), null);
    assert.equal(document.activeElement, button);
  });

  it("returns focus to the Pengaturan button from the close button", async () => {
    await openPanel();
    const button = toggle();
    const close = document.querySelector("button[aria-label='Close settings']");
    assert.ok(close instanceof HTMLButtonElement);
    await act(async () => {
      close.click();
    });
    assert.equal(document.querySelector("[role='dialog']"), null);
    assert.equal(document.activeElement, button);
  });

  it("leaves focus on an outside button", async () => {
    await openPanel();
    const outside = document.getElementById("outside-button");
    assert.ok(outside instanceof HTMLButtonElement);
    await act(async () => {
      outside.focus();
      outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    assert.equal(document.querySelector("[role='dialog']"), null);
    assert.equal(document.activeElement, outside);
  });

  it("leaves focus on an outside input", async () => {
    await openPanel();
    const outside = document.getElementById("outside-input");
    assert.ok(outside instanceof HTMLInputElement);
    await act(async () => {
      outside.focus();
      outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    assert.equal(document.querySelector("[role='dialog']"), null);
    assert.equal(document.activeElement, outside);
  });
});
