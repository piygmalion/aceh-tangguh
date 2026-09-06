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

    const idTatonas = id.peringatanDini.tatonas as Record<string, unknown>;
    const enTatonas = en.peringatanDini.tatonas as Record<string, unknown>;
    for (const key of TATONAS_CHROME) {
      assert.equal(typeof idTatonas[key], "string", `id tatonas.${key}`);
      assert.equal(typeof enTatonas[key], "string", `en tatonas.${key}`);
    }
    assert.equal(idTatonas.kind, undefined);
    assert.equal(enTatonas.kind, undefined);
  });
});
