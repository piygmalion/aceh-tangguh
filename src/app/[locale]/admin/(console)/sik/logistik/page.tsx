import { requireStaffPage } from "@/lib/auth/admin";
import { canAccessModule } from "@/lib/sik/roles";
import { SikForbidden } from "@/components/sik/SikForbidden";
import { SikResourceManager } from "@/components/sik/SikResourceManager";
import { GlassPanel } from "@/components/ui/GlassPanel";

export default async function SikLogistikPage() {
  const { profile } = await requireStaffPage();
  if (!canAccessModule(profile, "logistik")) return <SikForbidden />;
  return (
    <div className="flex flex-col gap-4">
      <GlassPanel className="p-5">
        <h1 className="text-xl font-semibold">Logistik / sumber daya</h1>
        <p className="mt-1 text-sm text-[var(--text-dim)]">
          Personil, peralatan, dan kebutuhan dasar. Distribusi diikat ke kejadian operasional.
        </p>
      </GlassPanel>
      <SikResourceManager resource="personil" title="Personil" fields={["nama", "jabatan", "keahlian", "kabupaten", "kode_kabupaten", "status"]} />
      <SikResourceManager resource="peralatan" title="Peralatan" fields={["nama", "kategori", "jumlah", "satuan", "kondisi", "kabupaten"]} />
      <SikResourceManager resource="kebutuhan" title="Kebutuhan dasar" fields={["nama", "kategori", "stok", "satuan", "kabupaten"]} />
      <SikResourceManager resource="distPersonil" title="Distribusi personil" fields={["kejadian_id", "personil_id", "mulai", "selesai"]} />
      <SikResourceManager resource="distPeralatan" title="Distribusi peralatan" fields={["kejadian_id", "peralatan_id", "jumlah"]} />
      <SikResourceManager resource="distKebutuhan" title="Distribusi kebutuhan" fields={["kejadian_id", "kebutuhan_id", "jumlah"]} />
    </div>
  );
}
