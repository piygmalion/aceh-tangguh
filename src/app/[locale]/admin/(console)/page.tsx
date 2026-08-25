import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { isSuperAdmin } from "@/lib/auth/types";
import { requireStaffPage } from "@/lib/auth/admin";

const OVERVIEW_STATUSES = ["submitted", "in_review", "approved", "rejected"] as const;

export default async function AdminOverviewPage() {
  const t = await getTranslations("admin");
  const { supabase, profile } = await requireStaffPage();
  const superAdmin = isSuperAdmin(profile);

  const counts = {
    submitted: 0,
    in_review: 0,
    approved: 0,
    rejected: 0,
  };
  for (const status of OVERVIEW_STATUSES) {
    const { count } = await supabase
      .from("laporan_kejadian")
      .select("id", { count: "exact", head: true })
      .eq("status", status);
    counts[status] = count ?? 0;
  }

  const { count: legacyQueued } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "queued");

  const cards = [
    { href: "/admin/moderasi" as const, title: t("navModeration"), body: t("overviewModeration") },
    ...(superAdmin
      ? [
          { href: "/admin/cms" as const, title: t("navCms"), body: t("overviewCms") },
          { href: "/admin/database" as const, title: t("navDatabase"), body: t("overviewDatabase") },
        ]
      : []),
  ];

  const statusLabel = {
    submitted: t("statusSubmitted"),
    in_review: t("statusInReview"),
    approved: t("statusApproved"),
    rejected: t("statusRejected"),
  };

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
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {OVERVIEW_STATUSES.map((key) => (
            <div key={key} className="rounded-xl border border-[var(--glass-border)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">
                {statusLabel[key]}
              </p>
              <p className="mt-1 text-2xl font-semibold">{counts[key]}</p>
            </div>
          ))}
        </div>
        {(legacyQueued ?? 0) > 0 ? (
          <p className="mt-3 text-xs text-[var(--text-dim)]">
            {t("overviewLegacyQueued")}: {legacyQueued}
          </p>
        ) : null}
      </GlassPanel>
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
