import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { PemulihanPanel } from "@/components/beranda/PemulihanPanel";
import { OperationalStatsSection } from "@/components/sik/OperationalStatsSection";
import { isSuperAdmin } from "@/lib/auth/types";
import { canAccessModule } from "@/lib/sik/roles";
import { requireStaffPage } from "@/lib/auth/admin";

const OVERVIEW_STATUSES = [
  "submitted",
  "in_review",
  "approved",
  "rejected",
  "needs_info",
] as const;

const OVERVIEW_TABLES = [
  { key: "kejadian", table: "laporan_kejadian" },
  { key: "penanganan", table: "laporan_penanganan" },
] as const;

type OverviewStatus = (typeof OVERVIEW_STATUSES)[number];
type OverviewCounts = Record<OverviewStatus, number>;

function emptyOverviewCounts(): OverviewCounts {
  return {
    submitted: 0,
    in_review: 0,
    approved: 0,
    rejected: 0,
    needs_info: 0,
  };
}

export default async function AdminOverviewPage() {
  const t = await getTranslations("admin");
  const { supabase, profile, roleModules } = await requireStaffPage();
  const superAdmin = isSuperAdmin(profile);

  const counts = {
    kejadian: emptyOverviewCounts(),
    penanganan: emptyOverviewCounts(),
  };
  for (const { key, table } of OVERVIEW_TABLES) {
    for (const status of OVERVIEW_STATUSES) {
      const { count } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("status", status);
      counts[key][status] = count ?? 0;
    }
  }

  const { count: legacyQueued } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "queued");

  const cards = [
    { href: "/admin/operasi" as const, title: t("navOpsDash"), body: t("overviewOpsDash") },
    { href: "/admin/moderasi" as const, title: t("navModeration"), body: t("overviewModeration") },
    ...(canAccessModule(profile, "kejadian", roleModules)
      ? [{ href: "/admin/sik/kejadian" as const, title: t("navKejadianOps"), body: t("overviewKejadian") }]
      : []),
    ...(canAccessModule(profile, "dailyBrief", roleModules)
      ? [{ href: "/admin/daily-brief" as const, title: t("navDailyBrief"), body: t("overviewDailyBrief") }]
      : []),
    ...(superAdmin
      ? [
          { href: "/admin/cms" as const, title: t("navCms"), body: t("overviewCms") },
          { href: "/admin/database" as const, title: t("navDatabase"), body: t("overviewDatabase") },
        ]
      : []),
  ];

  const statusLabel: Record<OverviewStatus, string> = {
    submitted: t("statusSubmitted"),
    in_review: t("statusInReview"),
    approved: t("statusApproved"),
    rejected: t("statusRejected"),
    needs_info: t("statusNeedsInfo"),
  };

  const groups = [
    { key: "kejadian" as const, label: t("tabKejadian"), counts: counts.kejadian },
    { key: "penanganan" as const, label: t("tabPenanganan"), counts: counts.penanganan },
  ];

  return (
    <div className="flex flex-col gap-4">
      <GlassPanel className="p-5 sm:p-6">
        <h1 className="text-xl font-semibold">{t("overviewTitle")}</h1>
        <p className="mt-1 text-sm text-[var(--text-dim)]">
          {t("overviewHello", {
            name: profile.displayName || profile.email || "",
            role: superAdmin ? t("roleSuperAdmin") : t("roleAdmin"),
          })}
        </p>
        <div className="mt-5 flex flex-col gap-5">
          {groups.map((group) => (
            <div key={group.key}>
              <p className="text-sm font-semibold">{group.label}</p>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {OVERVIEW_STATUSES.map((key) => (
                  <div key={key} className="rounded-xl border border-[var(--glass-border)] p-3">
                    <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">
                      {statusLabel[key]}
                    </p>
                    <p className="mt-1 text-2xl font-semibold">{group.counts[key]}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {(legacyQueued ?? 0) > 0 ? (
          <p className="mt-3 text-xs text-[var(--text-dim)]">
            {t("overviewLegacyQueued")}: {legacyQueued}
          </p>
        ) : null}
      </GlassPanel>
      <PemulihanPanel />
      <OperationalStatsSection />
      <div className="grid gap-3 md:grid-cols-2">
        {cards.map((card) => (
          <Link key={card.href} href={card.href}>
            <GlassPanel className="h-full p-5 transition hover:border-[var(--primary)]">
              <h2 className="font-semibold">{card.title}</h2>
              <p className="mt-1 text-sm text-[var(--text-dim)]">{card.body}</p>
            </GlassPanel>
          </Link>
        ))}
      </div>
    </div>
  );
}
