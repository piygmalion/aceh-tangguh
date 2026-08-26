import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("Vercel Node preview (not static export)", () => {
  it("uses Next.js + npm ci + Singapore, without legacy builds", () => {
    const cfg = JSON.parse(read("vercel.json")) as {
      framework?: string;
      installCommand?: string;
      buildCommand?: string;
      regions?: string[];
      builds?: unknown;
    };
    assert.equal(cfg.framework, "nextjs");
    assert.equal(cfg.installCommand, "npm ci");
    assert.equal(cfg.buildCommand, "npm run build");
    assert.deepEqual(cfg.regions, ["sin1"]);
    assert.equal(cfg.builds, undefined);
  });

  it("does not turn Vercel into a GitHub Pages static export", () => {
    const vercel = read("vercel.json");
    const nextCfg = read("next.config.mjs");
    assert.doesNotMatch(vercel, /STATIC_EXPORT|GITHUB_PAGES|NEXT_PUBLIC_BASE_PATH/);
    assert.match(nextCfg, /isStaticExport/);
    assert.match(nextCfg, /outputFileTracingIncludes/);
    assert.match(nextCfg, /public\/fixtures/);
  });

  it("pins Node 22 and keeps weather refresh within the Hobby 60s cap", () => {
    const nvm = read(".nvmrc").trim();
    const pkg = JSON.parse(read("package.json")) as {
      engines?: { node?: string };
    };
    assert.equal(nvm, "22");
    assert.equal(pkg.engines?.node, "22.x");

    const refresh = read("src/app/api/weather/refresh/route.ts");
    const match = refresh.match(/export const maxDuration = (\d+)/);
    assert.ok(match, "weather refresh must set maxDuration");
    assert.ok(Number(match[1]) <= 60, `maxDuration ${match[1]} exceeds Vercel Hobby`);
  });

  it("ships public Supabase keys for the Vercel host, never the service role", () => {
    const env = read(".env.production");
    const assigned = env
      .split("\n")
      .filter((line) => line && !line.startsWith("#"))
      .join("\n");
    assert.match(assigned, /NEXT_PUBLIC_SUPABASE_URL=https:\/\/whojoxrbcdyotrpolgav\.supabase\.co/);
    assert.match(assigned, /NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ/);
    assert.doesNotMatch(assigned, /SERVICE_ROLE|LAPORAN_PII|LAPORAN_CRON|WEATHER_CRON/);
  });
});
