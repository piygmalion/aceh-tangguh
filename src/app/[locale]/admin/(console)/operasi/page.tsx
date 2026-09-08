import { getTranslations } from "next-intl/server";
import { requireStaffPage } from "@/lib/auth/admin";
import { isSuperAdmin } from "@/lib/auth/types";
import { OpsDashboard } from "@/components/admin/OpsDashboard";
import { SikForbidden } from "@/components/sik/SikForbidden";
import { emptyOpsDashboardView, loadOpsDashboardView } from "@/lib/sik/ops-dashboard-load";
import { canAccessModule } from "@/lib/sik/roles";

export default async function AdminOpsDashboardPage() {
  const t = await getTranslations("admin");
  const { supabase, profile, roleModules } = await requireStaffPage();
  if (!canAccessModule(profile, "overview", roleModules)) return <SikForbidden />;

  const view = supabase
    ? await loadOpsDashboardView(supabase as never, profile, roleModules)
    : emptyOpsDashboardView({
        overview: true,
        moderasi: false,
        kejadian: false,
        logistik: false,
        master: false,
        destana: false,
        rehab: false,
        disabilitas: false,
        publikCms: false,
        dailyBrief: false,
      });

  return (
    <OpsDashboard
      view={view}
      name={profile.displayName || profile.email || ""}
      role={isSuperAdmin(profile) ? t("roleSuperAdmin") : t("roleAdmin")}
    />
  );
}
