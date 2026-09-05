import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

const HAZARDS_LIVE_CLAIM = "GET /api/hazards";

const REQUIRED_ATTACK_SURFACE_PATHS = [
  "/api/sik/sdb/katalog",
  "/api/sik/sdb/jadwal",
  "/api/sik/calon-kejadian",
  "/api/sik/kejadian/peringatan-dinamis",
  "/api/cron/overlay-live",
  "/api/panduan/ask",
  "/api/panduan/unknown",
] as const;

type MessagesWithS8 = {
  panduan?: { s8?: { body?: string } };
  metodologi?: { s8?: { body?: string } };
};

/** Brief AN-9/FE-10 menyebut `panduan.s8.body`; kunci JSON-nya `metodologi.s8.body`. */
function loadPanduanS8Body(locale: "id" | "en"): string {
  const parsed = JSON.parse(
    readFileSync(join(ROOT, "messages", `${locale}.json`), "utf8")
  ) as MessagesWithS8;
  const body = parsed.panduan?.s8?.body ?? parsed.metodologi?.s8?.body;
  if (typeof body !== "string") {
    throw new Error(`${locale} panduan.s8.body / metodologi.s8.body harus string`);
  }
  return body;
}

describe("inventaris penerimaan produksi G2–G5 (AN-9)", () => {
  it("panduan.s8.body id+en tidak mengklaim GET /api/hazards hidup", () => {
    for (const locale of ["id", "en"] as const) {
      const body = loadPanduanS8Body(locale);
      assert.equal(
        body.includes(HAZARDS_LIVE_CLAIM),
        false,
        `${locale} panduan.s8.body masih mengandung ${HAZARDS_LIVE_CLAIM}`
      );
    }
  });

  it("security/attack-surface.md memuat path staf/cron G2–G5", () => {
    const text = readFileSync(join(ROOT, "security/attack-surface.md"), "utf8");
    const missing = REQUIRED_ATTACK_SURFACE_PATHS.filter((path) => !text.includes(path));
    assert.deepEqual(missing, [], `attack-surface.md tidak memuat: ${missing.join(", ")}`);
  });

  it("security/attack-surface.md tidak mengklaim POST sik/public tanpa Upstash", () => {
    const text = readFileSync(join(ROOT, "security/attack-surface.md"), "utf8");
    assert.equal(
      text.includes("no** Upstash") || text.includes("**no** Upstash"),
      false,
      "attack-surface.md masih mengklaim POST /api/sik/public tanpa Upstash"
    );
    assert.equal(
      text.includes("guardPublicPost"),
      true,
      "attack-surface.md harus menyebut guardPublicPost pada POST /api/sik/public"
    );
    assert.equal(
      text.includes('requireModuleApi("moderasi")'),
      true,
      "attack-surface.md harus menyebut requireModuleApi(\"moderasi\") untuk /api/admin/laporan"
    );
  });

  it("rute POST publik yang diklaim memakai guardPublicPost benar-benar mengimpornya", () => {
    const routes = [
      "src/app/api/laporan/kejadian/route.ts",
      "src/app/api/laporan/penanganan/route.ts",
      "src/app/api/laporan/upload/route.ts",
      "src/app/api/sik/public/route.ts",
      "src/app/api/panduan/ask/route.ts",
      "src/app/api/panduan/unknown/route.ts",
    ] as const;
    for (const rel of routes) {
      const source = readFileSync(join(ROOT, rel), "utf8");
      assert.equal(
        source.includes("guardPublicPost"),
        true,
        `${rel} tidak mengimpor guardPublicPost`
      );
    }
  });
});
