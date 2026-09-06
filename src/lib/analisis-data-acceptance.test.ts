import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function messages(locale: "id" | "en"): Record<string, unknown> {
  return JSON.parse(read(`messages/${locale}.json`)) as Record<string, unknown>;
}

function ns(locale: "id" | "en"): Record<string, string> {
  const root = messages(locale).analisisData;
  assert.equal(typeof root, "object");
  return root as Record<string, string>;
}

describe("analisis data acceptance (AN-30)", () => {
  it("routing registers localized analisis-data path", () => {
    const src = read("src/i18n/routing.ts");
    assert.match(src, /"\/analisis-data"/);
    assert.match(src, /disaster-analysis/);
  });

  it("GET /api/kejadian/analisis exists and maps empty vs 503", () => {
    const route = read("src/app/api/kejadian/analisis/route.ts");
    assert.match(route, /loadKejadian/);
    assert.match(route, /buildKejadianAnalisis/);
    assert.match(route, /status:\s*503/);
    assert.match(route, /upstream/);
    const preview = read("src/lib/preview/public-api.ts");
    assert.match(preview, /\/api\/kejadian\/analisis/);
  });

  it("attack-surface lists the public analisis GET", () => {
    const text = read("security/attack-surface.md");
    assert.match(text, /\/api\/kejadian\/analisis/);
  });

  it("i18n copy matches AN-29 and page does not hardcode the Indonesian title", () => {
    assert.equal(ns("id").title, "Analisis data bencana");
    assert.equal(ns("en").title, "Disaster data analysis");
    assert.equal(ns("id").dibiTitle, "Agregat DIBI nasional (BNPB)");
    assert.equal(ns("en").dibiTitle, "National DIBI totals (BNPB)");
    assert.match(ns("id").dibiNote, /tidak dijumlahkan/);
    assert.match(ns("en").dibiNote, /not added/);
    const page = read("src/app/[locale]/analisis-data/page.tsx");
    assert.equal(page.includes("Analisis data bencana"), false);
    assert.match(page, /getTranslations\("analisisData"\)/);
  });

  it("Tanggapi analisisData is distinct from publikasi and cuaca", () => {
    const intents = read("src/lib/panduan/intents.ts");
    assert.match(intents, /analisisData/);
    assert.match(intents, /analisis data/);
    assert.equal(intents.includes("analisis cuaca"), false);
    const types = read("src/lib/panduan/types.ts");
    assert.match(types, /"\/analisis-data"/);
  });

  it("data-bencana teaser links to analisis-data instead of embedding KejadianAnalisis", () => {
    const table = read("src/components/kejadian/KejadianTable.tsx");
    assert.equal(table.includes("KejadianAnalisis"), false);
    assert.match(table, /AnalisisTeaser/);
  });

  it("AN-33: analog copy is not a forecast and KPI total stays kejadian-only", () => {
    assert.match(ns("id").analogDisclaimer, /bukan prediksi/i);
    assert.match(ns("en").analogDisclaimer, /not a forecast/i);
    assert.match(ns("id").historyNo, /tidak ada di katalog/i);
    const workspace = read("src/components/analisis/AnalisisWorkspace.tsx");
    assert.match(workspace, /buildAncamanRiwayat/);
    assert.match(workspace, /ancaman/);
    assert.equal(/data\.total\s*\+\s*.*irbi|irbi.*\+\s*data\.total/i.test(workspace), false);
  });
});
