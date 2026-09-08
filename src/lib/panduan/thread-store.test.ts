import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  clearTanggapiThread,
  loadTanggapiThread,
  parseTanggapiThread,
  saveTanggapiThread,
  serializeTanggapiThread,
  TANGGAPI_THREAD_MAX_MESSAGES,
  TANGGAPI_THREAD_STORAGE,
} from "./thread-store";
import type { GuideHref } from "./types";

function mockSession() {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem(key: string) {
        return data.has(key) ? data.get(key)! : null;
      },
      setItem(key: string, value: string) {
        data.set(key, String(value));
      },
      removeItem(key: string) {
        data.delete(key);
      },
    },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {},
  });
  return data;
}

describe("tanggapi thread store", () => {
  afterEach(() => {
    delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
    delete (globalThis as { window?: unknown }).window;
  });

  it("strips a phone number from a user message and keeps a feed figure on the bot", () => {
    const thread = serializeTanggapiThread({
      slots: { kabupaten: "Aceh Utara" },
      messages: [
        { id: "user-1", role: "user", body: "hubungi 081234567890 sekarang" },
        {
          id: "bot-1",
          role: "bot",
          intent: "peringatan",
          body: "Tatonas: AWLR Buga Water Level 84.187 cm (AMAN).",
          clauses: ["Cuaca: tidak ada peringatan ekstrem.", "Gempa MAGMA: 2.7 SR."],
        },
      ],
    });
    assert.match(thread.messages[0]?.body ?? "", /\[tel\]/);
    assert.doesNotMatch(thread.messages[0]?.body ?? "", /081234567890/);
    assert.match(thread.messages[1]?.body ?? "", /84\.187/);
    assert.equal(thread.messages[1]?.clauses?.length, 2);
    assert.equal(thread.slots.kabupaten, "Aceh Utara");
  });

  it("drops broken JSON and unknown versions", () => {
    assert.equal(parseTanggapiThread(null), null);
    assert.equal(parseTanggapiThread({ version: 99, messages: [] }), null);
    assert.equal(parseTanggapiThread({ version: 1, messages: "nope" }), null);
  });

  it("caps at 40 messages and rejects a /peta-only invented href", () => {
    const messages = Array.from({ length: TANGGAPI_THREAD_MAX_MESSAGES + 5 }, (_, i) => ({
      id: `m-${i}`,
      role: "bot" as const,
      body: `pesan ${i}`,
      links: [{ href: "/destana" as GuideHref, labelKey: "linkDestana" }],
    }));
    messages[0].links = [
      { href: "/peta" as GuideHref, labelKey: "linkPeta" },
      { href: "/not-a-page" as never, labelKey: "x" },
    ];
    const thread = serializeTanggapiThread({ messages, slots: {} });
    assert.equal(thread.messages.length, TANGGAPI_THREAD_MAX_MESSAGES);
    assert.equal(thread.messages[0]?.id, "m-5");
    const withPeta = parseTanggapiThread({
      version: 1,
      messages: [
        {
          id: "bot-p",
          role: "bot",
          body: "peta",
          links: [{ href: "/peta", labelKey: "linkPeta" }, { href: "https://evil.example", labelKey: "x" }],
        },
      ],
      slots: {},
    });
    assert.equal(withPeta?.messages[0]?.links?.length, 1);
    assert.equal(withPeta?.messages[0]?.links?.[0]?.href, "/peta");
  });

  it("round-trips through sessionStorage and clears without touching other keys", () => {
    const data = mockSession();
    data.set("aceh:tanggapi-bubble-seen", "1");
    saveTanggapiThread({
      slots: { lastIntent: "cuaca" },
      messages: [{ id: "bot-1", role: "bot", body: "Prakiraan Banda Aceh: berawan." }],
    });
    const loaded = loadTanggapiThread();
    assert.equal(loaded?.messages[0]?.body.includes("Banda Aceh"), true);
    assert.equal(loaded?.slots.lastIntent, "cuaca");
    clearTanggapiThread();
    assert.equal(loadTanggapiThread(), null);
    assert.equal(data.get("aceh:tanggapi-bubble-seen"), "1");
    assert.equal(data.has(TANGGAPI_THREAD_STORAGE), false);
  });
});