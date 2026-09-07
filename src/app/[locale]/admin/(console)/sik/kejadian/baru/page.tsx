import { requireStaffPage } from "@/lib/auth/admin";
import { canAccessModule } from "@/lib/sik/roles";
import { SikForbidden } from "@/components/sik/SikForbidden";
import { KejadianWizard } from "@/components/sik/KejadianWizard";

export default async function SikKejadianBaruPage({
  searchParams,
}: {
  searchParams: { laporan?: string };
}) {
  const { profile, roleModules } = await requireStaffPage();
  if (!canAccessModule(profile, "kejadian", roleModules)) return <SikForbidden />;
  return <KejadianWizard laporanId={searchParams.laporan} />;
}
