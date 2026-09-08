import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { PeringatanDiniResponse } from "@/lib/peringatan-dini-types";
import { emptyMaritimCard, unavailableMagmaCard } from "@/lib/peringatan-dini-types";
import {
  buildDailyBriefWhatsApp,
  composeDailyBrief,
  feedAvailability,
  maskWhatsAppPhone,
  parseBriefYmd,
  resolveDailyBriefSubscriberInput,
} from "./compose";

function emptyPeringatan(overrides: Partial<PeringatanDiniResponse> = {}): PeringatanDiniResponse {
  return {
    cuaca: {
      kind: "cuaca",
      tone: "neutral",
      empty: true,
      highlights: [],
      extra_count: 0,
      fetched_at: "2026-09-07T00:00:00.000Z",
      providers: ["bmkg"],
      href: "#cuaca",
      stale: false,
      source: "live",
    },
    magma: {
      kind: "magma",
      tone: "neutral",
      empty: true,
      event: null,
      fetched_at: "2026-09-07T00:00:00.000Z",
      href: "https://magma.esdm.go.id/",
      stale: false,
      source: "live",
    },
    sipongi: {
      kind: "sipongi",
      tone: "neutral",
      empty: true,
      points: [],
      fetched_at: "2026-09-07T00:00:00.000Z",
      href: "https://sipongi.gakkum.kehutanan.go.id/peta",
      stale: false,
      source: "live",
    },
    tatonas: {
      kind: "tatonas",
      tone: "neutral",
      empty: true,
      highlights: [],
      extra_count: 0,
      station_count: 0,
      fetched_at: "2026-09-07T00:00:00.000Z",
      href: "https://tatonas.co.id/monitoring/",
      stale: false,
      source: "live",
    },
    maritim: emptyMaritimCard("2026-09-07T00:00:00.000Z"),
    ...overrides,
  };
}

describe("AN-38 daily brief compose", () => {
  it("treats unavailable MAGMA as delayed and does not copy a leftover event", () => {
    const leftover = unavailableMagmaCard();
    leftover.event = {
      id: "x",
      magnitude: 5.1,
      magnitude_text: "M5.1",
      waktu_kejadian: "kemarin",
      koordinat_kedalaman: "",
      wilayah: "Aceh Besar",
      intensitas_mmi: null,
      gunung_api_terdekat: null,
      href: "",
      occurred_at: "2026-09-06T00:00:00.000Z",
    };
    const summary = composeDailyBrief({
      briefDate: "2026-09-07",
      peringatan: emptyPeringatan({ magma: leftover }),
      gempa: { queryOk: true, count: 0 },
      kejadian: { rowOk: true, activeIncidents: 2 },
    });
    const magma = summary.feeds.find((f) => f.kind === "magma");
    assert.equal(magma?.availability, "unavailable");
    assert.equal(magma?.headline, "data tertunda");
    assert.equal(magma?.headline?.includes("M5.1"), false);
  });

  it("does not write gempa count 0 when the overlay query fails", () => {
    const summary = composeDailyBrief({
      briefDate: "2026-09-07",
      peringatan: emptyPeringatan(),
      gempa: { queryOk: false, count: 0 },
      kejadian: { rowOk: false, activeIncidents: 99 },
    });
    const gempa = summary.feeds.find((f) => f.kind === "gempa");
    assert.equal(gempa?.availability, "unavailable");
    assert.equal(gempa?.count, null);
    assert.equal(gempa?.headline, "data tertunda");
    const kejadian = summary.feeds.find((f) => f.kind === "kejadian");
    assert.equal(kejadian?.count, null);
    assert.equal(kejadian?.headline, "data tertunda");
  });

  it("keeps a live empty cuaca card without inventing rainfall", () => {
    assert.equal(feedAvailability({ empty: true, source: "live" }), "empty");
    const summary = composeDailyBrief({
      briefDate: "2026-09-07",
      peringatan: emptyPeringatan(),
      gempa: { queryOk: true, count: 3 },
      kejadian: { rowOk: true, activeIncidents: 1 },
    });
    const cuaca = summary.feeds.find((f) => f.kind === "cuaca");
    assert.equal(cuaca?.availability, "empty");
    assert.equal(cuaca?.headline, null);
    const gempa = summary.feeds.find((f) => f.kind === "gempa");
    assert.equal(gempa?.count, 3);
    assert.match(summary.disclaimer, /112/);
    assert.doesNotMatch(JSON.stringify(summary), /IRBI|DIBI|WeatherNext|loggerKind|KRB/);
  });

  it("builds a WhatsApp body with the public brief path and no phone numbers", () => {
    const summary = composeDailyBrief({
      briefDate: "2026-09-07",
      peringatan: emptyPeringatan(),
      gempa: { queryOk: true, count: 0 },
      kejadian: { rowOk: true, activeIncidents: 0 },
    });
    const text = buildDailyBriefWhatsApp(summary, "id");
    assert.match(text, /Aceh Tangguh — ringkasan harian/);
    assert.match(text, /\/id\/brief\/2026-09-07/);
    assert.match(text, /112/);
    assert.doesNotMatch(text, /\+62|phone_enc/);
  });

  it("parses ymd and masks staff phone numbers", () => {
    assert.equal(parseBriefYmd("20260907"), "2026-09-07");
    assert.equal(parseBriefYmd("2026-09-07"), "2026-09-07");
    assert.equal(parseBriefYmd("nope"), null);
    assert.equal(maskWhatsAppPhone("6281234567890"), "6281***90");
  });

  it("swaps name and phone when the operator fills the form backwards", () => {
    const swapped = resolveDailyBriefSubscriberInput("test", "081279895959");
    assert.equal(swapped.phone, "081279895959");
    assert.equal(swapped.name, "test");
    assert.equal(swapped.swapped, true);
    const fromNameOnly = resolveDailyBriefSubscriberInput("", "081279895959");
    assert.equal(fromNameOnly.swapped, true);
    assert.equal(fromNameOnly.phone, "081279895959");
    const ok = resolveDailyBriefSubscriberInput("081234567890", "Hafid");
    assert.equal(ok.swapped, false);
    assert.equal(ok.phone, "081234567890");
  });

  it("does not mention maritime, AN-36, or public OTP in compose", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/daily-brief/compose.ts"), "utf8");
    assert.doesNotMatch(src, /maritim|OTP|Z-API|loggerKind/i);
  });
});
