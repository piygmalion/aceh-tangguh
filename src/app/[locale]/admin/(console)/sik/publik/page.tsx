import { requireStaffPage } from "@/lib/auth/admin";
import { canAccessModule } from "@/lib/sik/roles";
import { SikForbidden } from "@/components/sik/SikForbidden";
import { SikResourceManager } from "@/components/sik/SikResourceManager";

export default async function SikPublikCmsPage() {
  const { profile } = await requireStaffPage();
  if (!canAccessModule(profile, "publikCms")) return <SikForbidden />;
  return (
    <div className="flex flex-col gap-4">
      <SikResourceManager
        resource="nomorPenting"
        title="Nomor penting"
        fields={["kategori", "nama", "telepon", "kabupaten", "kode_kabupaten", "urutan"]}
      />
      <SikResourceManager
        resource="pelatihan"
        title="Pelatihan"
        fields={["judul", "deskripsi", "tanggal", "lokasi", "kabupaten", "status"]}
      />
      <SikResourceManager
        resource="permintaanPelatihan"
        title="Permintaan pelatihan masyarakat"
        fields={["judul", "desa", "tanggal_rencana", "kontak_nama", "status"]}
      />
    </div>
  );
}
