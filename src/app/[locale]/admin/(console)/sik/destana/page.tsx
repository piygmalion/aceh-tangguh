import { requireStaffPage } from "@/lib/auth/admin";
import { canAccessModule, isDesaRole, isPenilaiPkd, isProvinsiOps } from "@/lib/sik/roles";
import { SikForbidden } from "@/components/sik/SikForbidden";
import { DestanaAdminPanel } from "@/components/sik/DestanaAdminPanel";

export default async function SikDestanaPage() {
  const { profile } = await requireStaffPage();
  if (!canAccessModule(profile, "destana")) return <SikForbidden />;
  return (
    <DestanaAdminPanel
      isDesa={isDesaRole(profile)}
      isPenilai={isPenilaiPkd(profile) || isProvinsiOps(profile)}
      kodeDesa={profile.kodeDesaKelurahan}
    />
  );
}
