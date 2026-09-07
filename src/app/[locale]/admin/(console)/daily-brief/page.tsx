import { requireStaffPage } from "@/lib/auth/admin";
import { canAccessModule } from "@/lib/sik/roles";
import { SikForbidden } from "@/components/sik/SikForbidden";
import { DailyBriefManager } from "@/components/admin/DailyBriefManager";

export default async function AdminDailyBriefPage() {
  const { profile, roleModules } = await requireStaffPage();
  if (!canAccessModule(profile, "dailyBrief", roleModules)) return <SikForbidden />;
  return <DailyBriefManager />;
}
