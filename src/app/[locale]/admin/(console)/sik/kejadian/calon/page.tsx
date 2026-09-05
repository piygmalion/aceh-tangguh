import { requireStaffPage } from "@/lib/auth/admin";
import { canAccessModule, isKabScoped } from "@/lib/sik/roles";
import { SikForbidden } from "@/components/sik/SikForbidden";
import { CalonKejadianList } from "@/components/sik/CalonKejadianList";

export default async function SikCalonKejadianPage() {
  const { profile } = await requireStaffPage();
  if (!canAccessModule(profile, "kejadian")) return <SikForbidden />;
  return <CalonKejadianList isKabScoped={isKabScoped(profile)} />;
}
