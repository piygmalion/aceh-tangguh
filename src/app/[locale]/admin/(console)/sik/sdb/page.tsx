import { requireStaffPage } from "@/lib/auth/admin";
import { canAccessModule } from "@/lib/sik/roles";
import { SikForbidden } from "@/components/sik/SikForbidden";
import { SdbKatalogList } from "@/components/sik/SdbKatalogList";

export default async function SikSdbPage() {
  const { profile, roleModules } = await requireStaffPage();
  if (!canAccessModule(profile, "kejadian", roleModules)) return <SikForbidden />;
  return <SdbKatalogList />;
}
