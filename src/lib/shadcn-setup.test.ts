import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

describe("shadcn Fase 1 setup", () => {
  it("has components.json for new-york + lucide + existing aliases", () => {
    const raw = readFileSync(path.join(ROOT, "components.json"), "utf8");
    const cfg = JSON.parse(raw) as {
      style: string;
      iconLibrary: string;
      aliases: Record<string, string>;
      tailwind: { css: string; config: string; cssVariables: boolean };
    };
    assert.equal(cfg.style, "new-york");
    assert.equal(cfg.iconLibrary, "lucide");
    assert.equal(cfg.aliases.components, "@/components");
    assert.equal(cfg.aliases.utils, "@/lib/utils");
    assert.equal(cfg.tailwind.css, "src/app/globals.css");
    assert.equal(cfg.tailwind.config, "tailwind.config.ts");
    assert.equal(cfg.tailwind.cssVariables, true);
  });

  it("avoids Button.tsx / button.tsx Windows case collision", () => {
    const ui = path.join(ROOT, "src/components/ui");
    const names = readdirSync(ui);
    assert.equal(names.includes("Button.tsx"), false);
    assert.equal(names.includes("button.tsx"), true);
    assert.equal(names.includes("button-legacy.tsx"), false);
  });

  it("keeps Aceh HEX as source of truth and bridges shadcn aliases", () => {
    const css = readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8");
    assert.match(css, /--forest:\s*var\(--primary\)/);
    assert.match(css, /--orange:\s*var\(--primary\)/);
    assert.match(css, /--ink:\s*#111111/);
    assert.match(css, /--paper:\s*#f7f7f7/);
    assert.match(css, /--status-awas:\s*var\(--map-status-awas\)/);
    assert.match(css, /--primary:\s*#c8102e/);
    assert.match(css, /--accent:\s*#111111/);
    assert.match(css, /--accent-fg:\s*#ffffff/);
    assert.match(css, /--background:\s*var\(--bg\)/);
    assert.match(css, /--foreground:\s*var\(--text\)/);
    assert.match(css, /--card:\s*var\(--bg-raised\)/);
    assert.match(css, /--muted-foreground:\s*var\(--text-dim\)/);
    assert.match(css, /--primary-foreground:\s*var\(--primary-fg\)/);
    assert.equal(/oklch\(/.test(css), false);
  });
});
