import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const TATONAS_CHROME = [
  "source",
  "empty",
  "pos",
  "jenis",
  "nilai",
  "level",
  "waktu",
  "more",
  "aria",
] as const;

const MARITIM_CHROME = [
  "source",
  "empty",
  "perairan",
  "kategori",
  "tinggi",
  "berlaku",
  "more",
  "aria",
] as const;

const CAROUSEL_CHROME = ["carouselAria", "prev", "next", "slideOf"] as const;

describe("Peringatan Dini compact cards", () => {
  it("caps each card height and scrolls overflow instead of stretching the row", () => {
    const src = read("src/components/PeringatanDiniSection.tsx");
    assert.match(src, /h-\[20rem\]/);
    assert.match(src, /overflow-hidden/);
    assert.match(src, /overflow-y-auto/);
    assert.equal(/min-h-\[16rem\]/.test(src), false);
    assert.equal(/line-clamp-/.test(src), false);
  });

  it("does not invent Tatonas loggerKind labels", () => {
    const src = read("src/components/PeringatanDiniSection.tsx");
    assert.equal(/tatonas\.kind\./.test(src), false);
    assert.match(src, /logger_kind\.toUpperCase\(\)/);
  });

  it("restores missing peringatanDini chrome keys in id and en", () => {
    const id = JSON.parse(read("messages/id.json")) as {
      peringatanDini: Record<string, unknown>;
    };
    const en = JSON.parse(read("messages/en.json")) as {
      peringatanDini: Record<string, unknown>;
    };

    assert.equal(typeof id.peringatanDini.kicker, "string");
    assert.equal(typeof en.peringatanDini.kicker, "string");
    assert.equal(typeof id.peringatanDini.archiveLink, "string");
    assert.equal(typeof en.peringatanDini.archiveLink, "string");

    for (const key of CAROUSEL_CHROME) {
      assert.equal(typeof id.peringatanDini[key], "string", `id ${key}`);
      assert.equal(typeof en.peringatanDini[key], "string", `en ${key}`);
    }

    const idTatonas = id.peringatanDini.tatonas as Record<string, unknown>;
    const enTatonas = en.peringatanDini.tatonas as Record<string, unknown>;
    for (const key of TATONAS_CHROME) {
      assert.equal(typeof idTatonas[key], "string", `id tatonas.${key}`);
      assert.equal(typeof enTatonas[key], "string", `en tatonas.${key}`);
    }
    assert.equal(idTatonas.kind, undefined);
    assert.equal(enTatonas.kind, undefined);

    assert.match(String(id.peringatanDini.subtitle), /BMKG Maritim|gelombang/i);
    assert.match(String(en.peringatanDini.subtitle), /BMKG Maritim|wave/i);
    const idMaritim = id.peringatanDini.maritim as Record<string, unknown>;
    const enMaritim = en.peringatanDini.maritim as Record<string, unknown>;
    for (const key of MARITIM_CHROME) {
      assert.equal(typeof idMaritim[key], "string", `id maritim.${key}`);
      assert.equal(typeof enMaritim[key], "string", `en maritim.${key}`);
    }
  });

  it("renders a fifth maritime card without stretching card height", () => {
    const src = read("src/components/PeringatanDiniSection.tsx");
    assert.match(src, /MaritimCard/);
    assert.match(src, /data\.maritim/);
    assert.match(src, /h-\[20rem\]/);
    assert.equal(/xl:grid-cols-5/.test(src), false);
  });

  it("shows the five cards as a one-card slideshow, not a wrap grid", () => {
    const src = read("src/components/PeringatanDiniSection.tsx");
    assert.match(src, /aria-roledescription="carousel"/);
    assert.match(src, /carouselAria/);
    assert.match(src, /auto-cols-\[100%\]/);
    assert.match(src, /snap-x/);
    assert.match(src, /data-pd-card/);
    assert.equal(/md:grid-cols-2/.test(src), false);
    assert.equal(/xl:grid-cols-3/.test(src), false);
    assert.match(src, /<CuacaCard/);
    assert.match(src, /<MagmaCardView/);
    assert.match(src, /<SipongiCardView/);
    assert.match(src, /<TatonasCardView/);
    assert.match(src, /<MaritimCard/);
  });
});
