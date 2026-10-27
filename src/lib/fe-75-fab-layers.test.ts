import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { FeatureCollection } from "geojson";
import {
  TANGGAPI_YIELD_STRIP_PX,
  tanggapiHiddenForStrip,
  tanggapiYieldRootMargin,
} from "./home-fab-reserve";
import { geojsonForMarkerLayers } from "./marker-layer-selection";
import { hiddenListItems, listItemCount, overflowLabelKey, SMALL_CARD_ROWS } from "./peringatan-bento-rows";
import idJson from "../../messages/id.json";
import enJson from "../../messages/en.json";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

function point(layer: string, id: string): FeatureCollection["features"][number] {
  return {
    type: "Feature",
    id,
    geometry: { type: "Point", coordinates: [96.1, 4.4] },
    properties: { layer, title: id },
  };
}

describe("FE-75 Tanggapi bottom strip", () => {
  it("hides on any intersection with the bottom 96px, not on a 30% band ratio", () => {
    assert.equal(TANGGAPI_YIELD_STRIP_PX, 96);
    assert.equal(tanggapiYieldRootMargin(844), "-748px 0px 0px 0px");
    assert.equal(tanggapiYieldRootMargin(360), `-${360 - 96}px 0px 0px 0px`);
    for (const ratio of [0.05, 0.1, 0.27, 0.5]) {
      assert.equal(
        tanggapiHiddenForStrip({ bandRatioInViewport: ratio, intersectsBottomStrip: true }),
        true,
        String(ratio),
      );
      assert.equal(
        tanggapiHiddenForStrip({ bandRatioInViewport: ratio, intersectsBottomStrip: false }),
        false,
        String(ratio),
      );
    }
    const bot = read("src/components/panduan/GuideBot.tsx");
    assert.match(bot, /\[data-number-band\], \[data-peringatan\]/);
    assert.match(bot, /rootMargin: tanggapiYieldRootMargin\(window\.innerHeight\)/);
    assert.match(bot, /threshold: 0/);
    const invite = bot.slice(bot.indexOf("tanggapiBubbleOnViewport"), bot.indexOf("setShowBubble(true)"));
    assert.doesNotMatch(invite, /IntersectionObserver/);
  });
});

describe("FE-75 homepage padding", () => {
  it("keeps 72px under the page and drops the empty band pad", () => {
    assert.equal(4.5 * 16, 72);
    const page = read("src/app/[locale]/page.tsx");
    assert.match(page, /pb-\[4\.5rem\]/);
    const hero = read("src/components/beranda/DataHero.tsx");
    assert.match(hero, /data-number-band/);
    assert.doesNotMatch(hero, /max-md:pb-\[4\.5rem\]/);
    assert.doesNotMatch(hero, /pb-\[4\.5rem\]/);
  });
});

describe("FE-75 Laporkan indent", () => {
  it("places sub-item text at x44 with a 44px row and a hairline", () => {
    const lapor = read("src/components/laporan/ReportLaporDropdown.tsx");
    assert.match(lapor, /marginLeft: 12/);
    assert.match(lapor, /paddingLeft: 15/);
    assert.match(lapor, /minHeight: 44/);
    assert.match(lapor, /borderLeft: "1px solid rgba\(255,255,255,\.24\)"/);
    const drawerPad = 16;
    const labelX = drawerPad + 12;
    const textX = drawerPad + 12 + 1 + 15;
    assert.equal(labelX, 28);
    assert.equal(textX, 44);
    assert.equal(textX - labelX, 16);
  });
});

describe("FE-75 R3P panel", () => {
  it("starts the profile panel 8px under the 6rem header", () => {
    const panel = read("src/components/map/AreaProfilPanel.tsx");
    assert.match(panel, /top-\[calc\(6rem\+8px\)\]/);
    assert.doesNotMatch(panel, /top-\[4\.15rem\]/);
    assert.doesNotMatch(panel, /md:top-\[4\.5rem\]/);
    assert.equal(idJson.profilDesa.r3pKabKicker, "R3P KABUPATEN/KOTA");
  });
});

describe("FE-75 peringatan copy and rows", () => {
  it("replaces the archive snapshot footer in both locales", () => {
    assert.equal(idJson.beranda.peringatan.snapshot, "Belum ada data terbaru");
    assert.equal(enJson.beranda.peringatan.snapshot, "No newer data yet");
    assert.equal(idJson.beranda.peringatan.posLainnya, "+{count} pos lainnya");
    assert.equal(enJson.beranda.peringatan.posLainnya, "+{count} more stations");
    assert.equal(idJson.beranda.peringatan.gempaLainnya, "+{count} gempa lainnya");
    assert.equal(enJson.beranda.peringatan.gempaLainnya, "+{count} more earthquakes");
    assert.equal(idJson.beranda.peringatan.lainnya, "+{count} lainnya");
    assert.equal(enJson.beranda.peringatan.lainnya, "+{count} more");
  });

  it("names the overflow row after the card", () => {
    assert.equal(overflowLabelKey("magma"), null);
    assert.equal(overflowLabelKey("tatonas"), "posLainnya");
    assert.equal(overflowLabelKey("cuaca"), "wilayahLainnya");
    assert.equal(overflowLabelKey("sipongi"), "titikLainnya");
    assert.equal(overflowLabelKey("maritim"), "perairanLainnya");
    assert.equal(overflowLabelKey("lain"), "lainnya");
    const src = read("src/components/beranda/PeringatanBento.tsx");
    assert.match(src, /overflowLabelKey\(kartu\.key\)/);
    assert.equal(src.includes("peringatan.posLainnya"), false);
    assert.equal(src.includes("gempaLainnya"), false);
  });

  it("counts hidden list items and skips a single MAGMA event", () => {
    assert.equal(SMALL_CARD_ROWS, 2);
    assert.equal(listItemCount(["a", "b", "c"], 0), 3);
    assert.equal(hiddenListItems(listItemCount(["a", "b", "c"], 0), SMALL_CARD_ROWS), 1);
    assert.equal(hiddenListItems(listItemCount(["a", "b"], 4), SMALL_CARD_ROWS), 4);
    assert.equal(hiddenListItems(listItemCount([], 0), SMALL_CARD_ROWS), 0);
    // Three detail lines of one event are not three earthquakes. The live +1 was this mistake.
    assert.equal(hiddenListItems(null, SMALL_CARD_ROWS), 0);
    const src = read("src/components/beranda/PeringatanBento.tsx");
    const magma = src.slice(src.indexOf('key: "magma"'), src.indexOf('key: "sipongi"'));
    assert.match(magma, /ev\.wilayah, ev\.koordinat_kedalaman, ev\.waktu_kejadian/);
    assert.match(magma, /itemCount: null/);
    assert.match(src, /hiddenListItems\(kartu\.itemCount, shown\)/);
    assert.equal(src.includes("hiddenDetailRows(kartu.rincian.length"), false);
    assert.match(src, /data-pos-lainnya/);
    assert.match(src, /href=\{kartu\.href\}/);
    assert.match(src, /listItemCount\(pd\.tatonas\.highlights, pd\.tatonas\.extra_count\)/);
    const sel = src.slice(src.indexOf("function Sel"), src.indexOf("export function PeringatanBento"));
    const isi = sel.slice(sel.indexOf("const isi"), sel.indexOf("const kelas"));
    assert.match(isi, /data-pos-lainnya/);
    assert.match(sel, /<a[\s\S]*href=\{kartu\.href\}[\s\S]*\{isi\}/);
    assert.equal(src.includes("pd.tatonas.highlights.length"), false);
  });
});

describe("FE-75 layers omit markers and clusters", () => {
  it("drops omitted layers from the collection that feeds clusters", () => {
    const fc: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        point("disasterEvents", "a"),
        point("facHealth", "b"),
        point("laporanKejadian", "c"),
        point("", "d"),
      ],
    };
    const onlyHealth = geojsonForMarkerLayers(fc, ["facHealth"]);
    assert.deepEqual(
      onlyHealth.features.map((feature) => feature.properties?.layer),
      ["facHealth"],
    );
    const reports = geojsonForMarkerLayers(fc, ["laporanKejadian"]);
    assert.equal(reports.features.length, 1);
    assert.equal(reports.features[0]?.properties?.layer, "laporanKejadian");
    const none = geojsonForMarkerLayers(fc, []);
    assert.equal(none.features.length, 0);
    const disasters = geojsonForMarkerLayers(fc, ["disasterEvents"]);
    const layers = disasters.features.map((feature) => String(feature.properties?.layer ?? ""));
    assert.ok(layers.includes("disasterEvents"));
    assert.ok(layers.includes(""));
    assert.equal(layers.includes("facHealth"), false);
    const viewport = read("src/components/map/MapViewport.tsx");
    assert.match(viewport, /geojsonForMarkerLayers\(data \?\? EMPTY_FC, sortedKeys\)/);
    assert.match(viewport, /key=\{sortedKeys\.join\(","\)\}/);
    assert.equal(read("src/app/api/layers/markers/route.ts").includes("geojsonForMarkerLayers"), false);
  });
});
