import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { STATUS_HEX } from "./chart-colors";
import { COLOR_TOKENS } from "./layer-colors";
import { AREA_OUTLINE_COLOR, AREA_OUTLINE_COLOR_DARK } from "./village-distribution-lod";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("Peudeung v2 locks", () => {
  it("keeps STATUS_HEX on the hybrid scale and COLOR_TOKENS on the source palette", () => {
    assert.deepEqual(STATUS_HEX, {
      RENDAH: "#10B981",
      SEDANG: "#FBBF24",
      TINGGI: "#F97316",
      AWAS: "#C8102E",
    });
    assert.equal(COLOR_TOKENS.forest, "#1F4C15");
    assert.equal(COLOR_TOKENS.gold, "#C4A35A");
    assert.equal(COLOR_TOKENS.orange, "#FF7722");
    assert.equal(AREA_OUTLINE_COLOR, "rgba(17, 17, 17, 0.35)");
    assert.equal(AREA_OUTLINE_COLOR_DARK, "rgba(255, 255, 255, 0.30)");
  });

  it("aliases chrome status to the map scale and keeps legacy names for one release", () => {
    const css = read("src/app/globals.css");
    assert.match(css, /pendekatan warna PVMBG, bukan hex resmi|PVMBG colour approach, not/);
    assert.match(css, /--status-aman:\s*var\(--map-status-aman\)/);
    assert.match(css, /--status-waspada:\s*var\(--map-status-waspada\)/);
    assert.match(css, /--status-siaga:\s*var\(--map-status-siaga\)/);
    assert.match(css, /--status-awas:\s*var\(--map-status-awas\)/);
    assert.match(css, /--map-status-aman:\s*#10b981/);
    assert.match(css, /--map-status-waspada:\s*#fbbf24/);
    assert.match(css, /--map-status-siaga:\s*#f97316/);
    assert.match(css, /--map-status-awas:\s*#c8102e/);
    assert.match(css, /--status-awas-bar:\s*#ffffff/);
    assert.match(css, /--forest:\s*var\(--primary\)/);
    assert.match(css, /--sage:\s*var\(--text-dim\)/);
    assert.match(css, /--gold:\s*var\(--text-dim\)/);
    assert.match(css, /--orange:\s*var\(--primary\)/);
    assert.match(css, /--tangerine:\s*var\(--primary\)/);
    assert.match(css, /--bnpb-orange:\s*var\(--primary\)/);
    assert.match(css, /--burnt:\s*var\(--destructive\)/);
    assert.match(css, /--teal:\s*var\(--text\)/);
    assert.match(css, /--paper-warm:\s*var\(--bg\)/);
    assert.match(css, /--input:\s*#8a8a8a/);
    assert.match(css, /--chart-surface:\s*#0a0a0a/);
    assert.match(css, /stroke-dasharray:\s*7 6/);
  });

  it("limits the emergency strip to 112 and 117 and leaves Pusdalops empty", () => {
    const strip = read("src/components/EmergencyStrip.tsx");
    assert.match(strip, /tel:112/);
    assert.match(strip, /tel:117/);
    assert.equal(/tel:(?!112|117)\d+/.test(strip), false);
    const id = JSON.parse(read("messages/id.json")) as { nav: Record<string, string> };
    const en = JSON.parse(read("messages/en.json")) as { nav: Record<string, string> };
    assert.equal(id.nav.emergencyMissing, "belum ada");
    assert.equal(en.nav.emergencyMissing, "not available");
    const idMap = JSON.parse(read("messages/id.json")) as { map: Record<string, string> };
    assert.match(idMap.map.statusNote, /PVMBG/);
    assert.match(idMap.map.statusNote, /bukan hex resmi/);
  });
});
