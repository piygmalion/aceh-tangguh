import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { isSuperAdmin } from "@/lib/auth/types";
import { requireStaffPage } from "@/lib/auth/admin";
import type { ReportStatus } from "@/lib/supabase/types";

export default async function AdminOverviewPage() {
  const t = await getTranslations("admin");
  const { supabase, profile } = await requireStaffPage();
  const superAdmin = isSuperAdmin(profile);

  const counts: Record<ReportStatus, number> = {
    queued: 0,
    published: 0,
    rejected: 0,
  };
  for (const status of Object.keys(counts) as ReportStatus[]) {
    const { count } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", status);
    counts[status] = count ?? 0;
  }

  const cards = [
    { href: "/admin/moderasi" as const, title: t("navModeration"), body: t("overviewModeration") },
    ...(superAdmin
      ? [
          { href: "/admin/cms" as const, title: t("navCms"), body: t("overviewCms") },
          { href: "/admin/database" as const, title: t("navDatabase"), body: t("overviewDatabase") },
        ]
      : []),
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
        <div className="mt-5 grid grid-cols-3 gap-3">
          {(
            [
              ["queued", counts.queued],
              ["published", counts.published],
              ["rejected", counts.rejected],
            ] as const
          ).map(([key, value]) => (
            <div key={key} className="rounded-xl border border-[var(--glass-border)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">
                {t(
                  key === "queued"
                    ? "statusQueued"
                    : key === "published"
                      ? "statusPublished"
                      : "statusRejected"
                )}
              </p>
              <p className="mt-1 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </GlassPanel>
      <div className="grid gap-3 md:grid-cols-2">
        {cards.map((card) => (
          <Link key={card.href} href={card.href}>
            <GlassPanel className="h-full p-5 transition hover:border-[var(--accent)]">
              <h2 className="font-semibold">{card.title}</h2>
              <p className="mt-1 text-sm text-[var(--text-dim)]">{card.body}</p>
            </GlassPanel>
          </Link>
        ))}
      </div>
    </div>
  );
}
