import { requireStaffPage } from "@/lib/auth/admin";
import { canAccessModule } from "@/lib/sik/roles";
import { SikForbidden } from "@/components/sik/SikForbidden";
import { ModerationTable } from "@/components/admin/ModerationTable";

export default async function AdminModerationPage() {
  // Mirrors the guard on /api/admin/laporan: moderation exposes reporter PII,
  // so non-moderator staff get the forbidden screen instead of a 403 table.
  const { profile } = await requireStaffPage();
  if (!canAccessModule(profile, "moderasi")) return <SikForbidden />;
  return <ModerationTable />;
}
