import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { jamPendek } from "@/components/beranda/format";
import type { CuacaHighlight, PeringatanTone } from "@/lib/peringatan-dini-types";
import { cuacaBentoView } from "./card-copy";

const FETCHED = "2026-10-28T01:00:00.000Z";

function highlight(): CuacaHighlight {
  return {
    kabupaten: "Pidie",
    kondisi: "Hujan lebat",
    curah_hujan_mm: null,
    periode: null,
    source_label: "BMKG",
  };
}

function card(overrides: {
  source: "live" | "fixture" | "unavailable";
  stale: boolean;
  empty: boolean;
  highlights?: CuacaHighlight[];
  extra_count?: number;
  tone?: PeringatanTone;
  fetched_at?: string | null;
}) {
  return {
    source: overrides.source,
    stale: overrides.stale,
    empty: overrides.empty,
    highlights: overrides.highlights ?? [],
    extra_count: overrides.extra_count ?? 0,
    tone: overrides.tone ?? "neutral",
    fetched_at: overrides.fetched_at === undefined ? FETCHED : overrides.fetched_at,
  };
}

function messages() {
  const id = JSON.parse(readFileSync(path.join(process.cwd(), "messages/id.json"), "utf8")) as {
    beranda: { peringatan: Record<string, string> };
    peringatanDini: { stale: string; tone: Record<string, string> };
  };
  const en = JSON.parse(readFileSync(path.join(process.cwd(), "messages/en.json"), "utf8")) as {
    beranda: { peringatan: Record<string, string> };
    peringatanDini: { stale: string; tone: Record<string, string> };
  };
  return { id, en };
}

describe("cuaca bento states", () => {
  it("shows a tone chip and the warning count for fresh data with warnings", () => {
    const view = cuacaBentoView(
      card({
        source: "live",
        stale: false,
        empty: false,
        tone: "siaga",
        highlights: [highlight(), highlight()],
        extra_count: 1,
      }),
    );
    assert.equal(view.kind, "warnings");
    assert.equal(view.summaryKey, "cuacaCount");
    assert.equal(view.chip, "tone");
    assert.equal(view.grey, false);
    assert.equal(view.tone, "siaga");
    assert.equal(view.footer, "time");
    assert.equal(view.showDetails, true);
    assert.equal(jamPendek(FETCHED, "id") == null, false);
  });

  it("shows the empty sentence and a Normal tone chip only for fresh data with zero warnings", () => {
    const view = cuacaBentoView(
      card({ source: "live", stale: false, empty: true, highlights: [], fetched_at: FETCHED }),
    );
    const { id, en } = messages();
    assert.equal(view.kind, "empty");
    assert.equal(view.summaryKey, "cuacaEmpty");
    assert.equal(view.chip, "tone");
    assert.equal(view.grey, false);
    assert.equal(view.tone, "neutral");
    assert.equal(view.footer, "time");
    assert.equal(view.showDetails, false);
    assert.equal(id.beranda.peringatan.cuacaEmpty, "Tidak ada peringatan cuaca aktif");
    assert.equal(en.beranda.peringatan.cuacaEmpty, "No active weather warning");
    assert.equal(id.peringatanDini.tone.neutral, "Normal");
    assert.equal(en.peringatanDini.tone.neutral, "Normal");
  });

  it("uses the grey stale chip and a new sentence when the feed is unavailable", () => {
    const view = cuacaBentoView(
      card({
        source: "unavailable",
        stale: true,
        empty: true,
        highlights: [highlight()],
        tone: "siaga",
        fetched_at: null,
      }),
    );
    const { id, en } = messages();
    assert.equal(view.kind, "unavailable");
    assert.equal(view.summaryKey, "cuacaUnavailable");
    assert.equal(view.chip, "stale");
    assert.equal(view.grey, true);
    assert.equal(view.tone, "neutral");
    assert.equal(view.footer, "snapshot");
    assert.equal(view.showDetails, false);
    assert.equal(id.beranda.peringatan.cuacaUnavailable, "Data cuaca belum diperbarui");
    assert.equal(en.beranda.peringatan.cuacaUnavailable, "Weather data not yet updated");
    assert.notEqual(id.beranda.peringatan.cuacaUnavailable, id.beranda.peringatan.cuacaEmpty);
    assert.equal(id.beranda.peringatan.snapshot, "Belum ada data terbaru");
    assert.equal(en.beranda.peringatan.snapshot, "No newer data yet");
    assert.equal(id.peringatanDini.stale, "Data tertunda");
    assert.equal(en.peringatanDini.stale, "Data delayed");
    assert.equal(jamPendek(null, "id"), null);
  });

  it("treats stale:true as unavailable even when the source is still live", () => {
    const view = cuacaBentoView(
      card({
        source: "live",
        stale: true,
        empty: true,
        tone: "neutral",
        highlights: [],
        fetched_at: FETCHED,
      }),
    );
    assert.equal(view.kind, "unavailable");
    assert.equal(view.summaryKey, "cuacaUnavailable");
    assert.equal(view.chip, "stale");
    assert.equal(view.grey, true);
    assert.equal(view.footer, "snapshot");
    assert.equal(view.showDetails, false);
  });
});

describe("PeringatanBento cuaca wiring", () => {
  const src = readFileSync(
    path.join(process.cwd(), "src/components/beranda/PeringatanBento.tsx"),
    "utf8",
  );
  const cuaca = src.slice(src.indexOf('key: "cuaca"'), src.indexOf('key: "magma"'));

  it("builds the weather card from cuacaBentoView and the existing stale footer", () => {
    assert.match(src, /cuacaBentoView/);
    assert.match(cuaca, /summaryKey === "cuacaCount"/);
    assert.match(cuaca, /peringatan\.cuacaCount/);
    assert.match(cuaca, /peringatan\.\$\{view\.summaryKey\}/);
    assert.match(cuaca, /view\.showDetails/);
    assert.match(cuaca, /view\.footer === "snapshot"/);
    assert.match(cuaca, /view\.chip/);
    assert.match(cuaca, /view\.grey/);
    assert.match(src, /kartu\.basi \? t\("peringatan\.snapshot"\)/);
    assert.match(src, /kartu\.chip === "stale"[\s\S]*tp\("stale"\)/);
    assert.match(src, /uppercase/);
    assert.doesNotMatch(cuaca, /#[0-9A-Fa-f]{3,8}/);
    assert.equal(cuaca.includes("cuacaEmpty"), false);
  });
});
