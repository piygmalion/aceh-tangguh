import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "path";
import { describe, it } from "node:test";
import {
  COLOR_TOKENS,
  LAYER_COLORS,
  OFFICIAL_COLOR_HEX,
} from "./layer-colors";

const LEFTOVER_RAINBOW = [
  "#f59e0b",
  "#f97316",
  "#dc2626",
  "#0ea5e9",
  "#38bdf8",
  "#0369a1",
  "#1d4ed8",
  "#e11d48",
  "#7c3aed",
  "#475569",
  "#0d9488",
  "#a16207",
  "#ea580c",
  "#0f766e",
  "#64748b",
];

describe("LAYER_COLORS tokens", () => {
  it("uses official tokens only — no leftover Tailwind lime/sky/violet", () => {
    for (const [key, hex] of Object.entries(LAYER_COLORS)) {
      assert.ok(
        OFFICIAL_COLOR_HEX.has(hex),
        `${key} uses leftover ${hex} instead of an official token`
      );
      assert.equal(LEFTOVER_RAINBOW.includes(hex.toLowerCase()), false);
    }
    assert.equal(LAYER_COLORS.policeOffices, COLOR_TOKENS.ink);
    assert.equal(LAYER_COLORS.facEducation, COLOR_TOKENS.sage);
  });

  it("tokenizes leftover marker/area colors in public/icons/flat/index.json", () => {
    const file = path.join(process.cwd(), "public/icons/flat/index.json");
    const catalog = JSON.parse(readFileSync(file, "utf8")) as {
      markerLayers: { id: string; color: string }[];
      areaLayers: { id: string; color: string }[];
    };
    for (const row of [...catalog.markerLayers, ...catalog.areaLayers]) {
      assert.ok(
        OFFICIAL_COLOR_HEX.has(row.color),
        `${row.id} catalog color ${row.color} is not an official token`
      );
      assert.equal(LEFTOVER_RAINBOW.includes(row.color.toLowerCase()), false);
    }
  });
});
