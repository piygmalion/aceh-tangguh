import { requireStaffPage } from "@/lib/auth/admin";
import { canAccessModule } from "@/lib/sik/roles";
import { SikForbidden } from "@/components/sik/SikForbidden";
import { KejadianOpsList } from "@/components/sik/KejadianOpsList";

export default async function SikKejadianPage() {
  const { profile } = await requireStaffPage();
  if (!canAccessModule(profile, "kejadian")) return <SikForbidden />;
  return <KejadianOpsList />;
}
