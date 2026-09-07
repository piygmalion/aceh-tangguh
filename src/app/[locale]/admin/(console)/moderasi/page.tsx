import { requireStaffPage } from "@/lib/auth/admin";
import { canAccessModule, isKabScoped } from "@/lib/sik/roles";
import { SikForbidden } from "@/components/sik/SikForbidden";
import { ModerationTable } from "@/components/admin/ModerationTable";

export default async function AdminModerationPage() {
  // Mirrors the guard on /api/admin/laporan: moderation exposes reporter PII,
  // so non-moderator staff get the forbidden screen instead of a 403 table.
  const { profile, roleModules } = await requireStaffPage();
  if (!canAccessModule(profile, "moderasi", roleModules)) return <SikForbidden />;
  return <ModerationTable hideLegacy={isKabScoped(profile)} />;
}
