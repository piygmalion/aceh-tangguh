import { requireStaffPage } from "@/lib/auth/admin";
import { canAccessModule } from "@/lib/sik/roles";
import { SikForbidden } from "@/components/sik/SikForbidden";
import { SikResourceManager } from "@/components/sik/SikResourceManager";
import { GlassPanel } from "@/components/ui/GlassPanel";

export default async function SikDisabilitasPage() {
  const { profile } = await requireStaffPage();
  if (!canAccessModule(profile, "disabilitas")) return <SikForbidden />;
  return (
    <div className="flex flex-col gap-4">
      <GlassPanel className="p-5">
        <h1 className="text-xl font-semibold">Agregat disabilitas</h1>
        <p className="mt-1 text-sm text-[var(--text-dim)]">
          Hanya angka per kabupaten dan ragam hambatan. Tidak ada daftar nama di portal publik.
        </p>
      </GlassPanel>
      <SikResourceManager
        resource="disabilitas"
        title="Input agregat"
        fields={["kabupaten", "kode_kabupaten", "ragam", "jumlah", "dengan_pengasuh", "tanpa_pengasuh"]}
      />
    </div>
  );
}
