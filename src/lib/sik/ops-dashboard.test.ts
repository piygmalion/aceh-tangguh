import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { SIK_MODULES } from "./roles";
import {
  buildOpsDashboardView,
  emptyOpsCounts,
  isBlockedOpsField,
  progressRatio,
  projectOpsRecentRow,
  type OpsAccess,
  type OpsCounts,
} from "./ops-dashboard";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function fullAccess(): OpsAccess {
  return {
    overview: true,
    moderasi: true,
    kejadian: true,
    logistik: true,
    master: true,
    destana: true,
    rehab: true,
    disabilitas: true,
    publikCms: true,
    dailyBrief: true,
  };
}

function sampleCounts(over: Partial<OpsCounts> = {}): OpsCounts {
  return {
    ...emptyOpsCounts(),
    laporanMasuk: 4,
    laporanDitinjau: 2,
    laporanDisetujui: 6,
    laporanDitolak: 1,
    laporanPerluInfo: 1,
    penangananMasuk: 1,
    penangananDitinjau: 1,
    penangananDisetujui: 2,
    kejadianOps: 5,
    kejadianDarurat: 1,
    calonDraf: 3,
    personil: 10,
    peralatan: 8,
    kebutuhan: 4,
    distPersonil: 4,
    distPeralatan: 2,
    distKebutuhan: 1,
    destanaSi: 6,
    destanaAktivitas: 20,
    destanaAktivitasSelesai: 8,
    pkdTugas: 6,
    pkdTugasSelesai: 2,
    rehabKebutuhan: 5,
    rehabMonitoring: 3,
    rehabPenerima: 9,
    disabilitas: 12,
    nomorPenting: 7,
    pelatihan: 3,
    permintaanPelatihan: 2,
    instansi: 4,
    pengungsian: 2,
    dailyBriefActive: 3,
    dailyBriefs: 1,
    ...over,
  };
}

describe("ops dashboard math (AN-43)", () => {
  it("progressRatio is 0 for empty totals and clamps to 0–1", () => {
    assert.equal(progressRatio(0, 0), 0);
    assert.equal(progressRatio(3, 0), 0);
    assert.equal(progressRatio(-1, 4), 0);
    assert.equal(progressRatio(2, 4), 0.5);
    assert.equal(progressRatio(9, 3), 1);
  });

  it("builds Bolster lifecycle in scan → response → bind order", () => {
    const view = buildOpsDashboardView(sampleCounts(), [], fullAccess());
    assert.deepEqual(
      view.lifecycle.map((step) => step.key),
      ["incoming", "review", "approved", "ops", "logistics"],
    );
    assert.equal(view.lifecycle[0]?.value, 5);
    assert.equal(view.lifecycle[2]?.value, 8);
    assert.equal(view.lifecycle[3]?.value, 5);
    assert.equal(view.lifecycle[4]?.value, 7);
    assert.ok((view.lifecycle[0]?.href ?? "").startsWith("/admin"));
  });

  it("hides lifecycle stages and feeds the role cannot access", () => {
    const desa: OpsAccess = {
      ...fullAccess(),
      moderasi: false,
      kejadian: false,
      logistik: false,
      master: false,
      rehab: false,
      disabilitas: false,
      publikCms: false,
      dailyBrief: false,
    };
    const view = buildOpsDashboardView(sampleCounts(), [], desa);
    assert.deepEqual(view.lifecycle, []);
    assert.equal(view.feeds.some((feed) => feed.id === "logistik"), false);
    assert.equal(view.feeds.some((feed) => feed.id === "destana"), true);
    assert.ok(view.coverage.modulesVisible >= 1);
    assert.equal(view.coverage.queue, 0);
  });

  it("logistik feed relates stock to distribusi instead of a lone count", () => {
    const view = buildOpsDashboardView(sampleCounts(), [], fullAccess());
    const logistik = view.feeds.find((feed) => feed.id === "logistik");
    assert.ok(logistik);
    assert.equal(logistik.progress, progressRatio(7, 22));
    assert.ok(logistik.metrics.some((m) => m.key === "stock"));
    assert.ok(logistik.metrics.some((m) => m.key === "distributed"));
  });

  it("leaderboard ranks visible modules by volume and omits zeros last", () => {
    const view = buildOpsDashboardView(sampleCounts(), [], fullAccess());
    assert.ok(view.leaderboard.length >= 3);
    const volumes = view.leaderboard.map((row) => row.volume);
    assert.deepEqual(volumes, [...volumes].sort((a, b) => b - a));
    assert.equal(view.leaderboard.every((row) => row.volume >= 0), true);
  });

  it("blocks PII fields from recent rows", () => {
    assert.equal(isBlockedOpsField("phone_enc"), true);
    assert.equal(isBlockedOpsField("nama_enc"), true);
    assert.equal(isBlockedOpsField("jawaban_json"), true);
    assert.equal(isBlockedOpsField("pelapor_id"), true);
    assert.equal(isBlockedOpsField("nama"), false);
    const row = projectOpsRecentRow("logistik", {
      id: "p1",
      nama: "Gudang Banda Aceh",
      status: "siap",
      kabupaten: "Banda Aceh",
      phone_enc: "secret",
      nama_enc: "secret",
      jawaban_json: { deskripsi: "jangan" },
    });
    assert.ok(row);
    assert.equal(row.title, "Gudang Banda Aceh");
    assert.doesNotMatch(JSON.stringify(row), /secret|jangan|phone_enc|nama_enc/);
  });
});

describe("AN-43 FE-43 inventory", () => {
  it("does not add a role module or a write API", () => {
    assert.equal(SIK_MODULES.includes("overview"), true);
    assert.equal((SIK_MODULES as readonly string[]).includes("opsDash"), false);
    assert.equal(SIK_MODULES.length, 12);
    assert.equal(existsSync(join(ROOT, "src/app/api/admin/ops-dashboard")), false);
    assert.equal(existsSync(join(ROOT, "src/app/api/admin/operasi")), false);
    const roles = read("src/lib/sik/roles.ts");
    assert.doesNotMatch(roles, /opsDash/);
  });

  it("registers staff page, nav, and i18n without replacing overview", () => {
    const routing = read("src/i18n/routing.ts");
    const shell = read("src/components/admin/AdminShell.tsx");
    const page = read("src/app/[locale]/admin/(console)/operasi/page.tsx");
    const overview = read("src/app/[locale]/admin/(console)/page.tsx");
    const ui = read("src/components/admin/OpsDashboard.tsx");
    const load = read("src/lib/sik/ops-dashboard-load.ts");
    const attack = read("security/attack-surface.md");
    const id = JSON.parse(read("messages/id.json")) as { admin: Record<string, string> };
    const en = JSON.parse(read("messages/en.json")) as { admin: Record<string, string> };
    assert.match(routing, /"\/admin\/operasi"/);
    assert.match(shell, /\/admin\/operasi/);
    assert.match(shell, /navOpsDash/);
    assert.match(page, /OpsDashboard/);
    assert.match(page, /requireStaffPage/);
    assert.match(overview, /\/admin\/operasi/);
    assert.match(ui, /data-testid="ops-dashboard"/);
    assert.match(ui, /data-testid="ops-lifecycle"/);
    assert.match(load, /requireStaffPage|from\(/);
    assert.doesNotMatch(load, /jawaban_json|phone_enc|nama_enc|pelapor_id/);
    assert.match(attack, /\/id\/admin\/operasi/);
    assert.equal(id.admin.navOpsDash, "Dasbor data");
    assert.equal(en.admin.navOpsDash, "Data dashboard");
    assert.equal(typeof id.admin.opsDashTitle, "string");
    assert.equal(typeof en.admin.opsDashTitle, "string");
    assert.notEqual(id.admin.opsDashTitle, en.admin.opsDashTitle);
    assert.equal(id.admin.navOverview, "Ringkasan");
  });

    it("FE-56: feed cards link to existing module hrefs and filters are not a hard four-id list", () => {
    const ui = read("src/components/admin/OpsDashboard.tsx");
    const id = JSON.parse(read("messages/id.json")) as { admin: Record<string, string> };
    const en = JSON.parse(read("messages/en.json")) as { admin: Record<string, string> };
    assert.match(ui, /OPS_FEED_HREFS/);
    assert.match(ui, /opsDashOpenAria/);
    assert.match(ui, /view\.feeds\.map\(\(feed\) => feed\.id\)/);
    assert.doesNotMatch(ui, /FilterId = "all" \| "logistik" \| "kejadian" \| "destana" \| "rehab"/);
    assert.match(ui, /href=\{feed\.href\}/);
    assert.match(ui, /href=\{OPS_FEED_HREFS\[row\.module\]\}/);
    const keys = [
      "opsDashVolumeHintModerasi",
      "opsDashVolumeHintKejadian",
      "opsDashOpenAria",
      "opsDashEmptyModule",
      "opsDashNeedsWork",
    ] as const;
    for (const key of keys) {
      assert.equal(typeof id.admin[key], "string");
      assert.equal(typeof en.admin[key], "string");
      assert.notEqual(id.admin[key], en.admin[key]);
    }
    assert.doesNotMatch(id.admin.opsDashVolumeHintKejadian, /\u2014|\u2013/);
    assert.doesNotMatch(en.admin.opsDashVolumeHintKejadian, /\u2014|\u2013/);
  });
});
