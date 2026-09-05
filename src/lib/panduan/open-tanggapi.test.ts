import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  consumeOpenTanggapi,
  hasSeenTanggapiBubble,
  markTanggapiBubbleSeen,
  requestOpenTanggapi,
  TANGGAPI_BUBBLE_STORAGE,
  TANGGAPI_OPEN_STORAGE,
} from "./open-tanggapi";

function mockSession() {
  const data = new Map<string, string>();
  const store = {
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    setItem(key: string, value: string) {
      data.set(key, String(value));
    },
    removeItem(key: string) {
      data.delete(key);
    },
  };
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: store,
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      dispatchEvent() {
        return true;
      },
    },
  });
  return data;
}

describe("tanggapi open + bubble session", () => {
  afterEach(() => {
    delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
    delete (globalThis as { window?: unknown }).window;
  });

  it("keeps the first-visit bubble until it is marked seen", () => {
    mockSession();
    assert.equal(hasSeenTanggapiBubble(), false);
    markTanggapiBubbleSeen();
    assert.equal(hasSeenTanggapiBubble(), true);
  });

  it("does not mix the bubble flag with the queued-open flag", () => {
    const data = mockSession();
    requestOpenTanggapi();
    assert.equal(data.get(TANGGAPI_OPEN_STORAGE), "1");
    assert.equal(data.get(TANGGAPI_BUBBLE_STORAGE), undefined);
    assert.equal(hasSeenTanggapiBubble(), false);
    assert.equal(consumeOpenTanggapi(), true);
    assert.equal(consumeOpenTanggapi(), false);
  });
});
