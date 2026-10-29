import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  hiddenListItems,
  listItemCount,
  overflowLabelKey,
  sortPeringatanKartu,
  SMALL_CARD_ROWS,
} from "@/lib/peringatan-bento-rows";
import { translateCuacaKondisi } from "@/lib/peringatan-dini/card-copy";
import type { PeringatanTone } from "@/lib/peringatan-dini-types";
import { TONE_CHIP, TONE_DOT, TONE_EDGE } from "@/components/beranda/format";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

function messages() {
  const id = JSON.parse(read("messages/id.json")) as {
    beranda: { peringatan: Record<string, string> & { kondisi: Record<string, string> } };
  };
  const en = JSON.parse(read("messages/en.json")) as {
    beranda: { peringatan: Record<string, string> & { kondisi: Record<string, string> } };
  };
  return { id, en };
}

describe("FE-77 stale cards never lead the photo cell", () => {
  it("sorts delayed cards after fresh cards, then by tone severity", () => {
    const input = [
      { key: "tatonas", basi: true, tone: "danger" as PeringatanTone },
      { key: "cuaca", basi: false, tone: "warn" as PeringatanTone },
      { key: "magma", basi: true, tone: "neutral" as PeringatanTone },
      { key: "sipongi", basi: false, tone: "siaga" as PeringatanTone },
      { key: "maritim", basi: false, tone: "danger" as PeringatanTone },
    ];
    const ordered = sortPeringatanKartu(input);
    assert.deepEqual(
      ordered.map((row) => row.key),
      ["maritim", "sipongi", "cuaca", "tatonas", "magma"],
    );
    assert.equal(ordered[0]?.basi, false);
    assert.equal(ordered.every((row, index, all) => {
      if (index === 0) return true;
      const prev = all[index - 1]!;
      if (prev.basi === row.basi) return true;
      return prev.basi === false && row.basi === true;
    }), true);
  });

  it("wires PeringatanBento to sortPeringatanKartu so a stale card cannot take the large cell", () => {
    const src = read("src/components/beranda/PeringatanBento.tsx");
    assert.match(src, /sortPeringatanKartu/);
    assert.doesNotMatch(
      src,
      /kartu\.sort\(\(a, b\) => URUTAN_TONE\[a\.tone\] - URUTAN_TONE\[b\.tone\]\)/,
    );
  });
});

describe("FE-77 truncated kabupaten overflow row", () => {
  it("labels cuaca overflow as +N lainnya / +N more and counts extra_count", () => {
    const { id, en } = messages();
    assert.equal(overflowLabelKey("cuaca"), "lainnya");
    assert.equal(id.beranda.peringatan.lainnya, "+{count} lainnya");
    assert.equal(en.beranda.peringatan.lainnya, "+{count} more");
    const itemCount = listItemCount(["a", "b"], 3);
    assert.equal(itemCount, 5);
    assert.equal(hiddenListItems(itemCount, SMALL_CARD_ROWS), 3);
    // Two highlight rows fill the small card; the three extras remain.
    assert.equal(hiddenListItems(itemCount, 2), 3);
    // Large cell can show four rows, but only two highlights exist — extras still count.
    assert.equal(hiddenListItems(itemCount, Math.min(4, 2)), 3);
  });

  it("shows the overflow row on the large photo cell when items remain", () => {
    const src = read("src/components/beranda/PeringatanBento.tsx");
    const sel = src.slice(src.indexOf("function Sel"), src.indexOf("export function PeringatanBento"));
    assert.match(sel, /visibleRows\s*=\s*Math\.min\(shown,\s*kartu\.rincian\.length\)/);
    assert.match(sel, /hiddenListItems\(kartu\.itemCount,\s*visibleRows\)/);
    assert.doesNotMatch(sel, /hidden\s*=\s*besar\s*\?\s*0/);
  });
});

describe("FE-77 stale weather wording", () => {
  it("uses Data cuaca belum diperbarui and an English equivalent", () => {
    const { id, en } = messages();
    assert.equal(id.beranda.peringatan.cuacaUnavailable, "Data cuaca belum diperbarui");
    assert.equal(en.beranda.peringatan.cuacaUnavailable, "Weather data not yet updated");
  });
});

describe("FE-77 AWAS uses Peudeung status token", () => {
  it("paints danger chrome with --status-awas instead of #B42318", () => {
    for (const paint of [TONE_DOT.danger, TONE_CHIP.danger, TONE_EDGE.danger]) {
      assert.match(paint, /status-awas/);
      assert.equal(paint.includes("#B42318"), false);
      assert.equal(paint.includes("#c8102e"), false);
    }
    const bento = read("src/components/beranda/PeringatanBento.tsx");
    assert.equal(bento.includes("#B42318"), false);
    assert.match(bento, /status-awas/);
    const format = read("src/components/beranda/format.ts");
    const dangerBlock = format.slice(format.indexOf("TONE_DOT"), format.indexOf("kelasRisikoChip"));
    assert.equal(dangerBlock.includes("#B42318"), false);
  });
});

describe("FE-77 /en weather condition labels", () => {
  it("translates BMKG condition words used on the cuaca card", () => {
    const { id, en } = messages();
    assert.equal(id.beranda.peringatan.kondisi.petir, "petir");
    assert.equal(en.beranda.peringatan.kondisi.petir, "thunderstorm");
    assert.equal(id.beranda.peringatan.kondisi.hujanLebat, "hujan lebat");
    assert.equal(en.beranda.peringatan.kondisi.hujanLebat, "heavy rain");
    assert.equal(id.beranda.peringatan.kondisi.hujanSedang, "hujan sedang");
    assert.equal(en.beranda.peringatan.kondisi.hujanSedang, "moderate rain");
    assert.equal(id.beranda.peringatan.kondisi.hujanEkstrem, "hujan ekstrem");
    assert.equal(en.beranda.peringatan.kondisi.hujanEkstrem, "extreme rain");
    assert.equal(id.beranda.peringatan.kondisi.anginKencang, "angin kencang");
    assert.equal(en.beranda.peringatan.kondisi.anginKencang, "strong wind");

    const tEn = (key: string) => {
      const leaf = key.replace(/^kondisi\./, "");
      return en.beranda.peringatan.kondisi[leaf] ?? key;
    };
    const tId = (key: string) => {
      const leaf = key.replace(/^kondisi\./, "");
      return id.beranda.peringatan.kondisi[leaf] ?? key;
    };

    assert.equal(translateCuacaKondisi("Petir", "en", tEn), "thunderstorm");
    assert.equal(translateCuacaKondisi("Hujan lebat", "en", tEn), "heavy rain");
    assert.equal(
      translateCuacaKondisi("Petir · Hujan lebat", "en", tEn),
      "thunderstorm · heavy rain",
    );
    assert.equal(translateCuacaKondisi("Angin kencang", "id", tId), "angin kencang");
    assert.equal(translateCuacaKondisi("Petir", "id", tId), "petir");
  });

  it("wires the cuaca detail lines through translateCuacaKondisi", () => {
    const src = read("src/components/beranda/PeringatanBento.tsx");
    const cuaca = src.slice(src.indexOf('key: "cuaca"'), src.indexOf('key: "magma"'));
    assert.match(cuaca, /translateCuacaKondisi/);
  });
});
