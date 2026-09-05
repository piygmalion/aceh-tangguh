import { requireStaffPage } from "@/lib/auth/admin";
import { canAccessModule } from "@/lib/sik/roles";
import { SikForbidden } from "@/components/sik/SikForbidden";
import { SikResourceManager } from "@/components/sik/SikResourceManager";
import { GlassPanel } from "@/components/ui/GlassPanel";

export default async function SikRehabPage() {
  const { profile } = await requireStaffPage();
  if (!canAccessModule(profile, "rehab")) return <SikForbidden />;
  return (
    <div className="flex flex-col gap-4">
      <GlassPanel className="p-5">
        <h1 className="text-xl font-semibold">Rehab-rekon per kejadian</h1>
        <p className="mt-1 text-sm text-[var(--text-dim)]">
          Kebutuhan fisik menempel kejadian operasional. Baseline rencana publik tetap di halaman PRRPKA.
        </p>
      </GlassPanel>
      <SikResourceManager
        resource="rehab"
        title="Kebutuhan fisik"
        fields={["kejadian_id", "sektor", "subsektor", "kabupaten", "desa", "rusak_berat", "rusak_sedang", "rusak_ringan", "hilang", "kebutuhan_rp"]}
      />
      <SikResourceManager
        resource="rehabMonitoring"
        title="Monitoring"
        fields={["kebutuhan_id", "status", "progres_pct", "pelaksana", "catatan", "tanggal"]}
      />
      <SikResourceManager resource="rehabPenerima" title="Penerima manfaat" fields={["kebutuhan_id", "nama_enc", "desa", "status"]} />
    </div>
  );
}
