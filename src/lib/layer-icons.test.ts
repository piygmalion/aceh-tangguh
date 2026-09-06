import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "path";
import { describe, it } from "node:test";
import {
  AREA_LAYER_ICON_FILES,
  DISASTER_JENIS_ICON_FILES,
  LAYER_ICON_FILES,
  listMapSymbolIcons,
  overlayIconImageId,
} from "./layer-icons";

function catalogFiles(): string[] {
  return [
    ...Object.values(LAYER_ICON_FILES),
    ...Object.values(AREA_LAYER_ICON_FILES),
    ...Object.values(DISASTER_JENIS_ICON_FILES),
  ];
}

function pngColorType(file: string): number {
  const buf = readFileSync(file);
  return buf[25];
}

describe("flat icon assets", () => {
  it("keeps every catalog PNG on disk as RGBA", () => {
    const seen = new Set<string>();
    for (const file of catalogFiles()) {
      if (seen.has(file)) continue;
      seen.add(file);
      const abs = path.join(process.cwd(), "public/icons/flat", file);
      assert.equal(existsSync(abs), true, `missing ${file}`);
      assert.equal(pngColorType(abs), 6, `${file} must be RGBA`);
    }
  });

  it("registers overlay point ids alongside layer and jenis glyphs", () => {
    const ids = new Set(listMapSymbolIcons().map((row) => row.id));
    assert.equal(ids.has("layer:disasterEvents"), true);
    assert.equal(ids.has("jenis:kebakaran"), true);
    assert.equal(ids.has(overlayIconImageId("maritimePorts")), true);
    assert.equal(ids.has(overlayIconImageId("bmkgQuakes")), true);
    assert.equal(ids.has(overlayIconImageId("inariskBahayaGempa")), false);
  });
});
