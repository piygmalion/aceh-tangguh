import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COLOR_TOKENS } from "./layer-colors";
import { STATUS_HEX } from "./chart-colors";

describe("INS-47 warna AWAS peta", () => {
  it("sama dengan kartu Peringatan Dini (#C8102E) dan --map-status-awas", () => {
    assert.equal(COLOR_TOKENS.awas, STATUS_HEX.AWAS);
    assert.equal(COLOR_TOKENS.awas.toLowerCase(), "#c8102e");
    const css = readFileSync("src/app/globals.css", "utf8");
    assert.match(css, /--map-status-awas:\s*#c8102e/i);
    assert.equal(COLOR_TOKENS.awasOutline, "#111111");
  });
});
