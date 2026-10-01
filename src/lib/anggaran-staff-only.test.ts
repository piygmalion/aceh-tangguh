import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { messagesForPublicClient } from "./i18n/public-messages";
import { composeGuideAnswer } from "./panduan/answers";
import { contextToChunks } from "./panduan/retrieve";
import type { GuideContext } from "./panduan/types";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function messages(locale: "id" | "en"): {
  beranda: { metrics: Record<string, string>; sumber: Record<string, string> };
  nav: Record<string, string>;
  publikasi: Record<string, string>;
  admin: Record<string, string>;
} {
  return JSON.parse(read(`messages/${locale}.json`)) as {
    beranda: { metrics: Record<string, string>; sumber: Record<string, string> };
    nav: Record<string, string>;
    publikasi: Record<string, string>;
    admin: Record<string, string>;
  };
}

const STAFF_FIXTURES = [
  "analisis-anggaran-2026.json",
  "kegiatan-penanganan-2026.json",
  "prrpka_aceh.json",
  "prrpka_ringkasan.json",
  "r3p-slideshow.json",
] as const;

const FIGURE_CTX: GuideContext = {
  failed: [],
  anggaran: { tahun: 2026, totalRp: 176_206_915_272, kegiatan: 24 },
};

describe("FE-61 anggaran dan pemulihan hanya untuk staf", () => {
  it("homepage does not render the recovery panel or the budget tile", () => {
    const page = read("src/app/[locale]/page.tsx");
    assert.doesNotMatch(page, /PemulihanPanel/);
    assert.match(page, /<MetricRail/);
    const rail = read("src/components/beranda/MetricRail.tsx");
    assert.doesNotMatch(rail, /key: "anggaran"/);
    assert.doesNotMatch(rail, /useAnggaran/);
    assert.doesNotMatch(rail, /anggaran-bencana/);
    assert.match(rail, /key: "kejadian"/);
    assert.match(rail, /key: "terdampak"/);
    assert.match(rail, /key: "irbi"/);
    assert.match(rail, /md:grid-cols-3/);
    assert.doesNotMatch(rail, /lg:grid-cols-4/);
    const analisis = read("src/app/[locale]/analisis-data/page.tsx");
    assert.doesNotMatch(analisis, /R3PChartSection/);
    const nav = read("src/components/SiteNav.tsx");
    const footer = read("src/components/SiteFooter.tsx");
    const publikasi = read("src/app/[locale]/publikasi/page.tsx");
    assert.doesNotMatch(nav, /anggaran-bencana/);
    assert.doesNotMatch(footer, /anggaran-bencana/);
    assert.doesNotMatch(publikasi, /anggaran-bencana/);
  });

  it("drops public budget copy from both locales", () => {
    for (const locale of ["id", "en"] as const) {
      const msg = messages(locale);
      assert.equal(msg.beranda.metrics.anggaran, undefined);
      assert.equal(msg.beranda.metrics.anggaranNote, undefined);
      assert.equal(msg.beranda.metrics.anggaranNoteFallback, undefined);
      assert.equal(msg.beranda.metrics.anggaranLink, undefined);
      assert.equal(msg.nav.anggaranBencana, undefined);
      assert.equal(msg.publikasi.seeAnggaran, undefined);
      assert.equal(typeof msg.admin.navAnggaran, "string");
      assert.equal(typeof msg.beranda.metrics.kejadian, "string");
      assert.equal(typeof msg.beranda.metrics.irbi, "string");
      const raw = JSON.parse(read(`messages/${locale}.json`)) as {
        anggaranBencana?: { lead?: string };
      };
      assert.doesNotMatch(raw.anggaranBencana?.lead ?? "", /176|24 kegiatan|24 activities/);
      const pub = messagesForPublicClient(
        JSON.parse(read(`messages/${locale}.json`)) as Parameters<typeof messagesForPublicClient>[0]
      );
      assert.equal(pub.anggaranBencana, undefined);
      assert.equal(pub.prrpkaChart, undefined);
      const beranda = pub.beranda as { pemulihan?: unknown } | undefined;
      assert.equal(beranda?.pemulihan, undefined);
      assert.doesNotMatch(JSON.stringify(pub), /176/);
    }
  });

  it("rejects anonymous budget and PRRPKA reads", async () => {
    const previous = process.env.STATIC_EXPORT;
    process.env.STATIC_EXPORT = "1";
    try {
      const anggaran = await import("../app/api/anggaran/route");
      const prrpka = await import("../app/api/prrpka/summary/route");
      const r3p = await import("../app/api/r3p/summary/route");
      for (const GET of [anggaran.GET, prrpka.GET, r3p.GET]) {
        const res = await GET();
        assert.equal(res.status, 401);
        const body = (await res.json()) as { error?: string; analisis?: unknown; ringkasan?: unknown };
        assert.equal(body.error, "unauthorized");
        assert.equal(body.analisis, undefined);
        assert.equal(body.ringkasan, undefined);
      }
      const { fetchPublicApi } = await import("./preview/public-api");
      for (const path of ["/api/anggaran", "/api/prrpka/summary", "/api/r3p/summary"]) {
        const res = await fetchPublicApi(path);
        assert.equal(res.status, 401);
        const body = (await res.json()) as { error?: string; analisis?: unknown };
        assert.equal(body.error, "unauthorized");
        assert.equal(body.analisis, undefined);
      }
    } finally {
      if (previous === undefined) delete process.env.STATIC_EXPORT;
      else process.env.STATIC_EXPORT = previous;
    }
  });

  it("keeps budget fixtures off the public static tree", () => {
    for (const name of STAFF_FIXTURES) {
      assert.equal(existsSync(join(ROOT, "public/fixtures", name)), false, name);
      assert.equal(existsSync(join(ROOT, "data/staff", name)), true, name);
    }
  });

  it("renders the recovery panel on the staff dashboard behind the console guard", () => {
    const dash = read("src/app/[locale]/admin/(console)/page.tsx");
    const layout = read("src/app/[locale]/admin/(console)/layout.tsx");
    const detail = read("src/app/[locale]/admin/(console)/anggaran/page.tsx");
    const panel = read("src/components/beranda/PemulihanPanel.tsx");
    const shell = read("src/components/admin/AdminShell.tsx");
    assert.match(dash, /<PemulihanPanel/);
    assert.match(layout, /requireStaffPage/);
    assert.match(layout, /getMessages/);
    assert.doesNotMatch(layout, /requireSuperAdminPage/);
    const publicLayout = read("src/app/[locale]/layout.tsx");
    assert.match(publicLayout, /messagesForPublicClient/);
    assert.match(detail, /AnggaranDashboard/);
    assert.doesNotMatch(detail, /requireSuperAdminPage/);
    assert.match(panel, /href="\/admin\/anggaran"/);
    assert.doesNotMatch(panel, /anggaran-bencana/);
    assert.match(shell, /href: "\/admin\/anggaran"/);
    const legacy = read("src/app/[locale]/anggaran-bencana/page.tsx");
    assert.match(legacy, /redirect\(/);
    assert.match(legacy, /\/admin\/anggaran/);
    assert.doesNotMatch(legacy, /AnggaranDashboard/);
    assert.match(read("src/i18n/routing.ts"), /"\/admin\/anggaran"/);
  });

  it("does not quote budget figures or link the public budget page for visitors", () => {
    for (const locale of ["id", "en"] as const) {
      const answer = composeGuideAnswer(
        { intent: "anggaran", query: locale === "en" ? "disaster budget" : "anggaran bencana" },
        FIGURE_CTX,
        locale
      );
      assert.match(answer.body, /internal staff|staf internal/);
      assert.doesNotMatch(answer.body, /176|Rp|rupiah|24 kegiatan|24 activities/i);
      assert.equal(
        answer.links.some((link) => link.href === "/anggaran-bencana"),
        false
      );
      const chunks = contextToChunks(FIGURE_CTX, locale);
      const budget = chunks.find((chunk) => chunk.sourceId.includes("anggaran"));
      if (budget) {
        assert.doesNotMatch(budget.text, /176/);
        assert.notEqual(budget.href, "/anggaran-bencana");
      }
    }
    const tour = read("src/lib/panduan/tour-steps.ts");
    assert.doesNotMatch(tour, /prrpka/);
    const answers = read("src/lib/panduan/answers.ts");
    assert.doesNotMatch(answers, /formatRpCompact/);
    assert.doesNotMatch(answers, /anggaran-bencana/);
  });
});
