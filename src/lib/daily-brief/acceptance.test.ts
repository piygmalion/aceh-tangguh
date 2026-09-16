import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
  const root = messages(locale).dailyBrief;
  assert.equal(typeof root, "object");
  return root as Record<string, string>;
}

describe("AN-39 Daily Brief acceptance", () => {
  it("routing registers brief and admin daily-brief paths", () => {
    const src = read("src/i18n/routing.ts");
    assert.match(src, /"\/brief\/\[ymd\]"/);
    assert.match(src, /"\/admin\/daily-brief"/);
  });

  it("attack-surface lists public GET, cron, and staff routes", () => {
    const text = read("security/attack-surface.md");
    assert.match(text, /\/api\/brief\/\[ymd\]/);
    assert.match(text, /\/api\/cron\/daily-brief/);
    assert.match(text, /DAILY_BRIEF_CRON_SECRET/);
    assert.match(text, /\/api\/admin\/daily-brief\/subscribers/);
  });

  it("i18n copy exists and the public page does not hardcode the Indonesian title", () => {
    assert.equal(ns("id").title, "Aceh Disaster Daily Brief");
    assert.equal(ns("en").title, "Aceh Disaster Daily Brief");
    assert.match(ns("id").disclaimer, /112/);
    assert.match(ns("en").disclaimer, /112/);
    const page = read("src/app/[locale]/brief/[ymd]/page.tsx");
    assert.equal(page.includes("Aceh Disaster Daily Brief"), false);
    assert.match(page, /getTranslations\("dailyBrief"\)/);
  });

  it("admin manager does not import the server service module", () => {
    const src = read("src/components/admin/DailyBriefManager.tsx");
    assert.doesNotMatch(src, /daily-brief\/service/);
    assert.match(src, /phoneMasked/);
    assert.match(src, /resolveDailyBriefSubscriberInput/);
    assert.match(src, /dailyBriefPhoneInvalid/);
    assert.doesNotMatch(src, /OTP|Z-API/);
    const phoneLabel = src.indexOf("{t(\"dailyBriefPhone\")}");
    const nameLabel = src.indexOf("{t(\"dailyBriefName\")}");
    assert.ok(nameLabel >= 0 && phoneLabel > nameLabel);
  });

  it("does not open G32 research tables or LLM gate", () => {
    assert.equal(existsSync(join(ROOT, "supabase/migrations/20260927_research_briefs.sql")), false);
    const compose = read("src/lib/daily-brief/compose.ts");
    assert.doesNotMatch(compose, /DAILY_BRIEF_LLM|research_briefs|on_process/);
    const cron = read("src/app/api/cron/daily-brief/route.ts");
    assert.doesNotMatch(cron, /composeGroundedAnswer|PANDUAN_LLM/);
  });

  it("AN-56 keeps v1 feed layout, empty date, and no invented casualties or KRB", () => {
    const page = read("src/app/[locale]/brief/[ymd]/page.tsx");
    const situasi = read("src/components/daily-brief/DailyBriefSituasi.tsx");
    assert.match(page, /DailyBriefBody/);
    assert.match(situasi, /isDailyBriefV2/);
    assert.match(situasi, /FeedList/);
    assert.match(situasi, /priorityFeed|notOfficialSiaga/);
    assert.doesNotMatch(situasi, /kejadian_korban|IRBI|KRB|loggerKind/);
    assert.doesNotMatch(page, /phone_enc|subscriber/);
    assert.match(ns("id").priorityFeed, /Prioritas pemantauan umpan/);
    assert.match(ns("en").priorityFeed, /Feed monitoring priority/);
    assert.match(ns("id").belumAda, /Belum ada/);
    assert.match(ns("en").notFound, /No brief has been composed/);
  });

  it("production-config warns when the daily brief secret is unset", () => {
    const src = read("src/lib/security/production-config.ts");
    assert.match(src, /DAILY_BRIEF_CRON_SECRET/);
  });
});
