import { requireStaffPage } from "@/lib/auth/admin";
import { canAccessModule } from "@/lib/sik/roles";
import { SikForbidden } from "@/components/sik/SikForbidden";
import { SikResourceManager } from "@/components/sik/SikResourceManager";

export default async function SikMasterPage() {
  const { profile, roleModules } = await requireStaffPage();
  if (!canAccessModule(profile, "master", roleModules)) return <SikForbidden />;
  return (
    <div className="flex flex-col gap-4">
      <SikResourceManager
        resource="instansi"
        title="Instansi"
        fields={["nama", "kategori", "kabupaten", "kode_kabupaten", "kontak", "alamat", "kop_surat_url", "penandatangan_nama", "penandatangan_pangkat", "penandatangan_nip"]}
      />
      <SikResourceManager
        resource="pengungsian"
        title="Tempat pengungsian"
        fields={["nama", "desa", "kecamatan", "kabupaten", "kode_kabupaten", "kapasitas", "latitude", "longitude", "pic_nama", "pic_kontak"]}
      />
    </div>
  );
}
