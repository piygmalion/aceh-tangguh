import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { unavailableMagmaCard } from "@/lib/peringatan-dini-types";
import type { TatonasHighlight } from "@/lib/tatonas/types";
import { magmaSummary, newestHighlightAgeMinutes, tatonasCopy } from "./card-copy";

const NOW = Date.parse("2026-10-27T03:20:00.000Z");

function highlight(timeLocal: string | null, level: TatonasHighlight["level"] = "AMAN"): TatonasHighlight {
  return {
    uid: timeLocal ?? "none",
    pos_name: "Pos",
    project: "BWS",
    logger_kind: "wl",
    sensor: "Water Level",
    value: 1,
    satuan: "cm",
    level,
    time_local: timeLocal,
  };
}

describe("tatonasCopy", () => {
  it("uses the stale sentence when nothing is fresh, including a missing count", () => {
    const copy = tatonasCopy(
      {
        highlights: [highlight("2026-10-27 10:00:00"), highlight("2026-10-27 09:40:00")],
      },
      NOW,
    );
    assert.deepEqual(copy, { kind: "stale", menit: 20 });
  });

  it("floors a missing clock at 15 minutes", () => {
    assert.equal(newestHighlightAgeMinutes([null, "bukan-waktu"], NOW), 15);
    const copy = tatonasCopy({ fresh_count: 0, alert_count: 0, highlights: [] }, NOW);
    assert.deepEqual(copy, { kind: "stale", menit: 15 });
  });

  it("says every station is normal when fresh posts have no alert", () => {
    const copy = tatonasCopy(
      { fresh_count: 2, alert_count: 0, highlights: [highlight("2026-10-27 10:19:00")] },
      NOW,
    );
    assert.deepEqual(copy, { kind: "normal" });
  });

  it("shows alert_count when fresh WASPADA or AWAS posts exist", () => {
    const copy = tatonasCopy(
      { fresh_count: 3, alert_count: 2, highlights: [highlight("2026-10-27 10:19:00", "AWAS")] },
      NOW,
    );
    assert.deepEqual(copy, { kind: "alert", count: 2 });
  });
});

describe("magmaSummary", () => {
  it("separates unavailable from a live empty feed and from an event", () => {
    assert.equal(magmaSummary(unavailableMagmaCard()), "unavailable");
    assert.equal(
      magmaSummary({ source: "live", empty: true, event: null }),
      "empty",
    );
    assert.equal(
      magmaSummary({
        source: "live",
        empty: false,
        event: {
          id: "ROQ20261020232935",
          magnitude: 5.4,
          magnitude_text: "5.4 SR",
          waktu_kejadian: "—",
          koordinat_kedalaman: "—",
          wilayah: "Meulaboh",
          intensitas_mmi: null,
          gunung_api_terdekat: null,
          href: "https://magma.esdm.go.id/",
          occurred_at: null,
        },
      }),
      "event",
    );
  });
});

describe("PeringatanBento copy wiring", () => {
  const src = readFileSync(
    path.join(process.cwd(), "src/components/beranda/PeringatanBento.tsx"),
    "utf8",
  );

  it("does not count Tatonas highlights as posts above threshold", () => {
    assert.match(src, /tatonasCopy/);
    assert.match(src, /peringatan\.tatonasStale/);
    assert.match(src, /peringatan\.magmaUnavailable/);
    assert.equal(src.includes("pd.tatonas.highlights.length"), false);
    assert.match(src, /toneLevel/);
    assert.equal(src.includes('"awas"'), false);
  });
});
