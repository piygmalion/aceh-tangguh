import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { CALON_SOURCES } from "@/lib/overlay-calon";
import { isOverlayLayerKey, parseOverlayLayers } from "@/lib/overlay-layers";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("AN-57 isolation: NASA NRT vs official overlays", () => {
  it("official overlay live and calon do not import nasa-nrt", () => {
    const live = read("src/lib/overlay-live.ts");
    const calon = read("src/lib/overlay-calon.ts");
    const pd = read("src/lib/peringatan-dini/weather-summary.ts");
    const compose = read("src/lib/daily-brief/compose.ts");
    for (const src of [live, calon, pd, compose]) {
      assert.doesNotMatch(src, /nasa-nrt|GIBS|FIRMS_MAP_KEY|gibsTrueColor|firmsHotspots/i);
    }
  });

  it("calon sources stay BMKG MAGMA Sipongi Tatonas", () => {
    assert.deepEqual([...CALON_SOURCES], ["bmkg", "magma", "sipongi", "tatonas"]);
  });

  it("nasa tokens are not OverlayLayerKey and drop from overlays=", () => {
    assert.equal(isOverlayLayerKey("gibsTrueColor"), false);
    assert.equal(isOverlayLayerKey("firmsHotspots"), false);
    assert.deepEqual(parseOverlayLayers("sipongiHotspots,firmsHotspots,gibsTrueColor"), [
      "sipongiHotspots",
    ]);
  });

  it("FIRMS GET does not import overlay-live or calon", () => {
    const route = read("src/app/api/nasa-nrt/firms/route.ts");
    const load = read("src/lib/nasa-nrt/load.ts");
    const firms = read("src/lib/nasa-nrt/firms.ts");
    for (const src of [route, load, firms]) {
      assert.doesNotMatch(src, /overlay-live|overlay-calon|overlay_live_features/);
    }
    assert.match(route, /getFirmsHotspots/);
    assert.match(read("security/attack-surface.md"), /\/api\/nasa-nrt\/firms/);
    assert.match(read("security/attack-surface.md"), /\/api\/nasa-nrt\/gibs\/time/);
  });

  it("i18n copy matches AN-57 unofficial pill", () => {
    const id = JSON.parse(read("messages/id.json")) as { map: Record<string, string> };
    const en = JSON.parse(read("messages/en.json")) as { map: Record<string, string> };
    assert.equal(id.map.nasaNrtPill, "Bukan peringatan resmi");
    assert.equal(en.map.nasaNrtPill, "Not an official warning");
    assert.match(id.map.nasaNrtCloudHint, /awan/i);
    assert.match(id.map.nasaNrtCloudHint, /ubin putih/i);
    assert.equal(id.map.nasaNrtGroup, "Konteks satelit (bukan resmi)");
    assert.match(id.map.nasaNrtCloudHint, /tidak ada kebakaran/i);
    assert.equal(id.map.gibsTrueColor.length > 0, true);
    assert.equal(id.map.gibsThermal.length > 0, true);
    assert.equal(id.map.firmsHotspots.length > 0, true);
  });

  it("nasa URL sync uses the cancellable replaceState writer, not router.replace", () => {
    const src = read("src/hooks/useMapUrlState.ts");
    assert.match(src, /parseNasaNrtLayers/);
    assert.match(src, /nasaDate/);
    assert.match(src, /createMapUrlWriter/);
    assert.equal(src.includes("router.replace"), false);
    assert.equal(read("docs/pengembangan/jurnal/FE-57.md").startsWith("# FE-57 — Tanggapi"), true);
    assert.match(read("docs/pengembangan/jurnal/FE-60.md"), /raster GIBS/);
  });
});
