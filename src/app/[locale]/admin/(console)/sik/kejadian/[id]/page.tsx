import { requireStaffPage } from "@/lib/auth/admin";
import { canAccessModule } from "@/lib/sik/roles";
import { SikForbidden } from "@/components/sik/SikForbidden";
import { KejadianOpsDetail } from "@/components/sik/KejadianOpsDetail";

export default async function SikKejadianDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { profile } = await requireStaffPage();
  if (!canAccessModule(profile, "kejadian")) return <SikForbidden />;
  return <KejadianOpsDetail id={params.id} />;
}
