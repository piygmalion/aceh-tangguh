import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "path";
import { describe, it } from "node:test";
import { navInteractiveClass } from "@/lib/nav-chrome";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("nav chrome interaction tokens", () => {
  it("marks active or open sections with accent tint, not primary", () => {
    const active = navInteractiveClass({ active: true, shape: "pill" });
    const open = navInteractiveClass({ open: true, shape: "pill" });
    for (const cls of [active, open]) {
      assert.match(cls, /bg-\[var\(--accent-dim\)\]/);
      assert.match(cls, /text-\[var\(--accent\)\]/);
      assert.equal(cls.includes("--primary"), false);
      assert.equal(cls.includes("bg-accent"), false);
    }
  });

  it("keeps rest muted and uses accent only on hover, focus, and press", () => {
    const rest = navInteractiveClass({ shape: "row" });
    assert.match(rest, /text-\[var\(--text-dim\)\]/);
    assert.match(rest, /hover:bg-\[var\(--accent-dim\)\]/);
    assert.match(rest, /hover:text-\[var\(--accent\)\]/);
    assert.match(rest, /focus-visible:text-\[var\(--accent\)\]/);
    assert.match(rest, /active:text-\[var\(--accent-pressed\)\]/);
    assert.equal(rest.includes("--primary-dim"), false);
  });

  it("wires SiteNav, Lapor, Theme, and Auth to the shared accent recipe", () => {
    const nav = read("src/components/SiteNav.tsx");
    const lapor = read("src/components/laporan/ReportLaporDropdown.tsx");
    const theme = read("src/components/ThemeToggle.tsx");
    const auth = read("src/components/admin/AuthMenu.tsx");
    const locale = read("src/components/LocaleSwitch.tsx");

    assert.match(nav, /from "@\/lib\/nav-chrome"/);
    assert.match(nav, /navInteractiveClass/);
    assert.match(nav, /NAV_ACCENT_HOVER/);
    assert.equal(/bg-\[var\(--primary-dim\)\]/.test(nav), false);
    assert.match(nav, /Escape/);
    assert.match(nav, /mousedown/);

    assert.match(lapor, /navInteractiveClass/);
    assert.match(lapor, /active\?: boolean/);
    assert.equal(/bg-accent/.test(lapor), false);
    assert.equal(/text-accent-foreground/.test(lapor), false);
    assert.match(lapor, /Escape/);
    assert.match(lapor, /mousedown/);

    assert.match(theme, /NAV_UTILITY_HOVER|--accent/);
    assert.equal(/hover:text-\[var\(--primary\)\]/.test(theme), false);

    assert.match(auth, /NAV_UTILITY_HOVER|--accent/);
    assert.equal(
      /hover:border-\[var\(--primary\)\]/.test(auth),
      false,
      "Auth trigger still hovers with primary"
    );

    assert.match(locale, /TYPE_FLOOR_CLASS|text-\[0\.8125rem\]/);
    assert.match(locale, /hover:text-\[var\(--accent\)\]/);
    assert.match(locale, /bg-\[var\(--primary\)\]/);
  });
});
